ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "rating" integer;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "review_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sales_count" integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "products_sales_count_idx" ON "products" ("sales_count");
