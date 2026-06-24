-- Phase 1 — gate signup completion on email OTP verification.
-- New `email_verified_at` timestamp is NULL on register and becomes
-- non-NULL on successful OTP verify. The auth service blocks login
-- when this is NULL (legacy users are migrated to verified=now()
-- via a one-shot owner script, NOT this migration — preserves the
-- "no auto-migrate" rule).
--
-- NOT auto-applied. Run via ops-staging-migrate workflow.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified_at" timestamp;
