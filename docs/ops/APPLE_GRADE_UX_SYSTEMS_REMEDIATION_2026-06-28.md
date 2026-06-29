# Apple-grade UX & Systems Remediation Matrix — TASK-0096

Date: 2026-06-28
Scope: code-level verification and scoped remediation batches for the pasted Claude diagnostic report.
Safety boundary: no deploy · no db:migrate · no secrets · no production action · no live payment/shipping calls.

## Verification Baseline

| Check | Result |
| --- | --- |
| `pwd` | `/Users/thwany/Desktop/haa-stores-core` |
| `pnpm preflight` | Passed before edits |
| `pnpm ops:monitor` | Passed with warnings only for non-running local dev servers; no active P0 incident |
| Known local blocker | Local DB drift around `orders.preparation_status` remains outside this task |

## Status Legend

| Status | Meaning |
| --- | --- |
| Closed in TASK-0096 | Fixed in this batch |
| Closed in TASK-0097 | Fixed in the admin dangerous-action reason-gate batch |
| Closed in TASK-0098 | Fixed in the public marketplace P0 closure batch |
| Closed in TASK-0099 | Fixed in the merchant onboarding resume batch |
| Closed in TASK-0100 | Fixed in the merchant first-product empty-state batch |
| Closed in TASK-0101 | Fixed in the merchant Employees permission-denied / last-owner UX batch |
| Closed in TASK-0102 | Fixed in the API deep health readiness batch |
| Closed in TASK-0103 | Fixed in the admin permission-reflection route/sidebar batch |
| Closed in TASK-0104 | Fixed in the admin API/UI RBAC alignment batch |
| Closed in TASK-0105 | Fixed in the audit PII masking coverage batch |
| Closed in TASK-0106 | Fixed in the public API scope middleware hardening batch |
| Closed in TASK-0107 | Fixed in the storefront return/refund intake batch |
| Closed in TASK-0108 | Fixed in the local monitoring alert-emission batch |
| Closed in TASK-0109 | Fixed in the local provider smoke-coverage batch |
| Closed in TASK-0110 | Fixed in the storefront privacy request-intake batch |
| Closed in TASK-0111 | Fixed in the storefront order confirmation recovery batch |
| Closed in TASK-0112 | Fixed in the storefront coupon error-reasons batch |
| Closed in TASK-0113 | Fixed in the storefront cart shipping-estimate batch |
| Closed in TASK-0114 | Fixed in the checkout stock-depletion recovery batch |
| Closed in TASK-0115 | Fixed in the merchant subscription plan-change clarity batch |
| Closed in TASK-0116 | Fixed in the storefront buyer phone-input RTL/tel semantics batch |
| Closed in TASK-0117 | Fixed in the Fake 3DS DEV/test badge batch |
| Closed in TASK-0118 | Fixed in the storefront buyer-control ARIA polish batch |
| Closed in TASK-0119 | Fixed in the merchant product-form ARIA polish batch |
| Closed in TASK-0120 | Fixed in the merchant theme-editor ARIA polish batch |
| Closed in TASK-0121 | Fixed in the admin IBAN reveal typing preflight-unblock batch |
| Closed in TASK-0122 | Fixed in the non-financial admin dangerous-action dialog accessibility batch |
| Confirmed open | Verified in current code and still needs implementation |
| Partially mitigated | Some guard exists, but the report item is not fully closed |
| Corrected: current code differs | Claude report item appears stale or overstated after current-code verification |
| Owner / environment gated | Needs owner action, provider setup, staging, or production ops |
| Deferred P2/P3 | Valid polish or product-quality item, not in first P0/P1 batch |

## Executive Risks

| ID | Report item | Current evidence | Status | Next action |
| --- | --- | --- | --- | --- |
| R1 | Failed payment only shows transient toast | `apps/storefront/src/pages/Checkout.tsx` catch previously only called `toast.error` | Closed in TASK-0096 | Persistent recovery alert with retry, change-payment, and support link added |
| R2 | Marketplace 6x P0: seller PII, prohibited products, unauth orders | TASK-0098 removed the legacy public `phone` lookup fallback, removed seller email/phone selection from public seller detail, and added a product-level prohibited-category guard across public marketplace queries | Closed in TASK-0098 for local code/source guards | Add runtime abuse/pen-test coverage in staging before public launch |
| R3 | Admin financial/admin actions without confirmation | `SettlementBatchDetail.tsx` approve/transfer/verify buttons were direct; bank review, tenant/store status, and marketplace reject/suspend needed stronger reason gates | Closed in TASK-0096/TASK-0097 for payout, bank review, tenant/store status, and marketplace negative moderation | Continue broad dangerous-action audit as new admin actions appear |
| R4 | No tested backup/restore | DR docs exist; no owner-executed restore drill observed in this task | Owner / environment gated | Owner must run backup automation and restore drill before live data |
| R5 | Monitoring not wired / shallow health | `/health` now reports storage/payment/shipping/email/observability readiness without exposing secret values; `ops:monitor` now emits local alert candidates; external delivery remains owner-wired | Partially mitigated | Wire external alerting/uptime/Sentry/Slack/email evidence before launch |

## Opportunities

| ID | Opportunity | Status | Next action |
| --- | --- | --- | --- |
| O1 | Unified page states: loading/empty/error/success/permission-denied | Confirmed open | Audit admin + merchant pages and introduce shared denied state where missing |
| O2 | Complete broken flows: failed payment, RMA, onboarding resume | Partially mitigated | Failed payment, onboarding resume, and buyer return/refund intake closed; full RMA lifecycle remains |
| O3 | Unified confirmation + reason for dangerous actions | Partially mitigated | Payout, bank review, store/tenant status, and marketplace reject/suspend covered; non-financial admin dangerous-action dialogs now share `AdminDialog`; financial dialog/accessibility work is coordinated separately with the financial Batch 4 stream |
| O4 | Reflect permissions in admin UI | Closed in TASK-0103/TASK-0104 for current admin dashboard/API routes | Server-gated routes and formerly auth-only admin operational routes now share server/UI permission alignment; continue this pattern for new admin endpoints |
| O5 | Wire real monitoring + deeper health | Partially mitigated | Deep health closed in TASK-0102; local alert emission closed in TASK-0108; external delivery remains |

## UX Flow Matrix

| ID | Page / flow | Report score | Status | Notes / next action |
| --- | --- | ---: | --- | --- |
| UX1 | Storefront checkout | 2.5/5 | Closed in TASK-0096/TASK-0114 for failure and stock recovery | Persistent payment recovery added; stock-depletion errors now guide buyers back to cart |
| UX2 | Product detail / cart | 4/5 | Partially mitigated in TASK-0114 | Checkout core already locks stock before payment; depletion at checkout now returns typed recovery, while a future hold-stock/reservation system remains a product decision |
| UX3 | Order success / track | 3.5/5 | Closed in TASK-0111 for support fallback | Missing-phone confirmation state now links to support with order number; real resend automation remains open |
| UX4 | Returns / refunds | 1/5 | Partially mitigated | Customer can now submit a structured support-ticket return/refund request from order tracking; full RMA labels/approvals/refund automation remain |
| UX5 | Merchant onboarding | 3.5/5 | Closed in TASK-0099 for local resume | Skip now saves a local draft, `/onboarding` restores it, and Getting Started exposes a resume CTA |
| UX6 | Merchant products | 3/5 | Closed in TASK-0100 | True empty catalog now shows an explicit "إضافة أول منتج" CTA; filtered no-results remains search/filter oriented |
| UX7 | Employees / permissions | 3.5/5 | Closed in TASK-0101 for listed Employees gaps | Employees page now renders `UnauthorizedState` when `employees:view` is missing and explains the last-owner guard inline |
| UX8 | Subscriptions | 3/5 | Closed in TASK-0115 | Plan-change confirmation now shows current/new price, delta, proration estimate, effective timing, and period impact |
| UX9 | Admin settlements | 3/5 | Closed in TASK-0096 for money-moving confirmation | Direct payout approve/transfer/verify now confirm first |
| UX10 | Admin general | 3/5 | Partially mitigated | Dangerous status/moderation actions improved and scoped non-financial dangerous dialogs now share `AdminDialog`; current admin dashboard pages have server/UI permission alignment; remaining admin quality gaps are broader page-state, pagination, finance-stream UI coordination, and ops polish |

## Missing Systems

| ID | Missing system | Priority | Status | Next action |
| --- | --- | --- | --- | --- |
| MS1 | Returns / refunds RMA | P1 | Partially mitigated | Buyer intake via support ticket is closed in TASK-0107; design full API + merchant operations + labels/refund automation |
| MS2 | Failed-payment recovery | P0 | Closed in TASK-0096 | Add browser E2E when local payment fixture is available |
| MS3 | Real monitoring / alerting | P1 | Partially mitigated | Local alert emission is closed in TASK-0108; external Sentry/uptime/Slack/email delivery remains owner/environment-gated |
| MS4 | Automated backup + restore drill | P0 production | Owner / environment gated | Owner-run backup/restore evidence required |
| MS5 | Deep `/health` | P1 | Closed in TASK-0102 | `/health` now reports storage/payment/shipping/email/observability readiness without live provider calls |
| MS6 | Marketplace compliance | P0 | Closed in TASK-0098 for local code/source guards | Runtime abuse tests and external pen-test remain launch gates |
| MS7 | Buyer accounts / reviews | P2 | Deferred P2 | Product decision |
| MS8 | Data export/delete privacy flow | P1 | Partially mitigated | Buyer-facing support intake closed in TASK-0110; automated export/deletion fulfillment and retention workflows remain |

## Missing Actions

| ID | Action gap | Status | Next action |
| --- | --- | --- | --- |
| A1 | Failed payment handling | Closed in TASK-0096 | Persistent recovery alert added |
| A2 | Start return/refund | Closed in TASK-0107 for buyer intake | Order tracking now opens a structured support ticket; full RMA lifecycle remains under MS1 |
| A3 | Confirm settlement approval | Closed in TASK-0096 | Approval now opens confirmation |
| A4 | Confirm + reason for bank verification | Closed in TASK-0096 | Bank review dialog requires reason and API validation |
| A5 | Confirm + reason for store/tenant suspension | Closed in TASK-0097 | Tenant/store status changes now require UI reason and API `statusReason` validation |
| A6 | Marketplace product rejection reason required | Closed in TASK-0097 | Marketplace reject/suspend now require note in UI and API validation |
| A7 | First-product empty CTA | Closed in TASK-0100 | Empty catalog action opens product creation; filtered no-results does not show the first-product CTA |
| A8 | Resume onboarding after skip | Closed in TASK-0099 | Local draft save/restore + Getting Started resume CTA added |
| A9 | Shipping estimate before checkout | Closed in TASK-0113 | Cart now estimates shipping by city and keeps final checkout caveat |
| A10 | Permission-denied state for Employees | Closed in TASK-0101 | Page-level guard now returns `UnauthorizedState` and skips employee fetch when `employees:view` is missing |
| A11 | Explain last-owner guard | Closed in TASK-0101 | Last-owner guard now explains that another owner must be assigned before edit/delete |
| A12 | Coupon error reason | Closed in TASK-0112 | Server/API reasons are preserved and shown as persistent actionable alert |

## UX Defects

| ID | Defect | Status | Next action |
| --- | --- | --- | --- |
| UB1 | Payment failure is toast-only | Closed in TASK-0096 | Source guard added |
| UB2 | No-permission looks like empty employees | Closed in TASK-0101 | Source guard added |
| UB3 | Last-owner guard lacks explanation | Closed in TASK-0101 | Source guard added |
| UB4 | Product empty table lacks CTA | Closed in TASK-0100 | Source guard added |
| UB5 | Order phone gate lacks resend path | Closed in TASK-0111 for support fallback | Real email/SMS resend automation remains a separate integration follow-up |
| UB6 | Coupon errors lack explanation | Closed in TASK-0112 | Cart keeps server/API reasons and adds practical guidance |
| UB7 | Phone field RTL review | Closed in TASK-0116 for scoped buyer flows | Checkout/tracking/support/marketplace buyer phone inputs now use tel semantics and LTR direction |

## Logic / Security / Ops

| ID | Area | Report item | Status | Next action |
| --- | --- | --- | --- | --- |
| L1 | Logic | No inventory recheck between cart and payment | Closed in TASK-0114 for checkout-time guard/recovery | Corrected against current code: commerce-core already locks stock before payment; API/UI now expose typed stock-depletion recovery. Future hold-stock UX remains separate |
| L2 | Logic | Marketplace parallel cart/order and route collision risk | Partially mitigated | Existing source route regression passed in TASK-0098; runtime navigation tests still needed |
| L3 | Logic | Settlement double-payment guard not visible in UI | Partially mitigated | Confirmation added; expose maker-checker/double-payment state in UI later |
| L4 | Logic | Core order/payment state machine strong | Confirmed strength | Do not refactor core now |
| S1 | Security | Marketplace seller PII leak | Closed in TASK-0098 | Seller public response and seller detail select no longer expose email/phone; source guard updated |
| S2 | Security | Marketplace order auth concern | Closed in TASK-0098 for local code/source guards | Public guest creation remains by design; order tracking is access-token-only |
| S3 | Security | CSP unsafe-inline + JWT localStorage | Corrected / partially open | CSP script-src is strict; style-src has unsafe-inline; session storage remains broader security task |
| S4 | Security | `maskObject()` PII masking uncertainty | Closed in TASK-0105 | Shared masking now covers compound PII/secret keys with explicit tests |
| S5 | Security | public-api scope check in handler | Closed in TASK-0106 | Public API-key scope checks now live in typed route middleware with source-regression coverage |
| S6 | Security | Tenant isolation/RBAC/webhook/upload strengths | Confirmed strength | Preserve existing architecture |
| OP1 | Ops | No backup/restore drill | Owner / environment gated | Owner-run drill |
| OP2 | Ops | Monitoring not connected | Partially mitigated | Local NDJSON alert emission is connected to `ops:monitor`; external alert delivery evidence remains owner/environment-gated |
| OP3 | Ops | `/health` shallow | Closed in TASK-0102 | Deep dependency readiness added without secret exposure or live provider calls |
| OP4 | Ops | Duplicate 0049 migration | Corrected: current code differs | Current local drift is 0077, not duplicate 0049 |
| OP5 | Ops | Missing critical E2E/smoke | Partially mitigated | Local provider smoke closed in TASK-0109; DB-backed smoke and browser buyer journey remain |
| OP6 | Ops | Staging/deploy not proven | Owner / environment gated | Separate staging readiness task |

## Apple-grade Gap Checklist

| Criterion | Status | Tracking |
| --- | --- | --- |
| Simplicity | Confirmed open | Permissions and admin language pass |
| Consistency | Partially mitigated | Confirmation/reason pattern expanded; make reusable later |
| Trust | Partially mitigated | Payout/bank/status/moderation guards, marketplace P0 local code gaps, deep health, and local alerts improved; backup and external alert delivery remain |
| Completeness | Partially mitigated | Payment failure, onboarding resume, first-product CTA, and return/refund intake fixed; full RMA lifecycle remains |
| Cognitive load | Deferred P2 | Server-side pagination for large tables |
| Message quality | Partially mitigated | Payment recovery message now actionable |
| Permission states | Partially mitigated | Employees page closed in TASK-0101; current admin dashboard/API route alignment closed in TASK-0103/TASK-0104; broad all-page permission-denied audit remains open |

## Remediation Plan Mapping

| Plan item | Status after TASK-0096 |
| --- | --- |
| P0-1 Failed payment recovery | Closed in code + source guard |
| P0-2 Marketplace P0 verification | Closed in TASK-0098 for local code/source guards; runtime abuse/pen-test still launch-gated |
| P0-3 Financial admin confirmations | Closed for payout approve/transfer/verify and bank review |
| P0-4 Backup/restore | Owner gated |
| P1 RMA | Partially closed in TASK-0107 for buyer intake; full RMA lifecycle remains open |
| P1 Permission-denied UI | Partially closed: Employees page closed in TASK-0101 and admin dashboard/API route alignment closed in TASK-0103/TASK-0104; remaining broad rollout outside these pages remains |
| P1 Monitoring/deep health | Partially closed: deep health closed in TASK-0102 and local alert emission closed in TASK-0108; external alert delivery/uptime remains open |
| P1 Suspension/rejection reasons | Closed in TASK-0097 for tenant/store status + marketplace negative moderation |
| P1 E2E/smoke/migration drift/CSP session hardening | Partially corrected: local provider smoke closed in TASK-0109; DB-backed smoke, browser buyer journey, migration drift, and session hardening remain |
| P1 Data export/delete privacy flow | Partially closed in TASK-0110 for buyer-facing intake; automated fulfillment, retention rules, and legal owner review remain |
| P1 First-product CTA/onboarding resume | Closed locally in TASK-0099/TASK-0100 |
| P2 Order confirmation resend/support fallback | Closed in TASK-0111 for support fallback and canonical track-phone storage |
| P2 Inventory/coupon/shipping/subscription/pagination/reviews/masking/public-api | Partially closed: masking closed in TASK-0105, public-api scope middleware closed in TASK-0106, coupon error reasons closed in TASK-0112, cart shipping estimate closed in TASK-0113, checkout stock-depletion recovery closed in TASK-0114, and subscription decision clarity closed in TASK-0115; other product-quality items remain deferred |
| P3 RTL phone/dev badge/aria polish | Partially closed: phone-input RTL/tel semantics closed in TASK-0116, Fake 3DS dev badge closed in TASK-0117, scoped storefront buyer-control ARIA polish closed in TASK-0118, merchant product-form ARIA polish closed in TASK-0119, merchant theme-editor ARIA polish closed in TASK-0120, and non-financial admin dangerous-action dialog accessibility closed in TASK-0122; admin-dashboard/full WCAG sweep remains deferred |

## Definition of Ready for Commercial Launch

| Acceptance item | Status |
| --- | --- |
| Explicit page states everywhere | Open |
| No broken critical flow | Partially mitigated; buyer return/refund intake exists, but full RMA and provider smoke remain open |
| Every dangerous action has confirmation + reason where needed | Partially mitigated; non-financial admin dangerous-action dialog semantics closed in TASK-0122 |
| Server and UI permission alignment | Closed locally for current admin dashboard/API routes in TASK-0103/TASK-0104; keep regression guard for new routes |
| Marketplace P0 verified closed | Closed locally in TASK-0098; staging abuse tests / external pen-test still needed |
| Monitoring + deep health + tested backup | Partially mitigated: deep health closed in TASK-0102 and local alert emission closed in TASK-0108; external monitoring delivery and backup/restore remain owner/environment gated |
| Critical E2E + provider smoke | Partially mitigated: provider smoke closed locally; DB-backed/browser critical journey remains open |
| Owner legal/commercial gates | Owner gated |

## TASK-0096 Code Changes

- Storefront checkout now keeps a persistent failed-payment recovery alert with retry, change-payment, and support paths.
- Admin settlement detail now requires confirmation before approve, mark transfer pending, mark transferred, and verify transfer.
- Admin bank account review now requires a confirmation dialog and review reason; API validation accepts `reviewReason`; route records it in audit and notification data.
- Added source-regression guard: `tests/apple-grade-remediation.test.ts`.

## TASK-0097 Code Changes

- Admin tenant status changes now open a reason-required confirmation dialog and call the status endpoint with `statusReason`.
- Admin store status changes now open a reason-required confirmation dialog, call the status endpoint with `statusReason`, and the API records audit + invalidates store cache.
- Marketplace product rejection and suspension now share a reason-required moderation dialog.
- Admin API validation requires `statusReason` for tenant/store status and requires `note` for marketplace rejected/suspended product reviews.
- Added source-regression guard: `tests/admin-dangerous-action-reasons.test.ts`.

## TASK-0098 Code Changes

- Public marketplace order tracking is now access-token-only; the legacy `phone` fallback was removed from the API and storefront API client.
- Public marketplace seller detail no longer selects store email/phone.
- Public marketplace product, seller, stats, and category queries now apply a product-level prohibited-category guard.
- Marketplace product mapping validates all linked category slugs for SFDA/prohibited-category rules, not only the displayed category.
- Updated source-regression guards: `tests/marketplace-p0-3-access-token.test.ts`, `tests/marketplace-p0-2-category-blocklist.test.ts`, and `tests/marketplace-t5-t10-integration.test.ts`.

## TASK-0099 Code Changes

- Merchant onboarding skip now writes a local resumable draft keyed by `storeId`.
- Reopening `/onboarding` restores step, store form fields, generated products, selected products, product-step mode, and checklist state.
- Completing onboarding clears the local draft before setting `onboarding_done`.
- Getting Started shows a resume CTA when a draft exists.
- Updated source-regression guards: `tests/merchant-dashboard-apple-grade-fixes.test.ts` and `tests/getting-started-page-contract.test.ts`.

## TASK-0100 Code Changes

- Merchant Products now computes `hasActiveProductFilters` once and uses it to separate a truly empty catalog from filtered no-results.
- The true empty catalog state now shows an explicit `products.createFirst` CTA with a `Plus` icon and opens product creation via `openCreate`.
- Filtered no-results keeps the search/filter message and does not show the first-product creation CTA.
- Added Arabic copy for `products.createFirst`.
- Added source-regression guard: `tests/products-empty-state-cta.test.ts`.

## TASK-0101 Code Changes

- Merchant Employees now derives `canViewEmployees` from `employees:view`.
- If `employees:view` is missing, the page returns the shared `UnauthorizedState` and does not fetch employee data.
- Permission-management checks now use `canManageEmployeePermissions` instead of repeating the raw permission lookup inside save branches.
- The last-owner guard now includes visible inline guidance: another owner must be assigned before edit/delete.
- Added source-regression guard: `tests/employee-permission-denied-ux.test.ts`.

## TASK-0102 Code Changes

- Added `apps/api/src/services/platform-health.ts` to classify platform dependency readiness for storage, payment, shipping, email, and observability using configuration presence only.
- `/health` now includes a `dependencies` block with aggregate status and per-dependency status/reason/configured flags.
- Deep health output reports missing environment variable names where useful, but never returns raw secret values or provider credentials.
- Payment and shipping readiness keep live provider modes explicitly blocked and do not call live payment or shipping providers.
- Local storage readiness checks that the storage root is writable in development/test, while staging/production readiness requires non-local storage.
- Added source/unit regression guard: `tests/platform-health-readiness.test.ts`.

## TASK-0103 Code Changes

- Added shared admin `UnauthorizedState` for clear Arabic permission-denied page states.
- Admin sidebar now filters links by decoded admin JWT permissions for routes whose API already has `requireAdminPermission`.
- Direct navigation to protected admin routes now renders `UnauthorizedState` before page data fetches.
- Protected admin route/sidebar mapping now covers tenants, stores, KYC, bank accounts, settlement batches/detail, settlement readiness, store payment settings, store billing, admin users, and landing inbox.
- Pages whose API routes do not yet have explicit permission gates remain unguarded in the UI by design, to avoid inventing UI-only permissions.
- Added source-regression guard: `tests/admin-permission-reflection.test.ts`.

## TASK-0104 Code Changes

- Added shared `AdminPermission` and `ADMIN_PERMISSION_CATALOG` for platform-admin permissions, kept separate from merchant employee `PERMISSION_CATALOG`.
- Typed `requireAdminPermission()` against `AdminPermission`.
- Added explicit permission gates to previously auth-only admin routes: dashboard, payments, marketplace read/report endpoints, audit, webhooks/idempotency stats, plans read/update, upload, and settings read/update.
- Admin route/sidebar mapping now also covers dashboard, payments, marketplace, audit, plans, settings, and compliance.
- Admin shell skips the settings-branding fetch for limited admins without `platform.settings.read`, avoiding an unrelated forbidden toast.
- Plans, Marketplace, and Settings action buttons now reflect write/review/upload permissions before calling the API.
- Added source-regression guard: `tests/admin-api-rbac-alignment.test.ts`; updated `tests/admin-permission-reflection.test.ts`.

## TASK-0105 Code Changes

- Shared `maskObject()` now masks sensitive audit diff fields by patterns as well as exact key matches.
- Added coverage for compound customer/beneficiary PII, address, legal/financial identifiers, secret/card variants, and nested arrays/objects.
- Preserved non-sensitive audit metadata unchanged.
- Confirmed `AuditLogService` continues to route `oldValue` and `newValue` through shared `maskObject()`.
- Added source/unit regression guard: `tests/audit-mask-object-pii.test.ts`.

## TASK-0106 Code Changes

- Public API-key scope authorization now uses typed route middleware: `requireApiKeyScope(...)`.
- `/v1/products`, `/v1/orders`, and `POST /v1/orders` declare their required scope at route definition time.
- Route handler bodies no longer perform inline `meta.scopes.includes(...)` authorization checks.
- The existing insufficient-scope response remains `403` with `code: 'FORBIDDEN'` and message `Insufficient scope`.
- Added source-regression guard: `tests/public-api-scope-middleware.test.ts`.

## TASK-0107 Code Changes

- Storefront order tracking now shows a return/refund request card for `delivered`, `picked_up`, and `completed` orders.
- The intake is hidden from already-cancelled, returned, refunded, and partially refunded orders.
- Submitting the intake creates a support ticket through the existing storefront support API, avoiding new RMA tables or migrations.
- The ticket message includes order number, order/payment/fulfillment status, customer phone, order total, selected reason, optional details, and line-item context.
- The support access token is saved under the existing localStorage key and the follow-up link does not include `accessToken` in the URL.
- Added source-regression guard: `tests/storefront-return-request-intake.test.ts`.

## TASK-0108 Code Changes

- Added shared local alert construction through `buildOpsAlerts()` in `scripts/ops-events.mjs`.
- Added `pnpm ops:alerts`, backed by `scripts/emit-monitoring-alerts.mjs`.
- Local alerts are written to `storage/monitoring-alerts.ndjson` for active P0 incidents, repeated P1 task candidates, and repeated-fingerprint RCA candidates.
- Alert records include stable `dedupeKey` values and safe evidence metadata only; raw event messages are not copied into alert evidence.
- `pnpm ops:monitor` now runs health, synthetic checks, error analysis, and local alert emission in sequence.
- Updated command references in `AGENTS.md` and `docs/agent-os/TEST_STRATEGY.md`.
- Added source/regression guard: `tests/ops-monitoring-alerts.test.ts`.

## TASK-0109 Code Changes

- Extended `tests/pre-launch-smoke.test.ts` with local provider smoke coverage.
- Smoke now verifies FakePaymentProvider success/failure/cancel/expiry/COD/bank-transfer/3DS scenarios.
- Smoke now verifies payment live mode remains blocked and demo checkout forces `FakePaymentProvider`.
- Smoke now verifies shipping live mode remains blocked and manual/haa_mock providers stay local-safe `mock_ready` options.
- Smoke now verifies merchant provider-status route mounting and payment/shipping/shippingLabel readiness surfaces.
- Full DB-backed `pnpm smoke` and browser critical journey remain separate open gates because local migration drift is owner-gated.

## TASK-0110 Code Changes

- Storefront support now includes explicit privacy request actions for data export and data deletion.
- Each privacy action prefills a structured Arabic support-ticket subject and message with buyer verification fields.
- Data-export copy states identity verification is required before releasing any personal data.
- Data-deletion copy states legally required retention may still apply for billing, tax, and dispute reasons.
- The flow reuses the existing support-ticket API, local token storage, and token-free support-ticket follow-up route.
- Added source-regression guard: `tests/storefront-privacy-request-intake.test.ts`.

## TASK-0111 Code Changes

- Order confirmation missing-phone state now shows a support fallback for confirmation/resend help.
- The fallback displays the order number and links to the current store support page without tokens in the URL.
- Manual storefront order tracking now uses `saveTrackPhone()` from `order-track-storage`.
- The canonical guest track-phone key remains `track_phone_${orderNumber}` and is shared by checkout/confirmation/tracking.
- Added source-regression guard: `tests/storefront-order-confirmation-recovery.test.ts`.

## TASK-0112 Code Changes

- Cart coupon catch-path failures now preserve `Error.message` when the API client provides one.
- The generic coupon fallback is now a cart-specific Arabic message instead of `common.error`.
- Coupon errors render as a persistent `role="alert"` block with practical guidance.
- Existing server-side coupon rejection reasons remain passed through unchanged.
- Added source-regression guard: `tests/storefront-coupon-error-reasons.test.ts`.

## TASK-0113 Code Changes

- Cart summary now includes a city-based shipping estimate section.
- The estimate action calls `checkoutApi.getShippingRates(slug, cart.id, city)`.
- Rate results display method name, estimated days, price, and free-above information where available.
- Empty and error estimate states render as persistent alerts.
- A visible caveat states final shipping is confirmed during checkout after address and shipping-method selection.
- Added source-regression guard: `tests/storefront-cart-shipping-estimate.test.ts`.

## TASK-0114 Code Changes

- Verified commerce-core already decrements stock inside the checkout transaction before payment creation using stock quantity guards.
- Added shared `INSUFFICIENT_STOCK` user-friendly error message.
- Storefront checkout-session route now maps `Insufficient stock for product` to HTTP 400 with code `INSUFFICIENT_STOCK`.
- Storefront checkout now detects the typed error and shows stock-specific recovery copy with a return-to-cart action.
- Added source-regression guard: `tests/storefront-checkout-stock-recovery.test.ts`.

## TASK-0115 Code Changes

- Merchant subscription plan-change confirmation now includes current price, new price, and price delta for the active billing cycle.
- Upgrade confirmation shows an estimated prorated charge from remaining days over cycle days.
- The dialog states the change is effective immediately.
- The dialog shows next expected renewal for upgrades or current period end for downgrades.
- Copy clarifies final invoice calculation is server-owned after confirmation.
- Added source-regression guard: extended `tests/subscriptions-confirm-modal.test.tsx`.

## TASK-0116 Code Changes

- Scoped storefront buyer phone inputs now declare `type="tel"`, `inputMode="tel"`, autocomplete where applicable, and LTR direction.
- Covered checkout, marketplace checkout, manual tracking, order-success recovery, track-result recovery, and support ticket phone fields.
- Added source-regression guard: `tests/storefront-phone-input-rtl.test.ts`.

## TASK-0117 Code Changes

- Fake 3DS challenge page now renders a visible `DEV TEST` badge.
- Badge copy states the flow is a local simulation, not a bank or real payment challenge.
- The source-regression guard also confirms the route remains under `import.meta.env.DEV`.
- Added source-regression guard: `tests/fake-3ds-dev-badge.test.ts`.

## TASK-0118 Code Changes

- Base-elegant homepage carousel dots now have Arabic accessible names, `aria-current`, hidden decorative dots, and 44px hit targets.
- Base-elegant homepage FAQ buttons now expose `aria-expanded` and `aria-controls` for the rendered answer panel.
- Base-elegant and luxury product option buttons now expose `aria-pressed` and option/value accessible names.
- Luxury product-card add-to-cart loading state now keeps an `aria-label`, exposes `aria-busy`, and hides the spinner from assistive tech.
- Added source-regression guard: `tests/storefront-aria-controls.test.ts`.

## TASK-0119 Code Changes

- Merchant product image upload affordance is now a named `type="button"` that still opens the hidden file input.
- Queued and saved product image remove controls now have Arabic accessible names and titles.
- Variant option remove icon buttons now have action-oriented Arabic accessible names and titles.
- Product tag/category chips now expose `aria-pressed` and action-oriented Arabic labels.
- Added source-regression guard: `tests/merchant-product-form-aria-controls.test.ts`.

## TASK-0120 Code Changes

- Merchant theme-editor preview device controls now use Arabic accessible names, `type="button"`, `aria-pressed`, stable touch targets, and hidden decorative icons.
- Desktop preview zoom controls now expose Arabic labels/titles and `aria-pressed` state.
- Homepage section group and custom draggable section rows now expose `aria-expanded`/`aria-controls`, and section rows support Enter/Space activation while ignoring nested button key events.
- Section visibility, duplicate, delete, image-remove, and brand-remove controls now have explicit Arabic accessible names/titles.
- Theme-editor link-type, product-source, and category-selection chips now expose `aria-pressed`.
- Added source-regression guard: `tests/merchant-theme-editor-aria-controls.test.ts`.

## TASK-0121 Code Changes

- Added typed IBAN reveal/copy audit actions and Arabic labels to unblock preflight for the financial route added by the separate stream.
- Rebuilt local shared package artifacts so API typecheck consumes current permission/audit declarations.
- Added source-regression guard: `tests/admin-iban-reveal-typing.test.ts`.

## TASK-0122 Code Changes

- Added local admin-dashboard `AdminDialog` with focused dialog content, `role="dialog"`, `aria-modal`, labelled title, optional description linkage, initial focus, Escape close, overlay close, and body scroll locking.
- Migrated scoped non-financial dangerous-action dialogs only: marketplace reject/suspend, store delete/status, and tenant delete/status.
- Added accessible names to scoped reason textareas so required reasons can be targeted by label and assistive technology.
- Preserved the existing reason/confirmation/API contracts for those flows.
- Split out and preserved finance-adjacent dialog work at `/tmp/haa-task-0122-full-before-finance-split.patch`; financial Batch 4 stream files remain out of scope.
- Added source-regression guard: `tests/admin-dangerous-dialog-accessibility.test.ts`; extended `tests/admin-dangerous-action-reasons.test.ts`.

## Out of Scope For This Batch

- No database migrations.
- No production/staging deployment.
- No live payment or shipping provider calls.
- No real 3DS/payment provider changes, merchant/admin/auth/landing phone-field sweep, admin-dashboard/full WCAG accessibility audit beyond scoped non-financial dangerous dialogs, financial Batch 4 stream ownership, backend subscription billing/proration logic changes, stock reservation/hold system, checkout final-shipping calculation changes, coupon business-rule or discount-math changes, real confirmation resend email/SMS automation, full RMA lifecycle implementation, automated privacy export/deletion fulfillment, external alert delivery/account setup, broad merchant permission-denied rollout outside Employees, DB-backed/browser critical E2E smoke, runtime marketplace abuse test, external pen-test, or backup automation.
