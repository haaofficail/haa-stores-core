-- 0082 — store-settings compliance columns for the publish-gate checklist.
--
-- Bug closed by this migration: `ComplianceChecklistService.gatherData`
-- previously hardcoded `returnWindowDays: null`, so check #12 (blocking)
-- always failed. The fix wires three new columns into `store_settings`
-- as the source of truth for those settings.
--
-- All ADDs are guarded with IF NOT EXISTS so staging can be re-run safely.
-- Additive only — no DROP / RENAME / data destruction.
--
-- Defaults:
--   return_window_days        → 14  (Saudi e-commerce law nominal window)
--   excluded_return_categories → []  (no exclusions)
--   delay_cancellation_notice → NULL (merchant-authored, optional)
--
-- NOT auto-applied. Run via ops-staging-migrate workflow.
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "return_window_days" integer DEFAULT 14;
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "excluded_return_categories" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "delay_cancellation_notice" text;
