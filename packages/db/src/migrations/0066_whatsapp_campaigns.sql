-- WhatsApp bulk campaigns (merchant → customer segment)
CREATE TABLE IF NOT EXISTS "whatsapp_campaigns" (
  "id" serial PRIMARY KEY,
  "store_id" integer NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
  "name" varchar(100) NOT NULL,
  "segment_type" varchar(50),
  "message_template" text NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'draft',
  "total_recipients" integer DEFAULT 0,
  "sent_count" integer DEFAULT 0,
  "failed_count" integer DEFAULT 0,
  "scheduled_at" timestamp,
  "started_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "whatsapp_campaign_sends" (
  "id" serial PRIMARY KEY,
  "campaign_id" integer NOT NULL REFERENCES "whatsapp_campaigns"("id") ON DELETE CASCADE,
  "customer_id" integer REFERENCES "customers"("id"),
  "phone" varchar(20) NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "message_id" varchar(100),
  "error_message" text,
  "sent_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Enhance webhook endpoints with circuit-breaker fields
ALTER TABLE "webhook_endpoints"
  ADD COLUMN IF NOT EXISTS "consecutive_failures" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "paused_until" timestamp,
  ADD COLUMN IF NOT EXISTS "last_failure_at" timestamp,
  ADD COLUMN IF NOT EXISTS "total_deliveries" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_failures" integer NOT NULL DEFAULT 0;
