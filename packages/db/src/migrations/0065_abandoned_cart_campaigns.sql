-- Abandoned cart recovery campaigns
CREATE TABLE "abandoned_cart_campaigns" (
  "id" serial PRIMARY KEY,
  "store_id" integer NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
  "name" varchar(100) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  -- steps: [{step:1, channel:'email', delay_minutes:30, template_code:'cart_recover_1'}, ...]
  "steps" jsonb NOT NULL DEFAULT '[]',
  "discount_type" varchar(20),
  "discount_value" numeric(10, 2),
  "discount_expires_hours" integer DEFAULT 24,
  "min_cart_value" numeric(10, 2) DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Recovery attempts per abandoned session
CREATE TABLE "campaign_recoveries" (
  "id" serial PRIMARY KEY,
  "store_id" integer NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
  "checkout_session_id" uuid NOT NULL REFERENCES "checkout_sessions"("id") ON DELETE CASCADE,
  "campaign_id" integer REFERENCES "abandoned_cart_campaigns"("id"),
  "recovery_token" varchar(64) NOT NULL UNIQUE,
  "step" integer NOT NULL DEFAULT 1,
  "channel" varchar(20) NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'sent',
  "recipient" varchar(255),
  "discount_code" varchar(50),
  "recovered_order_id" integer,
  "sent_at" timestamp NOT NULL DEFAULT now(),
  "opened_at" timestamp,
  "recovered_at" timestamp,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "campaign_recoveries_token_idx" ON "campaign_recoveries"("recovery_token");
CREATE INDEX "campaign_recoveries_store_status_idx" ON "campaign_recoveries"("store_id", "status", "created_at");
CREATE INDEX "campaign_recoveries_session_idx" ON "campaign_recoveries"("checkout_session_id");
