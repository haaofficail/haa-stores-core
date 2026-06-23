-- WhatsApp message templates per store (WA-PR-5).
--
-- Free-form `body` with `{placeholder}` tokens substituted at send time
-- by the renderer in commerce-core (allow-listed keys only — never eval).
--
-- Unique constraint on (store_id, name) prevents two templates with the
-- same name within a store. Categories are free text (no DB enum) so
-- new categories don't require a migration.

CREATE TABLE IF NOT EXISTS "whatsapp_templates" (
  "id" serial PRIMARY KEY NOT NULL,
  "store_id" integer NOT NULL REFERENCES "stores"("id") ON DELETE cascade,
  "name" varchar(100) NOT NULL,
  "body" text NOT NULL,
  "category" varchar(50),
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "whatsapp_templates_store_name_unique" UNIQUE("store_id","name")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_templates_store_idx" ON "whatsapp_templates" ("store_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_templates_active_idx" ON "whatsapp_templates" ("is_active");
