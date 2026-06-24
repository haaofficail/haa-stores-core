-- Phase 1 close-out — backfill `email_verified_at` for legacy users.
--
-- The 0081 migration introduced `users.email_verified_at` NULL-by-
-- default. Every fresh signup since 0081 fills it in via OTP verify.
-- But every user who existed BEFORE 0081 still has NULL — and the
-- auth service blocks login when this is NULL unless the transitional
-- `AUTH_LEGACY_VERIFIED=1` env flag is set.
--
-- This one-shot UPDATE marks those legacy rows as verified, anchoring
-- the verify timestamp to the row's `created_at` so audit trails reflect
-- that the account predates the verification system. After this runs
-- successfully on each environment, the operator flips
-- `AUTH_LEGACY_VERIFIED=0` (via ops-staging-env workflow), closing the
-- transitional bypass forever.
--
-- Idempotent: the WHERE clause filters to NULL rows, so re-running is a
-- no-op. Forward-only: no DROP, no RENAME, no destructive side effects.
--
-- NOT auto-applied. Run via ops-staging-migrate workflow.

UPDATE "users"
SET "email_verified_at" = "created_at",
    "updated_at" = NOW()
WHERE "email_verified_at" IS NULL;
