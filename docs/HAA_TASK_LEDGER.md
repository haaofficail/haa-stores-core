# Haa Stores Task Ledger

> **Source of truth for owner-facing task progress.** This is a _unified
> ledger_ that consolidates engineering progress at a glance. It does
> not replace the deeper planning artifacts:
>
> - `docs/MASTER_CHECKLIST.md` — line-item launch checklist (1018 lines)
> - `docs/ops/TASK_TRACKER.md` — detailed phase tracker (2737 lines)
> - `docs/agent-os/REMAINING_WORK.md` — autopilot wave queue
> - `docs/agent-os/EXECUTION_CHECKLIST.md` — wave-by-wave status
> - `docs/agent-os/OWNER_DECISIONS.md` — authoritative decisions
> - `docs/ops/BETA_LAUNCH_CHECKLIST.md` — launch gates
>
> The ledger references those files as evidence; it does not duplicate them.
> Every PR that lands MUST update §5 (Update Log) and the affected rows
> in §3 (Master Checklist) before the agent claims "done".

## 1. Executive Status

- **Overall completion:** **71%**
- **Engineering completion:** **87%**
- **Commercial launch readiness:** **46%**
- **Current phase:** Phase 3 — Autopilot waves (Truth-Sync, theme gateway, brand tokens, payment env, …)
- **Last updated:** 2026-06-24
- **Last completed task:** Migrations 0083 + 0084 + 0085 applied on staging + `AUTH_LEGACY_VERIFIED=0` flipped — Phase-1 legacy auth bypass retired
- **Current blocker:** Geidea credentials + shipping-aggregator selection (owner gates G1–G10 only — engineering side is unblocked)
- **Next recommended action:** Begin 22-wave SAFE FULL AUTOPILOT — Wave 0 (Truth Sync of `docs/agent-os/*` + `docs/ops/*`).

## 2. Progress Scale

|    Value | Meaning                |
| -------: | ---------------------- |
|   **0%** | غير موجود              |
|  **25%** | مخطط أو skeleton فقط   |
|  **50%** | منفذ جزئياً            |
|  **75%** | منفذ ويحتاج اختبار/ربط |
|  **90%** | جاهز staging           |
| **100%** | جاهز production ومختبر |

## 3. Master Checklist

### A. Auth / Identity

| ID  | Task                                       | Status      | Progress | Evidence                                                                                                                                   | Blocker                                                      | Next Action                                      |
| --- | ------------------------------------------ | ----------- | -------: | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------ |
| A1  | Phone-first registration                   | Done        |     100% | PR #163 (`6a26097f`) + migration 0080 (partial UNIQUE)                                                                                     | —                                                            | —                                                |
| A2  | Unique phone number                        | Done        |     100% | Migration `0080_users_phone_unique.sql` applied on staging                                                                                 | —                                                            | —                                                |
| A3  | Login by phone/email                       | Done        |     100% | PR #163 — `AuthFlowService.login` accepts `identifier`                                                                                     | —                                                            | —                                                |
| A4  | Email OTP infrastructure                   | Done        |     100% | PR #162 (`3a7f6690`) + migration 0079 + `EmailOtpService`                                                                                  | —                                                            | —                                                |
| A5  | Signup verify via OTP                      | Done        |     100% | PR #164 (`37195928`) + migration 0081 (`email_verified_at`)                                                                                | —                                                            | —                                                |
| A6  | Password reset OTP                         | Done        |     100% | PR #165 (`b5e8962c`) — `/auth/password-reset/{request,confirm}`                                                                            | —                                                            | —                                                |
| A7  | Magic login OTP                            | Done        |     100% | PR #173 (`59812bc6`) — `/auth/magic-login/{request,confirm}`                                                                               | —                                                            | —                                                |
| A8  | Auth rate limits                           | Done        |     100% | PR #166 (`bf77fbe9`) — per-route `rateLimiter` on register/login                                                                           | —                                                            | —                                                |
| A9  | Legacy user backfill (`email_verified_at`) | Done        |     100% | Migration 0083 applied on staging (run `28116088846`) — `email_verified_at = created_at` for legacy rows                                   | —                                                            | —                                                |
| A10 | Disable `AUTH_LEGACY_VERIFIED` flag        | Done        |     100% | `ops-staging-env` flipped key=`AUTH_LEGACY_VERIFIED` value=`0` on staging (run `28116152919`) + api restarted — transitional bypass closed | —                                                            | —                                                |
| A11 | SMS OTP decision                           | Not Started |       0% | —                                                                                                                                          | Owner decision: SMS vs WhatsApp-only as fallback OTP channel | Owner picks: Unifonic/Taqnyat or skip SMS for v1 |
| A12 | SMS provider integration                   | Not Started |      25% | `packages/notification-core/providers/{unifonic,taqnyat}.ts` exist (skeleton)                                                              | Owner credentials                                            | After A11 decision: wire selected provider       |

### B. Email / SMTP / Notifications

| ID  | Task                          | Status      | Progress | Evidence                                                                            | Blocker                                                        | Next Action                                                  |
| --- | ----------------------------- | ----------- | -------: | ----------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| B1  | SMTP provider                 | Done        |     100% | PR #161 (`153ab485`) — `SmtpEmailProvider` via nodemailer + Hostinger               | —                                                              | —                                                            |
| B2  | Branded email template        | Done        |     100% | `renderHaaEmail` + brand stripe + RTL — PR #161                                     | —                                                              | —                                                            |
| B3  | Landing contact email notify  | Done        |     100% | PR #157 (`d22785a4`) + PR #161 wires SMTP                                           | —                                                              | —                                                            |
| B4  | Welcome email                 | Done        |     100% | PR #168 (`1aa63438`) — fire-and-forget in `verifySignup`                            | —                                                              | —                                                            |
| B5  | Store published email         | Done        |     100% | PR #172 (`9777c904`) — fires in `PublishGateService.publish`                        | —                                                              | —                                                            |
| B6  | Order transactional emails    | Done        |     100% | PR #167 (`4bfcfd95`) — created/status/refund/new_order                              | —                                                              | —                                                            |
| B7  | Low-stock email               | Done        |     100% | PR #176 (`7639b1a0`) + migration 0084 applied on staging (run `28116088846`)        | —                                                              | —                                                            |
| B8  | Abandoned-cart recovery email | Done        |     100% | PR #177 (`11ff2b7c`) — system-default ladder gated by `FEATURE_EMAIL_RECOVERY_LIVE` | —                                                              | —                                                            |
| B9  | Subscription renewal reminder | Done        |     100% | PR #179 + migration 0085 applied on staging (run `28116088846`) — scheduler live    | —                                                              | —                                                            |
| B10 | SPF / DKIM / DMARC            | Blocked     |      50% | Hostinger MX records are set (memory); DKIM/DMARC unverified                        | Owner: verify DKIM signature + DMARC policy on `haastores.com` | Run `dig TXT hello._domainkey.haastores.com` and DMARC check |
| B11 | Email failure monitoring      | Not Started |      25% | Errors logged to stderr only; no Sentry/alert routing                               | Sentry DSN env (owner)                                         | After Sentry: wire SMTP failure events                       |
| B12 | Unsubscribe / opt-out         | Not Started |      25% | Abandoned-cart footer has unsubscribe link (text-only)                              | No DB column for `customers.emailOptOut`                       | Add column + link handler endpoint                           |

### C. Payments

| ID  | Task                            | Status  | Progress | Evidence                                                                                         | Blocker                                                | Next Action                                   |
| --- | ------------------------------- | ------- | -------: | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | --------------------------------------------- |
| C1  | Order state machine hardening   | Done    |     100% | PR #169 (`c17e9f71`) — `PAYMENT_STATUS_TRANSITIONS` + idempotency + TOCTOU fix                   | —                                                      | —                                             |
| C2  | 3DS challenge flow              | Done    |     100% | `tests/3ds-flow.test.ts`, `Fake3DSChallenge.tsx` storefront page                                 | —                                                      | —                                             |
| C3  | COD fee policy                  | Done    |      90% | `tests/cod-fees.test.ts`, `tests/platform-fees-wiring.test.ts`                                   | Owner: confirm production COD fee %                    | Confirm fee schedule with owner               |
| C4  | Payment guards                  | Done    |     100% | `phase2-payments.test.ts`, `packages/payment-providers/`                                         | —                                                      | —                                             |
| C5  | Sandbox payment / mock provider | Done    |      75% | `FakePaymentProvider` exists; partial scenario coverage                                          | Full 9-scenario simulator from Wave 3 not yet built    | Build mock-payment simulator (W3)             |
| C6  | Geidea credentials              | Blocked |       0% | —                                                                                                | **Owner gate G1/G2** — Geidea CR + merchant onboarding | Owner: complete Geidea KYC, share credentials |
| C7  | Geidea webhook secret           | Blocked |      25% | Webhook handler abstraction exists (`payment-webhook-service.ts`)                                | C6 must complete                                       | After C6: store webhook secret in `.env`      |
| C8  | Geidea live payment             | Blocked |      25% | Provider contract drafted (`docs/ops/GEIDEA_PAYMENT_READINESS.md`)                               | C6 + C7                                                | After credentials: sandbox tests → live       |
| C9  | Refund flow                     | Blocked |      50% | `OrdersService.updatePaymentStatus` handles `refunded/partially_refunded` (PR #167 emails wired) | C6 production provider                                 | After C6: end-to-end refund test              |
| C10 | Prevent fake/live mix           | Done    |      90% | Provider selection gated by `PAYMENT_SANDBOX_*` vs `PAYMENT_LIVE_*` env vars                     | Live keys missing (C6)                                 | C6                                            |

### D. Shipping

| ID  | Task                            | Status      | Progress | Evidence                                                                     | Blocker                                                  | Next Action                                                                    |
| --- | ------------------------------- | ----------- | -------: | ---------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| D1  | Shipping aggregator credentials | Blocked     |       0% | —                                                                            | **Owner gate** — name + credentials of chosen aggregator | Owner: confirm aggregator name (preliminary agreement noted but not finalized) |
| D2  | Rate API abstraction            | Done        |      75% | `packages/shipping-core/` exists; `tests/shipping-lc2d.test.ts`              | D1                                                       | After D1: bind live rate API                                                   |
| D3  | Create label                    | Not Started |      25% | Label abstraction skeleton in shipping-core                                  | D1                                                       | After D1: implement label create                                               |
| D4  | Print label                     | Not Started |      25% | Storefront prints from `shipments` table                                     | D1                                                       | After D1: wire PDF generation                                                  |
| D5  | Tracking                        | Done        |      75% | `OrdersService.changeStatus`+`storefront/checkout.track` route works locally | D1 (real provider tracking IDs)                          | After D1: provider tracking webhook                                            |
| D6  | Handover                        | Not Started |      25% | Skeleton exists; no real provider integration                                | D1                                                       | —                                                                              |
| D7  | Returns                         | Not Started |      25% | Order-state transitions cover `returned/refunded` (PR #169)                  | D1 + return-policy DB schema                             | —                                                                              |
| D8  | Shipping pricing                | Done        |      75% | `tests/haa-1004-shipping-guards.test.ts` enforces guards                     | D1 (real provider rates)                                 | —                                                                              |
| D9  | Service areas / eligibility     | Done        |      75% | `shippingMethods` table + per-method `serviceAreas` jsonb                    | D1 (provider coverage rules)                             | —                                                                              |

### E. Storefront / Domains

| ID  | Task                              | Status | Progress | Evidence                                                                  | Blocker                           | Next Action                              |
| --- | --------------------------------- | ------ | -------: | ------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------- |
| E1  | Storefront smoke test             | Done   |      90% | `tests/storefront-safety.test.ts`, `tests/pre-launch-smoke.test.ts`       | Production Cloudflare DNS missing | After Cloudflare: full smoke             |
| E2  | Merchant subdomain                | Done   |     100% | `${slug}.haastores.com` resolved via wildcard DNS + Caddy                 | —                                 | —                                        |
| E3  | Merchant custom domain            | Done   |      75% | `CustomDomainService` + `tests/3ds-flow` style checks; verify flow exists | DNS-level test pending            | Owner verify with a real merchant domain |
| E4  | Domain verification (TXT + CNAME) | Done   |      90% | `packages/commerce-core/src/custom-domain.ts` — TXT+CNAME ok flow         | —                                 | —                                        |
| E5  | SSL automation (Caddy)            | Done   |      90% | Caddy auto-issues via ACME on first request                               | Production Cloudflare not set     | After Cloudflare: validate               |
| E6  | DNS instructions                  | Done   |      75% | Custom-domain UI returns instruction strings                              | —                                 | —                                        |
| E7  | Fallback / StoreNotFound          | Done   |     100% | `apps/storefront/src/pages/StoreNotFound.tsx`                             | —                                 | —                                        |

### F. Merchant Dashboard

| ID  | Task                                      | Status | Progress | Evidence                                                                            | Blocker                            | Next Action |
| --- | ----------------------------------------- | ------ | -------: | ----------------------------------------------------------------------------------- | ---------------------------------- | ----------- |
| F1  | Publish checklist + drill-down UI         | Done   |     100% | PR #175 (`542c0f23`) — `ChecklistDrillDown` + `/compliance/checklist` consolidation | —                                  | —           |
| F2  | Store settings                            | Done   |      90% | `apps/merchant-dashboard/src/pages/settings/*`                                      | Some sub-routes are tabs not paths | —           |
| F3  | Policies (privacy/terms/shipping/returns) | Done   |     100% | `PoliciesService` + `/policies/:type/publish` route                                 | —                                  | —           |
| F4  | Products (CRUD + variants + images)       | Done   |     100% | `packages/commerce-core/src/products.ts` + `tests/products-final-qa.test.ts`        | —                                  | —           |
| F5  | Orders                                    | Done   |     100% | `tests/order-actions-qa.test.ts`, `tests/orders-lc2b.test.ts`                       | —                                  | —           |
| F6  | Customers                                 | Done   |      90% | `tests/customer-segmentation.test.ts`                                               | —                                  | —           |
| F7  | Coupons                                   | Done   |      90% | `tests/g10-storefront-dto-contract.test.ts` + `coupons.ts`                          | —                                  | —           |
| F8  | Marketing actions                         | Done   |      90% | `tests/marketing-action-engine.test.ts`, `tests/marketing-events.test.ts`           | —                                  | —           |
| F9  | Staff / permissions                       | Done   |     100% | `tests/employee-management-api.test.ts`, RBAC tests                                 | —                                  | —           |
| F10 | Verification / compliance                 | Done   |      90% | `ComplianceChecklistService` + dashboard PublishSection                             | —                                  | —           |

### G. Admin Dashboard

| ID  | Task                                 | Status       | Progress | Evidence                                                         | Blocker                                               | Next Action                                         |
| --- | ------------------------------------ | ------------ | -------: | ---------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------- |
| G1  | Admin landing inbox                  | Done         |     100% | PR #159 (`c1d987ad`) — list/filter/detail/status                 | —                                                     | —                                                   |
| G2  | Tenant/store management              | Done         |      90% | `apps/admin-dashboard/src/` + `tests/staging-security.test.ts`   | —                                                     | —                                                   |
| G3  | Compliance review                    | Done         |      75% | KYC profile fields + checklist                                   | UI for admin-side review TBD                          | Build admin compliance-review page                  |
| G4  | Settings                             | Done         |      75% | Admin settings exist; needs platform-level legal entity wiring   | PR #179 (legal entity constants)                      | After PR #179: wire CR + VAT into platform settings |
| G5  | Logs / audit                         | Done         |     100% | `tests/audit-logs.test.ts`, `AuditLogService`                    | —                                                     | —                                                   |
| G6  | Support visibility                   | Done         |      75% | `tests/support-errors.test.ts` (W10 will tighten to 404 in prod) | W10 of Autopilot                                      | —                                                   |
| G7  | Platform branding                    | Needs Review |      75% | `#5c9cd5` is canonical (memory) + design-tokens.test enforces    | 85 hex literals still in storefront (per test output) | Run W2 (brand audit) to drive to zero               |
| G8  | Operational controls (feature flags) | Done         |      75% | `ops-staging-env` allow-list — extended in PR #174               | New flags need allow-list additions per PR            | Document the allow-list extension policy            |

### H. Billing / Subscriptions

| ID  | Task                        | Status      | Progress | Evidence                                                                   | Blocker                                    | Next Action                          |
| --- | --------------------------- | ----------- | -------: | -------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------ | ------------------- |
| H1  | Plans                       | Done        |     100% | `subscriptionPlans` table + 4 seeded plans (Starter/Growth/Pro/Business)   | —                                          | —                                    |
| H2  | Trial / free plan           | Done        |      90% | `merchantSubscriptions.status = 'trialing'` + `trialEnd`                   | Trial→active transition cron not yet built | Add cron job                         |
| H3  | Subscription lifecycle      | Done        |      75% | `packages/commerce-core/src/subscriptions.ts`                              | Renewal cron from PR #178                  | After H4 + H5                        | After PR #178 lands |
| H4  | Renewal reminders (7d + 1d) | Done        |     100% | PR #179 + migration 0085 applied (run `28116088846`) — same as B9          | —                                          | —                                    |
| H5  | Subscription invoices       | Done        |      75% | `subscriptionInvoices` table + ZATCA hooks pending                         | I4 (ZATCA)                                 | After I4                             |
| H6  | Grace period                | Not Started |      25% | No explicit grace logic                                                    | Owner decision: # of days                  | Owner picks: 3 / 7 / 14 days         |
| H7  | Suspension policy           | Not Started |      25% | `stores.publishStatus = 'suspended'` exists                                | H6 + owner decision                        | After H6: build auto-suspend cron    |
| H8  | Plan limits enforcement     | Done        |      75% | `productLimit`, `staffLimit`, `storageLimitMb`, `orderLimit` columns exist | UI to surface limit-reached errors         | Wire dashboard banner when limit hit |

### I. VAT / ZATCA / Invoices

| ID  | Task                                  | Status      | Progress | Evidence                                                                                  | Blocker                                                   | Next Action                                               |
| --- | ------------------------------------- | ----------- | -------: | ----------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------- |
| I1  | VAT calculation                       | Done        |      90% | `packages/zatca-core/` + `tests/zatca-hash-chain.test.ts`                                 | —                                                         | —                                                         |
| I2  | Invoice numbering                     | Done        |     100% | `orderPrefix` + sequential per-store                                                      | —                                                         | —                                                         |
| I3  | QR (Phase 1)                          | Done        |      90% | ZATCA Phase 1 TLV QR implemented in zatca-core                                            | —                                                         | —                                                         |
| I4  | ZATCA Phase 2 readiness               | Blocked     |      50% | Hash-chain + signing skeleton exists                                                      | **Owner gate G2** — VAT certificate + ZATCA portal access | Owner: complete ZATCA onboarding                          |
| I5  | Refund invoice / credit note          | Not Started |      25% | Refund flow exists; credit-note doc not generated                                         | I4                                                        | After I4                                                  |
| I6  | Tax settings per store                | Done        |     100% | `storeSettings.defaultCurrency` + VAT toggles in kycProfiles                              | —                                                         | —                                                         |
| I7  | Platform legal entity (CR 7038798612) | Done        |     100% | PR #181 (merged) — single source `platform-entity.ts` + email/landing/legal-page surfaces | —                                                         | ZATCA invoice rendering uses same constant in a follow-up |

### J. Analytics / Reports

| ID  | Task                   | Status | Progress | Evidence                                            | Blocker | Next Action |
| --- | ---------------------- | ------ | -------: | --------------------------------------------------- | ------- | ----------- |
| J1  | Sales reports          | Done   |      90% | `packages/commerce-core/src/reports.ts` + dashboard | —       | —           |
| J2  | Product reports        | Done   |      90% | Same                                                | —       | —           |
| J3  | Customer reports       | Done   |      75% | Customer segmentation tests                         | —       | —           |
| J4  | Order reports          | Done   |      90% | Order list filters cover dashboards                 | —       | —           |
| J5  | Export CSV/XLSX        | Done   |      75% | `packages/commerce-core/src/exports.ts`             | —       | —           |
| J6  | Growth metrics         | Done   |      75% | `tests/growth-insights.test.ts`                     | —       | —           |
| J7  | Live radar / dashboard | Done   |      75% | `tests/live-presence.test.ts` + live snapshot cron  | —       | —           |

### K. Import / Export

| ID  | Task                     | Status      | Progress | Evidence                                       | Blocker             | Next Action                   |
| --- | ------------------------ | ----------- | -------: | ---------------------------------------------- | ------------------- | ----------------------------- |
| K1  | Product import (CSV)     | Done        |      75% | `commerce-core/products.ts` import path        | UI polish + dry-run | —                             |
| K2  | Product export           | Done        |      75% | `exports.ts`                                   | —                   | —                             |
| K3  | Customer import / export | Done        |      50% | Schema supports; UI partial                    | —                   | —                             |
| K4  | Orders export            | Done        |      75% | —                                              | —                   | —                             |
| K5  | Validation               | Done        |      75% | Zod schemas across import paths                | —                   | —                             |
| K6  | Dry-run                  | Not Started |      25% | No `--dry-run` flag in import service          | Spec from owner     | Add `dryRun:true` mode        |
| K7  | Rollback strategy        | Not Started |      25% | Transactional inserts; no batch-level rollback | —                   | Design batch-import savepoint |

### L. Themes / Marketplace

| ID  | Task                                        | Status | Progress | Evidence                                                           | Blocker                                                   | Next Action                             |
| --- | ------------------------------------------- | ------ | -------: | ------------------------------------------------------------------ | --------------------------------------------------------- | --------------------------------------- |
| L1  | Theme isolation (storefront-themes gateway) | Done   |      75% | `packages/storefront-themes/` + `/server` entrypoint               | Wave 1 enforces dashboard import bans                     | Run Autopilot W1                        |
| L2  | Theme preview                               | Done   |      75% | Storefront-themes runtime renders                                  | —                                                         | —                                       |
| L3  | Theme activation                            | Done   |      90% | `storeSettings.themeConfig` jsonb default                          | —                                                         | —                                       |
| L4  | Theme registry                              | Done   |      75% | `packages/storefront-themes/` is the registry                      | —                                                         | —                                       |
| L5  | Theme safety tests                          | Done   |      75% | `tests/luxury-showcase-visual-regression.test.ts` + brand-fidelity | Theme-boundary test from W1                               | W1                                      |
| L6  | Marketplace governance (Haa Marketplace)    | Done   |      50% | `apps/api/src/routes/haa-marketplace.ts` + storefront UI           | SFDA category enforcement deferred to Phase 2 marketplace | Owner: enable marketplace beta or defer |

### M. Security / Ops

| ID  | Task                                       | Status      | Progress | Evidence                                                                                          | Blocker                                               | Next Action                                       |
| --- | ------------------------------------------ | ----------- | -------: | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------- |
| M1  | Gitleaks (current snapshot)                | Done        |     100% | CI passes Secret Scan (G4) + Secrets Scan                                                         | —                                                     | —                                                 |
| M2  | CI (lint + typecheck + tests)              | Done        |     100% | `.github/workflows/ci.yml` + PR #183 (`live-presence` flake fix via NODE_ENV=test scheduler gate) | —                                                     | —                                                 |
| M3  | Lint (`pnpm exec eslint --max-warnings 0`) | Done        |     100% | Pre-commit hook + CI both enforce                                                                 | —                                                     | —                                                 |
| M4  | Tests (unit + source-grep)                 | Done        |     100% | ~120 test files in `tests/`; pre-commit runs full suite                                           | —                                                     | —                                                 |
| M5  | E2E                                        | Done        |      75% | `tests/e2e-shipping-tracking.test.ts`, Playwright mounted (W17 of Autopilot may extend)           | More journeys needed                                  | Wave 17 of Autopilot                              |
| M6  | Branch protection                          | Done        |      90% | GitHub branch protection requires CI green + 1 approval                                           | Production branch policy TBD                          | Owner action when production launches             |
| M7  | Release gate                               | Done        |      75% | `release-gate` skill exists; no production runs yet                                               | After H7 + production deploy plan                     | —                                                 |
| M8  | Backup strategy                            | Done        |      75% | `ops-staging-migrate` snapshots DB pre-migration                                                  | Automated nightly backup on staging not yet scheduled | Schedule nightly `pg_dump` cron                   |
| M9  | Restore drill                              | Blocked     |      25% | Backup file path documented in workflow                                                           | **Owner gate G10** — DR tabletop                      | Owner: schedule DR drill                          |
| M10 | Monitoring                                 | Not Started |      25% | Health-check endpoints exist (`/health`)                                                          | No external uptime monitor                            | Pick: Uptime Kuma / Better Uptime / Sentry Status |
| M11 | Alerting                                   | Not Started |      25% | No Slack/email alert pipeline yet                                                                 | Owner Slack workspace + Sentry DSN                    | Owner: confirm Slack workspace                    |
| M12 | Disaster recovery                          | Blocked     |      25% | DR plan doc exists (`docs/ops/OWNER_ACTION_G10_DR_PLAN.md`)                                       | M9                                                    | M9                                                |
| M13 | Secrets audit                              | Done        |      75% | `.env.example` + gitleaks regex; secrets never committed                                          | Pen-test verification                                 | Owner gate G6/G7                                  |

### N. Staging / Production Launch

| ID  | Task                        | Status  | Progress | Evidence                                                                                    | Blocker                                 | Next Action                                   |
| --- | --------------------------- | ------- | -------: | ------------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------- |
| N1  | Staging migrations workflow | Done    |     100% | `.github/workflows/ops-staging-migrate.yml`                                                 | —                                       | —                                             |
| N2  | Staging env workflow        | Done    |      90% | `.github/workflows/ops-staging-env.yml` + allow-list (PR #174 extended)                     | Allow-list documentation policy         | Document the per-PR allow-list extension rule |
| N3  | Staging deploy              | Done    |     100% | `deploy.yml` + PR #183 (6×backoff warmup ~24min + `deploy-watchdog.yml` auto-recovery)      | —                                       | —                                             |
| N4  | Staging smoke test          | Done    |      85% | `tests/pre-launch-smoke.test.ts` + PR #183 watchdog opens `deploy-failure` issue on failure | No automated post-deploy smoke gate yet | Wire smoke into deploy.yml                    |
| N5  | Production deploy plan      | Blocked |      25% | `docs/ops/PHASE_5_DEPLOY_RUNBOOK.md` exists                                                 | **Owner gates G1–G10**                  | Owner completes G1–G10                        |
| N6  | Production rollback plan    | Done    |      75% | `ops-staging-migrate` keeps backup file; `docker compose` rollback documented               | Owner-tested rollback drill             | M9                                            |
| N7  | Beta merchants              | Blocked |      25% | No beta merchant onboarded yet                                                              | Owner: identify 3 beta merchants        | Owner action                                  |
| N8  | Launch checklist            | Done    |      75% | `docs/ops/BETA_LAUNCH_CHECKLIST.md` + `BETA_LAUNCH_TECHNICAL_CHECKLIST.md`                  | —                                       | —                                             |

### Owner Gates (G1–G10)

| Gate | Description                   | Status                                                        | Evidence                                                                  |
| ---- | ----------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| G1   | CR (Commercial Registration)  | Provided 2026-06-24 — CR 7038798612, مؤسسة حرف الهاء التجارية | Memory `legal-entity-info.md`                                             |
| G2   | VAT / ZATCA enrollment        | Blocked                                                       | `docs/ops/OWNER_ACTION_G2_VAT.md`                                         |
| G3   | E-commerce license (SBC)      | Blocked                                                       | `docs/ops/OWNER_ACTION_G3_ECOMMERCE_LICENSE.md`                           |
| G4   | DPO (Data Protection Officer) | Blocked                                                       | `docs/ops/OWNER_ACTION_G4_DPO.md`                                         |
| G5   | Trademark filing              | Blocked                                                       | `docs/ops/OWNER_ACTION_G5_TRADEMARK.md` + `TRADEMARK_FILING_MATERIALS.md` |
| G6   | PCI-DSS ASV scan              | Blocked                                                       | `docs/ops/OWNER_ACTION_G6_PCI_ASV.md`                                     |
| G7   | Pen-test                      | Blocked                                                       | `docs/ops/OWNER_ACTION_G7_PENTEST.md`                                     |
| G8   | KSA hosting compliance        | Blocked                                                       | `docs/ops/OWNER_ACTION_G8_KSA_HOSTING.md`                                 |
| G9   | Tabby/BNPL DPA                | Blocked                                                       | `docs/ops/OWNER_ACTION_G9_TABBY_DPA.md`                                   |
| G10  | DR tabletop                   | Blocked                                                       | `docs/ops/OWNER_ACTION_G10_DR_PLAN.md`                                    |

## 4. Task Format (legend)

Status: `Not Started` · `In Progress` · `Blocked` · `Needs Review` · `Done` · `Deferred`

## 5. Update Log

### 2026-06-24 — Initial ledger creation (PR #178)

- Completed: PRs #160–#177 inventoried (auth + emails + state hardening + drill-down UI + recovery ladder)
- Changed: New unified ledger file `docs/HAA_TASK_LEDGER.md`
- Tests run: read-only — no test changes
- CI status: not triggered yet (ledger PR follows)
- New blockers: none (existing G1–G10 already tracked)
- Updated completion: overall 62% / engineering 78% / commercial 38%
- Recommendation:
  1. Land PR #179 (Subscription renewal reminder) — stashed work, finish commit
  2. Land PR #180 (CR 7038798612 wiring into legal-facing surfaces)
  3. Begin 22-wave Autopilot from W0 (Truth Sync)

### 2026-06-24 — Staging migrations applied + AUTH_LEGACY_VERIFIED retired

- Completed:
  - `ops-staging-migrate` run **`28116088846`** applied **3 migrations** in one batch on staging:
    - **0083** — `UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL` (legacy backfill)
    - **0084** — `ALTER TABLE products ADD COLUMN last_low_stock_alerted_at` (low-stock dedupe)
    - **0085** — `ALTER TABLE merchant_subscriptions ADD COLUMN last_renewal_reminder_at, last_renewal_reminder_step` (renewal dedupe)
  - `ops-staging-env` run **`28116152919`** flipped `AUTH_LEGACY_VERIFIED=0` + restarted `api` container. The Phase-1 transitional bypass is now closed — every login MUST pass through `email_verified_at !== null`.
- Tests run: post-migration health-check passed via ops workflow's built-in `__drizzle_migrations` journal verification + container restart smoke.
- Rows updated:
  - A9 → Done 100% (was 90%) — backfill applied
  - A10 → Done 100% (was 75%) — flag flipped
  - B7 → blocker cleared (low-stock dedupe live)
  - B9 + H4 → blocker cleared (renewal reminders live)
- New blockers: only owner gates remain (G1–G10).
- Updated completion: overall **71%** (+3) / engineering **87%** (+3) / commercial **46%** (+2 — first staging-live commercial-side migration cluster)
- Recommendation: **Begin 22-wave SAFE FULL AUTOPILOT.** Start at Wave 0 (Truth-Sync of `docs/agent-os/*` + `docs/ops/*` against the new state of the repo).

### 2026-06-24 — PR #183 merged: deploy hardening + scheduler test gate

- Completed: PR #183 (`fix(ci): root-cause deploy failures — fail2ban window + scheduler test flake`) — merged on main
- Three structural fixes for repeating red Actions:
  1. **SSH warmup window:** 3 retries × 30/60/90 s = ~3 min was below the staging fail2ban 15-min ban. Now 6 retries × 30/60/120/240/480/480 = ~24 min. Applied to BOTH staging and production warmup blocks.
  2. **`deploy-watchdog.yml` (new workflow):** triggers on completed Deploy runs, classifies failure (`ssh-fail2ban` / `code-failure` / `unknown`), auto-reruns ONCE for transient SSH failures (after 18-min sleep past ban window), opens a `deploy-failure` issue otherwise, auto-closes issues on next successful deploy.
  3. **`worker.ts` scheduler test gate:** `startScheduler` + `startBullMQWorker` now early-return on `NODE_ENV === 'test'`. Eliminates PROBLEM-012 (`EnvironmentTeardownError: Closing rpc while onUserConsoleLog was pending`) which had been killing CI on green test runs.
- Companion docs: `docs/ops/DEPLOY_FAILURE_PLAYBOOK.md` documents all three failure classes + manual-unban commands + 4 anti-patterns.
- Tests: `tests/deploy-hardening.test.ts` (19 source-grep guards) — including a "does NOT silently downgrade retry count" assertion to prevent the original 3-attempt regression from sneaking back. `tests/live-presence.test.ts` now passes without the teardown error.
- Rows updated: M2 (CI evidence updated) · N3 (deploy hardening) · N4 (auto-recovery added, 75→85%)
- New blockers: none (all three are removed)
- Updated completion: overall **68%** (+2) / engineering **84%** (+2) / commercial **44%** (+2)
- Recommendation:
  1. Batch `ops-staging-migrate` for 0083 + 0084 + 0085 (now safe — watchdog catches failures)
  2. Flip `AUTH_LEGACY_VERIFIED=0` via `ops-staging-env`
  3. Begin 22-wave Autopilot from W0

### 2026-06-24 — PR #181 merged: platform legal entity wired

- Completed: PR #181 (`feat(legal): wire platform CR 7038798612 into email + landing + legal pages`) — merged on main
- Changed:
  - `packages/shared/src/legal/platform-entity.ts` (new) — single source of truth (CR `7038798612` lives here only)
  - `packages/shared/src/index.ts` — re-export
  - `packages/notification-core/src/email-template.ts` — entity footer block
  - `apps/storefront/src/pages/LandingPage.tsx` — `<p className="lp-legal-entity">` below copyright
  - `apps/storefront/src/pages/LegalPage.tsx` — entity header card above sections
  - `apps/storefront/src/landing/landing.css` — `.lp-legal-entity` rule
  - `apps/storefront/package.json` + `pnpm-lock.yaml` — added `@haa/shared` workspace dep
  - `tests/platform-legal-entity.test.ts` (new — 14 tests)
- Tests run: `pnpm typecheck` clean · ESLint `--max-warnings 0` clean (1 pre-existing lucide warning silenced with targeted disable + rationale) · 14 + 135 regression all green
- CI status: green on PR; merged via squash
- Rows updated: I7 (Done 100%)
- New blockers:
  - **Deploy #205 for PR #179 failed** — SSH timeout, fail2ban ban on staging runner IP. Per `staging-deploy-fail2ban` memory: wait ~15 min then re-run.
- Updated completion: overall **66%** (+2) / engineering **82%** (+2) / commercial **42%** (+4 — first commercial-side surface complete)
- Recommendation:
  1. Re-run failed Deploy #205 once fail2ban window clears
  2. Batch `ops-staging-migrate` for 0083 + 0084 + 0085
  3. Flip `AUTH_LEGACY_VERIFIED=0` via `ops-staging-env`
  4. Begin 22-wave Autopilot from W0

### 2026-06-24 — PR #179 merged: subscription renewal reminder

- Completed: PR #179 (`feat(billing): subscription renewal reminder emails (7d + 1d)`) — merged on main
- Changed:
  - `packages/db/src/schema/subscriptions.ts` — `lastRenewalReminderAt` + `lastRenewalReminderStep` columns
  - `packages/db/src/migrations/0085_subscription_renewal_reminder_state.sql` + snapshot
  - `packages/notification-core/src/welcome-emails.ts` — `renderSubscriptionRenewalEmail`
  - `packages/commerce-core/src/subscription-renewal-notifier.ts` (new)
  - `apps/api/src/worker.ts` — `JOB_NAMES.subscriptionRenewalReminder` at 09:00 Asia/Riyadh + 4 pre-existing `any` cleaned up
  - `tests/subscription-renewal-reminder.test.ts` (new — 20 tests)
- Tests run: `pnpm typecheck` clean · ESLint `--max-warnings 0` clean · 31 + 99 regression all green
- CI status: green on PR; merged via squash
- Rows updated: B9 (Done 100%) · H4 (Done 100%)
- New blockers: migration 0085 not yet applied on staging — awaits `ops-staging-migrate`
- Updated completion: overall **64%** (+2) / engineering **80%** (+2) / commercial 38%
- Recommendation:
  1. PR #180 — CR 7038798612 wiring into email footer + storefront + legal pages
  2. Batch `ops-staging-migrate` to apply 0083 (legacy backfill) + 0084 (low-stock) + 0085 (renewal reminder)
  3. After 0083 settled: flip `AUTH_LEGACY_VERIFIED=0` via `ops-staging-env`
  4. Begin 22-wave Autopilot from W0

---

## 6. Mandatory Future Rule

> After ANY task lands on `main`, the agent MUST update this ledger
> BEFORE delivering the final task report. Specifically:
>
> 1. Update §1 Executive Status (last task / completion %).
> 2. Update the affected row(s) in §3 (Status / Progress / Evidence).
> 3. Append a new dated entry to §5 Update Log.
> 4. If a blocker has changed: update the Blocker column AND §1 Current blocker.
>
> Skipping the ledger update means the task is INCOMPLETE — restart and update before the final report.
>
> A task report MUST include:
>
> ```
> ## Task Report
> - Task:
> - Files changed:
> - Tests run:
> - Result:
> - Task ledger updated: yes/no
> - Overall completion:
> - Done:
> - Remaining:
> - Blockers:
> - Recommendation:
> ```
