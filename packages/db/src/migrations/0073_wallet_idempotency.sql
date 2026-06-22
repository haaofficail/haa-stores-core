-- Wallet posting idempotency — DECISION-OS-018.
--
-- Adds 7 partial unique indexes to wallet_entries mirroring the existing
-- platform_fee pattern (introduced in migration 0062). Closes F-QA-C-001.
--
-- DB-level idempotency for the previously in-memory dedup types:
--   - sale                (order)
--   - cod_fee             (order)
--   - refund              (refund)
--   - gateway_fee         (order)
--   - payout_debit        (payout)
--   - payout_reversal     (payout)
--   - settlement_difference (adjustment)
--
-- These partial indexes prevent concurrent webhook replay from double-
-- crediting or double-debiting a wallet entry. WalletPostingService writes
-- with onConflictDoNothing + return-existing semantics so balance is moved
-- exactly once per (storeId, referenceType, referenceId, type).
--
-- This migration is ADDITIVE. Rollback drops the indexes; existing rows are
-- not touched.
--
-- NOTE: This file was hand-authored to bypass an unrelated drizzle-kit
-- snapshot-meta issue (CURRENT_STATE notes the Drizzle snapshot chain was
-- previously rebuilt via scripts/build-snapshots.cjs). The SQL matches the
-- shape documented in docs/agent-os/WALLET_IDEMPOTENCY_PLAN.md and the
-- existing 0062 partial unique index for platform_fee.
--
-- DO NOT RUN AUTOMATICALLY (DECISION-OS-016). Apply manually:
--     pnpm db:migrate
-- after explicit owner approval against the target environment.

CREATE UNIQUE INDEX IF NOT EXISTS "wallet_entries_sale_uniq"
  ON "wallet_entries" ("store_id", "reference_id")
  WHERE "type" = 'sale' AND "reference_type" = 'order';
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "wallet_entries_cod_fee_uniq"
  ON "wallet_entries" ("store_id", "reference_id")
  WHERE "type" = 'cod_fee' AND "reference_type" = 'order';
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "wallet_entries_refund_uniq"
  ON "wallet_entries" ("store_id", "reference_id")
  WHERE "type" = 'refund' AND "reference_type" = 'refund';
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "wallet_entries_gateway_fee_uniq"
  ON "wallet_entries" ("store_id", "reference_id")
  WHERE "type" = 'gateway_fee' AND "reference_type" = 'order';
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "wallet_entries_payout_debit_uniq"
  ON "wallet_entries" ("store_id", "reference_id")
  WHERE "type" = 'payout_debit' AND "reference_type" = 'payout';
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "wallet_entries_payout_reversal_uniq"
  ON "wallet_entries" ("store_id", "reference_id")
  WHERE "type" = 'payout_reversal' AND "reference_type" = 'payout';
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "wallet_entries_settlement_diff_uniq"
  ON "wallet_entries" ("store_id", "reference_id")
  WHERE "type" = 'settlement_difference' AND "reference_type" = 'adjustment';
