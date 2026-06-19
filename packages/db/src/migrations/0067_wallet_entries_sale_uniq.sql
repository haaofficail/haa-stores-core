-- Financial Integrity (Batch 2b) — DB-level idempotency for sale entries.
--
-- Complements 0062_platform_fee_idempotency_index.sql which already covers
-- platform_fee entries. This migration extends the same guarantee to `sale`
-- entries: at most ONE sale credit per (store, order) pair.
--
-- Why narrow partial index instead of full unique:
--   - refund / adjustment entries may legitimately repeat for the same order
--     (e.g. partial refunds of different amounts)
--   - payout entries are not order-scoped
--   - Only `sale` and `platform_fee` (covered by 0062) are truly 1-per-order
--
-- Verified safe: no existing duplicate (store_id, reference_id) groups for
-- type='sale' AND reference_type='order'. Idempotent: IF NOT EXISTS guard.
-- Rollback: DROP INDEX wallet_entries_sale_order_uniq; (no data loss).

CREATE UNIQUE INDEX IF NOT EXISTS "wallet_entries_sale_order_uniq"
ON "wallet_entries" ("store_id", "reference_id")
WHERE type = 'sale' AND reference_type = 'order';
