-- Configurable Platform Fee Policy — store-level billing settings
-- Each store has exactly one row that owns its platform-fee mode, percentages,
-- and audit fields. The policy is read at order creation and snapshotted into
-- the platform_fee wallet entry (idempotency key prevents double-charge).
--
-- Idempotent: safe to re-run.
-- Backward compatible: any existing store without a row gets a default
-- percentage / 0.02 (2%) policy so the checkout path stays consistent.

CREATE TABLE IF NOT EXISTS "store_billing_settings" (
  "id" serial PRIMARY KEY,
  "store_id" integer NOT NULL REFERENCES "stores"("id"),
  "platform_fee_mode" varchar(30) NOT NULL DEFAULT 'percentage',
  "platform_fee_pct" numeric(8, 6),
  "platform_fee_fixed" numeric(12, 2),
  "is_platform_fee_enabled" boolean NOT NULL DEFAULT true,
  "effective_from" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "updated_by" integer REFERENCES "users"("id"),
  "change_reason" text,
  CONSTRAINT "store_billing_settings_store_id_unique" UNIQUE ("store_id")
);

-- Default seed: every existing store gets a 2% percentage policy.
-- Uses ON CONFLICT DO NOTHING so re-running is safe.
INSERT INTO "store_billing_settings" (
  "store_id",
  "platform_fee_mode",
  "platform_fee_pct",
  "platform_fee_fixed",
  "is_platform_fee_enabled",
  "change_reason"
)
SELECT
  s."id",
  'percentage',
  0.02,
  0,
  true,
  'Default Haa platform fee (seeded by migration 0050)'
FROM "stores" s
WHERE NOT EXISTS (
  SELECT 1 FROM "store_billing_settings" b WHERE b."store_id" = s."id"
);
