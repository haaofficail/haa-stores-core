import { eq, sql } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { hashPassword, verifyPassword } from '@haa/auth-core';
import { AuditLogService } from '@haa/integration-core';
import { normalizeSaudiPhone } from '@haa/shared';

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
  | { kind: 'no_tenant'; message: string };

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

    return this.db.transaction(async (tx) => {
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
      } as const;
    });
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

