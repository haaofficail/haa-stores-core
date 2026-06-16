-- Add fee-snapshot fields to wallet_entries
-- These fields capture the rate and fixed amount that produced each fee entry
-- so historical fee entries remain traceable even when the store's billing
-- policy changes later.
--
-- Idempotent: safe to re-run.

ALTER TABLE "wallet_entries" ADD COLUMN IF NOT EXISTS "fee_rate_pct" numeric(8, 6);
ALTER TABLE "wallet_entries" ADD COLUMN IF NOT EXISTS "fee_fixed" numeric(12, 2);
ALTER TABLE "wallet_entries" ADD COLUMN IF NOT EXISTS "fee_source" varchar(30);
