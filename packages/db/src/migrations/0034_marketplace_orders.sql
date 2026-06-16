CREATE TABLE IF NOT EXISTS marketplace_orders (
  id serial PRIMARY KEY,
  marketplace_order_number varchar(50) NOT NULL UNIQUE,
  status varchar(30) NOT NULL DEFAULT 'created',
  payment_status varchar(30) NOT NULL DEFAULT 'unpaid',
  fulfillment_status varchar(30) NOT NULL DEFAULT 'unfulfilled',
  customer_name varchar(100) NOT NULL,
  customer_phone varchar(20) NOT NULL,
  customer_email varchar(255),
  shipping_address jsonb,
  subtotal numeric(12,2) NOT NULL,
  shipping_total numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL,
  platform_commission numeric(12,2) NOT NULL DEFAULT 0,
  payment_method varchar(50),
  notes varchar(1000),
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketplace_orders_created_at_idx
  ON marketplace_orders (created_at);

CREATE INDEX IF NOT EXISTS marketplace_orders_customer_phone_idx
  ON marketplace_orders (customer_phone);

CREATE TABLE IF NOT EXISTS marketplace_order_links (
  id serial PRIMARY KEY,
  marketplace_order_id integer NOT NULL REFERENCES marketplace_orders(id),
  order_id integer NOT NULL REFERENCES orders(id),
  store_id integer NOT NULL,
  store_name varchar(255) NOT NULL,
  store_slug varchar(255) NOT NULL,
  subtotal numeric(12,2) NOT NULL,
  shipping_cost numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL,
  platform_commission numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS marketplace_order_links_marketplace_order_idx
  ON marketplace_order_links (marketplace_order_id);

CREATE INDEX IF NOT EXISTS marketplace_order_links_store_idx
  ON marketplace_order_links (store_id);
