-- Harden transfer receipts (Batch 4B).
--
-- A receipt is a financial document, so we record its content type and a
-- sha256 of the file bytes (tamper detection / audit), and enforce AT MOST ONE
-- active receipt per payout to prevent a double receipt.
--
-- The partial-unique index excludes rows marked 'superseded' so a future
-- receipt_correction path (deferred) can replace a receipt without violating
-- the constraint.
--
-- Owner action: NOT applied automatically (no auto-migrate policy). Apply with
-- `pnpm db:migrate` against the target database.
ALTER TABLE "payout_transfer_proofs" ADD COLUMN "file_mime_type" varchar(100);
ALTER TABLE "payout_transfer_proofs" ADD COLUMN "sha256" varchar(64);
CREATE UNIQUE INDEX "payout_transfer_proofs_active_unique"
  ON "payout_transfer_proofs" ("payout_request_id")
  WHERE verification_status <> 'superseded';
