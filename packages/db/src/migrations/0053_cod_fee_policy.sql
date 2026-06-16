-- Per-store COD (Cash on Delivery) fee policy.
--
-- TASK-0032 (Phase 9 of the Financial Wallet Accuracy remediation):
-- the COD fee was hardcoded at `* 0.02` in `orders.ts:321`. This migration
-- adds the policy columns so the call site can read the per-store policy
-- and snapshot it onto the `cod_fee` wallet entry.
--
-- Default values preserve the existing 2% behavior for every merchant
-- who has a `store_billing_settings` row already — no business behavior
-- changes at migration time.
--
-- Defense-in-depth CHECK constraint mirrors the platform-fee cap (50%);
-- see migration 0052 for the same pattern on `platform_fee_pct`.
--
-- Idempotent: uses `ADD COLUMN IF NOT EXISTS` and conditional
-- constraint creation. Safe to re-run.

ALTER TABLE "store_billing_settings"
  ADD COLUMN IF NOT EXISTS "cod_fee_mode" varchar(30) NOT NULL DEFAULT 'percentage';

ALTER TABLE "store_billing_settings"
  ADD COLUMN IF NOT EXISTS "cod_fee_pct" numeric(8, 6);

ALTER TABLE "store_billing_settings"
  ADD COLUMN IF NOT EXISTS "cod_fee_fixed" numeric(12, 2);

ALTER TABLE "store_billing_settings"
  ADD COLUMN IF NOT EXISTS "is_cod_fee_enabled" boolean NOT NULL DEFAULT true;

-- Defense-in-depth: even if the application-layer validation is bypassed
-- (e.g. by a future code regression or direct DB write), the DB itself
-- refuses to store a cod_fee_pct > 0.5. Mirrors `store_billing_settings_pct_cap`.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'store_billing_settings_cod_pct_cap'
      AND conrelid = 'store_billing_settings'::regclass
  ) THEN
    ALTER TABLE "store_billing_settings"
      ADD CONSTRAINT "store_billing_settings_cod_pct_cap"
      CHECK ("cod_fee_pct" IS NULL OR "cod_fee_pct" <= 0.5);
  END IF;
END$$;
