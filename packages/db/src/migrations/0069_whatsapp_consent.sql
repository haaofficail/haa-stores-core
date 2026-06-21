ALTER TABLE "customers" ADD COLUMN "whatsapp_marketing_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "whatsapp_consent_at" timestamp;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "whatsapp_opt_out" boolean DEFAULT false NOT NULL;
