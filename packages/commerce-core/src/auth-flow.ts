import { eq, sql } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { hashPassword, verifyPassword, EmailOtpService } from '@haa/auth-core';
import { AuditLogService } from '@haa/integration-core';
import { normalizeSaudiPhone } from '@haa/shared';
import {
  renderMerchantWelcomeEmail,
  type MerchantWelcomeContext,
} from '@haa/notification-core';
import { pickWelcomeEmailProvider } from './email-provider.js';

/**
 * Resolve the storefront base URL for a merchant's store. Mirrors the
 * subdomain pattern used in `OrdersService.buildStoreBaseUrl` so all
 * transactional emails point at the same canonical surface:
 * `https://<slug>.haastores.com` (the `STOREFRONT_APEX_DOMAIN` env
 * lets staging override the apex).
 */
function buildStoreBaseUrl(slug: string): string {
  const apex = (process.env.STOREFRONT_APEX_DOMAIN || 'haastores.com').replace(/^https?:\/\//, '');
  return `https://${slug}.${apex}`;
}

/**
 * Resolve the merchant dashboard base URL. The dashboard is hosted on
 * the apex `merchant.<apex>` subdomain. Falls back to the production
 * value when `STOREFRONT_APEX_DOMAIN` is unset.
 */
function buildDashboardUrl(): string {
  const apex = (process.env.STOREFRONT_APEX_DOMAIN || 'haastores.com').replace(/^https?:\/\//, '');
  return `https://merchant.${apex}`;
}

/**
 * AuthFlowService — owns the user-account lifecycle business logic.
 *
 * This service is the ONLY place in the project that is allowed to
 * touch users / tenants / tenantUsers / stores / storeSettings tables
 * for auth purposes. Routes call into this service; the service
 * encapsulates the multi-table transactions + audit + password
 * hashing. JWT minting is intentionally a transport concern and
 * stays in the route layer (which is where `@haa/auth-core` already
 * lives).
 *
 * Originally extracted from `apps/api/src/routes/auth.ts` as part of
 * Quality Pass 5, Route Migration 1/24.
 */

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  /**
   * Phone-first registration: required in the API layer (registerSchema),
   * still typed as optional here to keep the OAuth auto-register path
   * (`loginOrRegisterWithOAuth`) which does NOT collect a phone.
   *
   * When provided, MUST be a parseable Saudi mobile; the service runs
   * `normalizeSaudiPhone` and returns `invalid_phone` (→ 400) on miss.
   */
  phone?: string;
  storeName: string;
  storeSlug: string;
}

/**
 * The data needed for the route to mint the JWT. The service does
 * NOT mint the token itself — that's a transport-layer concern and
 * keeping it out of the service lets us swap JWT for opaque tokens
 * or session cookies without touching the service.
 */
export interface RegisterPayload {
  userId: number;
  userName: string;
  userEmail: string;
  userTokenVersion: number;
  tenantId: number;
  storeId: number;
  storeName: string;
  storeSlug: string;
  role: 'owner';
  /**
   * HAA-AUTH-SIGNUP-VERIFY — `true` when the user must complete email
   * OTP verification before they can log in. New rows always carry
   * `email_verified_at = NULL`, so this is `true` on every fresh
   * password registration. OAuth auto-register (loginOrRegisterWithOAuth)
   * leaves it on the legacy path — the OAuth provider already vouched
   * for the email — so the flag is `false` for that path.
   */
  verificationRequired: boolean;
}

export type RegisterError =
  | { kind: 'email_taken'; message: string }
  | { kind: 'slug_taken'; message: string }
  | { kind: 'phone_taken'; message: string }
  | { kind: 'invalid_phone'; message: string };

export interface LoginInput {
  /**
   * Canonical identifier (Saudi mobile in any accepted shape OR email).
   * Either `identifier` OR the legacy `email` / `phone` aliases must be
   * provided. The service resolves them in that order.
   */
  identifier?: string;
  /** Legacy alias for `identifier` — kept for backwards-compat. */
  email?: string;
  /** Legacy alias for `identifier` — kept for backwards-compat. */
  phone?: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export type LoginError =
  | { kind: 'invalid_credentials'; message: string }
  | { kind: 'no_tenant'; message: string }
  | { kind: 'email_not_verified'; message: string };

/** HAA-AUTH-SIGNUP-VERIFY — input shape for `verifySignup`. */
export interface VerifySignupInput {
  email: string;
  code: string;
  sourceIp?: string | null;
  userAgent?: string | null;
}

/** HAA-AUTH-SIGNUP-VERIFY — input shape for `resendSignupOtp`. */
export interface ResendSignupOtpInput {
  email: string;
  sourceIp?: string | null;
  userAgent?: string | null;
}

/**
 * Verified-signup payload — same data the route needs to mint a JWT,
 * mirrors `LoginPayload` but with the verified user row included for
 * caller convenience.
 */
export interface VerifySignupPayload {
  userId: number;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  userTokenVersion: number;
  tenantId: number;
  storeId: number;
  storeName: string | null;
  storeSlug: string | null;
  role: string;
}

export type VerifySignupError = {
  reason:
    | 'INVALID_CODE'
    | 'EXPIRED'
    | 'NOT_FOUND'
    | 'TOO_MANY_ATTEMPTS'
    | 'USED'
    | 'ALREADY_VERIFIED';
};

export interface LoginPayload {
  userId: number;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  userTokenVersion: number;
  tenantId: number;
  storeId: number;
  storeName: string | null;
  storeSlug: string | null;
  role: string;
}

/** Public user shape returned by `getMe` (without JWT-derived fields). */
export interface MeUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
}

export class AuthFlowService {
  constructor(private db: DbClient = createDbClient()) {}

  /**
   * Register a new user, tenant, tenantUser, store, and storeSettings
   * in a single transaction. Returns either a RegisterPayload (data
   * the route uses to mint a JWT) or a RegisterError describing the
   * conflict.
   *
   * The caller is responsible for mapping the error kind to an HTTP
   * status code (email_taken / slug_taken → 409).
   */
  async register(input: RegisterInput): Promise<RegisterPayload | RegisterError> {
    // Phone-first: if a phone was supplied, normalize it FIRST so every
    // downstream insert (users / tenants / stores) carries the same
    // canonical +9665XXXXXXXX value. The DB UNIQUE index assumes this.
    //
    // The OAuth auto-register path passes no phone — leave `undefined`
    // alone so legacy OAuth signups keep working.
    let normalizedPhone: string | undefined = undefined;
    if (input.phone !== undefined && input.phone !== null && input.phone !== '') {
      const normalized = normalizeSaudiPhone(input.phone);
      if (normalized === null) {
        return { kind: 'invalid_phone', message: 'رقم الجوال غير صحيح' } as const;
      }
      normalizedPhone = normalized;
    }

    const txResult = await this.db.transaction(async (tx) => {
      const existingUser = await tx
        .select()
        .from(s.users)
        .where(eq(s.users.email, input.email))
        .limit(1);
      if (existingUser.length > 0) {
        return { kind: 'email_taken', message: 'Email already registered' } as const;
      }

      // Phone uniqueness pre-check. The DB also enforces this via the
      // partial UNIQUE index (migration 0080) — this is a friendlier
      // 409 path that avoids surfacing a raw DB constraint error to
      // the API consumer.
      if (normalizedPhone !== undefined) {
        const existingPhone = await tx
          .select()
          .from(s.users)
          .where(eq(s.users.phone, normalizedPhone))
          .limit(1);
        if (existingPhone.length > 0) {
          return { kind: 'phone_taken', message: 'رقم الجوال مستخدم بالفعل' } as const;
        }
      }

      const existingStore = await tx
        .select()
        .from(s.stores)
        .where(eq(s.stores.slug, input.storeSlug))
        .limit(1);
      if (existingStore.length > 0) {
        return { kind: 'slug_taken', message: 'Store slug already taken' } as const;
      }

      const passwordHash = await hashPassword(input.password);

      const [user] = await tx
        .insert(s.users)
        .values({
          name: input.name,
          email: input.email,
          passwordHash,
          phone: normalizedPhone,
        })
        .returning();

      const [tenant] = await tx
        .insert(s.tenants)
        .values({
          name: input.storeName,
          slug: input.storeSlug,
          email: input.email,
          phone: normalizedPhone,
        })
        .returning();

      await tx.insert(s.tenantUsers).values({
        tenantId: tenant.id,
        userId: user.id,
        role: 'owner',
      });

      const [store] = await tx
        .insert(s.stores)
        .values({
          tenantId: tenant.id,
          name: input.storeName,
          slug: input.storeSlug,
          email: input.email,
          phone: normalizedPhone,
        })
        .returning();

      await tx.insert(s.storeSettings).values({ storeId: store.id });

      return {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userTokenVersion: user.tokenVersion,
        tenantId: tenant.id,
        storeId: store.id,
        storeName: store.name,
        storeSlug: store.slug,
        role: 'owner' as const,
        verificationRequired: true,
      } as const;
    });

    // If the transaction returned an error, just propagate it.
    if ('kind' in txResult) return txResult;

    // HAA-AUTH-SIGNUP-VERIFY — Fire-and-forget OTP send. The row was
    // inserted with email_verified_at = NULL; the user must complete
    // /auth/signup/verify before they can /auth/login. We do NOT block
    // the register response on email delivery — a failed send becomes a
    // /auth/signup/resend-otp call from the client. Logged so ops can
    // see delivery failures without surfacing them to the caller.
    try {
      const otpService = new EmailOtpService(this.db);
      const sendResult = await otpService.generateAndSend({
        email: input.email,
        purpose: 'signup_verify',
        userId: txResult.userId,
        sourceIp: null,
        userAgent: null,
      });
      if (!sendResult.ok) {
        console.warn(
          `[auth-flow] signup OTP send failed userId=${txResult.userId} reason=${sendResult.reason}`,
        );
      }
    } catch (err) {
      console.error('[auth-flow] signup OTP send threw', err);
    }

    return txResult;
  }

  /**
   * Authenticate a user. On failure (invalid email / wrong password /
   * no tenant access) records an audit log entry and returns a
   * LoginError the caller can map to HTTP 401/403.
   *
   * On success, returns a LoginPayload the route uses to mint a JWT.
   */
  async login(
    input: LoginInput,
    audit: AuditLogService = new AuditLogService(),
  ): Promise<LoginPayload | LoginError> {
    const { password, ipAddress, userAgent } = input;

    // Resolve the identifier. Canonical clients send `identifier`.
    // Legacy clients send `email` or `phone`. The order is:
    //   identifier > email > phone
    // LEGACY-ALIAS: drop this fallback once all frontends migrate to
    // `identifier`. Tracked as an OWNER-FOLLOWUP in the report.
    const rawIdentifier = input.identifier ?? input.email ?? input.phone ?? '';
    if (rawIdentifier.length === 0) {
      // Don't reveal that the identifier was missing — the only signal
      // a caller should ever see on the login endpoint is "valid" or
      // "INVALID_CREDENTIALS". This keeps us aligned with the no-
      // enumeration-leak rule for username/password endpoints.
      return { kind: 'invalid_credentials', message: 'Invalid credentials' };
    }

    // Phone-first lookup: if the identifier parses as a Saudi mobile,
    // normalize and search by phone. Otherwise treat as email (lower-
    // cased; emails are case-insensitive per RFC 5321 local-part norms
    // we follow at insert time).
    const normalizedPhone = normalizeSaudiPhone(rawIdentifier);
    let user: typeof s.users.$inferSelect | undefined;
    if (normalizedPhone !== null) {
      [user] = await this.db
        .select()
        .from(s.users)
        .where(eq(s.users.phone, normalizedPhone))
        .limit(1);
    } else {
      const emailLookup = rawIdentifier.trim().toLowerCase();
      [user] = await this.db
        .select()
        .from(s.users)
        .where(eq(s.users.email, emailLookup))
        .limit(1);
      // Fallback for legacy rows inserted with original-case email
      // (we did not lowercase emails on insert historically). Without
      // this lookup, mixed-case email logins would 401.
      if (!user) {
        [user] = await this.db
          .select()
          .from(s.users)
          .where(eq(s.users.email, rawIdentifier))
          .limit(1);
      }
    }
    if (!user) {
      await audit.record({
        action: 'failed_login',
        entityType: 'user',
        ipAddress,
        userAgent,
      });
      // Generic INVALID_CREDENTIALS — must not reveal whether the
      // identifier was unknown vs the password was wrong.
      return { kind: 'invalid_credentials', message: 'Invalid credentials' };
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await audit.record({
        actorUserId: user.id,
        action: 'failed_login',
        entityType: 'user',
        entityId: user.id,
        ipAddress,
        userAgent,
      });
      // Same generic message as the missing-user branch.
      return { kind: 'invalid_credentials', message: 'Invalid credentials' };
    }

    // HAA-AUTH-SIGNUP-VERIFY — email-verification gate. New users have
    // `email_verified_at = NULL` until they complete /auth/signup/verify.
    // Block login here so an unverified account can't get a JWT.
    //
    // LEGACY-BACKFILL: staging has rows created before this column
    // existed (and thus NULL). To keep them unblocked while ops backfills
    // them via a one-shot owner script, the AUTH_LEGACY_VERIFIED env
    // flag short-circuits this guard. Once backfill ships, flip the env
    // off and this branch starts enforcing.
    const TREAT_LEGACY_AS_VERIFIED = process.env.AUTH_LEGACY_VERIFIED === '1';
    if (user.emailVerifiedAt === null && !TREAT_LEGACY_AS_VERIFIED) {
      await audit.record({
        actorUserId: user.id,
        action: 'failed_login',
        entityType: 'user',
        entityId: user.id,
        ipAddress,
        userAgent,
      });
      return {
        kind: 'email_not_verified',
        message: 'يجب تفعيل البريد الإلكتروني أولاً. تحقّق من صندوق الوارد.',
      };
    }

    const [tenantUser] = await this.db
      .select()
      .from(s.tenantUsers)
      .where(eq(s.tenantUsers.userId, user.id))
      .limit(1);
    if (!tenantUser) {
      await audit.record({
        actorUserId: user.id,
        action: 'failed_login',
        entityType: 'tenant_user',
        entityId: user.id,
        ipAddress,
        userAgent,
      });
      return { kind: 'no_tenant', message: 'No tenant access' };
    }

    // Resolve the active store: prefer stores the user has explicit
    // userStoreRoles access to, fall back to the first store in the
    // tenant (for tenant owners without per-store roles).
    const userStoreRoles = await this.db
      .select({ storeId: s.userStoreRoles.storeId })
      .from(s.userStoreRoles)
      .where(eq(s.userStoreRoles.userId, user.id));
    const allowedStoreIds = userStoreRoles.map((r) => r.storeId);

    const allStores = await this.db
      .select()
      .from(s.stores)
      .where(eq(s.stores.tenantId, tenantUser.tenantId))
      .limit(10);
    let activeStore = allStores.find((st) => allowedStoreIds.includes(st.id));
    if (!activeStore && allStores.length > 0) {
      activeStore = allStores[0];
    }

    await audit.record({
      actorUserId: user.id,
      tenantId: tenantUser.tenantId,
      storeId: activeStore?.id,
      action: 'login',
      entityType: 'user',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userPhone: user.phone,
      userTokenVersion: user.tokenVersion,
      tenantId: tenantUser.tenantId,
      storeId: activeStore?.id ?? 0,
      storeName: activeStore?.name ?? null,
      storeSlug: activeStore?.slug ?? null,
      role: tenantUser.role,
    };
  }

  /**
   * Read the current user record (no relations, no tenant lookup —
   * tenantId + activeStoreId are read from the JWT context passed in
   * because the API layer already has them from requireAuth()).
   *
   * Returns null if the user record was deleted between JWT mint and
   * the /me call (caller should map to 404).
   */
  async getMe(userId: number): Promise<MeUser | null> {
    const [user] = await this.db
      .select({
        id: s.users.id,
        name: s.users.name,
        email: s.users.email,
        phone: s.users.phone,
      })
      .from(s.users)
      .where(eq(s.users.id, userId))
      .limit(1);
    if (!user) return null;
    return user;
  }

  /**
   * Invalidate all active sessions for a user by bumping their
   * tokenVersion. Idempotent — the caller does not need to check
   * whether the update affected 0 or 1 rows.
   */
  async logout(userId: number): Promise<void> {
    await this.db
      .update(s.users)
      .set({ tokenVersion: sql`${s.users.tokenVersion} + 1` })
      .where(eq(s.users.id, userId));
  }

  /**
   * HAA-AUTH-SIGNUP-VERIFY — verify the signup OTP and flip
   * `users.email_verified_at` to NOW(). Returns the data a route needs
   * to mint a JWT (mirrors `LoginPayload`).
   *
   * Failure modes mirror the underlying `EmailOtpService.verify` plus an
   * extra `ALREADY_VERIFIED` guard against double-submits.
   */
  async verifySignup(
    input: VerifySignupInput,
    otpService: EmailOtpService = new EmailOtpService(this.db),
  ): Promise<{ ok: true; payload: VerifySignupPayload } | ({ ok: false } & VerifySignupError)> {
    const email = input.email.trim().toLowerCase();

    const verifyResult = await otpService.verify({
      email,
      purpose: 'signup_verify',
      code: input.code,
    });

    if (!verifyResult.ok) {
      return { ok: false, reason: verifyResult.reason };
    }

    // Look up the user. The OTP service stores the email lowercased, so
    // we must do the same here. We also fall through to the raw input
    // in case the user row was inserted with mixed-case (legacy path).
    let [user] = await this.db
      .select()
      .from(s.users)
      .where(eq(s.users.email, email))
      .limit(1);
    if (!user) {
      [user] = await this.db
        .select()
        .from(s.users)
        .where(eq(s.users.email, input.email))
        .limit(1);
    }
    if (!user) {
      // OTP verified but no matching user row — should not happen in
      // practice (the OTP row is created at register() time). Treat as
      // NOT_FOUND so the route returns a uniform error.
      return { ok: false, reason: 'NOT_FOUND' };
    }

    // Idempotent guard: if the user is already verified, a re-submit
    // should NOT issue a fresh JWT (use /auth/login for that).
    if (user.emailVerifiedAt !== null) {
      return { ok: false, reason: 'ALREADY_VERIFIED' };
    }

    const now = new Date();
    await this.db
      .update(s.users)
      .set({ emailVerifiedAt: now, updatedAt: now })
      .where(eq(s.users.id, user.id));

    // Resolve tenant + store the same way login() does.
    const [tenantUser] = await this.db
      .select()
      .from(s.tenantUsers)
      .where(eq(s.tenantUsers.userId, user.id))
      .limit(1);
    if (!tenantUser) {
      // No tenant — surface as NOT_FOUND (uniform, doesn't leak the
      // missing-tenant detail to the client).
      return { ok: false, reason: 'NOT_FOUND' };
    }

    const userStoreRoles = await this.db
      .select({ storeId: s.userStoreRoles.storeId })
      .from(s.userStoreRoles)
      .where(eq(s.userStoreRoles.userId, user.id));
    const allowedStoreIds = userStoreRoles.map((r) => r.storeId);

    const allStores = await this.db
      .select()
      .from(s.stores)
      .where(eq(s.stores.tenantId, tenantUser.tenantId))
      .limit(10);
    let activeStore = allStores.find((st) => allowedStoreIds.includes(st.id));
    if (!activeStore && allStores.length > 0) {
      activeStore = allStores[0];
    }

    // HAA-MERCHANT-WELCOME — Welcome email — fire-and-forget. The DB
    // row (`users.email_verified_at`) is the source of truth for
    // "this merchant is now verified"; email failure must NEVER fail
    // the verify response. Same pattern as the OTP send in register()
    // and the order emails in OrdersService.sendOrderEmail.
    void (async () => {
      try {
        const provider = pickWelcomeEmailProvider();
        if (!provider) return;
        const ctx = await this.buildWelcomeContext(user.id);
        if (!ctx) return;
        const { subject, html } = renderMerchantWelcomeEmail(ctx);
        await provider.send({ recipient: user.email, subject, body: html });
      } catch (err) {
        // Log only the kind + user id — no PII (no email, no name).
        console.error(
          '[welcome-email] kind=merchant_welcome user=' +
            user.id +
            ' err=' +
            (err instanceof Error ? err.message : 'unknown'),
        );
      }
    })();

    return {
      ok: true,
      payload: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone,
        userTokenVersion: user.tokenVersion,
        tenantId: tenantUser.tenantId,
        storeId: activeStore?.id ?? 0,
        storeName: activeStore?.name ?? null,
        storeSlug: activeStore?.slug ?? null,
        role: tenantUser.role,
      },
    };
  }

  /**
   * HAA-MERCHANT-WELCOME — Assemble the welcome-email context for a
   * freshly verified merchant. Joins users + stores + tenant to pull
   * the merchant's display name, the store's display name + slug, and
   * derives the public storefront + dashboard URLs.
   *
   * Returns `null` if the user has no resolvable tenant or store —
   * the caller treats that as "skip the email" (no throw).
   */
  private async buildWelcomeContext(
    userId: number,
  ): Promise<MerchantWelcomeContext | null> {
    const [user] = await this.db
      .select({ name: s.users.name })
      .from(s.users)
      .where(eq(s.users.id, userId))
      .limit(1);
    if (!user) return null;

    const [tenantUser] = await this.db
      .select({ tenantId: s.tenantUsers.tenantId })
      .from(s.tenantUsers)
      .where(eq(s.tenantUsers.userId, userId))
      .limit(1);
    if (!tenantUser) return null;

    const [store] = await this.db
      .select({ name: s.stores.name, slug: s.stores.slug })
      .from(s.stores)
      .where(eq(s.stores.tenantId, tenantUser.tenantId))
      .limit(1);
    if (!store) return null;

    return {
      merchantName: user.name,
      storeName: store.name,
      storeSlug: store.slug,
      storeUrl: buildStoreBaseUrl(store.slug),
      dashboardUrl: buildDashboardUrl(),
    };
  }

  /**
   * HAA-AUTH-SIGNUP-VERIFY — re-issue a signup OTP for an
   * already-registered, not-yet-verified user.
   *
   * Distinct error reasons are returned to the caller — the route is
   * responsible for collapsing NOT_FOUND / ALREADY_VERIFIED into a
   * uniform "تحقّق من البريد" response so this endpoint cannot be used
   * to enumerate existing accounts.
   */
  async resendSignupOtp(
    input: ResendSignupOtpInput,
    otpService: EmailOtpService = new EmailOtpService(this.db),
  ): Promise<
    | { ok: true; expiresAt: Date }
    | { ok: false; reason: 'NOT_FOUND' | 'ALREADY_VERIFIED' | 'RATE_LIMITED' }
  > {
    const email = input.email.trim().toLowerCase();

    let [user] = await this.db
      .select()
      .from(s.users)
      .where(eq(s.users.email, email))
      .limit(1);
    if (!user) {
      [user] = await this.db
        .select()
        .from(s.users)
        .where(eq(s.users.email, input.email))
        .limit(1);
    }

    if (!user) {
      return { ok: false, reason: 'NOT_FOUND' };
    }

    if (user.emailVerifiedAt !== null) {
      return { ok: false, reason: 'ALREADY_VERIFIED' };
    }

    const sendResult = await otpService.generateAndSend({
      email,
      purpose: 'signup_verify',
      userId: user.id,
      sourceIp: input.sourceIp ?? null,
      userAgent: input.userAgent ?? null,
    });

    if (!sendResult.ok) {
      if (sendResult.reason === 'RATE_LIMITED') {
        return { ok: false, reason: 'RATE_LIMITED' };
      }
      // Any other failure (EMAIL_SEND_FAILED / INVALID_PURPOSE) — log
      // and surface as NOT_FOUND from the caller's perspective so we
      // never reveal infrastructure state.
      console.warn(
        `[auth-flow] resendSignupOtp send failed userId=${user.id} reason=${sendResult.reason}`,
      );
      return { ok: false, reason: 'NOT_FOUND' };
    }

    return { ok: true, expiresAt: sendResult.expiresAt };
  }

  /**
   * HAA-AUTH-PASSWORD-RESET — request a password-reset OTP.
   *
   * Returns a UNIFORM `{ ok: true }` regardless of whether the
   * identifier resolves to a real user. This is the no-enumeration
   * rule: the request endpoint MUST NOT be usable as an oracle for
   * "does this account exist?". The only failure mode that propagates
   * is RATE_LIMITED, which the route maps to HTTP 429.
   *
   * Identifier resolution mirrors `login()`:
   *   - normalizeSaudiPhone(identifier) → if non-null, lookup by phone
   *   - else lowercase + lookup by email
   */
  async requestPasswordReset(
    input: {
      identifier: string;
      sourceIp?: string | null;
      userAgent?: string | null;
    },
    otpService: EmailOtpService = new EmailOtpService(this.db),
  ): Promise<{ ok: true } | { ok: false; reason: 'RATE_LIMITED' }> {
    const rawIdentifier = input.identifier.trim();
    if (rawIdentifier.length === 0) {
      // Empty identifier — same uniform response as the unknown-user
      // path, to keep this endpoint a non-oracle.
      return { ok: true };
    }

    // Phone-first resolution (matches login()).
    const normalizedPhone = normalizeSaudiPhone(rawIdentifier);
    let user: typeof s.users.$inferSelect | undefined;
    if (normalizedPhone !== null) {
      [user] = await this.db
        .select()
        .from(s.users)
        .where(eq(s.users.phone, normalizedPhone))
        .limit(1);
    } else {
      const emailLookup = rawIdentifier.toLowerCase();
      [user] = await this.db
        .select()
        .from(s.users)
        .where(eq(s.users.email, emailLookup))
        .limit(1);
      // Legacy mixed-case email fallback (same as login()).
      if (!user) {
        [user] = await this.db
          .select()
          .from(s.users)
          .where(eq(s.users.email, rawIdentifier))
          .limit(1);
      }
    }

    if (!user) {
      // No-enumeration: return uniform `ok: true`. We do NOT surface
      // NOT_FOUND on the request path — the only allowed failure is
      // RATE_LIMITED, which is enforced below.
      return { ok: true };
    }

    const sendResult = await otpService.generateAndSend({
      email: user.email,
      purpose: 'password_reset',
      userId: user.id,
      sourceIp: input.sourceIp ?? null,
      userAgent: input.userAgent ?? null,
    });

    if (!sendResult.ok) {
      if (sendResult.reason === 'RATE_LIMITED') {
        return { ok: false, reason: 'RATE_LIMITED' };
      }
      // Other failure modes (EMAIL_SEND_FAILED / INVALID_PURPOSE) are
      // logged for ops forensics but reported to the caller as success
      // — surfacing infra state would let an attacker probe delivery
      // and infer account existence. The OTP row was created (logged
      // in the database) so ops can correlate.
      console.warn(
        `[auth-flow] requestPasswordReset send failed userId=${user.id} reason=${sendResult.reason}`,
      );
      return { ok: true };
    }

    return { ok: true };
  }

  /**
   * HAA-AUTH-PASSWORD-RESET — confirm a password reset.
   *
   * Verifies the OTP, hashes the new password, rotates the user row's
   * `password_hash`, bumps `token_version` (invalidating every JWT
   * minted before this point), writes an audit log, and returns a
   * fresh JWT payload the route can sign.
   *
   * NOT_FOUND IS DELIBERATELY EXPOSED on this path — once the user has
   * the OTP code in hand, the enumeration tradeoff has already been
   * paid (and the request endpoint never returned it). This is the
   * standard pattern for OTP-confirm endpoints.
   */
  async confirmPasswordReset(
    input: {
      identifier: string;
      code: string;
      newPassword: string;
      sourceIp?: string | null;
      userAgent?: string | null;
    },
    otpService: EmailOtpService = new EmailOtpService(this.db),
    audit: AuditLogService = new AuditLogService(),
  ): Promise<
    | { ok: true; payload: VerifySignupPayload }
    | {
        ok: false;
        reason:
          | 'INVALID_CODE'
          | 'EXPIRED'
          | 'NOT_FOUND'
          | 'TOO_MANY_ATTEMPTS'
          | 'USED'
          | 'WEAK_PASSWORD';
      }
  > {
    // 1. Validate password strength FIRST so we don't waste an OTP
    //    attempt on a malformed payload. Mirrors the route's zod schema
    //    (min 8) — defense-in-depth in case the service is invoked
    //    directly from a non-HTTP caller (tests, scripts).
    if (typeof input.newPassword !== 'string' || input.newPassword.length < 8) {
      return { ok: false, reason: 'WEAK_PASSWORD' };
    }

    const rawIdentifier = input.identifier.trim();
    if (rawIdentifier.length === 0) {
      return { ok: false, reason: 'NOT_FOUND' };
    }

    // 2. Identifier resolution — same as requestPasswordReset / login.
    const normalizedPhone = normalizeSaudiPhone(rawIdentifier);
    let user: typeof s.users.$inferSelect | undefined;
    if (normalizedPhone !== null) {
      [user] = await this.db
        .select()
        .from(s.users)
        .where(eq(s.users.phone, normalizedPhone))
        .limit(1);
    } else {
      const emailLookup = rawIdentifier.toLowerCase();
      [user] = await this.db
        .select()
        .from(s.users)
        .where(eq(s.users.email, emailLookup))
        .limit(1);
      if (!user) {
        [user] = await this.db
          .select()
          .from(s.users)
          .where(eq(s.users.email, rawIdentifier))
          .limit(1);
      }
    }

    if (!user) {
      return { ok: false, reason: 'NOT_FOUND' };
    }

    // 3. Verify the OTP. The EmailOtpService stores email lowercased,
    //    so we feed it the canonical email from the user row.
    const verifyResult = await otpService.verify({
      email: user.email,
      purpose: 'password_reset',
      code: input.code,
    });

    if (!verifyResult.ok) {
      return { ok: false, reason: verifyResult.reason };
    }

    // 4. Rotate password + bump tokenVersion in a single transaction.
    //    Bumping tokenVersion is what makes EVERY existing JWT issued
    //    before this point immediately invalid — that's the whole
    //    point of password reset (assume the old credential was
    //    compromised and revoke all live sessions).
    const passwordHash = await hashPassword(input.newPassword);
    const now = new Date();
    await this.db.transaction(async (tx) => {
      await tx
        .update(s.users)
        .set({
          passwordHash,
          tokenVersion: sql`${s.users.tokenVersion} + 1`,
          updatedAt: now,
        })
        .where(eq(s.users.id, user.id));
    });

    // 5. Audit. The plaintext password is NEVER recorded; we only log
    //    the action + entity. ipAddress / userAgent come from the route.
    await audit.record({
      actorUserId: user.id,
      action: 'password_reset_completed',
      entityType: 'user',
      entityId: user.id,
      ipAddress: input.sourceIp ?? null,
      userAgent: input.userAgent ?? null,
    });

    // 6. Re-read the user to pick up the bumped tokenVersion so the
    //    JWT we mint right after this carries the NEW version (older
    //    JWTs minted with the previous version are now invalid).
    const [refreshed] = await this.db
      .select()
      .from(s.users)
      .where(eq(s.users.id, user.id))
      .limit(1);
    const verifiedUser = refreshed ?? user;

    // 7. Resolve tenant + active store the same way login() does so
    //    the route can mint a JWT with the right tenant/store context.
    const [tenantUser] = await this.db
      .select()
      .from(s.tenantUsers)
      .where(eq(s.tenantUsers.userId, verifiedUser.id))
      .limit(1);
    if (!tenantUser) {
      // User reset password but has no tenant — surface as NOT_FOUND
      // rather than minting a useless JWT.
      return { ok: false, reason: 'NOT_FOUND' };
    }

    const userStoreRoles = await this.db
      .select({ storeId: s.userStoreRoles.storeId })
      .from(s.userStoreRoles)
      .where(eq(s.userStoreRoles.userId, verifiedUser.id));
    const allowedStoreIds = userStoreRoles.map((r) => r.storeId);

    const allStores = await this.db
      .select()
      .from(s.stores)
      .where(eq(s.stores.tenantId, tenantUser.tenantId))
      .limit(10);
    let activeStore = allStores.find((st) => allowedStoreIds.includes(st.id));
    if (!activeStore && allStores.length > 0) {
      activeStore = allStores[0];
    }

    return {
      ok: true,
      payload: {
        userId: verifiedUser.id,
        userName: verifiedUser.name,
        userEmail: verifiedUser.email,
        userPhone: verifiedUser.phone,
        userTokenVersion: verifiedUser.tokenVersion,
        tenantId: tenantUser.tenantId,
        storeId: activeStore?.id ?? 0,
        storeName: activeStore?.name ?? null,
        storeSlug: activeStore?.slug ?? null,
        role: tenantUser.role,
      },
    };
  }

  /**
   * Find or create a user from an OAuth provider (Google, Apple, etc.).
   * Returns LoginPayload on success (same shape as password login).
   * Returns LoginError if the account cannot be resolved.
   */
  async loginOrRegisterWithOAuth(input: {
    provider: 'google' | 'apple';
    providerId: string;
    email: string;
    name: string;
  }): Promise<LoginPayload | LoginError> {
    // Look up existing user by email
    const [existingUser] = await this.db
      .select()
      .from(s.users)
      .where(eq(s.users.email, input.email))
      .limit(1);

    let userId: number;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Auto-register: create user + tenant + store scaffold
      const randomSlug = `store-${input.providerId.slice(0, 8)}-${Math.random().toString(36).slice(2, 6)}`;
      const registerResult = await this.register({
        name: input.name,
        email: input.email,
        password: `oauth:${input.provider}:${input.providerId}`,
        storeName: `${input.name}'s Store`,
        storeSlug: randomSlug,
      });

      if ('kind' in registerResult) {
        return { kind: 'invalid_credentials', message: registerResult.message };
      }
      userId = registerResult.userId;

      // HAA-AUTH-SIGNUP-VERIFY — OAuth providers vouch for the email
      // out-of-band (Google/Apple already verified it). Mark the user
      // verified immediately so the email-not-verified guard in login()
      // doesn't trip on the next provider sign-in.
      await this.db
        .update(s.users)
        .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(s.users.id, userId));
    }

    // Resolve tenant + store
    const [tenantUser] = await this.db
      .select()
      .from(s.tenantUsers)
      .where(eq(s.tenantUsers.userId, userId))
      .limit(1);

    if (!tenantUser) return { kind: 'no_tenant', message: 'No tenant found for user' };

    const [store] = await this.db
      .select()
      .from(s.stores)
      .where(eq(s.stores.tenantId, tenantUser.tenantId))
      .limit(1);

    const [user] = await this.db.select().from(s.users).where(eq(s.users.id, userId)).limit(1);

    return {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userPhone: user.phone ?? null,
      userTokenVersion: user.tokenVersion,
      tenantId: tenantUser.tenantId,
      storeId: store?.id ?? 0,
      storeName: store?.name ?? null,
      storeSlug: store?.slug ?? null,
      role: tenantUser.role,
    };
  }
}

/** Shared default instance for ad-hoc callers (most code uses DI). */
export const authFlowService = new AuthFlowService();

