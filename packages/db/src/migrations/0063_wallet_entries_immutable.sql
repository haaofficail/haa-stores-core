-- Financial Integrity (Batch 2) — make wallet_entries an append-only ledger.
--
-- wallet_entries is the financial source of truth. Historical entries must be
-- immutable: corrections happen via a NEW reversal/adjustment entry, never by
-- editing or deleting a past row.
--
-- Today nothing at the DB level stops an UPDATE of `amount` or a DELETE. The
-- only legitimate mutation in the whole codebase is the status transition
-- pending -> available (WalletLedger.markPaymentReconciled), so the trigger
-- allows ONLY the `status` column to change and blocks everything else, plus
-- all DELETEs.
--
-- Idempotent: CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS before create.
-- Rollback: DROP TRIGGER ... ; DROP FUNCTION wallet_entries_prevent_mutation();
-- (no data loss — structural only).

CREATE OR REPLACE FUNCTION "wallet_entries_prevent_mutation"()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'wallet_entries is append-only: DELETE is not allowed (use a reversal entry)';
  END IF;

  -- UPDATE: every column except `status` must be unchanged.
  IF ROW(
      NEW.id, NEW.store_id, NEW.wallet_account_id, NEW.type, NEW.direction,
      NEW.amount, NEW.balance_before, NEW.balance_after, NEW.reference_type,
      NEW.reference_id, NEW.description, NEW.metadata, NEW.created_at,
      NEW.fee_rate_pct, NEW.fee_fixed, NEW.fee_source
    ) IS DISTINCT FROM ROW(
      OLD.id, OLD.store_id, OLD.wallet_account_id, OLD.type, OLD.direction,
      OLD.amount, OLD.balance_before, OLD.balance_after, OLD.reference_type,
      OLD.reference_id, OLD.description, OLD.metadata, OLD.created_at,
      OLD.fee_rate_pct, OLD.fee_fixed, OLD.fee_source
    )
  THEN
    RAISE EXCEPTION 'wallet_entries is append-only: only the status column may change (immutable financial record)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "wallet_entries_no_update" ON "wallet_entries";
CREATE TRIGGER "wallet_entries_no_update"
  BEFORE UPDATE ON "wallet_entries"
  FOR EACH ROW EXECUTE FUNCTION "wallet_entries_prevent_mutation"();

DROP TRIGGER IF EXISTS "wallet_entries_no_delete" ON "wallet_entries";
CREATE TRIGGER "wallet_entries_no_delete"
  BEFORE DELETE ON "wallet_entries"
  FOR EACH ROW EXECUTE FUNCTION "wallet_entries_prevent_mutation"();
