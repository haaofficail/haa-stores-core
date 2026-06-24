-- HAA-SUB-RENEWAL — dedupe anchor for the subscription-renewal
-- reminder email ladder (7-day + 1-day before period end).
--
-- Adds TWO nullable columns to `merchant_subscriptions`:
--
--   * last_renewal_reminder_at  — timestamp of the last successful
--     send. NULL means "never reminded for the current period".
--   * last_renewal_reminder_step — which ladder step (7 or 1) was
--     last reminded. Required so a sent 7-day reminder does NOT
--     suppress the later 1-day reminder within the same period.
--
-- The notifier (SubscriptionRenewalNotifier.runDailySweep in
-- commerce-core) skips a subscription when:
--
--   last_renewal_reminder_step = current daysUntilRenewal AND
--   last_renewal_reminder_at  >= current_period_start
--
-- Anchoring on current_period_start means a brand-new billing period
-- automatically re-arms both ladder steps — no nightly reset job
-- required.
--
-- Failures do NOT consume the dedupe slot — the columns are only set
-- AFTER `provider.send()` resolves successfully. A transient provider
-- outage cannot silently swallow the next sweep.
--
-- Forward-only. Additive. `IF NOT EXISTS` makes re-running safe.
-- No DROP / RENAME / data destruction.
--
-- NOT auto-applied. Run via ops-staging-migrate workflow.
ALTER TABLE "merchant_subscriptions"
  ADD COLUMN IF NOT EXISTS "last_renewal_reminder_at" timestamp;
ALTER TABLE "merchant_subscriptions"
  ADD COLUMN IF NOT EXISTS "last_renewal_reminder_step" integer;
