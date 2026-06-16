-- Hard cap on platform_fee_pct (50%).
--
-- Defense-in-depth: even if the application-layer validation is bypassed
-- (e.g. by a future code regression or direct DB write), the DB itself
-- refuses to store a platform_fee_pct > 0.5. This protects merchants
-- from an admin error that would zero out their wallet.
--
-- Idempotent: drops the existing constraint if it exists, then
-- re-adds it. Safe to re-run.
--
-- Scope: ONLY store_billing_settings. Other fee-bearing tables
-- (wallet_entries, etc.) are out of scope for this migration.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'store_billing_settings_pct_cap'
      AND conrelid = 'store_billing_settings'::regclass
  ) THEN
    ALTER TABLE "store_billing_settings" DROP CONSTRAINT "store_billing_settings_pct_cap";
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'store_billing_settings_pct_cap'
      AND conrelid = 'store_billing_settings'::regclass
  ) THEN
    ALTER TABLE "store_billing_settings"
      ADD CONSTRAINT "store_billing_settings_pct_cap"
      CHECK ("platform_fee_pct" IS NULL OR "platform_fee_pct" <= 0.5);
  END IF;
END$$;
