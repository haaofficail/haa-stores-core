import { eq, sql } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { hashPassword, verifyPassword } from '@haa/auth-core';
import { AuditLogService } from '@haa/integration-core';

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
  | { kind: 'slug_taken'; message: string };

export interface LoginInput {
  email: string;
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
    return this.db.transaction(async (tx) => {
      const existingUser = await tx
        .select()
        .from(s.users)
        .where(eq(s.users.email, input.email))
        .limit(1);
      if (existingUser.length > 0) {
        return { kind: 'email_taken', message: 'Email already registered' } as const;
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
          phone: input.phone,
        })
        .returning();

      const [tenant] = await tx
        .insert(s.tenants)
        .values({
          name: input.storeName,
          slug: input.storeSlug,
          email: input.email,
          phone: input.phone,
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
          phone: input.phone,
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
    const { email, password, ipAddress, userAgent } = input;

    const [user] = await this.db
      .select()
      .from(s.users)
      .where(eq(s.users.email, email))
      .limit(1);
    if (!user) {
      await audit.record({
        action: 'failed_login',
        entityType: 'user',
        ipAddress,
        userAgent,
      });
      return { kind: 'invalid_credentials', message: 'Invalid email or password' };
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
      return { kind: 'invalid_credentials', message: 'Invalid email or password' };
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
}

/** Shared default instance for ad-hoc callers (most code uses DI). */
export const authFlowService = new AuthFlowService();

