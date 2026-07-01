import { pgTable, serial, varchar, timestamp, boolean, integer, text, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  isActive: boolean('is_active').notNull().default(true),
  isAdmin: boolean('is_admin').notNull().default(false),
  // Platform admin role (only consulted when isAdmin = true). Defaults to
  // 'super_admin' so every pre-existing admin keeps full `admin:*` access and
  // the platform is never locked out by this change. 'accountant' is a
  // finance-scoped role (see ADMIN_ROLE_PERMISSIONS in @haa/shared).
  adminRole: varchar('admin_role', { length: 32 }).notNull().default('super_admin'),
  tokenVersion: integer('token_version').notNull().default(0),
  adminTotpSecretEncrypted: text('admin_totp_secret_encrypted'),
  adminTotpPendingSecretEncrypted: text('admin_totp_pending_secret_encrypted'),
  adminTotpPendingCreatedAt: timestamp('admin_totp_pending_created_at'),
  adminTotpEnabledAt: timestamp('admin_totp_enabled_at'),
  lastLoginAt: timestamp('last_login_at'),
  // HAA-AUTH-SIGNUP-VERIFY — non-null when the user has completed the
  // signup_verify OTP flow (PR #162 infra + this PR). Login is blocked
  // when this is NULL unless the AUTH_LEGACY_VERIFIED env flag is set,
  // which gives staging time to backfill pre-existing accounts via a
  // one-shot owner script.
  emailVerifiedAt: timestamp('email_verified_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // DB drift fix: these two indexes already exist in migrations
  // 0080_users_phone_unique.sql and 0090_admin_totp.sql (both owner-gated,
  // "not auto-applied") and were present in the drizzle-kit snapshot chain,
  // but were never declared here — meaning a future `drizzle-kit generate`
  // would have proposed DROPPING them. Declaring them keeps schema.ts in
  // sync with the migration chain's intended end-state.
  phoneUnique: uniqueIndex('users_phone_unique').on(table.phone).where(sql`phone IS NOT NULL`),
  adminTotpEnabledIdx: index('users_admin_totp_enabled_idx').on(table.id).where(sql`admin_totp_enabled_at IS NOT NULL`),
}));
