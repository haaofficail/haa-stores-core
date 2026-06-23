-- PROBLEM-015: ZATCA invoice hash chain (tamper-evidence for Phase 2).
--
-- Each invoice generated for a store gets one row here. Each row's
-- `previous_hash` matches the `current_hash` of the prior row for the
-- same store, forming an append-only chain. The UNIQUE constraint on
-- (store_id, previous_hash) makes a fork impossible at the DB level.
--
-- This migration is idempotent (IF NOT EXISTS) so re-running it is
-- safe in environments where it's already been applied manually.
--
-- NOTE: per owner directive (2026-06-23), this migration MUST be run
-- via the ops-staging-migrate workflow with explicit owner approval.
-- Not auto-applied.

CREATE TABLE IF NOT EXISTS "zatca_invoice_chain" (
    "id" serial PRIMARY KEY NOT NULL,
    "store_id" integer NOT NULL,
    "order_id" integer,
    "invoice_uuid" char(36) NOT NULL,
    "invoice_number" varchar(80) NOT NULL,
    "previous_hash" char(64) NOT NULL,
    "current_hash" char(64) NOT NULL,
    "xml_hash" char(64) NOT NULL,
    "sequence" integer NOT NULL,
    "issued_at" timestamp with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
    ALTER TABLE "zatca_invoice_chain"
        ADD CONSTRAINT "zatca_invoice_chain_store_id_stores_id_fk"
        FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "zatca_chain_invoice_uuid_uq"
    ON "zatca_invoice_chain" ("invoice_uuid");

-- The fork-prevention constraint. Two concurrent inserts for the same
-- store CANNOT both succeed with the same previous_hash — the loser
-- gets a unique_violation (errcode 23505) and must retry against the
-- new head. Application code wraps the insert in SELECT ... FOR UPDATE
-- on the chain head to serialize ahead of this constraint.
CREATE UNIQUE INDEX IF NOT EXISTS "zatca_chain_store_previous_uq"
    ON "zatca_invoice_chain" ("store_id", "previous_hash");

CREATE INDEX IF NOT EXISTS "zatca_chain_store_seq_idx"
    ON "zatca_invoice_chain" ("store_id", "sequence");
