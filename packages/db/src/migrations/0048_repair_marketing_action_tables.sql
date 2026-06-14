-- Repair: marketing_action_* tables missing despite 0036 being marked applied
-- Idempotent: safe to re-run
-- This is a state-repair migration; the canonical source is 0036_marketing_actions.sql

CREATE TABLE IF NOT EXISTS "marketing_action_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"key" varchar(100) NOT NULL,
	"value_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_action_settings_store_key_unique" UNIQUE("store_id","key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketing_action_states" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"action_fingerprint" varchar(255) NOT NULL,
	"action_type" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"snoozed_until" timestamp,
	"dismissed_at" timestamp,
	"done_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_action_states_store_fingerprint_unique" UNIQUE("store_id","action_fingerprint")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketing_action_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"action_id" integer,
	"action_fingerprint" varchar(255) NOT NULL,
	"action_type" varchar(100) NOT NULL,
	"event" varchar(50) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'marketing_action_logs_store_id_stores_id_fk'
	) THEN
		ALTER TABLE "marketing_action_logs" ADD CONSTRAINT "marketing_action_logs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END$$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'marketing_action_logs_action_id_marketing_action_states_id_fk'
	) THEN
		ALTER TABLE "marketing_action_logs" ADD CONSTRAINT "marketing_action_logs_action_id_marketing_action_states_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."marketing_action_states"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END$$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'marketing_action_settings_store_id_stores_id_fk'
	) THEN
		ALTER TABLE "marketing_action_settings" ADD CONSTRAINT "marketing_action_settings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END$$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'marketing_action_states_store_id_stores_id_fk'
	) THEN
		ALTER TABLE "marketing_action_states" ADD CONSTRAINT "marketing_action_states_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END$$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketing_action_logs_store_id_idx" ON "marketing_action_logs" USING btree ("store_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketing_action_logs_action_id_idx" ON "marketing_action_logs" USING btree ("action_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketing_action_logs_fingerprint_idx" ON "marketing_action_logs" USING btree ("action_fingerprint");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketing_action_logs_created_at_idx" ON "marketing_action_logs" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketing_action_settings_store_id_idx" ON "marketing_action_settings" USING btree ("store_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketing_action_states_store_id_idx" ON "marketing_action_states" USING btree ("store_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketing_action_states_status_idx" ON "marketing_action_states" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketing_action_states_fingerprint_idx" ON "marketing_action_states" USING btree ("action_fingerprint");
