-- RLS Tenant Isolation Migration
-- Adds PostgreSQL Row-Level Security to all tenant-scoped tables.
-- 
-- Prerequisites: None (safe to run multiple times via IF NOT EXISTS)
-- Usage:
--   psql -U <user> -d <database> -f 002-rls-tenant-isolation.sql
--
-- This is a SAFETY NET, not a replacement for application-level auth.
-- Even if the app layer forgets WHERE store_id = ?, RLS prevents leakage.

-- ════════════════════════════════════════════════════════════════
-- STEP 1: Helper function to set the store context for the session
-- ════════════════════════════════════════════════════════════════
-- Called at the start of each request:
--   PERFORM set_tenant_context(store_id, tenant_id);
-- Or via:
--   SELECT set_config('app.current_store_id', '123', TRUE);
--   SELECT set_config('app.current_tenant_id', '456', TRUE);
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_tenant_context(p_store_id INTEGER, p_tenant_id INTEGER)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_store_id', p_store_id::TEXT, TRUE);
  PERFORM set_config('app.current_tenant_id', p_tenant_id::TEXT, TRUE);
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════
-- STEP 2: RLS on store-level tables (has store_id directly)
-- ════════════════════════════════════════════════════════════════
-- Each policy checks: store_id = current_setting('app.current_store_id')::int
-- ════════════════════════════════════════════════════════════════

-- stores table — tenant-level isolation
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_stores ON stores;
CREATE POLICY tenant_isolation_stores ON stores
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- store_settings
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_store_settings ON store_settings;
CREATE POLICY tenant_isolation_store_settings ON store_settings
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_products ON products;
CREATE POLICY tenant_isolation_products ON products
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- categories, brands, tags
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_categories ON categories;
CREATE POLICY tenant_isolation_categories ON categories
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_brands ON brands;
CREATE POLICY tenant_isolation_brands ON brands
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_tags ON tags;
CREATE POLICY tenant_isolation_tags ON tags
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_customers ON customers;
CREATE POLICY tenant_isolation_customers ON customers
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- carts
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_carts ON carts;
CREATE POLICY tenant_isolation_carts ON carts
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- checkout_sessions
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_checkout_sessions ON checkout_sessions;
CREATE POLICY tenant_isolation_checkout_sessions ON checkout_sessions
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_orders ON orders;
CREATE POLICY tenant_isolation_orders ON orders
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_payments ON payments;
CREATE POLICY tenant_isolation_payments ON payments
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- roles
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_roles ON roles;
CREATE POLICY tenant_isolation_roles ON roles
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- user_store_roles
ALTER TABLE user_store_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_user_store_roles ON user_store_roles;
CREATE POLICY tenant_isolation_user_store_roles ON user_store_roles
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- coupons
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_coupons ON coupons;
CREATE POLICY tenant_isolation_coupons ON coupons
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- promotions
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_promotions ON promotions;
CREATE POLICY tenant_isolation_promotions ON promotions
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- store_policies
ALTER TABLE store_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_store_policies ON store_policies;
CREATE POLICY tenant_isolation_store_policies ON store_policies
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- wallet_accounts, wallet_entries, payout_requests, payout_events
ALTER TABLE wallet_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_wallet_accounts ON wallet_accounts;
CREATE POLICY tenant_isolation_wallet_accounts ON wallet_accounts
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE wallet_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_wallet_entries ON wallet_entries;
CREATE POLICY tenant_isolation_wallet_entries ON wallet_entries
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_payout_requests ON payout_requests;
CREATE POLICY tenant_isolation_payout_requests ON payout_requests
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE payout_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_payout_events ON payout_events;
CREATE POLICY tenant_isolation_payout_events ON payout_events
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- shipping tables
ALTER TABLE shipping_provider_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_shipping_provider_accounts ON shipping_provider_accounts;
CREATE POLICY tenant_isolation_shipping_provider_accounts ON shipping_provider_accounts
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_shipping_methods ON shipping_methods;
CREATE POLICY tenant_isolation_shipping_methods ON shipping_methods
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_shipping_zones ON shipping_zones;
CREATE POLICY tenant_isolation_shipping_zones ON shipping_zones
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_shipments ON shipments;
CREATE POLICY tenant_isolation_shipments ON shipments
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE oto_vendor_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_oto_vendor_mappings ON oto_vendor_mappings;
CREATE POLICY tenant_isolation_oto_vendor_mappings ON oto_vendor_mappings
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE sender_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_sender_locations ON sender_locations;
CREATE POLICY tenant_isolation_sender_locations ON sender_locations
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE oto_shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_oto_shipments ON oto_shipments;
CREATE POLICY tenant_isolation_oto_shipments ON oto_shipments
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- webhook_endpoints
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_webhook_endpoints ON webhook_endpoints;
CREATE POLICY tenant_isolation_webhook_endpoints ON webhook_endpoints
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_api_keys ON api_keys;
CREATE POLICY tenant_isolation_api_keys ON api_keys
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- kyc_profiles — has both store_id and tenant_id
ALTER TABLE kyc_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_kyc_profiles ON kyc_profiles;
CREATE POLICY tenant_isolation_kyc_profiles ON kyc_profiles
  FOR ALL
  USING (
    store_id = current_setting('app.current_store_id')::int
    AND tenant_id = current_setting('app.current_tenant_id')::int
  );

-- merchant_bank_accounts, kyc_documents
ALTER TABLE merchant_bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_merchant_bank_accounts ON merchant_bank_accounts;
CREATE POLICY tenant_isolation_merchant_bank_accounts ON merchant_bank_accounts
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_kyc_documents ON kyc_documents;
CREATE POLICY tenant_isolation_kyc_documents ON kyc_documents
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- merchant_subscriptions, subscription_invoices
ALTER TABLE merchant_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_merchant_subscriptions ON merchant_subscriptions;
CREATE POLICY tenant_isolation_merchant_subscriptions ON merchant_subscriptions
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_subscription_invoices ON subscription_invoices;
CREATE POLICY tenant_isolation_subscription_invoices ON subscription_invoices
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_notification_preferences ON notification_preferences;
CREATE POLICY tenant_isolation_notification_preferences ON notification_preferences
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- provider_connections, marketplace_connections
ALTER TABLE provider_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_provider_connections ON provider_connections;
CREATE POLICY tenant_isolation_provider_connections ON provider_connections
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE marketplace_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_marketplace_connections ON marketplace_connections;
CREATE POLICY tenant_isolation_marketplace_connections ON marketplace_connections
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- channel_listings, channel_orders, sync_logs
ALTER TABLE channel_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_channel_listings ON channel_listings;
CREATE POLICY tenant_isolation_channel_listings ON channel_listings
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE channel_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_channel_orders ON channel_orders;
CREATE POLICY tenant_isolation_channel_orders ON channel_orders
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_sync_logs ON sync_logs;
CREATE POLICY tenant_isolation_sync_logs ON sync_logs
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- payment_provider_settings & credentials
ALTER TABLE merchant_payment_provider_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_merchant_payment_provider_settings ON merchant_payment_provider_settings;
CREATE POLICY tenant_isolation_merchant_payment_provider_settings ON merchant_payment_provider_settings
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE merchant_payment_provider_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_merchant_payment_provider_credentials ON merchant_payment_provider_credentials;
CREATE POLICY tenant_isolation_merchant_payment_provider_credentials ON merchant_payment_provider_credentials
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- pickup_locations, size_guides
ALTER TABLE pickup_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_pickup_locations ON pickup_locations;
CREATE POLICY tenant_isolation_pickup_locations ON pickup_locations
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE size_guides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_size_guides ON size_guides;
CREATE POLICY tenant_isolation_size_guides ON size_guides
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- merchant_acknowledgements
ALTER TABLE merchant_acknowledgements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_merchant_acknowledgements ON merchant_acknowledgements;
CREATE POLICY tenant_isolation_merchant_acknowledgements ON merchant_acknowledgements
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- support_tickets
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_support_tickets ON support_tickets;
CREATE POLICY tenant_isolation_support_tickets ON support_tickets
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- knowledge_base_articles
ALTER TABLE knowledge_base_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_knowledge_base_articles ON knowledge_base_articles;
CREATE POLICY tenant_isolation_knowledge_base_articles ON knowledge_base_articles
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::int);

-- ════════════════════════════════════════════════════════════════
-- STEP 3: RLS on child tables (no direct store_id — via FK chain)
-- ════════════════════════════════════════════════════════════════
-- These use subqueries to resolve store_id through their parent.
-- Performance impact is minimal with proper indexes.
-- ════════════════════════════════════════════════════════════════

-- product_images → products → store_id
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_product_images ON product_images;
CREATE POLICY tenant_isolation_product_images ON product_images
  FOR ALL
  USING (
    (SELECT store_id FROM products WHERE id = product_images.product_id)
    = current_setting('app.current_store_id')::int
  );

-- product_variants → products → store_id
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_product_variants ON product_variants;
CREATE POLICY tenant_isolation_product_variants ON product_variants
  FOR ALL
  USING (
    (SELECT store_id FROM products WHERE id = product_variants.product_id)
    = current_setting('app.current_store_id')::int
  );

-- order_items → orders → store_id
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_order_items ON order_items;
CREATE POLICY tenant_isolation_order_items ON order_items
  FOR ALL
  USING (
    (SELECT store_id FROM orders WHERE id = order_items.order_id)
    = current_setting('app.current_store_id')::int
  );

-- order_status_history → orders → store_id
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_order_status_history ON order_status_history;
CREATE POLICY tenant_isolation_order_status_history ON order_status_history
  FOR ALL
  USING (
    (SELECT store_id FROM orders WHERE id = order_status_history.order_id)
    = current_setting('app.current_store_id')::int
  );

-- cart_items → carts → store_id
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_cart_items ON cart_items;
CREATE POLICY tenant_isolation_cart_items ON cart_items
  FOR ALL
  USING (
    (SELECT store_id FROM carts WHERE id = cart_items.cart_id)
    = current_setting('app.current_store_id')::int
  );

-- customer_addresses → customers → store_id
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_customer_addresses ON customer_addresses;
CREATE POLICY tenant_isolation_customer_addresses ON customer_addresses
  FOR ALL
  USING (
    (SELECT store_id FROM customers WHERE id = customer_addresses.customer_id)
    = current_setting('app.current_store_id')::int
  );

-- payment_attempts → payments → store_id
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_payment_attempts ON payment_attempts;
CREATE POLICY tenant_isolation_payment_attempts ON payment_attempts
  FOR ALL
  USING (
    (SELECT store_id FROM payments WHERE id = payment_attempts.payment_id)
    = current_setting('app.current_store_id')::int
  );

-- payment_transactions → payments → store_id
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_payment_transactions ON payment_transactions;
CREATE POLICY tenant_isolation_payment_transactions ON payment_transactions
  FOR ALL
  USING (
    (SELECT store_id FROM payments WHERE id = payment_transactions.payment_id)
    = current_setting('app.current_store_id')::int
  );

-- shipment_tracking_events → shipments → store_id
ALTER TABLE shipment_tracking_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_shipment_tracking_events ON shipment_tracking_events;
CREATE POLICY tenant_isolation_shipment_tracking_events ON shipment_tracking_events
  FOR ALL
  USING (
    (SELECT store_id FROM shipments WHERE id = shipment_tracking_events.shipment_id)
    = current_setting('app.current_store_id')::int
  );

-- ticket_messages → support_tickets → store_id
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_ticket_messages ON ticket_messages;
CREATE POLICY tenant_isolation_ticket_messages ON ticket_messages
  FOR ALL
  USING (
    (SELECT store_id FROM support_tickets WHERE id = ticket_messages.ticket_id)
    = current_setting('app.current_store_id')::int
  );

-- ════════════════════════════════════════════════════════════════
-- STEP 4: Admin override bypass
-- ════════════════════════════════════════════════════════════════
-- Allows platform admins to bypass RLS when needed (e.g., super admin panel).
-- Usage in a transaction:
--   SET LOCAL BYPASS_RLS TO 'admin_allowed';
--   ... queries ...
-- ════════════════════════════════════════════════════════════════

-- Note: RLS bypass is controlled by the BYPASSRLS attribute on the
-- PostgreSQL role. For granular control, policies can check a setting:
--
--   CREATE POLICY admin_bypass ON orders FOR ALL
--     USING (
--       current_setting('app.bypass_rls', TRUE) = 'true'
--       OR store_id = current_setting('app.current_store_id')::int
--     );
--
-- For now, we keep simple single-condition policies and rely on
-- PostgreSQL role-level BYPASSRLS for admin users.

-- ════════════════════════════════════════════════════════════════
-- Verification queries (run after applying):
-- ════════════════════════════════════════════════════════════════
-- SELECT relname, relrowsecurity FROM pg_class
-- WHERE relrowsecurity = true
-- ORDER BY relname;
