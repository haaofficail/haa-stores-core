CREATE TABLE IF NOT EXISTS provider_connections (
  id serial PRIMARY KEY,
  store_id integer NOT NULL REFERENCES stores(id),
  provider_type varchar(50) NOT NULL,
  provider_name varchar(50) NOT NULL,
  integration_model varchar(50) NOT NULL DEFAULT 'not_configured',
  mode varchar(20) NOT NULL DEFAULT 'sandbox',
  status varchar(50) NOT NULL DEFAULT 'not_configured',
  external_vendor_id varchar(255),
  credentials_encrypted text,
  last_verified_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS oto_vendor_mappings (
  id serial PRIMARY KEY,
  store_id integer NOT NULL UNIQUE REFERENCES stores(id),
  integration_model varchar(50) NOT NULL DEFAULT 'marketplace_vendor',
  oto_vendor_email varchar(255),
  oto_client_id varchar(255),
  oto_vendor_status varchar(50) NOT NULL DEFAULT 'not_registered',
  remaining_credit decimal(12, 2),
  validity_date varchar(50),
  registered_at timestamp,
  last_synced_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sender_locations (
  id serial PRIMARY KEY,
  store_id integer NOT NULL REFERENCES stores(id),
  sender_name varchar(120) NOT NULL,
  sender_phone varchar(20) NOT NULL,
  sender_email varchar(255),
  sender_country varchar(2) NOT NULL DEFAULT 'SA',
  sender_city varchar(100) NOT NULL,
  sender_address_line text NOT NULL,
  sender_short_address_code varchar(50),
  lat decimal(10, 7),
  lon decimal(10, 7),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS oto_shipments (
  id serial PRIMARY KEY,
  store_id integer NOT NULL REFERENCES stores(id),
  order_id integer NOT NULL REFERENCES orders(id),
  shipment_id integer REFERENCES shipments(id),
  oto_order_id varchar(255),
  provider_shipment_id varchar(255),
  delivery_option_id varchar(255),
  delivery_company_name varchar(255),
  tracking_number varchar(100),
  tracking_url varchar(500),
  label_url varchar(500),
  status varchar(50) NOT NULL DEFAULT 'pending',
  sync_status varchar(50) NOT NULL DEFAULT 'pending',
  error_code varchar(100),
  error_message text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_connections_store_provider_idx
  ON provider_connections(store_id, provider_type, provider_name);

CREATE INDEX IF NOT EXISTS sender_locations_store_default_idx
  ON sender_locations(store_id, is_default);

CREATE INDEX IF NOT EXISTS oto_shipments_store_order_idx
  ON oto_shipments(store_id, order_id);
