-- P1-3 audit fix — additive columns to enable encrypting compliance PII
-- (bank IBAN, national ID / Iqama) at rest. Mirrors the
-- encrypted_payload + key_version pattern already in production for
-- merchant_payment_provider_credentials.
--
-- SCOPE OF THIS MIGRATION: schema only. It does NOT:
--   - backfill existing plaintext iban / national_id_or_iqama values
--   - change any read/write path (app code still uses the plaintext
--     columns unchanged)
--   - drop the plaintext columns
--
-- Both are nullable and unused until an owner-approved follow-up lands
-- that decides:
--   1. Key strategy — reuse PAYMENT_CREDENTIALS_ENCRYPTION_KEY (AES-256-GCM,
--      packages/commerce-core/src/encryption.ts) or a dedicated
--      compliance-scoped key for blast-radius isolation.
--   2. Backfill approach — one-shot owner script vs lazy re-encrypt on
--      next write.
--   3. When to drop the plaintext columns (after backfill is verified).
--
-- NOT auto-applied. Owner runs via the ops-staging-migrate workflow
-- after reviewing the key-management decision above (AGENTS.md §14.7 —
-- db:migrate execution is owner-only; this file is generated, not run).

ALTER TABLE "kyc_profiles"
  ADD COLUMN IF NOT EXISTS "national_id_encrypted" text,
  ADD COLUMN IF NOT EXISTS "national_id_key_version" varchar(20);

ALTER TABLE "merchant_bank_accounts"
  ADD COLUMN IF NOT EXISTS "iban_encrypted" text,
  ADD COLUMN IF NOT EXISTS "iban_key_version" varchar(20);
