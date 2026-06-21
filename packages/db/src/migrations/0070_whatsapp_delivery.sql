ALTER TABLE "whatsapp_campaigns" ADD COLUMN "delivered_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "whatsapp_campaigns" ADD COLUMN "read_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "whatsapp_campaign_sends" ADD COLUMN "delivered_at" timestamp;--> statement-breakpoint
ALTER TABLE "whatsapp_campaign_sends" ADD COLUMN "read_at" timestamp;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wa_campaign_sends_message_id_idx" ON "whatsapp_campaign_sends" ("message_id");
