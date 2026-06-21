-- Loyalty points (QA Loyalty) — per-store settings, per-customer accounts, ledger.
--
-- Mirrors the wallet ledger pattern: every balance change is an immutable
-- transaction row with balance_before/balance_after. Points are integers.
--
-- Idempotency: a partial unique index guarantees at most ONE earn transaction
-- per (store, order). Redeem/expire/adjust may legitimately repeat, so the
-- index is narrowed to type='earn' AND reference_type='order' — same approach
-- as wallet_entries_sale_order_uniq (0067).

CREATE TABLE IF NOT EXISTS "loyalty_settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "store_id" integer NOT NULL REFERENCES "stores"("id") ON DELETE cascade,
  "enabled" boolean DEFAULT false NOT NULL,
  "earn_rate_per_currency" numeric(10, 4) DEFAULT '1' NOT NULL,
  "redeem_value_per_point" numeric(10, 4) DEFAULT '0.01' NOT NULL,
  "min_redeem_points" integer DEFAULT 100 NOT NULL,
  "max_redeem_percent" numeric(5, 4) DEFAULT '0.5' NOT NULL,
  "points_expiry_months" integer DEFAULT 12 NOT NULL,
  "earn_on_tax" boolean DEFAULT false NOT NULL,
  "earn_on_shipping" boolean DEFAULT false NOT NULL,
  "min_order_for_earn" numeric(12, 2) DEFAULT '0' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "loyalty_settings_store_id_unique" UNIQUE("store_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_accounts" (
  "id" serial PRIMARY KEY NOT NULL,
  "store_id" integer NOT NULL REFERENCES "stores"("id") ON DELETE cascade,
  "customer_id" integer NOT NULL REFERENCES "customers"("id") ON DELETE cascade,
  "balance" integer DEFAULT 0 NOT NULL,
  "lifetime_earned" integer DEFAULT 0 NOT NULL,
  "lifetime_redeemed" integer DEFAULT 0 NOT NULL,
  "lifetime_expired" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_transactions" (
  "id" serial PRIMARY KEY NOT NULL,
  "store_id" integer NOT NULL REFERENCES "stores"("id") ON DELETE cascade,
  "account_id" integer NOT NULL REFERENCES "loyalty_accounts"("id") ON DELETE cascade,
  "customer_id" integer NOT NULL REFERENCES "customers"("id") ON DELETE cascade,
  "type" varchar(20) NOT NULL,
  "direction" varchar(10) NOT NULL,
  "points" integer NOT NULL,
  "balance_before" integer NOT NULL,
  "balance_after" integer NOT NULL,
  "reference_type" varchar(50),
  "reference_id" integer,
  "order_number" varchar(50),
  "description" text,
  "expires_at" timestamp,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_accounts_store_customer_uniq" ON "loyalty_accounts" ("store_id", "customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_tx_account_created_idx" ON "loyalty_transactions" ("account_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_tx_store_created_idx" ON "loyalty_transactions" ("store_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_tx_reference_idx" ON "loyalty_transactions" ("reference_type", "reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_tx_earn_order_uniq" ON "loyalty_transactions" ("store_id", "reference_id") WHERE type = 'earn' AND reference_type = 'order';
