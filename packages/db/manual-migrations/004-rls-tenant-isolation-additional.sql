-- RLS Tenant Isolation — Additional Tables (004)
-- ════════════════════════════════════════════════════════════════
-- ⚠️  OWNER-GATED MIGRATION — DO NOT RUN WITHOUT EXPLICIT OWNER APPROVAL.
--
-- Context: P1-4 audit fix. Migration 002-rls-tenant-isolation.sql covers
-- 57 tenant-scoped tables, but the schema has grown since it was written
-- and 26 tenant-scoped tables were never added to the RLS policy set —
-- meaning RLS provides zero defense-in-depth for them even after
-- RLS_ENFORCE=on, including financial ones (payment_provider_transactions,
-- store_billing_settings, wallet_settlement_readiness, zatca_invoice_chain,
-- loyalty_accounts/transactions).
--
-- The 26-table list below was computed programmatically by diffing every
-- table in packages/db/src/migrations/meta/0091_snapshot.json that has a
-- store_id or tenant_id column against the table names covered by 002
-- (grep on 002's own ALTER TABLE statements) — not hand-curated, so it
-- should be re-derived (same diff) before applying if the schema has
-- changed since this file was generated.
--
-- Prerequisites: 002-rls-tenant-isolation.sql already applied (uses the
-- same set_tenant_context() helper function it creates).
-- Usage (owner only): psql -U <user> -d <database> -f 004-rls-tenant-isolation-additional.sql
--
-- Special cases (nullable store_id / dual-scope — see comments inline):
--   tenant_users   — store_id NULLABLE (NULL = tenant-wide membership row,
--                    per packages/auth-core StoreMembershipResolver),
--                    tenant_id NOT NULL. Policy must accept NULL store_id
--                    rows when the tenant matches, or every tenant-wide
--                    membership becomes invisible under RLS.
--   audit_logs, webhook_events — both store_id and tenant_id NULLABLE
--                    (some rows are platform-level, no store/tenant).
--                    Policy scopes rows with a store_id to that store;
--                    platform-level rows (store_id IS NULL) are only
--                    visible to a matching tenant context, matching the
--                    tenant_users pattern.
--   integration_logs, notification_logs, wallet_settlement_readiness —
--                    store_id NULLABLE but no tenant_id column to fall
--                    back to. Simple policy (same as 002's pattern);
--                    NULL-store_id rows are invisible under any tenant
--                    context, same fail-closed behavior 002 already
--                    accepts for its own tables.
-- ════════════════════════════════════════════════════════════════

-- Simple store_id-scoped tables (store_id NOT NULL) — same pattern as 002.

ALTER TABLE abandoned_cart_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_abandoned_cart_campaigns ON abandoned_cart_campaigns;
CREATE POLICY tenant_isolation_abandoned_cart_campaigns ON abandoned_cart_campaigns
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE campaign_recoveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_campaign_recoveries ON campaign_recoveries;
CREATE POLICY tenant_isolation_campaign_recoveries ON campaign_recoveries
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE live_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_live_presence ON live_presence;
CREATE POLICY tenant_isolation_live_presence ON live_presence
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE live_radar_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_live_radar_snapshots ON live_radar_snapshots;
CREATE POLICY tenant_isolation_live_radar_snapshots ON live_radar_snapshots
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE loyalty_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_loyalty_accounts ON loyalty_accounts;
CREATE POLICY tenant_isolation_loyalty_accounts ON loyalty_accounts
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE loyalty_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_loyalty_settings ON loyalty_settings;
CREATE POLICY tenant_isolation_loyalty_settings ON loyalty_settings
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_loyalty_transactions ON loyalty_transactions;
CREATE POLICY tenant_isolation_loyalty_transactions ON loyalty_transactions
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE marketing_action_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_marketing_action_logs ON marketing_action_logs;
CREATE POLICY tenant_isolation_marketing_action_logs ON marketing_action_logs
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE marketing_action_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_marketing_action_settings ON marketing_action_settings;
CREATE POLICY tenant_isolation_marketing_action_settings ON marketing_action_settings
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE marketing_action_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_marketing_action_states ON marketing_action_states;
CREATE POLICY tenant_isolation_marketing_action_states ON marketing_action_states
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE marketing_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_marketing_events ON marketing_events;
CREATE POLICY tenant_isolation_marketing_events ON marketing_events
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE marketing_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_marketing_sessions ON marketing_sessions;
CREATE POLICY tenant_isolation_marketing_sessions ON marketing_sessions
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE payment_provider_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_payment_provider_transactions ON payment_provider_transactions;
CREATE POLICY tenant_isolation_payment_provider_transactions ON payment_provider_transactions
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE product_performance_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_product_performance_daily ON product_performance_daily;
CREATE POLICY tenant_isolation_product_performance_daily ON product_performance_daily
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE store_billing_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_store_billing_settings ON store_billing_settings;
CREATE POLICY tenant_isolation_store_billing_settings ON store_billing_settings
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE store_pixels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_store_pixels ON store_pixels;
CREATE POLICY tenant_isolation_store_pixels ON store_pixels
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_whatsapp_campaigns ON whatsapp_campaigns;
CREATE POLICY tenant_isolation_whatsapp_campaigns ON whatsapp_campaigns
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_whatsapp_sessions ON whatsapp_sessions;
CREATE POLICY tenant_isolation_whatsapp_sessions ON whatsapp_sessions
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_whatsapp_templates ON whatsapp_templates;
CREATE POLICY tenant_isolation_whatsapp_templates ON whatsapp_templates
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE zatca_invoice_chain ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_zatca_invoice_chain ON zatca_invoice_chain;
CREATE POLICY tenant_isolation_zatca_invoice_chain ON zatca_invoice_chain
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

-- Nullable store_id, no tenant fallback column — same simple pattern;
-- NULL-store_id rows are invisible under any tenant context (fail-closed).

ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_integration_logs ON integration_logs;
CREATE POLICY tenant_isolation_integration_logs ON integration_logs
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_notification_logs ON notification_logs;
CREATE POLICY tenant_isolation_notification_logs ON notification_logs
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

ALTER TABLE wallet_settlement_readiness ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_wallet_settlement_readiness ON wallet_settlement_readiness;
CREATE POLICY tenant_isolation_wallet_settlement_readiness ON wallet_settlement_readiness
  FOR ALL USING (store_id = current_setting('app.current_store_id')::int);

-- Dual-scope tables: store_id NULLABLE, has a tenant_id fallback.
-- A row with store_id NULL is a tenant-wide row (e.g. tenant_users
-- membership with no specific store) — visible to any store context
-- within the matching tenant.

ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_tenant_users ON tenant_users;
CREATE POLICY tenant_isolation_tenant_users ON tenant_users
  FOR ALL USING (
    tenant_id = current_setting('app.current_tenant_id')::int
    AND (
      store_id IS NULL
      OR store_id = current_setting('app.current_store_id')::int
    )
  );

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_audit_logs ON audit_logs;
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  FOR ALL USING (
    store_id = current_setting('app.current_store_id')::int
    OR (store_id IS NULL AND tenant_id = current_setting('app.current_tenant_id')::int)
  );

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_webhook_events ON webhook_events;
CREATE POLICY tenant_isolation_webhook_events ON webhook_events
  FOR ALL USING (
    store_id = current_setting('app.current_store_id')::int
    OR (store_id IS NULL AND tenant_id = current_setting('app.current_tenant_id')::int)
  );

-- Verification queries (run after applying):
-- SELECT relname, relrowsecurity FROM pg_class
-- WHERE relname IN (
--   'abandoned_cart_campaigns','audit_logs','campaign_recoveries','integration_logs',
--   'live_presence','live_radar_snapshots','loyalty_accounts','loyalty_settings',
--   'loyalty_transactions','marketing_action_logs','marketing_action_settings',
--   'marketing_action_states','marketing_events','marketing_sessions','notification_logs',
--   'payment_provider_transactions','product_performance_daily','store_billing_settings',
--   'store_pixels','tenant_users','wallet_settlement_readiness','webhook_events',
--   'whatsapp_campaigns','whatsapp_sessions','whatsapp_templates','zatca_invoice_chain'
-- ) ORDER BY relname;
