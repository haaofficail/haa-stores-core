ALTER TABLE products
  ADD COLUMN IF NOT EXISTS haa_marketplace_review_status varchar(30) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS haa_marketplace_review_note text,
  ADD COLUMN IF NOT EXISTS haa_marketplace_reviewed_at timestamp,
  ADD COLUMN IF NOT EXISTS haa_marketplace_reviewed_by integer,
  ADD COLUMN IF NOT EXISTS haa_marketplace_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS haa_marketplace_featured_until timestamp,
  ADD COLUMN IF NOT EXISTS haa_marketplace_featured_sort_order integer NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS products_haa_marketplace_idx;

CREATE INDEX IF NOT EXISTS products_haa_marketplace_idx
  ON products (haa_marketplace_enabled, haa_marketplace_review_status, status, created_at);

CREATE INDEX IF NOT EXISTS products_haa_marketplace_featured_idx
  ON products (haa_marketplace_featured, haa_marketplace_featured_sort_order, created_at);
