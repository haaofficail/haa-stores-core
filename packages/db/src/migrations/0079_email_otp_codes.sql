-- HAA-AUTH-OTP-001: Create email_otp_codes table.
--
-- Short-lived (10 min) one-time codes delivered by email, used for three
-- authentication flows: signup_verify, magic_login, password_reset.
--
-- Lifecycle:
--   1. `generateAndSend` inserts a row with bcrypt(`code`), expiresAt =
--      now() + 10 min, attempts = 0, usedAt = NULL.
--   2. `verify` finds the latest unused row for (email, purpose),
--      increments attempts, then bcrypt.compare's the submitted code.
--      On success it stamps usedAt; the row is never reusable again.
--   3. Codes expire after 10 minutes (attempts >= maxAttempts also locks
--      the row out). A cleanup job that purges expired rows is an
--      OWNER-FOLLOWUP — not part of this migration. Until that runs,
--      expired rows are harmless because `verify` rejects them.
--
-- Indexes:
--   - (email, purpose, created_at DESC) — main lookup for "latest unused
--     code for this email+purpose".
--   - (email, created_at)               — rate-limit / abuse window scans.
--   - (expires_at)                      — for the eventual cleanup job.
--
-- This migration is idempotent (IF NOT EXISTS everywhere). It is NOT
-- auto-applied by deploy. Per owner directive, run it manually via the
-- ops-staging-migrate workflow.

CREATE TABLE IF NOT EXISTS "email_otp_codes" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" varchar(255) NOT NULL,
  "purpose" varchar(30) NOT NULL,
  "code_hash" text NOT NULL,
  "user_id" integer,
  "expires_at" timestamp NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 5 NOT NULL,
  "used_at" timestamp,
  "source_ip" varchar(45),
  "user_agent" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "email_otp_codes_email_purpose_created_at_idx"
  ON "email_otp_codes" ("email", "purpose", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "email_otp_codes_email_created_at_idx"
  ON "email_otp_codes" ("email", "created_at");

CREATE INDEX IF NOT EXISTS "email_otp_codes_expires_at_idx"
  ON "email_otp_codes" ("expires_at");
