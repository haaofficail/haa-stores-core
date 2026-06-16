CREATE TABLE IF NOT EXISTS "knowledge_base_articles" (
  "id" serial PRIMARY KEY NOT NULL,
  "store_id" integer NOT NULL,
  "title" varchar(500) NOT NULL,
  "slug" varchar(500) NOT NULL,
  "content" text NOT NULL,
  "category" varchar(100),
  "is_published" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'knowledge_base_articles_store_id_stores_id_fk'
  ) THEN
    ALTER TABLE "knowledge_base_articles"
      ADD CONSTRAINT "knowledge_base_articles_store_id_stores_id_fk"
      FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kb_articles_store_published_idx" ON "knowledge_base_articles" USING btree ("store_id","is_published");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kb_articles_store_category_idx" ON "knowledge_base_articles" USING btree ("store_id","category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kb_articles_store_slug_idx" ON "knowledge_base_articles" USING btree ("store_id","slug");
