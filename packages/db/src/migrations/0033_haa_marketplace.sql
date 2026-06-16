ALTER TABLE products
  ADD COLUMN IF NOT EXISTS haa_marketplace_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS haa_marketplace_commission_rate numeric(5,4) NOT NULL DEFAULT 0.0500;

CREATE INDEX IF NOT EXISTS products_haa_marketplace_idx
  ON products (haa_marketplace_enabled, status, created_at);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS platform_commission numeric(12,2);

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS source varchar(30) NOT NULL DEFAULT 'storefront',
  ADD COLUMN IF NOT EXISTS platform_commission_rate numeric(5,4),
  ADD COLUMN IF NOT EXISTS platform_commission numeric(12,2);

ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS source varchar(30) NOT NULL DEFAULT 'storefront';
