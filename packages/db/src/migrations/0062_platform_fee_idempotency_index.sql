-- Financial Integrity (Batch 2) — DB-level idempotency for platform fees.
--
-- A platform_fee is the platform's cut of an order. There must be AT MOST ONE
-- per (store, order). Until now this was enforced only in application code
-- (WalletLedger.hasPlatformFeeForOrder + a check-then-insert), which has a
-- TOCTOU race window under webhook replay / concurrency.
--
-- This partial UNIQUE index moves the guarantee into the database, so a
-- duplicate is impossible regardless of races. It is intentionally NARROW:
-- it only covers type = 'platform_fee' AND reference_type = 'order', so it
-- never restricts sale / refund / payout / reversal / adjustment entries
-- (which may legitimately repeat for the same order, e.g. partial refunds).
--
-- Verified clean before creation: 0 duplicate (store_id, reference_id) groups
-- for platform_fee/order in the live DB. Idempotent: safe to re-run.
-- Rollback: DROP INDEX wallet_entries_platform_fee_order_uniq; (no data loss).

CREATE UNIQUE INDEX IF NOT EXISTS "wallet_entries_platform_fee_order_uniq"
ON "wallet_entries" ("store_id", "reference_id")
WHERE type = 'platform_fee' AND reference_type = 'order';
