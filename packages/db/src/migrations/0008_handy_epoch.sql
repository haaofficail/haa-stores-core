CREATE TABLE IF NOT EXISTS "notification_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer,
	"channel" varchar(20) NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"subject" varchar(500),
	"body" text,
	"status" varchar(20) DEFAULT 'sent' NOT NULL,
	"template_code" varchar(50),
	"metadata" jsonb,
	"error_message" text,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"email_address" varchar(255),
	"sms_enabled" boolean DEFAULT false NOT NULL,
	"sms_phone" varchar(20),
	"whatsapp_enabled" boolean DEFAULT false NOT NULL,
	"whatsapp_phone" varchar(20),
	"order_created" boolean DEFAULT true NOT NULL,
	"payment_success" boolean DEFAULT true NOT NULL,
	"payment_failed" boolean DEFAULT true NOT NULL,
	"shipping_update" boolean DEFAULT true NOT NULL,
	"low_stock" boolean DEFAULT true NOT NULL,
	"abandoned_cart" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_store_id_unique" UNIQUE("store_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"channel" varchar(20) DEFAULT 'email' NOT NULL,
	"subject_template" varchar(500),
	"body_template" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_templates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
