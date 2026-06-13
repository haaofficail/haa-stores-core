CREATE TABLE IF NOT EXISTS "size_guides" (
  "id" serial PRIMARY KEY NOT NULL,
  "store_id" integer NOT NULL,
  "name" varchar(120) NOT NULL,
  "type" varchar(40) DEFAULT 'clothing' NOT NULL,
  "unit" varchar(10) DEFAULT 'cm' NOT NULL,
  "rows" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "category_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "product_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "size_guides" ADD CONSTRAINT "size_guides_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "size_guides_store_active_idx" ON "size_guides" USING btree ("store_id","is_active");
