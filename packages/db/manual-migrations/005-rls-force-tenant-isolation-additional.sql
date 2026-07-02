-- RLS FORCE Migration (005) — Additional Tables Hardening
-- ════════════════════════════════════════════════════════════════
-- ⚠️  OWNER-GATED MIGRATION — DO NOT RUN WITHOUT EXPLICIT OWNER APPROVAL.
--
-- Companion to 004-rls-tenant-isolation-additional.sql, mirroring what
-- 003-rls-force-tenant-isolation.sql does for the original 57 tables:
-- `ENABLE ROW LEVEL SECURITY` (004) does not apply to the table OWNER or
-- roles with BYPASSRLS — this adds `FORCE ROW LEVEL SECURITY` so the
-- policies apply to the owner connection too.
--
-- PRECONDITIONS (all must hold before running — owner decision):
--   1. 004-rls-tenant-isolation-additional.sql is already applied.
--   2. Same preconditions as 003 (RLS_ENFORCE=on, every tenant-scoped
--      request path sets context via withTenantContext()/setRlsContext()
--      INSIDE its transaction — otherwise queries with no context FAIL
--      CLOSED with an error, not silently return no rows).
--   3. Verified on staging with the RLS isolation test suite green,
--      including the 3 dual-scope tables (tenant_users, audit_logs,
--      webhook_events) and their NULL-store_id row handling.
--
-- This file is generated for review only. Per AGENTS.md §14.7, db:migrate
-- execution is owner-only.
--
-- Usage (owner only, after preconditions):
--   psql -U <user> -d <database> -f 005-rls-force-tenant-isolation-additional.sql
--
-- Rollback:
--   ALTER TABLE <t> NO FORCE ROW LEVEL SECURITY;   -- per table
-- ════════════════════════════════════════════════════════════════

ALTER TABLE abandoned_cart_campaigns FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE campaign_recoveries FORCE ROW LEVEL SECURITY;
ALTER TABLE integration_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE live_presence FORCE ROW LEVEL SECURITY;
ALTER TABLE live_radar_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE loyalty_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE loyalty_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE marketing_action_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE marketing_action_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE marketing_action_states FORCE ROW LEVEL SECURITY;
ALTER TABLE marketing_events FORCE ROW LEVEL SECURITY;
ALTER TABLE marketing_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE payment_provider_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE product_performance_daily FORCE ROW LEVEL SECURITY;
ALTER TABLE store_billing_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE store_pixels FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_users FORCE ROW LEVEL SECURITY;
ALTER TABLE wallet_settlement_readiness FORCE ROW LEVEL SECURITY;
ALTER TABLE webhook_events FORCE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_campaigns FORCE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE zatca_invoice_chain FORCE ROW LEVEL SECURITY;

-- Verification after applying:
-- SELECT relname, relforcerowsecurity FROM pg_class
-- WHERE relforcerowsecurity = true ORDER BY relname;
