-- RLS FORCE Migration (003) — Tenant Isolation Hardening
-- ════════════════════════════════════════════════════════════════
-- ⚠️  OWNER-GATED MIGRATION — DO NOT RUN WITHOUT EXPLICIT OWNER APPROVAL.
--
-- Context: RLS-001 (defense-in-depth). Migration 002 ENABLEs RLS, but
-- `ENABLE ROW LEVEL SECURITY` does NOT apply to the table OWNER or to roles
-- with BYPASSRLS. If the application connects as the table owner, the 002
-- policies are silently inert. This migration adds `FORCE ROW LEVEL SECURITY`
-- so the policies apply to the owner too — making RLS a real second layer.
--
-- PRECONDITIONS (all must hold before running — owner decision):
--   1. Migration 002-rls-tenant-isolation.sql is already applied.
--   2. Every tenant-scoped request path sets the tenant context via
--      withTenantContext()/setRlsContext() INSIDE its transaction
--      (RLS_ENFORCE=on). Otherwise queries with no context will FAIL CLOSED
--      (current_setting('app.current_store_id') errors) → application outage.
--   3. Verified on staging with the RLS isolation test suite green.
--
-- This file is generated for review only. Per AGENTS.md §14.7 and the
-- "no auto-migrate" owner decision, db:migrate execution is owner-only.
--
-- Usage (owner only, after preconditions):
--   psql -U <user> -d <database> -f 003-rls-force-tenant-isolation.sql
--
-- Rollback:
--   ALTER TABLE <t> NO FORCE ROW LEVEL SECURITY;   -- per table
-- ════════════════════════════════════════════════════════════════


ALTER TABLE stores FORCE ROW LEVEL SECURITY;
ALTER TABLE store_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
ALTER TABLE categories FORCE ROW LEVEL SECURITY;
ALTER TABLE brands FORCE ROW LEVEL SECURITY;
ALTER TABLE tags FORCE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
ALTER TABLE carts FORCE ROW LEVEL SECURITY;
ALTER TABLE checkout_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;
ALTER TABLE roles FORCE ROW LEVEL SECURITY;
ALTER TABLE user_store_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE coupons FORCE ROW LEVEL SECURITY;
ALTER TABLE promotions FORCE ROW LEVEL SECURITY;
ALTER TABLE store_policies FORCE ROW LEVEL SECURITY;
ALTER TABLE wallet_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE wallet_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE payout_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE payout_events FORCE ROW LEVEL SECURITY;
ALTER TABLE shipping_provider_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE shipping_methods FORCE ROW LEVEL SECURITY;
ALTER TABLE shipping_zones FORCE ROW LEVEL SECURITY;
ALTER TABLE shipments FORCE ROW LEVEL SECURITY;
ALTER TABLE oto_vendor_mappings FORCE ROW LEVEL SECURITY;
ALTER TABLE sender_locations FORCE ROW LEVEL SECURITY;
ALTER TABLE oto_shipments FORCE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints FORCE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE kyc_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE merchant_bank_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE merchant_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences FORCE ROW LEVEL SECURITY;
ALTER TABLE provider_connections FORCE ROW LEVEL SECURITY;
ALTER TABLE marketplace_connections FORCE ROW LEVEL SECURITY;
ALTER TABLE channel_listings FORCE ROW LEVEL SECURITY;
ALTER TABLE channel_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE sync_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE merchant_payment_provider_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE merchant_payment_provider_credentials FORCE ROW LEVEL SECURITY;
ALTER TABLE pickup_locations FORCE ROW LEVEL SECURITY;
ALTER TABLE size_guides FORCE ROW LEVEL SECURITY;
ALTER TABLE merchant_acknowledgements FORCE ROW LEVEL SECURITY;
ALTER TABLE support_tickets FORCE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_articles FORCE ROW LEVEL SECURITY;
ALTER TABLE product_images FORCE ROW LEVEL SECURITY;
ALTER TABLE product_variants FORCE ROW LEVEL SECURITY;
ALTER TABLE order_items FORCE ROW LEVEL SECURITY;
ALTER TABLE order_status_history FORCE ROW LEVEL SECURITY;
ALTER TABLE cart_items FORCE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses FORCE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE shipment_tracking_events FORCE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages FORCE ROW LEVEL SECURITY;

-- Verification after applying:
-- SELECT relname, relforcerowsecurity FROM pg_class WHERE relforcerowsecurity = true ORDER BY relname;
