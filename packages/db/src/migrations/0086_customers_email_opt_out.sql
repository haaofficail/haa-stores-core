-- Customer email opt-out (PDPL Article 18 — Right to Withdraw Consent).
--
-- Every customer who receives a marketing or order-recovery email from
-- the platform must be able to opt out with a single click. This adds:
--
--   - email_opt_out_at   timestamp NULL — when the customer opted out
--                                          (or NULL = still subscribed)
--   - email_opt_out_source varchar(20) NULL — how they opted out
--                                          ('footer_link' | 'admin' | 'support')
--
-- Backend MUST filter every customer-facing email send by this column
-- (NULL = allowed; NON-NULL = skip). Transactional emails the customer
-- explicitly triggered (order confirmation, password reset OTP) are NOT
-- gated by this flag — they're consent-implicit.
--
-- Additive only. Forward-only. NULL default = nobody is opted out
-- retroactively on the rollout — they keep getting emails until they
-- click unsubscribe.
--
-- NOT auto-applied. Run via ops-staging-migrate workflow.

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "email_opt_out_at" timestamp;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "email_opt_out_source" varchar(20);
