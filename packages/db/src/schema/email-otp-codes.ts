import { pgTable, serial, varchar, text, integer, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * Email OTP codes — short-lived (10 min) one-time codes delivered via
 * the platform's SMTP/Resend email path. Used for three flows:
 *
 *   - `signup_verify`  — verify the email of a freshly-created account
 *                        (the row may exist BEFORE the user row; userId
 *                        is nullable for this reason).
 *   - `magic_login`    — passwordless login via emailed code.
 *   - `password_reset` — confirm ownership of the address before
 *                        resetting the password.
 *
 * Stored as bcrypt(`code`) — never store the plaintext code. Re-use is
 * refused: once `usedAt` is set, the code is dead. `attempts` is
 * incremented on every verify call (success or failure), and the row
 * is locked out once `attempts >= maxAttempts`.
 *
 * Indexes:
 *   - (email, purpose, created_at desc) — "latest unused code for this
 *     email + purpose" lookup. Most frequent query.
 *   - (email, created_at) — rate-limit / abuse window scans.
 *   - (expires_at) — cleanup job target (a follow-up; not built here).
 */
export const emailOtpCodes = pgTable('email_otp_codes', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  purpose: varchar('purpose', { length: 30 }).notNull(),
  codeHash: text('code_hash').notNull(),
  userId: integer('user_id'),
  expiresAt: timestamp('expires_at').notNull(),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(5),
  usedAt: timestamp('used_at'),
  sourceIp: varchar('source_ip', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  emailPurposeCreatedAtIdx: index('email_otp_codes_email_purpose_created_at_idx')
    .on(t.email, t.purpose, t.createdAt.desc()),
  emailCreatedAtIdx: index('email_otp_codes_email_created_at_idx')
    .on(t.email, t.createdAt),
  expiresAtIdx: index('email_otp_codes_expires_at_idx').on(t.expiresAt),
}));

export const EMAIL_OTP_PURPOSES = ['signup_verify', 'magic_login', 'password_reset'] as const;
export type EmailOtpPurpose = (typeof EMAIL_OTP_PURPOSES)[number];
