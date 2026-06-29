import { pgTable, serial, varchar, timestamp, boolean, integer, text } from 'drizzle-orm/pg-core';

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
});
