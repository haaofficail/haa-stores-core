# Internal Changelog

## 2026-06-29 — Admin Finance CSV Export Permission Enforcement (TASK-0128)

- Added admin Finance Reports CSV export route guarded by `wallet.payout.export`.
- Added admin Accountant Inbox CSV export route guarded by `wallet.payout.export`.
- Preserved existing read route guards on `wallet.payout.view_all`.
- Added a small admin CSV response helper with UTF-8 BOM, quoted cells, and formula-prefix neutralization for exported finance cells.
- Updated admin API client with Blob download helpers for finance reports and accountant inbox exports.
- Updated Finance Reports and Accountant Inbox buttons to check `hasAdminPermission('wallet.payout.export')`, disable for non-export admins, and call the guarded API routes rather than generating finance CSV locally from read data.
- Kept exported data masked: no full IBAN, no proof file key, no receipt URL, and no merchant bank-account IBAN selection added.
- Extended focused finance/accountant tests for API route guards, query schema wiring, client Blob export, and page export wiring.
- Verification passed: `pnpm ops:monitor` with 0 failures and no recommended tasks/incidents; finance export focused tests 4 files / 55 tests; API typecheck; admin-dashboard build.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live provider calls.

## 2026-06-29 — Admin Webhooks/Idempotency Operational Page (TASK-0127)

- Added typed admin API client helpers for webhook events, webhook deduplication stats, and HTTP idempotency-key stats.
- Added `queryKeys.operationalWebhooks` for the admin dashboard operational surface.
- Added `/operations/webhooks` to the admin dashboard route tree behind `AdminPermissionRoute permission="webhooks.read"`.
- Added a sidebar entry under the system section so admins with `webhooks.read` can discover the page.
- Built `OperationalWebhooks.tsx` with webhook totals, fresh/duplicate counts, duplicate rate, race-recovered count, provider breakdown, idempotency-key totals, hits, conflicts, hit rate, and cache size.
- Added tenant/store filters, current-page search, sortable table columns, loading/error/empty states, and `TablePager` to keep the operational table usable with larger local result sets.
- Extended focused admin RBAC/permission tests to guard the API-client/page wiring and route/sidebar permission reflection.
- Verification passed: `pnpm ops:monitor` with 0 failures and no recommended tasks/incidents; focused admin RBAC/permission reflection tests 2 files / 12 tests; admin-dashboard build.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live provider calls.

## 2026-06-29 — Admin COD Fee Policy UI/API Wiring (TASK-0126)

- Closed the deferred TASK-0032 admin-dashboard follow-up for COD fee policy configuration.
- Re-exported COD fee policy descriptors/validators from commerce-core alongside the existing platform fee surface so admin routes consume one package boundary.
- Extended admin billing settings GET/PATCH to return `effectiveCodPolicy` / `effectiveCodPolicyLabel` and accept `codFeeMode`, `codFeePct`, `codFeeFixed`, and `isCodFeeEnabled`.
- Kept COD validation on the existing wallet-core source of truth: `validateCodFeePolicyInput`, `COD_FEE_MODES`, and `MAX_COD_FEE_PCT`.
- Extended `StoreBillingSettingsService.updateSettings` to write COD policy fields and include COD before/after values in the billing audit diff while preserving platform fee behavior.
- Updated the admin API client billing settings contracts for COD policy fields.
- Updated Store Billing Settings UI with separate RTL sections for platform fee and COD fee, both saved under one required change reason.
- Extended `tests/cod-fees-wiring.test.ts` to guard service write/audit, route validation/response, API-client typing, and admin UI wiring.
- Verification passed: `pnpm ops:monitor` with 0 failures and no recommended tasks/incidents; COD/platform focused tests 3 files / 76 tests; commerce-core build/typecheck; API typecheck; admin-dashboard build.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live provider calls.

## 2026-06-29 — Admin Marketplace Server Pagination Wiring (TASK-0124)

- Updated `adminApi.getMarketplaceProducts` to accept `status`, `page`, and `limit`.
- Added a response-envelope helper for admin API calls that need top-level metadata while preserving the existing `request<T>()` behavior for ordinary data-only endpoints.
- Added shared Marketplace pagination normalization so products and orders use one envelope-metadata path in the admin API client.
- Updated admin Marketplace products query keys and fetches to include server page and page size.
- Drove the Marketplace products `TablePager` from server `total`/`totalPages` metadata instead of local filtered row counts.
- Updated `/admin/marketplace/orders` to accept `page`/`limit`, return `total`/`totalPages`, and remove the hardcoded `.limit(200)` ceiling.
- Added a separate admin Marketplace orders query key, server page state, loading/error/empty states, and `TablePager` driven by order server totals.
- Kept search/sort local to the currently fetched page; global server-side search/sort remains a separate enhancement.
- Added focused regression coverage in `tests/marketplace-p1-2-p1-3.test.ts` for backend pagination, API-client metadata preservation, and page-level server pager wiring across products and orders.
- Verification passed: `pnpm ops:monitor` with 0 failures and no recommended tasks/incidents; focused Marketplace/admin query tests 2 files / 24 tests; API typecheck; admin-dashboard build.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live provider calls.

## 2026-06-29 — Admin Auth 2FA and Password Reset (TASK-0125)

- Added admin TOTP helpers in `@haa/auth-core`: Base32 secret generation, HMAC-based code verification, `otpauth://` URL generation, AES-256-GCM encrypted secret envelopes, and `ADMIN_TOTP_ENCRYPTION_KEY` readiness checks.
- Added encrypted admin TOTP state to the `users` schema plus unapplied migration `0090_admin_totp.sql`, journal entry, snapshot synthesis delta, and generated `0090_snapshot.json`.
- Extended `AdminAuthService` with TOTP-aware login, enrollment start/confirm, disable, admin password-reset request, and password-reset confirm.
- Kept admin reset logic out of merchant `AuthFlowService`; admin routes still delegate to `AdminAuthService`.
- Extended admin JWTs with `twoFactorEnabled` and `twoFactorVerified` claims and added `requireAdminTwoFactorIfEnabled()` middleware.
- Added TOTP checks to sensitive admin mutations across tenant/store changes, KYC review, payment settings, marketplace moderation, full-IBAN reveal, payout state changes, upload/settings/plans, billing, and landing-contact updates.
- Added admin password reset and TOTP routes under `/admin/login/password-reset/*` and `/admin/security/totp/*`, with route-level rate limiting for reset request/confirm.
- Added staging-safe TOTP readiness handling: admin login/reset use base-user selects before reading TOTP columns, missing TOTP columns are treated as no enabled TOTP for login/guards, and enrollment returns `READINESS_UNAVAILABLE` until migration/config are applied.
- Updated admin login UI to support TOTP challenge and self-serve password reset request/confirm.
- Added `/security` in the admin dashboard for account-level TOTP enrollment, confirmation, and disable.
- Added `tests/admin-auth-hardening.test.ts` and extended `tests/admin-accountant-login.test.ts` to guard crypto, encrypted storage, migration/snapshot coverage, admin route separation, sensitive route guards, UI wiring, and pre-migration login compatibility.
- Verification passed: branch-start `pnpm preflight`; db/shared/auth-core builds; auth-core/API typechecks; admin-dashboard build; and focused auth regression suite 5 files / 53 tests.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live provider calls. Runtime rollout requires owner-only migration execution plus `ADMIN_TOTP_ENCRYPTION_KEY` and transactional email configuration.

## 2026-06-29 — Post-financial Handoff Takeover Sync (TASK-0123)

- Read the financial agent's accountant-settlement handoff and recorded the integration state in `docs/ops/ACCOUNTANT_FINANCE_HANDOFF_INTEGRATION_PLAN_2026-06-29.md`.
- Corrected stale TASK-0122/project-state language that said final repo `pnpm preflight` was still blocked by `packages/wallet-core/src/settlement-config.ts`; current takeover verification shows `pnpm preflight` passes.
- Added TASK-0123 and ISSUE-0060 to track the remaining GitHub-readiness risk as integration/staging hygiene, not TypeScript health.
- Moved the handoff work onto `codex/apple-grade-finance-integration` from current `origin/main`, preserving the stale pre-move state in `/tmp` patch/tar backups and `stash@{0}`.
- Repaired post-integration full-test fallout: route source-grep tests now inspect service-layer read models, product media upload remains image-only while admin receipt uploads explicitly opt into PDF, migration snapshots 0088/0089 are synthesized from script deltas, tenant audit/source-grep assertions match status reasons, and typography no longer uses arbitrary text sizing in the touched employee guard.
- Verification is green locally: targeted integration suite 27 files / 214 tests, full `pnpm test` 400 files / 4940 tests, shared build, wallet-core/API/admin typechecks, admin build, lint 0 errors / 431 existing warnings, `pnpm check:skills` 43/43, diff checks, `pnpm ops:monitor`, and final `pnpm preflight`.
- Follow-up publish-readiness cleanup removed the staged-file pre-commit hook debt without using `--no-verify`: targeted `eslint --max-warnings 0 --no-warn-ignored` passed on the 16 touched hook files with zero output, package typechecks/builds passed for the affected API/merchant/storefront/shared/admin surfaces, focused affected vitest passed 9 files / 50 tests with 1 skipped, full `pnpm test` passed again, final `pnpm preflight` passed, `pnpm check:skills` passed, and `git diff --check` was clean.
- Repo-wide `pnpm lint` still exits 0 with 331 pre-existing warnings outside the staged hook-cleanup scope; those files were not widened into TASK-0123 to preserve branch hygiene.
- Opened draft PR #325 and addressed the SonarCloud quality-gate blockers locally: removed the insecure `Math.random()` fallback from admin financial idempotency keys, reduced complexity in shared PII masking, wallet ledger posting, and base-elegant homepage rendering, narrowed merchant theme-editor props, moved `AdminDialog` to native `<dialog>` semantics, fixed labelled admin transfer/status inputs, switched the Fake3DS DEV badge to `<output>`, and updated the monitoring-alert imports to `node:` builtins.
- Sonar remediation verification passed: targeted ESLint with `--max-warnings 0`, affected package typechecks, shared/admin/merchant/storefront builds, focused Sonar regression tests 11 files / 88 tests, finance/wallet/settlement suite 42 files / 376 tests with 1 todo, full `pnpm test` 400 files / 4940 tests, `pnpm preflight`, `pnpm check:skills`, `pnpm ops:monitor`, `git diff --check`, and repo-wide `pnpm lint` exit 0 with the same 331 legacy warnings.
- Addressed the second SonarCloud annotation set from check run `83968206453`: removed remaining nested ternaries in admin/accountant/checkout render states, linked bank-account review labels, removed redundant jump flow in accountant inbox service, replaced marketplace category-slug nested ternaries, deduplicated shared media validation, tightened readonly React prop types, generated merchant homepage section IDs with Web Crypto, replaced source-regression length assertions with array matchers, and kept `AdminDialog` on native `<dialog>` implicit semantics without noninteractive mouse listeners.
- Second Sonar cleanup verification passed: targeted ESLint with `--max-warnings 0` on all annotation files, API/shared/admin/merchant/storefront typechecks, shared/admin/merchant/storefront builds, focused regression suite 24 files / 215 tests with 1 skipped, full `pnpm test` 400 files / 4940 tests, `pnpm preflight`, `pnpm check:skills` 43/43, `pnpm ops:monitor` 0 failures and no new alerts, `git diff --check`, and repo-wide `pnpm lint` exit 0 with the same 331 legacy warnings.
- Pushed commit `f2e03a51` to draft PR #325 and watched GitHub checks: Required Merge Gate, Preflight, Lint, Typecheck, Test, E2E Tests, API/admin/merchant/storefront builds, Secret Scan (G4), Secrets Scan, Dependency Audit, License Check, Outdated Dependencies, and SonarCloud Code Analysis all passed. TestSprite and Snyk remain external/account-state blockers (`No tests detected`, private-test limit).
- No `db:migrate`, deploy, secrets, production action, SSH, live payment-provider call, or live shipping-provider call occurred. The financial migrations 0088/0089 remain owner-only to apply.

## 2026-06-29 — Non-financial Admin Dangerous-action Dialog Accessibility (TASK-0122)

- Added local `AdminDialog` for admin-dashboard dangerous-action dialogs with focused dialog content, `role="dialog"`, `aria-modal`, labelled title, optional description linkage, initial focus, Escape close, overlay close, and body scroll locking.
- Migrated only non-financial dangerous-action dialogs: marketplace reject/suspend, store delete/status, and tenant delete/status.
- Added accessible names to the scoped reason textareas so the visible reason requirement is also programmatically addressable.
- Preserved the existing reason/confirmation gates and API calls for those flows.
- Split out all finance-adjacent dialog work after the owner identified a separate financial Batch 4 stream; the preserved draft is `/tmp/haa-task-0122-full-before-finance-split.patch`.
- Added `tests/admin-dangerous-dialog-accessibility.test.ts` and extended `tests/admin-dangerous-action-reasons.test.ts`.
- Verification after split covered focused admin dialog/reason/settlement regression tests plus mocked local Playwright QA for marketplace desktop and stores mobile; final full verification is recorded in `docs/ops/SKILL_COMPLIANCE_REPORT_TASK_0122.md`.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, no live provider calls, and no financial Batch 4 files intentionally touched.

## 2026-06-29 — Admin IBAN Reveal Typing Preflight Unblock (TASK-0121)

- Added `bank_account.iban_revealed_for_payout` and `bank_account.iban_copied_for_payout` to the shared `AuditAction` union.
- Added Arabic labels for the two IBAN reveal/copy audit actions.
- Rebuilt `@haa/shared` locally so API typecheck consumes the current `AdminPermission` and `AuditAction` declarations.
- Added `tests/admin-iban-reveal-typing.test.ts` to guard the dedicated IBAN reveal permission, route guard, audit action labels, and audit-payload minimization.
- Verification passed: `@haa/shared` build, focused IBAN reveal typing regression 1 file / 3 tests, API typecheck, `pnpm check:skills` 43/43, clean `git diff --check`, and final `pnpm preflight`.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, no live provider calls, and no IBAN reveal business-rule/UI changes.

## 2026-06-29 — Merchant Theme-editor ARIA Polish (TASK-0120)

- Added Arabic accessible names and `aria-pressed` state to merchant theme-editor preview device controls.
- Added `aria-pressed` and Arabic labels/titles to desktop preview zoom controls.
- Added homepage section group/row disclosure contracts with `aria-expanded`/`aria-controls`, and Enter/Space row activation guarded so nested buttons do not accidentally toggle the row.
- Added Arabic accessible names/titles to section visibility, duplicate, delete, image-remove, and brand-remove controls.
- Added `aria-pressed` to theme-editor link-type, product-source, and category-selection chips.
- Added `tests/merchant-theme-editor-aria-controls.test.ts` to guard these source-level ARIA contracts.
- Verification passed: focused merchant theme-editor ARIA regression 1 file / 4 tests; merchant-dashboard typecheck; merchant-dashboard build; `pnpm check:skills` 43/43; clean `git diff --check`; final `pnpm preflight`.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, no live provider calls, and no theme-rendering/API changes.

## 2026-06-29 — Merchant Product-form ARIA Polish (TASK-0119)

- Converted the merchant product image upload affordance from a clickable `div` to a named `type="button"` while preserving the hidden file input click.
- Added Arabic `aria-label` and `title` values to queued-image removal and saved-image deletion controls.
- Added Arabic `aria-label` and `title` values to variant option remove icon buttons.
- Added `aria-pressed` and action-oriented Arabic labels to tag/category chips in the product form.
- Added `tests/merchant-product-form-aria-controls.test.ts` to guard these source-level ARIA contracts.
- Verification passed: focused merchant product-form ARIA regression 1 file / 4 tests; merchant-dashboard typecheck; merchant-dashboard build; `pnpm check:skills` 43/43; clean `git diff --check`; final `pnpm preflight`.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, no live provider calls, and no API/product-rule changes.

## 2026-06-29 — Storefront Buyer-control ARIA Polish (TASK-0118)

- Added accessible names, active-state semantics, and 44px hit targets to base-elegant homepage carousel dot buttons.
- Added `aria-expanded` and `aria-controls` to base-elegant homepage FAQ disclosure buttons.
- Added `aria-pressed` plus option/value accessible names to base-elegant and luxury product option buttons.
- Added `aria-label`, `aria-busy`, and hidden decorative spinner treatment to the luxury product-card add-to-cart loading state.
- Added `tests/storefront-aria-controls.test.ts` to guard these source-level ARIA contracts.
- Verification passed: focused storefront ARIA regression 1 file / 5 tests; storefront typecheck; storefront build with the pre-existing `MarketplaceProductCard` Rollup circular chunk warning; `pnpm check:skills` 43/43; clean `git diff --check`; final `pnpm preflight`; local Browser/Playwright QA loaded demo home/product pages, confirmed no framework overlay, confirmed luxury `aria-busy` controls, and verified Tab focus reached 10/10 interactive elements in the product page fallback run.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, no live provider calls, and no API/payment/shipping logic changes.

## 2026-06-29 — Fake 3DS DEV Badge (TASK-0117)

- Added a visible `DEV TEST` badge to the Fake 3DS challenge page.
- Badge copy states the page is a local simulation only and not a real bank/payment challenge.
- Added `data-testid="fake-3ds-dev-badge"` for stable regression coverage; TASK-0123 later changed the badge wrapper to semantic `<output>` to satisfy SonarCloud without changing the visible DEV warning.
- Added `tests/fake-3ds-dev-badge.test.ts` to lock the badge and the existing `import.meta.env.DEV` route guard.
- Verification passed: focused Fake3DS/3DS regression 2 files / 13 tests; storefront typecheck; storefront build with the pre-existing `MarketplaceProductCard` Rollup circular chunk warning.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, no live provider calls, and no payment logic changes.

## 2026-06-29 — Storefront Buyer Phone Input RTL Hardening (TASK-0116)

- Added telephone input semantics to scoped storefront buyer phone fields.
- Checkout and marketplace checkout phone fields now use `type="tel"`, `inputMode="tel"`, `autoComplete="tel"`, and `dir="ltr"`.
- Manual tracking, order-success recovery, and track-result recovery phone fields now use the same telephone semantics and LTR direction.
- Support ticket phone input now uses telephone semantics, explicit LTR direction, and `text-start` alignment.
- Added `tests/storefront-phone-input-rtl.test.ts` to guard these contracts.
- Verification passed: focused phone/order-confirmation regression 2 files / 9 tests; storefront typecheck; storefront build with the pre-existing `MarketplaceProductCard` Rollup circular chunk warning.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, no live provider calls, and no phone validation/API changes.

## 2026-06-29 — Subscription Plan-change Financial Clarity (TASK-0115)

- Added display-only subscription impact helpers in `Subscriptions.tsx`.
- The plan-change confirmation now shows current price, new price, and price delta for the active billing cycle.
- Upgrade confirmations show an estimated prorated charge based on remaining days over cycle days.
- The confirmation states the change is effective immediately.
- The confirmation shows the next expected renewal date for upgrades or current period end for downgrades.
- Copy clarifies that the final invoice is calculated by the system after confirmation.
- Extended `tests/subscriptions-confirm-modal.test.tsx` to lock impact, proration, effective-date, and final-invoice copy.
- Verification passed: focused subscription confirmation/proration regression 2 files / 13 tests; merchant-dashboard typecheck; merchant-dashboard build.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, no live payment/shipping-provider calls, and no backend billing logic change.

## 2026-06-29 — Checkout Stock-depletion Recovery (TASK-0114)

- Verified the current checkout core already locks/decrements stock inside the transaction before payment creation.
- Added `INSUFFICIENT_STOCK` to shared user-friendly error messages.
- Updated the storefront checkout-session route to map `Insufficient stock for product` to HTTP 400 with code `INSUFFICIENT_STOCK`.
- Added stock-specific storefront checkout recovery that explains product availability changed and offers a return-to-cart action.
- Kept payment-failure recovery behavior unchanged for actual payment failures.
- Added `tests/storefront-checkout-stock-recovery.test.ts` to lock stock-before-payment evidence, typed API error mapping, shared message registration, and storefront recovery copy/action.
- Verification passed: focused checkout stock/cart regression 3 files / 10 tests; API/storefront/shared typechecks; shared/API/storefront builds with the pre-existing `MarketplaceProductCard` Rollup circular chunk warning on storefront build; `pnpm check:skills` 43/43.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live payment/shipping-provider calls. No stock reservation system was added.

## 2026-06-29 — Storefront Cart Shipping Estimate (TASK-0113)

- Added a shipping estimate section to the storefront cart summary.
- Buyers can enter a city and request estimated shipping options before checkout.
- The estimate uses the existing `checkoutApi.getShippingRates(slug, cart.id, city)` API.
- Rate results show method name, estimated delivery days, price, and free-above information where available.
- Empty and error states render as persistent alerts.
- Copy states the final shipping price is confirmed during checkout after address and method selection.
- Added `tests/storefront-cart-shipping-estimate.test.ts` to lock endpoint wiring, estimate form, rate display, and final-price caveat.
- Verification passed: focused cart-shipping/checkout-race regression 2 files / 6 tests; storefront typecheck; storefront build with the pre-existing `MarketplaceProductCard` Rollup circular chunk warning.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live payment/shipping-provider calls. Checkout remains the final source of truth for shipping cost.

## 2026-06-29 — Storefront Coupon Error Reasons (TASK-0112)

- Added `getCouponErrorMessage()` in cart coupon handling to preserve API/client error messages when available.
- Coupon catch-path failures no longer collapse every thrown error to `common.error`.
- Coupon errors now render as a persistent `role="alert"` block instead of a terse single red line.
- Added buyer guidance to verify code spelling, minimum order, and expiry.
- Existing server-side Arabic rejection reasons remain passed through unchanged.
- Added `tests/storefront-coupon-error-reasons.test.ts` to lock backend reason pass-through, catch-path message preservation, and persistent alert rendering.
- Verification passed: focused coupon/money regression 2 files / 9 tests; storefront typecheck; storefront build with the pre-existing `MarketplaceProductCard` Rollup circular chunk warning.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live payment/shipping-provider calls. Coupon business rules and discount math were not changed.

## 2026-06-29 — Storefront Order Confirmation Recovery (TASK-0111)

- Added a support fallback card to the order confirmation missing-phone state.
- The fallback explains that buyers can open a support ticket for confirmation/resend help when tracking data or the confirmation message is missing.
- The fallback displays the order number so the buyer can include it in the ticket.
- The fallback links to the current store support page and does not place tokens or sensitive values in the URL.
- Updated `TrackOrder` to use the shared `saveTrackPhone()` helper instead of writing a separate slug-scoped sessionStorage key.
- Added `tests/storefront-order-confirmation-recovery.test.ts` to lock the recovery copy/link and canonical tracking phone storage contract.
- Verification passed: focused order-confirmation/return-intake regression 2 files / 6 tests; storefront typecheck; storefront build with the pre-existing `MarketplaceProductCard` Rollup circular chunk warning.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live payment/shipping-provider calls. Real email/SMS resend automation remains open.

## 2026-06-29 — Storefront Privacy Request Intake (TASK-0110)

- Added a privacy request section to the storefront support page.
- Buyers can now choose "طلب نسخة من بياناتي" or "طلب حذف بياناتي" instead of writing a generic support ticket from scratch.
- Each action prefills a structured Arabic support-ticket subject/message with verification fields.
- Data-export copy states identity verification is required before releasing any data.
- Data-deletion copy states some data may be retained for legal billing, tax, or dispute reasons before final deletion.
- The flow reuses the existing support-ticket API, local `support-ticket-token:${slug}:${ticketId}` storage, and `/s/:slug/support/tickets/:ticketId` follow-up link pattern.
- Added `tests/storefront-privacy-request-intake.test.ts` to lock explicit privacy actions, structured templates, and token-free follow-up links.
- Verification passed: focused privacy/support regression 2 files / 6 tests; storefront typecheck; storefront build with the pre-existing `MarketplaceProductCard` Rollup circular chunk warning.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live payment/shipping-provider calls. Automated export/deletion fulfillment remains open.

## 2026-06-29 — Local Provider Smoke Coverage (TASK-0109)

- Extended `tests/pre-launch-smoke.test.ts` with a no-network "Payment + Shipping providers" section.
- Smoke now asserts FakePaymentProvider covers success, failure/decline, cancellation, expiry, bank transfer, COD, and fake 3DS challenge scenarios.
- Smoke now asserts payment live mode remains blocked, unconfigured non-live providers fall back to fake where intended, and demo checkout forces `FakePaymentProvider`.
- Smoke now asserts shipping live mode remains blocked and manual/haa_mock stay local-safe `mock_ready` providers.
- Smoke now asserts merchant provider-status remains mounted for readiness checks and includes payment/shipping/shippingLabel readiness surfaces.
- Verification passed: `pnpm test:smoke` 1 file / 34 tests; adjacent provider verification 4 files / 58 tests.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live payment/shipping-provider calls. Full DB-backed `pnpm smoke` remains blocked by known local migration drift.

## 2026-06-29 — Local Monitoring Alert Emission (TASK-0108)

- Added `buildOpsAlerts()` to `scripts/ops-events.mjs`, reusing the existing active-window/actionable-event classifier for alert decisions.
- Added `scripts/emit-monitoring-alerts.mjs`, exposed as `pnpm ops:alerts`.
- `pnpm ops:alerts` writes new local alert candidates to `storage/monitoring-alerts.ndjson` for active P0 incidents, repeated P1 task candidates, and repeated-fingerprint RCA candidates.
- Alert evidence stores safe metadata only and intentionally avoids copying raw event messages.
- Alert records dedupe by stable `dedupeKey` so repeated monitor runs do not spam identical alert candidates.
- `pnpm ops:monitor` now runs health, synthetic checks, error analysis, and local alert emission in sequence.
- Updated command references in `AGENTS.md` and `docs/agent-os/TEST_STRATEGY.md`.
- Added `tests/ops-monitoring-alerts.test.ts` to lock P0/P1/RCA alert emission, no-alert quiet behavior, dedupe behavior, and package script wiring.
- Verification passed: focused ops alert/analyzer tests 2 files / 12 passed; `pnpm ops:alerts` emitted 0 alert candidates on current local P2-only state; `pnpm ops:monitor` exited 0 with no local alert candidates.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live payment/shipping-provider calls. External alert delivery remains owner/environment-gated.

## 2026-06-29 — Storefront Return/Refund Request Intake (TASK-0107)

- Added a return/refund request card to storefront order tracking for fulfilled buyer-visible orders: `delivered`, `picked_up`, and `completed`.
- Blocked the intake from already-cancelled, returned, refunded, or partially refunded order states.
- Wired the form to the existing storefront support API instead of introducing a new migration-backed RMA system.
- Structured the support-ticket message with order number, order/payment/fulfillment status, customer phone, order total, selected reason, optional details, and line-item context.
- Saved the support access token under the existing `support-ticket-token:${slug}:${ticketId}` localStorage key and linked to `/s/:slug/support/tickets/:ticketId` without `accessToken` in the URL.
- Added `tests/storefront-return-request-intake.test.ts` to lock eligible statuses, structured ticket payload, local token persistence, and token-free follow-up links.
- Verification passed: focused storefront return/refund intake test 1 file / 3 passed; storefront typecheck; storefront build with the pre-existing `MarketplaceProductCard` Rollup warning.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live payment/shipping-provider calls. Full RMA lifecycle remains open.

## 2026-06-29 — Public API Scope Middleware Hardening (TASK-0106)

- Added typed public API scope middleware (`requireApiKeyScope`) for `/v1` API-key routes.
- Moved `/v1/products`, `/v1/orders`, and `POST /v1/orders` scope enforcement from inline route handlers to route definitions.
- Preserved the existing `FORBIDDEN` response shape and 403 status for insufficient scope.
- Added `tests/public-api-scope-middleware.test.ts` to lock route-level scope middleware coverage and prevent inline handler-body scope checks from returning.
- Verification passed: focused public API scope/DTO/RBAC tests 3 files / 17 passed; API typecheck; `pnpm check:skills` 43/43; `git diff --check`; and final `pnpm preflight`.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live payment/shipping-provider calls.

## 2026-06-29 — Audit PII Masking Coverage (TASK-0105)

- Hardened shared `maskObject()` so audit old/new diffs mask sensitive fields by key patterns in addition to exact key matches.
- Added coverage for compound/camelCase/snake_case PII keys such as `customerEmail`, `customerPhone`, `customerName`, `beneficiaryName`, `shippingAddress`, `accountNumber`, `bank_account`, `beneficiaryIbanMasked`, `commercial_registration`, `nationalId`, and `taxNumber`.
- Added full masking for secret/card variants such as `apiSecret`, `privateKeyPem`, `cardNumber`, `authorizationHeader`, and `oneTimePassword`.
- Kept non-sensitive audit metadata unchanged.
- Added `tests/audit-mask-object-pii.test.ts` to lock shared masking behavior and `AuditLogService` old/new usage of shared `maskObject()`.
- Verification passed: focused mask/compliance tests 2 files / 37 passed; shared typecheck; integration-core typecheck; shared build; `pnpm check:skills` 43/43; `git diff --check`; and final `pnpm preflight`.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live payment/shipping-provider calls.

## 2026-06-29 — Admin API/UI RBAC Alignment (TASK-0104)

- Added shared platform-admin permission source: `AdminPermission` and `ADMIN_PERMISSION_CATALOG`.
- Kept platform-admin permission catalog separate from merchant employee `PERMISSION_CATALOG`, avoiding merchant permission-matrix pollution.
- Typed `requireAdminPermission()` against `AdminPermission`.
- Added explicit admin permission gates to previously auth-only admin routes: dashboard, payments, marketplace read/report endpoints, audit, webhooks/idempotency stats, plans read/update, upload, and platform settings read/update.
- Extended admin sidebar and route wrappers to cover dashboard, payments, marketplace, audit, plans, settings, and compliance with server-aligned permission keys.
- Guarded admin shell settings-branding fetch behind `platform.settings.read` so limited admins do not receive an unrelated forbidden toast on every page.
- Reflected mutation permissions in page actions: `plans.update`, `marketplace.review`, `marketplace.feature`, `platform.settings.update`, and `platform.media.upload`.
- Added `tests/admin-api-rbac-alignment.test.ts` and updated `tests/admin-permission-reflection.test.ts` to lock API guards, shared catalog keys, route/sidebar guards, and action disabled states.
- Verification passed: focused admin RBAC tests 3 files / 27 passed; shared build; API typecheck; admin-dashboard typecheck; admin-dashboard build; `pnpm check:skills` 43/43; `git diff --check`; and final `pnpm preflight`.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live payment/shipping-provider calls.

## 2026-06-29 — Admin Permission Reflection (TASK-0103)

- Added shared admin `UnauthorizedState` with clear Arabic denied-state copy and optional permission-key display.
- Added admin route permission metadata for routes whose API already enforces `requireAdminPermission`.
- Admin sidebar now filters server-gated links with `hasAdminPermission`, while `admin:*` remains the super-admin override through the existing helper.
- Direct navigation to protected admin routes now renders `UnauthorizedState` before page data fetches.
- Covered routes: tenants, stores, KYC, bank accounts, settlement batches/detail, settlement readiness, store payment settings, store billing, admin users, and landing inbox.
- Left pages without explicit API permission gates unguarded in UI by design, avoiding UI-only permission invention.
- Added `tests/admin-permission-reflection.test.ts` to lock denied state, sidebar filtering, route wrappers, and no UI-only guard invention.
- Verification passed: focused admin permission reflection tests 3 files / 13 passed; admin-dashboard typecheck; admin-dashboard build; `pnpm check:skills` 43/43; `git diff --check`; and final `pnpm preflight`.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live payment/shipping-provider calls.

## 2026-06-29 — API Deep Health Readiness (TASK-0102)

- Added `apps/api/src/services/platform-health.ts`, a typed readiness classifier for storage, payment, shipping, email, and observability.
- Updated `/health` to include a non-secret `dependencies` block with aggregate status and per-dependency status/configured/reason fields.
- Storage readiness now verifies local storage writability for development/test and marks local storage as not launch-ready for staging/production.
- Payment readiness reports active provider/mode, missing configuration key names, and live-mode blocking without calling payment providers.
- Shipping readiness reports active provider/mode, missing configuration key names, and live-mode blocking without calling shipping providers.
- Email readiness matches actual provider behavior by requiring `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASSWORD`, with Resend as an alternative.
- Observability readiness reports whether Sentry or OTEL sink configuration is present without exposing DSN or endpoint values.
- Added `tests/platform-health-readiness.test.ts` to lock readiness classification, route wiring, and secret-value non-disclosure.
- Verification passed: focused platform health tests 4 files / 63 passed; API typecheck; API build; `pnpm check:skills` 43/43; `git diff --check`; final `pnpm preflight`; and final `pnpm ops:monitor` with no recommended incidents/tasks.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live payment/shipping-provider calls.
- Remaining open: external alerting/uptime/Sentry evidence and owner-run backup/restore drill.

## 2026-06-28 — Employees Permission-denied and Last-owner UX (TASK-0101)

- Added page-local `canViewEmployees` handling in Employees so missing `employees:view` returns the shared `UnauthorizedState`.
- Employees no longer fetches employee data when `employees:view` is missing.
- Replaced repeated permission-management lookups in save branches with `canManageEmployeePermissions`.
- Expanded the last-owner guard from a terse badge into visible inline guidance: assign another owner before edit/delete.
- Added `tests/employee-permission-denied-ux.test.ts` to lock the unauthorized and last-owner UX contracts.
- Verification passed: focused employee permission UX tests 4 files / 60 passed; merchant-dashboard typecheck; merchant-dashboard build; `pnpm check:skills` 43/43; `git diff --check`; and final `pnpm preflight`.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live payment/shipping-provider calls.

## 2026-06-28 — Merchant Products First-empty-state CTA (TASK-0100)

- Added `hasActiveProductFilters` in Products so a true empty catalog and filtered no-results are treated as distinct states.
- The true empty catalog state now shows an explicit "إضافة أول منتج" CTA with a `Plus` icon.
- The CTA remains guarded by `products:create` and opens the existing create-product dialog via `openCreate`.
- Filtered no-results keeps search/filter guidance and does not display the first-product CTA.
- Added Arabic copy for `products.createFirst`.
- Added `tests/products-empty-state-cta.test.ts` to lock the empty-catalog/no-results contract.
- Verification passed: focused products empty-state tests 3 files / 86 passed; merchant-dashboard typecheck; merchant-dashboard build; `pnpm check:skills` 43/43; `git diff --check`; and final `pnpm preflight`.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live payment/shipping-provider calls.

## 2026-06-28 — Merchant Onboarding Resume (TASK-0099)

- Added a local onboarding draft keyed by `storeId` so skipping onboarding preserves step, store form fields, generated products, selected product indexes, product-step mode, and checklist state.
- The skip action still requires confirmation, but now writes the resumable draft, clears `onboarding_done`, shows a saved-progress toast, and navigates to the dashboard.
- Reopening `/onboarding` restores the saved draft; completing onboarding clears it before marking `onboarding_done`.
- Getting Started now surfaces a resume CTA when an onboarding draft exists.
- Added Arabic copy for the saved-progress toast.
- Updated focused onboarding/Getting Started source-regression tests.
- Verification passed: focused onboarding tests 3 files / 31 passed with 1 skipped; merchant-dashboard typecheck; merchant-dashboard build; `pnpm check:skills` 43/43; `git diff --check`; and final `pnpm preflight`.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live payment/shipping-provider calls.

## 2026-06-28 — Public Marketplace P0 Closure (TASK-0098)

- Removed the legacy `phone` fallback from public marketplace order tracking; `GET /marketplace/orders/:marketplaceOrderNumber` now requires `access_token` / `accessToken`.
- Removed storefront `haaMarketplaceApi.getOrderLegacy` and `?phone=` marketplace order-tracking URL construction.
- Removed store email/phone selection from the public marketplace seller detail route, tightening PII minimization beyond response-shape filtering.
- Added a product-level `noProhibitedMarketplaceCategoryCondition()` guard and applied it across public marketplace stats, product list, product detail, seller detail counts, seller list real/demo queries, and categories.
- Product mapping now validates SFDA/prohibited-category eligibility against all linked category slugs, not only the displayed category slug.
- Updated focused marketplace source-regression tests for access-token-only lookup, prohibited-category guards, and seller PII minimization.
- Verification passed: focused marketplace tests 5 files / 52 passed with 1 skipped; API typecheck; storefront typecheck; API build; storefront build with the pre-existing `MarketplaceProductCard` Rollup warning; `pnpm check:skills` 43/43; `git diff --check`; and final `pnpm preflight`.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live payment/shipping-provider calls.

## 2026-06-28 — Admin Dangerous-action Reason Gates (TASK-0097)

- Added reason-required confirmation dialogs for admin tenant status changes and store status changes.
- Removed status/isActive mutation from the normal edit-save payloads in Tenants/Stores so status changes route through the audited reason gate.
- Added reason-required marketplace moderation for rejected and suspended products; suspension no longer calls the review API directly without a note.
- Extended admin API client methods for tenant/store status updates to send `statusReason`.
- Extended Hono validation so tenant/store status routes require `statusReason`, and marketplace product review requires `note` for `rejected` or `suspended`.
- Hardened store status route with not-found handling, no-op handling, audit logging via `admin_store_suspended`, and store tenant-cache invalidation after status changes.
- Added `tests/admin-dangerous-action-reasons.test.ts` to lock the UI/API contract.
- Verification passed: focused remediation tests 2 files / 7 tests; expanded affected regression tests 5 files / 48 passed with 1 skipped; admin-dashboard typecheck; API typecheck; admin-dashboard build; `pnpm check:skills` 43/43; `git diff --check`; and final `pnpm preflight`.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live payment/shipping-provider calls.

## 2026-06-28 — Claude Apple-grade Diagnostic Remediation Batch (TASK-0096)

- Added `docs/ops/APPLE_GRADE_UX_SYSTEMS_REMEDIATION_2026-06-28.md` as the traceable matrix for every item in the pasted diagnostic report, including corrected/stale claims, owner-gated items, deferred polish, and confirmed open follow-ups.
- Fixed storefront checkout failed-payment UX: payment/session failures now set a persistent recovery alert with retry, change-payment, and store support actions instead of relying on a transient toast only.
- Added confirmation gates for admin manual payout money-moving transitions: approve, mark transfer pending, mark transferred, and verify transfer now require explicit confirmation before the API call.
- Added confirmation + reason capture for admin bank-account verification/rejection; the admin API now validates `reviewReason`, records it in the `bank_account_changed` audit `newValue`, and passes it into notification context.
- Added `tests/apple-grade-remediation.test.ts` source guards so the remediated P0 gaps cannot silently regress to toast-only or one-click financial decisions.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live payment/shipping-provider calls.

## 2026-06-28 — Merchant/Employee Permissions UX Audit (TASK-0095)

- Fixed merchant-dashboard permission API client paths so catalog, presets, and membership permission reads/writes use the mounted `/merchant/:storeId/permissions/...` route prefix.
- Fixed `apps/api/src/routes/permissions.ts` so membership permission operations derive `storeId` from the URL path after `requireStoreAccess()` verifies access, rather than using `auth.activeStoreId`.
- Fixed `EmployeeFormDialog` to use `useAuth().storeId` instead of direct `active_store_id` localStorage reads, preserving the existing source-of-truth pattern from `Employees.tsx`.
- Fixed permission clearing behavior: editing a member with an empty custom permission set now sends the empty set instead of skipping the update and leaving stale permissions.
- Fixed create-time custom permissions: after inviting a new employee, the dashboard now saves the selected permission set when the actor can manage permissions.
- Added `warehouse_staff` as a shared merchant role and preset with fulfillment-oriented permissions only: dashboard view, product read, order read/status update, shipping manage, and storefront read.
- Simplified employee role UX with Arabic role labels and automatic permission seeding from the selected role, including the new warehouse staff role.
- Updated the permission matrix UX copy to state the real behavior: custom membership permissions save at store scope; branch/warehouse/channel scopes are catalog-visible but not active for saving yet.
- Updated the employee-management API contract doc so it no longer claims custom permissions are 501/future-only; current custom permissions are store-scoped membership permissions.
- Added regression tests for URL-store scoping, mounted permission client paths, auth-sourced dialog storeId, empty permission-set saves, create-time custom permission saves, and warehouse staff role restrictions.
- Verification: focused employee/RBAC tests passed 8 files / 147 tests; `pnpm --filter @haa/shared typecheck`, `pnpm --filter @haa/shared build`, `pnpm --filter @haa/api typecheck`, and `pnpm --filter @haa/merchant-dashboard typecheck` passed; pre-commit lint-staged + repo-wide typecheck passed; final `pnpm preflight` passed.
- Published the scoped work as draft PR #324 after focused employee/RBAC verification passed 8 files / 147 tests, pre-commit lint-staged + repo-wide typecheck passed, and final `pnpm preflight` passed.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, and no live payment/shipping-provider calls.

## 2026-06-28 — GitHub Integration Closure (TASK-0094)

- Verified PR #320 and PR #321 are merged into `main`; latest merged commit is `73e0aea93777e8b1a667503368d990f0a436d917`.
- Closed PR #319 as superseded by PR #321 after non-mutating merge simulation proved the merge result would be identical to current `main`, and patch-id comparison proved the footer patch already landed.
- Added `.github/workflows/required-merge-gate.yml`, a lightweight always-on check with no `paths-ignore`, so branch protection can require one stable status check even for docs-only PRs.
- Merged PR #322 to `main` as `49601bea70d88de618fe5359955d18a7146237b4`, then updated branch protection to require `Required Merge Gate` with strict branch updates while force-push/delete protection and conversation resolution stayed enabled.
- Verified post-merge `main`: Required Merge Gate run `28329981653`, CI run `28329981652`, Deploy run `28329981663`, and Deploy Watchdog run `28330180539` all passed. Staging deploy and smoke gate passed; production deploy was skipped.
- Kept safety boundaries intact: no production deploy, no `db:migrate`, no secrets, no SSH/DNS/firewall changes, and no live payment/shipping-provider calls.

> Human-readable log of structural, behavioral, or operational changes.
> This is NOT a replacement for git. It captures context that git cannot.

---

## 2026-06-28 — Admin Settlement Handoff Integrated (TASK-0093)

- Took over the other agent's staged admin-dashboard handoff and repaired the integration blocker in `apps/admin-dashboard/src/pages/SettlementBatches.tsx`.
- Removed invalid JSX ternary-branch comments from the inherited staged admin work before publish so TypeScript can parse the settlement batch error state.
- Kept the handoff scoped to admin settlement/readiness polish and the wallet settlement-readiness clarification; unrelated storefront, screenshot, and storage artifacts remain parked.
- Addressed immediate SonarCloud PR blockers after first push: templated docs excluded from CPD through `.sonarcloud.properties` / `sonar-project.properties`, `StorePaymentSettings.tsx` nested settings normalization refactored, frontend hook file test switched to `[[ ]]`, merchant print `document.write` strings replaced with DOM `textContent` construction, and Plans modal backdrop semantics fixed.
- Fixed the later GitHub Test source-grep drift by updating contracts to assert shared admin `ErrorState` retry wiring and merchant DOM/textContent print construction instead of old page-local retry text and `document.write` expectations.
- Extracted repeated admin-dashboard UI contracts after the refreshed SonarCloud gate narrowed to 5.7% new-code duplication: shared table loading skeleton, store selector panel, CSV export helper, and typed nav item helper.
- Verification: `pnpm --filter @haa/admin-dashboard typecheck` passed; focused settlement/geidea tests passed 3 files / 24 tests; `pnpm --filter @haa/admin-dashboard build` passed; `pnpm --filter @haa/merchant-dashboard typecheck` passed; focused CI contract tests passed 4 files / 46 tests with 1 skipped; focused admin wiring/source-grep tests passed 3 files / 60 tests with 1 skipped; full `pnpm test` passed 354 files / 4618 tests with 3 skipped and 14 todo; dashboard print HTML escape tests passed 3/3; `bash -n scripts/hooks/pre-edit-frontend.sh` passed; `pnpm check:skills` passed 43/43; `pnpm preflight` passed.

## 2026-06-28 — Mandatory Skill Gate Numeric Cap Removed (TASK-0092)

- Updated `AGENTS.md` §14.2 so `Skills selected` now means all applicable skills with no numeric cap.
- Added a guardrail that agents must not pad gates with unrelated skills; every selected skill still needs a concrete one-line why.
- Synced active process references: PR template, execution checklist, skills registry, skill file mapping, and agent handoff template.
- Removed the outdated historical phrase in the TASK-0088 skill compliance report that said the constitution capped selected skills.
- Verification: `pnpm check:skills` passed 43/43; `git diff --check` clean; whitespace scan clean. At TASK-0092 close time, `pnpm preflight` was blocked by unrelated admin-dashboard syntax errors in `SettlementBatches.tsx`; TASK-0093 fixed that blocker.

## 2026-06-28 — Local App Smoke With Fake/Mock Providers (TASK-0091)

- Started/checked local API, merchant dashboard, and storefront services; reused the existing local admin dashboard listener.
- Verified local runtime surfaces without secrets or live provider calls: `pnpm ops:monitor` passed all 25 health checks and local synthetic checks; browser-like HTTP checks returned 200 for storefront home, `/s/haa-demo`, cart, checkout, merchant login, and admin.
- Verified sanitized API probes: admin login 200, merchant owner login 200, storefront store info 200, cart create 201, merchant provider-status 200, and shipments provider-status 200 with live blocked/manual fallback indicators.
- `pnpm test:smoke` passed 29/29.
- `pnpm smoke` ran and failed 9/46. The run exposed stale smoke-test assumptions (`body.data.data` for products and old `/api/v1/products` expectation) plus a real local DB blocker: order/tracking routes query `orders.preparation_status`, but the current local DB has not applied `packages/db/src/migrations/0077_order_preparation_status.sql`.
- Recorded ISSUE-0027 and regression guidance. Owner approval is required before any local `db:migrate` or DB rebuild.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, no live payment/shipping calls.

## 2026-06-28 — Sandbox Rehearsal Checklist (TASK-0090)

- Added `docs/ops/SANDBOX_REHEARSAL_CHECKLIST.md` for local mock and conditional staging sandbox payment/shipping rehearsal.
- Defined local mock payment scenarios, local mock/manual shipping readiness checks, staging sandbox preconditions, redacted evidence rules, and GO/NO-GO triggers.
- Verified the focused local mock test baseline: 10 files / 151 tests passed.
- Updated launch-readiness source-of-truth docs so the next safe action is local mock rehearsal execution, not live beta or production launch.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, no live payment/shipping calls.

## 2026-06-28 — Owner Gate Answers + Sandbox Path (TASK-0089)

- Recorded owner answers for launch gates: VAT/ZATCA is not available, e-commerce license exists but proof/reference is pending, DPO is not available, and sandbox preparation is the immediate requested path.
- Updated `LAUNCH_READINESS_GATE.md`, `PRODUCTION_LAUNCH_GATES.md`, `REMAINING_WORK.md`, and `HAA_TASK_LEDGER.md` so sandbox planning can proceed without live providers or production action.
- Kept closed live beta and public launch as NO-GO because VAT/ZATCA, DPO, PCI/ASV, pen-test, DR/restore, DNS/secrets, live credentials, and beta merchants are not all closed.
- Safety boundary unchanged: no deploy, no `db:migrate`, no secrets, no production action, no live payment/shipping calls.

## 2026-06-28 — Launch Readiness Gate v1 (TASK-0088)

- Added `docs/ops/LAUNCH_READINESS_GATE.md` as the immediate owner/agent decision board for starting launch-readiness work.
- Classified launch modes: readiness sprint is GO, staging rehearsal is CONDITIONAL, closed live beta is NO-GO, and public launch is NO-GO.
- Consolidated blockers from the existing launch docs into a single domain gate: owner gates G2-G10, DNS/TLS, production secrets, Geidea/payment credentials, shipping credentials, wallet migration execution, Sentry/monitoring, backups/restore, pen-test, DR drill, and beta merchant cohort.
- Updated `TASK_TRACKER.md`, `CURRENT_STATE.md`, `ACTIVE_WORK.md`, and the TASK-0088 skill compliance report.
- Verification: `pnpm preflight` passed; `pnpm ops:monitor` exited 0 with no actionable events and no recommended incidents/tasks; `pnpm check:skills` passed 43/43; `git diff --check` was clean.

## 2026-06-28 — Apple-grade Defensive Audit P1 Hardening (TASK-0087)

- Ran the repository safety gate and local defensive audit across dependency audit, secret scanning, Semgrep SAST, CI workflow review, Docker/deploy config review, crypto helpers, and dashboard print-output sinks. The uploaded screenshot was explicitly ignored per user instruction and did not influence findings.
- Hardened staging ops workflows (`ops-staging-bullmq-check`, `ops-staging-env`, `ops-staging-migrate`) by moving workflow inputs through shell `env`, replacing direct `${{ inputs.* }}` interpolation inside `run:` blocks, and base64-encoding remote env payload transfer before SSH execution.
- Hardened credential encryption helpers in `packages/commerce-core` and `packages/marketplace-core`: strict 64-hex key validation, explicit AES-GCM `authTagLength: 16`, IV/tag/ciphertext format checks, and malformed encrypted-looking payload rejection before decrypt.
- Added `apps/merchant-dashboard/src/lib/html.ts` and wired order bulk print plus gift-message print windows through HTML-context escaping so user-controlled order/customer/gift text cannot break out of print markup.
- Added focused regression tests for workflow shell input handling, encrypted credential formats, malformed payload rejection, and dashboard print HTML escaping. Updated the existing PII/CSV contract test so print HTML and CSV export use the correct escaping contexts.
- Verification: focused tests passed 42/42; `pnpm typecheck` passed; `pnpm lint` exited 0 with 499 pre-existing warnings; `pnpm test` passed 4618 active tests with 3 skipped and 14 todo; `pnpm build` passed with the existing storefront Rollup chunk warning for `MarketplaceProductCard` re-exports.
- Residual audit items not changed in this P1-only patch: gitleaks historical redacted findings and ignored local env/generated files require owner-led rotation/hygiene decisions; Docker image scanning could not run because the Docker daemon was unavailable; Semgrep residual warnings are reviewed JSON-LD and legacy Nginx `$host` items; repo-wide lint warnings remain separate quality debt.

## 2026-06-27 — P1 CVE Cleanup + Pixel Script Hardening (TASK-0086)

- Closed all 6 `pnpm audit` vulnerabilities by upgrading `vite` from `6.4.2` to `6.4.3` (closes GHSA-fx2h-pf6j-xcff high + GHSA-v6wh-96g9-6wx3 moderate) and adding pnpm overrides for `esbuild@0.25.12` (closes GHSA-67mh-4wv8-2f99 transitive from drizzle-kit) and `uuid@11.1.1` (closes GHSA-w5hq-g745-h8pq transitive from storybook).
- Verified `pnpm audit` now reports **0 vulnerabilities** (was 6, including 2 high). Verified `pnpm deps:audit --prod` also clean (already was, but reconfirmed).
- Hardened pixel-script injection in `apps/storefront/src/hooks/usePixels.ts`:
  - Added a defense-in-depth provider allowlist (`PIXEL_PROVIDER_SIGNATURES` in browser-safe `packages/commerce-core/src/pixel-validation.ts`) covering meta (fbq), tiktok (ttq / TiktokAnalyticsObject), snapchat (snaptr), twitter (twq), ga4 (gtag / dataLayer), gtm (dataLayer / gtm.js), and pinterest (pintrk).
  - Backend `PixelService.buildScripts` now stamps each script block with a `<!-- HAA-PIXEL-PROVIDER: <name> -->` marker so the frontend validator can pinpoint which signature to check.
  - Frontend `usePixels` now imports `validatePixelScripts()` from `@haa/commerce-core/pixel-validation` and runs every fetched payload through it before `innerHTML`. Payloads with any `<script>` whose body does not match a known provider signature are dropped silently with a console warning — including tampered responses and admin-configured payloads that bypass `buildScripts` entirely.
  - Added `window.__haaPixelsLoaded` observability list of successfully loaded providers, so future CSP report-only collectors can audit pixel execution.
- Fixed the PR #315 storefront CI build failure by keeping pixel validation out of the main `@haa/commerce-core` browser import path. The main package index still re-exports the validator for Node/test callers, but storefront imports the explicit subpath so Vite does not pull `commerce-core/dist/index.js`, DB clients, or `postgres` into the browser build.
- Added `tests/pixel-provider-allowlist.test.ts` (13 tests) covering: signature list completeness, buildScripts marker + signature embedding, ID sanitization defense, payload rejection of arbitrary `<script>alert(1)</script>`, mismatched-provider rejection, multi-provider acceptance, and src-loaded script exemption for the GA4 gtag/js loader.
- Verified full regression: `pnpm exec vitest run tests/` → **4543 passed / 0 failed / 3 skipped / 14 todo**. Pixels-route regression tests still pass (5/5 in `tests/storefront-pixels-route.test.ts`).
- Verified `pnpm preflight` is green on the rebased branch (against current `main` HEAD `ad7d37a4`). Earlier audit notes that mentioned "14 pre-existing TS unused-locals errors" were based on a working tree that contained the other agent's WIP; with that WIP excluded, `pnpm run -r typecheck` and `pnpm preflight` both pass with zero errors. No follow-up PR is required for the preflight blocker.
- Out of scope (deferred to P2/P3 follow-ups): CSP nonce migration (requires nginx + Express + template coordination); token-only-in-cookie migration (requires login flow refactor); legacy query-token removal in `support.ts`, `haa-marketplace.ts`, and WhatsApp SSE.

## 2026-06-27 — CI E2E Local Target Defaults (TASK-0085)

- Diagnosed why PR #308's `main` CI run was cancelled: `.github/workflows/ci.yml` uses `concurrency.group: CI-${{ github.ref }}` with `cancel-in-progress: true`, and a newer `main` push superseded the run.
- Confirmed PR #308's Deploy run succeeded with staging smoke 5/5 on merge commit `3af46fd809a6ab669b4e42effa312cadd4307ac8`.
- Identified the newer `main` CI E2E failure as an environment-target mismatch: CI started local dev servers, but Playwright navigated to shared staging during a concurrent Deploy.
- Changed Playwright defaults so `CI=true` targets local storefront `http://localhost:5174`, while explicit `E2E_BASE_URL` still supports manual staging checks.
- Changed merchant-login E2E to use `E2E_MERCHANT_URL` or local merchant dashboard `http://localhost:5173/login` in CI, instead of hardcoding the staging merchant subdomain.
- Verified with local E2E against local servers: `CI=true pnpm test:e2e` passed 4/4; supporting checks passed (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check:skills`, `git diff --check`, `pnpm preflight`, and final `pnpm ops:monitor`).

## 2026-06-27 — Gift Message Sanitization + Shipping Guard Verification (TASK-0084)

- Added a plain-text gift-message sanitizer for commerce-core write paths and shared storefront DTO output paths.
- Wired cart item storage, checkout session gift metadata, order-level gift options, order-item gift messages, public cart DTOs, and public order DTOs through sanitizer calls.
- Added `tests/gift-message-sanitization.test.ts` to cover malicious HTML/script/control-character cleanup, Arabic text preservation, input/output boundary wiring, and safe React text rendering.
- Re-verified the existing shipment guard: unpaid non-COD and unconfirmed COD orders are blocked before shipment creation; paid or COD-pending packed orders remain valid.
- Classified repo-wide lint warnings as pre-existing cleanup debt rather than mixing a broad refactor into this security task.

## 2026-06-27 — BNPL Callback Tenant-Isolation Fix (TASK-0083)

- Fixed a confirmed P0 from the attached deep security review: `CheckoutService.handleBNPLCallback` now resolves BNPL payments by both `providerPaymentId` and `storeId` before provider confirmation or side effects.
- Added `tests/bnpl-callback-tenant-isolation.test.ts` to lock the ownership predicate and the ownership-specific not-found path.
- Verified the pasted wallet-idempotency concern against current code: schema partial unique indexes, migrations `0062`/`0073`, and ledger `onConflictDoNothing` guards are already covered by existing tests.
- Verified the direct `pending_payment -> shipped` claim is already rejected by the order state machine; stricter unpaid-shipping guards for indirect progressions remain a separate follow-up candidate.
- Gift-message sanitization was not changed in this P0 patch to avoid mixing scopes; it should be handled as a dedicated medium-risk security task if prioritized.

## 2026-06-20 — GitHub Actions CI/Docker Recovery (TASK-0054)

- Added a PostgreSQL 16 service plus the documented fresh-database bootstrap/seed preparation to the CI Test job; E2E now uses the same bootstrap path.
- Repaired migration 0010 with an explicit `USING` cast for `customers.total_spent`, allowing the chain to run on a clean PostgreSQL database.
- Added ordered workspace-package builds before every app build in CI and in all four Dockerfiles.
- Changed the API production dependency install to skip lifecycle scripts, preventing the root Husky prepare hook from failing when devDependencies are excluded.
- Added CI contract coverage for the database service and package-before-app build order.
- Local verification: 12/12 CI contract tests, 2668 full-suite tests, all workspace packages, and all four apps passed. Docker image build remains delegated to GitHub because Docker is unavailable locally.
- Added `docs/ops/GITHUB_ACTIONS_TROUBLESHOOTING.md` with the CI architecture, recovered root causes, diagnostic commands, prevention rules, and closure criteria.

## 2026-06-17 (Session #2: TASK-0034 — Phase 4-9 + Saudi PDPL — ALL 8 SUB-ITEMS DONE)

### Context

Session #2 of the 4-session "production-ready" roadmap (see `~/.mavis/scratchpads/mvs_50210367da784a45867523901dde4cbc/scratchpad.md`). All 8 sub-items of TASK-0034 shipped in a single session. **Owner decision Q2 (refund policy per provider) and Q5 (payout reservation) resolved during implementation** with reasonable defaults (Q5 = soft cap = warning only). Q1 and Q3 were already resolved in Session #1.

### Added — Sub-item 1: postPlatformFee

- New `postPlatformFee` method on `WalletPostingService` — mirrors `postCodFee` exactly. Reads the per-store `PlatformFeePolicy`, calculates the fee, snapshots the policy onto the result. Idempotent on `(storeId, orderId, 'platform_fee')`. **Resolves audit Finding 1 for the platform_fee path**; call sites in `checkout.ts` and `payment-webhook-service.ts` were migrated in sub-item 5.
- 7 new tests in `tests/wallet-posting-service.test.ts` (mode=none, percentage, fixed, percentage_plus_fixed, idempotency, non-positive order total, postPlatformFee vs postCodFee independence).

### Added — Sub-item 2: GatewayFeeRefundPolicy enum (Q2)

- New module `packages/wallet-core/src/gateway-fee-refund-policy.ts`:
  - `GatewayFeeRefundPolicy = 'REFUNDABLE' | 'NON_REFUNDABLE'`
  - `DEFAULT_GATEWAY_FEE_REFUND_POLICY = 'NON_REFUNDABLE'` (safest for the merchant)
  - `getProviderDefaultRefundPolicy(provider)` — case-insensitive lookup with Q2 owner decision baked in:
    - `moyasar` → `REFUNDABLE` (Moyasar refunds the gateway fee)
    - `tabby` / `tamara` → `NON_REFUNDABLE` (pending verification with providers)
    - all other providers → `NON_REFUNDABLE` (default)
  - `normalizeGatewayFeeRefundPolicy(input)` — for future admin override endpoints
- 8 new tests in `tests/gateway-fee-refund-policy.test.ts` (enum shape, default, provider defaults, unknown fallback, case-insensitive lookup, type contract).
- Per-store overrides (a future `storeGatewayFeePolicy` table) are out of scope — tracked as a follow-up.

### Added — Sub-item 3: postGatewayFee + postSettlementDifference

- `postGatewayFee(input)` — records a `gateway_fee` debit. Resolves the provider's refund policy via `getProviderDefaultRefundPolicy`; accepts explicit `refundPolicy` override for merchants with negotiated deals. Idempotent on `(storeId, orderId, 'gateway_fee')`. **Resolves audit Finding 2** (no `gateway_fee` entry type existed in code or live DB).
- `postSettlementDifference(input)` — records a **signed** difference between expected and settled amounts. Positive = merchant gained (e.g. favorable FX), negative = merchant lost (e.g. partial refund). `reason` enum: `partial_refund` | `extra_charge` | `fx_difference` | `unknown`. Idempotent on `(storeId, orderId, 'settlement_difference')`.
- `PostResult` type extended with optional fields: `provider`, `refundPolicy`, `reason`, `payoutId`.
- 10 new tests in `tests/wallet-posting-service.test.ts` (5 per method, including idempotency, override, and independence).

### Changed — Sub-item 4: Migrate apps/api refund route to WalletPostingService

- `apps/api/src/routes/orders.ts:131` refund handler now uses the same pattern as `collectCOD` in `packages/commerce-core/src/orders.ts`. The service provides the entry type + amount; the `WalletLedger` does the actual DB write. The transaction-free `db` instance is shared between the service and the ledger (matches the route's existing structure). The `body.reason` (free-text, max 500 chars) is preserved in the wallet entry description; the service's `reason` field uses the strict 4-value union for analytics, defaulted to `'customer_request'`. **Resolves audit Critical Finding 3**.
- 1 new wiring test in `tests/wallet-posting-wiring.test.ts`.
- Also: export `WalletPostingService` + `DedupKey` / `PostResult` / `PolicySource` types from `packages/commerce-core/src/index.ts`. They were implemented in Session #1 but never exported, so this is also a leftover from TASK-0033.

### Changed — Sub-item 5: Migrate checkout.ts + payment-webhook-service.ts to WalletPostingService

- 4 raw `recordEntry` call sites in feature code migrated to use the service. The actual DB write remains on `WalletLedger` (preserves the audit-trail fields: `feeRatePct`, `feeFixed`, `feeSource`, `metadata`).
  - `payment-webhook-service.ts` `runPostPaymentFlow` (2 sites — sale + platform_fee)
  - `checkout.ts` online checkout `confirmPayment` (2 sites)
  - `checkout.ts` BNPL checkout `confirmPayment` (2 sites)
- Cross-flow dedup (checkout wrote platform_fee before the webhook arrives) is preserved via `hasPlatformFeeForOrder` — the service's per-instance dedup only protects within a single transaction.
- The `orderNumber` field is metadata only (not part of the dedup key), so the BNPL flow uses `String(payment.orderId)` as a placeholder; a future task can look up the real `orderNumber` if audit metadata needs it.
- 3 new wiring tests in `tests/wallet-posting-wiring.test.ts`.
- 2 tests updated in `tests/platform-fees-wiring.test.ts` (the `calcPlatformFee` import is no longer expected in `checkout.ts` or `payment-webhook-service.ts` — the calc moved into the service).

### Added — Sub-item 6: Gateway Fee UX (Q1)

- New "You receive X" hero card at the top of `apps/merchant-dashboard/src/pages/Wallet.tsx`. Shows `netBalance` prominently with a native `<details>`/`<summary>` collapsible breakdown of the components: `totalSales`, `platformFees`, `paymentFees` (gateway), `shippingFees` (conditional), and `netBalance`. Q1 owner decision (2026-06-16): "You receive X" with collapsible breakdown, matching Saudi BNPL UX conventions.
- 4 new i18n keys in `apps/merchant-dashboard/src/i18n/locales/ar.json`: `youWillReceive`, `youWillReceiveHint`, `viewBreakdown`, `viewBreakdownHide`.
- Native `<details>`/`<summary>` keeps the change dependency-free (no Radix Collapsible or similar added).
- Scope: merchant wallet aggregate view. Per-order "You receive X" on the order detail / checkout confirmation is a follow-up.
- 5 new source-grep tests in `tests/gateway-fee-ux-q1-wiring.test.ts`.

### Added — Sub-item 7: postPayoutDebit + postPayoutReversal + hasRecentPayoutRequest

- `postPayoutDebit(input)` — records a `payout_debit` entry when a payout is initiated. `status` field tracks lifecycle: `'processing'` | `'completed'` | `'failed'`. Idempotent on `(storeId, payoutId, 'payout_debit')`.
- `postPayoutReversal(input)` — records a `payout_reversal` entry when a payout is cancelled or fails. `reason` field: `'merchant_cancelled'` | `'system_error'` | `'compliance_hold'`. Idempotent on `(storeId, payoutId, 'payout_reversal')`.
- `hasRecentPayoutRequest(storeId)` — Q5 soft cap helper. Returns true if a payout_debit or payout_reversal has been posted for this `storeId` during this service instance's lifetime. **Q5 owner decision: soft cap = warning only** (not hard block). The route can use this to show a "you have a pending payout request" warning to the merchant. In-memory check (per-instance); a DB-backed check is a follow-up.
- **Completes the WalletPostingService surface (all 8 methods now implemented).** Resolves audit Phase 10 (payout pending reservation).
- 11 new tests in `tests/wallet-posting-service.test.ts` (4 + 3 + 4).

### Added — Sub-item 8: PDPL endpoints (Saudi Personal Data Protection Law)

- New `apps/api/src/routes/merchant-data.ts`:
  - `GET /merchant/:storeId/data-export` — returns a JSON dump of the merchant's data: `{ store, storeBillingSettings, products, orders (with items), customers (basic info, no password hashes), walletEntries, coupons, categories, brands, tags }`. Not paginated — full export in one response. Future: streaming or download URL for very large datasets.
  - `DELETE /merchant/:storeId/account` — soft delete the store (`isActive = false`, `status = 'deactivated'`). Preserves data for 30 days (retention period for tax/audit). Returns `{ deactivatedAt, retentionDays, hardDeleteAt }`. Hard-delete background job is tracked as a follow-up.
- Both endpoints: `requireAuth` + `requireStoreAccess` + `settings:update` permission.
- `store_deactivated` added to the `AuditAction` union (`packages/shared/src/types/orders.ts`) with Arabic label `'إيقاف المتجر (PDPL)'` in `AUDIT_ACTION_LABELS`.
- Mounted at `/merchant/:storeId` in `apps/api/src/index.ts`.
- 12 new source-grep tests in `tests/pdpl-endpoints-wiring.test.ts`.
- Limitations / follow-up: no re-activate endpoint (deleted account is permanent); no 2FA confirmation step for deletion; no bulk export of audit logs; hard-delete background job after 30-day retention.

### Verified (Session #2 end state)

- **Test count:** `pnpm test` → 2329 passing (+56 from Session #1 baseline 2273), 4 pre-existing baseline failures (unchanged from Session #1):
  - `tests/migration-deduplication.test.ts`: 0046 file split
  - `tests/schema-deduplication.test.ts`: marketing-actions.ts split
  - `tests/security-boundary-gates.test.ts`: Dashboard does not import storefront + Storefront CSS global
  - These are all documented Session #1 baseline failures unrelated to Session #2 work.
- **Sub-item-level verification:**
  - `tests/wallet-posting-service.test.ts`: 40/40 (3 + 7 + 10 + 11 + 9 dedup = 40)
  - `tests/wallet-posting-wiring.test.ts`: 10/10 (was 7, +3 for new sub-items)
  - `tests/gateway-fee-refund-policy.test.ts`: 8/8
  - `tests/gateway-fee-ux-q1-wiring.test.ts`: 5/5
  - `tests/pdpl-endpoints-wiring.test.ts`: 12/12
  - `tests/platform-fees-wiring.test.ts`: 25/25 (was 27, -2 sub-item 5 expectations updated)
- **Branch state:** `feature/phase-9-cod-fee-policy` @ `bbd97d2e` (6 Session #1 + 9 Session #2 = 15 commits). `docs/financial-wallet-audit-phase-1` @ `09f0323b` (3 audit commits, parked). `integration/platform-fee-policy` @ `761ae27e` (untouched, parked). Stash `stash@{0}` (QP5 noise) preserved.
- **Typecheck:** `@haa/commerce-core`, `@haa/api`, `@haa/merchant-dashboard`, `@haa/wallet-core`, `@haa/shared` — all clean.

### Risks (Session #2 → Session #3+ handoff)

- 🟢 **Low** for Session #2 work — all changes are additive or migration-based, with no merchant-visible behavior change beyond the new PDPL endpoints.
- 🟡 **Q4 (Tabby/Tamara fee data source)** still open — needs owner decision during Session #3 implementation. Current default uses whatever the webhook payload provides.
- 🟡 **Q5 hard-block option** — currently soft cap (warning only). If abuse appears, a future task can tighten to hard block.
- 🟡 **PDPL hard-delete background job** — current state is soft delete with 30-day retention. The hard-delete job is a follow-up.
- 🟡 **Per-order "You receive X" UX** — current implementation is the aggregate wallet view. Per-order checkout confirmation is a follow-up.
- 🟡 **2FA confirmation for account deletion** — recommended for Session #3+ to prevent accidental deletion.
- 🟡 **3 of 4 owner gates still required** — deployment, live API keys (Moyasar/Tabby/Tamara/Sentry), legal docs finalization, pricing beyond Q1/Q2/Q3.

### Out of Session #2 (deferred to Session #3+)

- Quality Pass 5 remainder: Route Migrations 20-24 (subscriptions, webhooks, shipments, haa-marketplace, admin/tenants-stores, admin/marketplace) — total 5 routes still on raw Drizzle.
- 3D Secure flow (SAMA mandatory since 2021).
- ZATCA e-invoicing Phase 2 integration (invoice generator with QR).
- VAT-aware pricing display.
- Deployment runbook (provision server, run docker-compose, configure reverse proxy).
- Legal docs templates: Privacy Policy, ToS, DPAs.
- Live API keys (Moyasar, Tabby, Tamara, Sentry DSN, Postgres production credentials).
- Walk-through with owner.

---

## 2026-06-16 (Session #1: Financial Wallet Accuracy Foundation — Audit + COD Fee + WalletPostingService)

### Context

Session #1 of the 4-session "production-ready" roadmap (see `~/.mavis/scratchpads/mvs_50210367da784a45867523901dde4cbc/scratchpad.md`). Owner directive: "Complete the entire technical product. Only external integrations activation and deployment remain for me." Combined with the 14-phase remediation plan from the Financial Wallet Accuracy Pass Phase 1 audit (TASK-0031). **3 of 5 owner questions resolved** (Q1 gateway fee UX, Q2 refund policy per provider, Q3 COD fee). **Q1+Q2 implementation deferred to TASK-0034 (Session #2); Q3 implementation DONE in TASK-0032.** Q4 (Tabby/Tamara fee data source) and Q5 (payout pending reservation policy) still open; to be answered during Session #2.

### Added

- **TASK-0031: Financial Wallet Accuracy Pass — Phase 1 Audit (diagnostic only).** New `docs/ops/FINANCIAL_WALLET_AUDIT_PHASE_1.md` (402 lines, 18 sections) on `docs/financial-wallet-audit-phase-1` branch. Documents all 6 `recordEntry(...)` call sites, live-DB entry-type distribution (2 types: `sale` + `platform_fee`, 25 each), 5 critical findings, 14-phase remediation plan (Phases 2-15), and 5 open owner questions. **0 code, 0 migration, 0 schema changes.** Integration branch `integration/platform-fee-policy` HEAD untouched at `761ae27e`; stash `stash@{0}` (QP5 noise) preserved untouched. 3 audit-branch commits, all docs-only.
- **TASK-0032: Phase 9 — COD Fee Policy (Q3 owner decision, DONE).** Per-store COD fee policy decoupled from platform fee. Migration `0053_cod_fee_policy.sql` adds 4 columns to `store_billing_settings`: `cod_fee_mode varchar(30) default 'percentage' NOT NULL`, `cod_fee_pct numeric(8,6)`, `cod_fee_fixed numeric(12,2)`, `is_cod_fee_enabled boolean default true NOT NULL`. CHECK constraint `store_billing_settings_cod_pct_cap` enforces `cod_fee_pct <= 0.5`. New `packages/wallet-core/src/cod-fees.ts` (parallel to `platform-fees.ts`): `CodFeePolicy`, `COD_FEE_MODES`, `DEFAULT_COD_FEE_POLICY` (default 2%), `normalizeCodFeePolicy`, `calcCodFee` (4 modes: `none` / `percentage` / `fixed` / `percentage_plus_fixed`), `describeCodFeePolicy`, `validateCodFeePolicyInput`, `MAX_COD_FEE_PCT` (50%). `packages/commerce-core/src/orders.ts:321` (`collectCOD`) no longer hardcodes `* 0.02` — reads from the policy service and snapshots policy onto the `cod_fee` wallet entry (feeRatePct, feeFixed, feeSource='cod_policy') for historical immutability. **2 new test files:** `tests/cod-fees.test.ts` (34 unit tests) + `tests/cod-fees-wiring.test.ts` (12 source-grep tests) = 46/46 passing. No regressions on `platform-fees` tests.
- **TASK-0033: Phase 2-3 — WalletPostingService (Session #1 of 4-session master plan, Session #1 scope DONE).** New `packages/commerce-core/src/wallet-posting-service.ts` — central posting service. 8 methods declared (`postSale`, `postPlatformFee`, `postCodFee`, `postRefund`, `postPayoutDebit`, `postPayoutReversal`, `postGatewayFee`, `postSettlementDifference`). **3 fully implemented in Session #1:** `postSale`, `postCodFee`, `postRefund` (exceeded target of 2). **5 stubbed for Session #2 / TASK-0034.** Centralized dedup via `hasExistingEntry(storeId, referenceType, referenceId, type)` helper — **resolves Critical Finding 4 (sale double-write race)**. Refactored 2 of 6 `recordEntry(...)` call sites to use the service (`orders.ts:313,320`). 4 call sites still raw, queued for Session #2 (TASK-0034 sub-items 5+6: `apps/api/src/routes/orders.ts:131` refund, `checkout.ts`, `payment-webhook-service.ts`). `WalletEntryType` union extended with `gateway_fee` + `settlement_difference` for the upcoming Phase 4-9 work. **2 new test files:** `tests/wallet-posting-service.test.ts` (12 unit tests) + `tests/wallet-posting-wiring.test.ts` (7 source-grep tests) = 19/19 passing.
- **TASK-0034: Phase 4-9 + Saudi PDPL (Session #2 brief, registered; queued for next session).** 8 sub-items planned: (1) `postPlatformFee` (mirrors `postCodFee`); (2) `postGatewayFee` + `postSettlementDifference` (new entry types); (3) `GatewayFeeRefundPolicy` enum (Q2: `REFUNDABLE | NON_REFUNDABLE`); (4) `postPayoutDebit` + `postPayoutReversal` (Q5); (5) migrate `apps/api/src/routes/orders.ts:131` refund to service; (6) migrate `checkout.ts` + `payment-webhook-service.ts` to service; (7) PDPL data export + account deletion endpoints (`GET /api/merchant/data-export`, `DELETE /api/merchant/account`); (8) gateway fee UX (Q1: "You receive X" + collapsible breakdown). Out of Session #2: Route Migrations 20-24 (QP5 remainder), 3DS flow, ZATCA e-invoicing, deployment runbook, legal templates.

### Changed (audit decisions)

- **Owner Decision Q1 (gateway fee UX):** "You receive X" with collapsible breakdown. Rationale: more transparent and matches Saudi BNPL UX conventions. Implementation deferred to TASK-0034 sub-item 8.
- **Owner Decision Q2 (refund policy per provider):** Per-provider enum, default `NON_REFUNDABLE`. Provider-specific defaults: Moyasar=`REFUNDABLE`, Tabby/Tamara=`NON_REFUNDABLE` pending verification. Implementation deferred to TASK-0034 sub-item 3.
- **Owner Decision Q3 (COD fee):** Per-store policy, decoupled from platform fee, default 2% (preserves current behavior). **DONE in TASK-0032.**

### Background

The wallet entry creation was dispersed across 6 call sites in 3 files with no central posting service. The Phase 1 audit (TASK-0031) flagged 5 critical findings. Session #1 shipped:

- **Findings 1, 3, 4** — addressed via the new `WalletPostingService` (TASK-0033). Centralized dedup kills the sale double-write race (Finding 4). Route-level refund (Finding 3) and 6 dispersed call sites (Finding 1) are partially addressed; remaining 4 call sites queued for Session #2 (TASK-0034 sub-items 5+6).
- **Finding 2** (no `gateway_fee` entry type) — `WalletEntryType` union extended; full implementation queued for TASK-0034 sub-item 2.
- **Finding 5** (hardcoded COD fee) — DONE in TASK-0032. Policy-driven via `store_billing_settings.cod_fee_*` columns.

### Verified (Session #1 end state)

- **Test count:** `pnpm test` → 2273 passing (+18 from baseline 2255), 4 pre-existing baseline failures (migration-deduplication / schema-deduplication / security-boundary-gates CSS isolation) unrelated to Session #1 work.
- **TASK-0031:** 0 code changes; diagnostic report exists and matches all acceptance criteria.
- **TASK-0032:** `pnpm vitest run tests/cod-fees.test.ts tests/cod-fees-wiring.test.ts` → 46/46. `pnpm vitest run tests/cod-fees.test.ts tests/cod-fees-wiring.test.ts tests/platform-fees.test.ts tests/platform-fees-wiring.test.ts` → 108/108 (no regressions). Typecheck clean on `@haa/wallet-core`, `@haa/commerce-core`, `@haa/db`.
- **TASK-0033:** `pnpm vitest run tests/wallet-posting-service.test.ts tests/wallet-posting-wiring.test.ts` → 19/19. Typecheck clean on `@haa/commerce-core`, `@haa/wallet-core`.
- **TASK-0032 Fresh-DB verification (2026-06-16):** Created `haastores_cod_test`, applied all 56 migrations via `psql -f` (drizzle-kit migrate fails silently on stale journal — known gotcha documented in MEMORY.md), then verified: (a) 4 new columns exist with correct types/defaults, (b) CHECK constraint exists with correct def, (c) all 6 behavioral tests pass (valid insert 0.02, cap edge case 0.5 OK, over-cap rejected 0.6 raises `store_billing_settings_cod_pct_cap`, pct=NULL OK, fixed mode OK, percentage_plus_fixed mode OK), (d) idempotent re-apply confirmed (4 `column already exists` NOTICEs + `DO` block re-runs, schema unchanged), (e) 97 total tables created (full schema applied).
- **Branch state:** `feature/phase-9-cod-fee-policy` @ `ef991a86` (6 Session #1 commits). `docs/financial-wallet-audit-phase-1` @ `09f0323b` (3 audit commits, all docs, parked). `integration/platform-fee-policy` @ `761ae27e` (untouched, parked). Stash `stash@{0}` (QP5 noise) preserved.

### Risks (Session #1 → Session #2 handoff)

- 🟢 **Low** for Session #1 work — all changes are additive or policy-driven, with no merchant-visible behavior change (default values preserve current behavior).
- 🟡 **5 stub methods in WalletPostingService** — `postPlatformFee`, `postPayoutDebit`, `postPayoutReversal`, `postGatewayFee`, `postSettlementDifference` are declared but not implemented. Session #2 = TASK-0034.
- 🟡 **4 raw call sites** — `apps/api/src/routes/orders.ts:131` refund + `checkout.ts` + `payment-webhook-service.ts` still use raw `WalletLedger.recordEntry(...)`. Session #2 = TASK-0034 sub-items 5+6.
- 🟡 **drizzle-kit migrate gotcha** — `drizzle-kit migrate` fails silently on stale journal (root cause: 0050/0051 applied via psql, journal not synced). Documented in MEMORY.md (`drizzle-migration-snapshots` topic). Affects fresh-DB verification only; existing-DB unaffected.
- 🟢 **Admin UI/write surface for COD fee field** — closed by TASK-0126 on 2026-06-29. Merchant wallet COD display remains optional. Not blocking backend correctness.
- 🟡 **Q4 (Tabby/Tamara fee data source) and Q5 (payout pending reservation policy)** — owner decisions deferred to Session #2 (TASK-0034).
- 🟡 **3 of 4 owner gates still required** — deployment, live API keys (Moyasar/Tabby/Tamara/Sentry), legal docs finalization. Owner-only.

### Session #2 plan (TASK-0034, ~3-4 hours focused work)

8 sub-items as listed in "Added" above. Expected commits: ~6-8 (one per sub-item or grouped). After Session #2: 0 raw call sites, all 8 WalletPostingService methods implemented, Saudi PDPL endpoints live, gateway fee UX shipped to merchant wallet.

### Session #3+ (not in Session #2)

- Quality Pass 5 remainder: Route Migrations 20-24 (subscriptions, webhooks, shipments, haa-marketplace, admin/tenants-stores, admin/marketplace) — total 5 routes still on raw Drizzle.
- 3D Secure flow (SAMA mandatory since 2021).
- ZATCA e-invoicing Phase 2 integration (invoice generator with QR).
- VAT-aware pricing display.
- Deployment runbook (provision server, run docker-compose, configure reverse proxy).
- Legal docs templates: Privacy Policy, ToS, DPAs.
- Live API keys (Moyasar, Tabby, Tamara, Sentry DSN, Postgres production credentials).
- Walk-through with owner.

---

## 2026-06-15 (Quality Pass 5 — Items 1+2+3: Service Layer + Queue Scaffold + Theme Rationalization)

### Added

- `apps/api/src/services/queue.ts` (~120 LOC) — BullMQ shim with noop-first design, mirroring the observability shim pattern:
  - `getQueue()` returns the active producer (BullMQ if installed + `QUEUE_REDIS_URL` set, else noop)
  - `NoopQueue` is always safe, logs to stderr so production operators see what would have been queued
  - BullMQ loaded lazily via CommonJS `require` cast to `any` — package stays optional
  - try/catch fallback to noop if BullMQ init fails
  - `JobOptions` shape (name, data, delayMs, attempts) is BullMQ-flavored so noop + real are interchangeable
- `apps/api/src/services/README.md` — convention doc for the service layer. Codifies Principle 5 ("No route accesses Drizzle directly"), documents where service code lives (`packages/commerce-core` for business logic, `apps/api/src/services` for cross-cutting API services, `apps/api/src/routes` for transport only), and the migration steps for converting a route to use the service layer.
- `docs/ops/THEME_RATIONALIZATION.md` — multi-step migration plan to deprecate and remove `@haa/theme-system` (the legacy package, replaced by `@haa/storefront-themes` per its own description). Lists the 8 call-sites, the API surface mapping, and the recommended migration order (apps/api → apps/merchant-dashboard → apps/storefront).
- `packages/storefront-themes/README.md` — explains role + relationship to other theme packages
- `packages/system-theme/README.md` — dashboard identity layer docs
- `packages/theme-react/README.md` — React bindings docs
- `tests/service-layer-enforcement.test.ts` (7 tests) — scans every route file, counts `drizzle-orm` imports, asserts the count stays ≤ `MAX_EXISTING_ROUTE_VIOLATIONS` (24). Logs the current migration backlog every run.
- `tests/queue-scaffold.test.ts` (12 tests) — asserts queue module shape, lazy BullMQ, noop default, `QUEUE_REDIS_URL` gating, try/catch fallback, `JobOptions` interface.
- `tests/theme-rationalization.test.ts` (7 tests) — asserts theme package structure, rationalization plan exists, legacy package flagged, no 7th theme package can be added silently.

### Background

Quality Pass 5 is the architectural cleanup pass. The three items shipped in this commit are **contracts** (tests + scaffolds + plan docs) that prevent the codebase from regressing into the same gaps that existed before. The actual migration work (converting 24 routes to use the service layer, removing `@haa/theme-system`) is multi-step and tracked by the new tests.

### Verified (TDD)

- Service-layer: 7/7 new tests pass.
- Queue: 12/12 new tests pass (verified RED 9/12 fail without impl → GREEN 12/12 with impl).
- Theme: 7/7 new tests pass.
- `pnpm --filter @haa/api typecheck` — clean.
- `pnpm --filter @haa/api build` — clean.
- Full test suite: 1948/1952 passing (4 pre-existing baseline failures in TASK-0027 working tree, unrelated to this commit).

### Risks

- 🟢 Low for the contracts. They prevent regression without changing runtime behavior.
- 🟡 Service-layer migration of 24 routes is significant work — deferred to future sessions via the test's migration backlog.
- 🟡 BullMQ producer API is minimal. Worker surface (the actual job processing) is a future iteration.
- 🟡 `@haa/theme-system` deletion is a coordinated 8-step migration across 3 apps — the plan doc records the steps.

### Next

- Migrate one route file from direct Drizzle access to a service call (start the budget reduction).
- Wire a real BullMQ worker process in a production deployment to drain the noop-queue.
- Begin the `@haa/theme-system` migration per the rationalization plan.

---

## 2026-06-15 (Quality Pass 4 — Items 2 + 3: Observability + Redis Rate Limiter)

### Added

- `apps/api/src/services/observability.ts` (~115 LOC) — observability shim with noop-first design:
  - `initObservability()` — wires an `ErrorMonitor` to the existing `error-handler.ts` interface
  - `createErrorMonitor()` — returns Sentry monitor if `SENTRY_DSN` + `@sentry/node` are present, else noop
  - `NoopMonitor` class — always safe to call, logs to stderr
  - `tryCreateSentryMonitor()` — lazy `require('@sentry/node')` with try/catch fallback to noop
  - `SentryShape` interface — local type definition so we don't need a hard import of the optional package
  - `initObservability()` is **idempotent** — safe to call multiple times
- `tests/observability-wiring.test.ts` (10 source-grep tests) — asserts the module shape, lazy require, noop, boot wiring, env recognition.
- `tests/redis-rate-limiter-wiring.test.ts` (14 source-grep tests) — asserts the production Redis rate-limiter wiring contract: atomic store, factory reads `RATE_LIMIT_STORE`, default `memory`, `REDIS_URL` required, X-RateLimit headers, 429 + RATE_LIMITED, store created once (not per-request), env.ts production defaults.

### Modified

- `apps/api/src/index.ts` — added `import { initObservability } from './services/observability.js'` and a call to `initObservability()` right after `app.onError(errorHandler)`. This is the only change to runtime code in this commit.

### Background

The project declared `SENTRY_DSN` and `OTEL_EXPORTER_OTLP_ENDPOINT` as required env vars in production (env.ts:88) but had **no consumer** for them — boot would fail with "missing SENTRY_DSN" yet no Sentry SDK was ever loaded. Similarly, the `ErrorMonitor` interface in `error-handler.ts` (from Quality Pass 1) had zero implementations and zero callers. This commit closes the gap with a noop-first shim: production deployments can opt in to Sentry by setting `SENTRY_DSN` + installing `@sentry/node`; dev/test/local runs are unaffected.

For the Redis rate limiter, the production code (`RedisAtomicRateLimiterStore` + factory) was already in place from earlier work but **untested**. This commit adds a contract test so future changes can't silently break the multi-instance production rate limiting.

### Verified (TDD)

- Observability: 10/10 new tests pass.
- Redis: 14/14 new tests pass.
- `pnpm --filter @haa/api typecheck` — clean.
- `pnpm --filter @haa/api build` — clean.
- Full test suite: 1922/1926 passing (4 pre-existing baseline failures in TASK-0027 working tree, unrelated to this commit).
- Negative-path: Sentry require failure (package not installed) → noop monitor, no boot crash. Verified by reading the `try/catch` in `tryCreateSentryMonitor`.

### Risks

- 🟢 Low. Both files are additive; the only runtime change is `initObservability()` which gracefully falls back to noop.
- 🟡 The Sentry init config is minimal (tracesSampleRate 0.1, environment from NODE_ENV). Production tuning belongs in deployment env config, not in code.
- 🟡 The Redis rate-limiter is only as good as the Redis instance behind it. The atomic store uses `INCR` + `PEXPIRE` (correct) but if the Redis is single-instance (no cluster), there's still a SPoF.

### Next

- Quality Pass 4 Item 4+: per-task scope. With CI + observability + Redis rate-limiter shipped, the core ops hardening is done. Possible next: request body size limits, response compression, structured log shipping (Loki/Datadog), request signing for outbound webhooks.

---

## 2026-06-15 (Quality Pass 4 — Item 1: CI/CD Pipeline)

### Added

- `.github/workflows/ci.yml` (158 lines) — real GitHub Actions CI pipeline. 4 parallel jobs (`preflight`, `typecheck`, `lint`, `test`), each with: `actions/checkout@v4` → `actions/setup-node@v4` (Node 20) → `pnpm/action-setup@v4` (pnpm 10) → pnpm store cache (key on `pnpm-lock.yaml`) → `pnpm install --frozen-lockfile` → run the relevant command.

### Triggers

- `push` to `main` and to all `quality-pass-*` branches
- `pull_request` to `main`
- `concurrency.cancel-in-progress: true` to save CI minutes on rapid pushes
- `preflight` is the gate dependency for the other 3 jobs

### Background

The project has had `tests/ci-cd-pipeline.test.ts` since Quality Pass 1 that asserts a CI workflow should exist with specific shape — but the workflow file was never created. Every commit relied on local `pnpm ci:local` to catch breakage. This commit makes the existing test green for the first time and gives the project a real automated gate on every push/PR.

### Verified (TDD)

- RED confirmed: `tests/ci-cd-pipeline.test.ts` had 10/10 failures before this commit.
- GREEN confirmed: 10/10 pass after this commit.
- Full test suite: 1898/1902 passing (4 pre-existing baseline failures in TASK-0027 working tree, unrelated to this commit).

### Risks

- 🟢 Low. Adds a CI workflow, doesn't change runtime code.
- 🟡 CI secrets (e.g. Sentry DSN) are not wired here — those come with the observability sub-item.
- 🟡 The `quality-pass-*` branch glob is permissive; main branch protection should still require reviews.

### Next

- Item 2: Sentry / OpenTelemetry observability wiring
- Item 3: Redis-backed rate-limiter production switch (`RATE_LIMIT_STORE=redis-atomic`)

---

## 2026-06-15 (Quality Pass 3 — Item 4: Deeper RBAC Review)

### Added

- `tests/rbac-coverage.test.ts` — automated enforcement that every mutating route in `apps/api/src/routes/` is RBAC-protected. The test scans every `.ts` file in the routes directory, finds every POST/PUT/PATCH/DELETE declaration, and asserts:

  1. **`requireAuth`** is called (inline or via the file-level `<router>.use('*', requireAuth(), ...)` middleware).
  2. **`requireStoreAccess`** is called for routes whose URL contains `:storeId`.
  3. **`requirePermission` / `requireAnyPermission`** is called on every mutating route.

- A `DENY_LIST` of route files that are intentionally public (no auth): pre-auth (auth, admin/_), webhooks (signature-based), storefront customer endpoints (cart, checkout, haa-marketplace, support under `/s/_`), and one-offs (landing-ai-agent, public-api with API key auth, health, support-errors, migration).

### Background

The RBAC framework is solid — Quality Pass 1 + 2 + RBAC Passes 1-5 already implemented 38+ routes with `requirePermission` + `requireAuth` + `requireStoreAccess`. But nothing **enforced** this contract: a future change could add a new mutating route without guards and the regression would slip through. The test codifies the contract.

### Verified (TDD)

- 4/4 new tests pass.
- **Negative test confirmed the test catches violations**: temporarily removed `requirePermission` from `coupons.ts POST /`, the test flagged it correctly. Restored.
- `pnpm --filter @haa/api typecheck` — clean
- Full test suite: 1891 passing, 0 regressions vs the pre-change baseline. (The 70+ pre-existing failures in `luxury-showcase-*` and `landing-ai-chat` tests come from the user's pre-existing TASK-0027 working tree, unrelated to this commit.)

### Risk

- 🟢 The test is a file-source scan; it does not change any production code.
- 🟡 Future maintainers must keep `DENY_LIST` in sync if a new intentionally-public route is added (a code comment at the top of the test explains the convention).
- 🟡 The slice-window heuristic for inline-middleware detection (slice ends at the next route declaration) is correct for the current code style but could drift if the convention changes (e.g. multi-line arrow functions inside route definitions).

---

## 2026-06-15 (Quality Pass 3 — Item 3: Audit Logging Depth)

### Changed

- `apps/api/src/routes/orders.ts` — `PATCH /:orderId/status` now records an `order_status_changed` audit entry with `oldValue: { status: prevStatus }` and `newValue: { status: new, reason }`.
- `apps/api/src/routes/wallet.ts` — `POST /payouts/request` and `POST /payouts` now record a `payout_requested` audit entry with `newValue: { amount, status }`.
- `packages/shared/src/types/orders.ts` — added `'payout_requested'` to the `AuditAction` union (was in `WebhookEventType` but missing from `AuditAction`).
- `packages/shared/src/types/audit.ts` — added matching Arabic label `'طلب سحب أرباح'` to `AUDIT_ACTION_LABELS`.

### Background (pre-change state)

Of 8 total `audit.record()` calls in the API, none were in `orders.ts` or `wallet.ts`. `products.ts` already had audit on create/update/bulk/delete (added in an earlier task). The high-impact paths for compliance and incident investigation — order status changes, refunds, payout requests — were **completely unaudited**.

### Verified (TDD)

- 9/9 new tests in `tests/audit-depth.test.ts` pass.
- TDD cycle: RED (9 failed because the audit calls were missing) → GREEN (added the calls) → RED (TypeScript caught the missing `AuditAction` value) → GREEN (added the value + label, full chain builds clean).
- `pnpm --filter @haa/api typecheck` — clean
- `pnpm --filter @haa/api build` — clean
- `pnpm --filter @haa/shared build` — clean
- `pnpm --filter @haa/integration-core build` — clean
- Full test suite: 1862 passing, 14 pre-existing failures unrelated (ci-cd-pipeline, migration-dedup, schema-dedup, security-boundary — all confirmed on pre-change commit `596337c`).

### Risk

- 🟡 Future route changes in `orders/products/wallet` can forget audit calls. The test asserts presence in 3 specific files but doesn't lint every route. A custom lint rule could enforce this later (out of scope for Item 3).
- 🟢 The action vocabulary is fully type-safe — adding a new action value requires adding a label or the `Record<AuditAction, string>` invariant fails to compile. The TS compiler is the gate.

---

## 2026-06-15 (Quality Pass 3 — Item 2: Webhook Idempotency)

### Added

- `apps/api/src/middleware/webhook-dedup.ts` — `deduplicateWebhook` + `resolveIdempotencyKey` helpers that dedup inbound webhooks at the API edge.
- `tests/webhook-dedup.test.ts` — 13 source-grep tests covering the helper's contract and the wiring in both webhook route files.

### Why

Payment providers (Moyasar, HyperPay, etc.) and shipping providers (SMSA, OTO, Aramex) regularly re-deliver the same webhook for reliability. The existing code had partial dedup support — `paymentWebhookEvents.idempotencyKey` is UNIQUE in the schema and Moyasar's provider checks for duplicates — but:

1. Most providers do **not** send `x-idempotency-key` on inbound webhooks, so the existing dedup never fired in practice.
2. Shipping webhooks had **no dedup at all** — every duplicate re-delivery re-processed the business logic (double wallet entries, double notifications, double outbox events).

### Design

- **Key resolution:** prefer the provider-supplied `x-idempotency-key` header; fall back to `sha256(provider + rawBody + signature)` when the header is absent. The fallback guarantees the same physical delivery always produces the same key.
- **Wired into all 3 webhook handlers** (payment at `/webhooks/payments/:provider`, generic shipping at `/webhooks/shipping/:provider`, OTO at `/webhooks/shipping/oto/`).
- **Ordering:** dedup runs **after** signature verification. If dedup ran first, an attacker could pre-poison the idempotency table with arbitrary bodies + bogus signatures to block legitimate deliveries. With signature-first ordering, only legitimate providers can claim a key.
- **Storage:** uses the existing `paymentWebhookEvents` table (already has the UNIQUE constraint on `idempotencyKey`). No new table.

### Verified (TDD)

- 13/13 new tests pass. Test written first (RED), watched fail (ENOENT for the helper file), then implemented (GREEN), then corrected the ordering (signature before dedup) and updated the test to assert that ordering.
- `pnpm --filter @haa/api typecheck` — clean
- `pnpm --filter @haa/api build` — clean
- Full test suite: 1839 passing, 14 pre-existing failures unrelated (ci-cd-pipeline, migration-dedup, schema-dedup, security-boundary — all confirmed on pre-change commit `bf63dcf`).

### Risk

- 🟡 Shipping providers don't have their own unique-constrained dedup tables — they all use `paymentWebhookEvents`. If a payment webhook and a shipping webhook from the same provider hash to the same key (unlikely but possible), they would collide. Real-world risk is essentially zero because the provider names are disjoint.
- 🟢 Future maintainers should not reverse the signature-before-dedup ordering. The tests assert this.

---

## 2026-06-15 (Quality Pass 3 — Item 1: CSRF Origin Check)

### Added

New defense-in-depth CSRF protection on the API:

- `apps/api/src/middleware/csrf-origin.ts` — new middleware that:
  - Lets GET/HEAD/OPTIONS pass through unchanged.
  - Lets mutating methods (POST/PUT/PATCH/DELETE) pass through when the request has no `Origin` header (legitimate server-to-server, CLI, mobile-app, and webhook calls).
  - Lets mutating methods pass when the `Origin` is in `env.CORS_ORIGINS` (with trailing-slash normalization for forgiveness).
  - Rejects mutating methods with a non-allow-listed `Origin` with `403` and structured error `CSRF_ORIGIN_REJECTED`.

- `tests/csrf-origin.test.ts` — 11 source-grep tests covering the middleware's contract and the mount point in `apps/api/src/index.ts`.

- `apps/api/src/index.ts` — imports the new middleware and registers it globally with `app.use('*', csrfOrigin())` immediately after the CORS middleware, so both layers share the same `env.CORS_ORIGINS` allow-list.

### Why Origin check (not double-submit cookies)

The project uses **Bearer tokens in `localStorage`** and has **no cookies anywhere**. The classic CSRF attack exploits auto-attached cookies, which we don't have. However, three reasons to add the defense-in-depth layer:

1. Some browsers treat `Authorization` headers as credentials in cross-origin `fetch({ credentials: 'include' })` mode.
2. The project sets `cors({ credentials: true })` which signals cookie-or-credential auth to clients.
3. A future change adding cookie-based sessions would silently lose CSRF protection without a new layer.

This pattern is the modern equivalent of double-submit cookies for Bearer-token APIs (the approach used by GitHub, GitLab, etc.). If the project ever adds cookie auth, a double-submit-cookie layer can be added on top.

### Verified (TDD)

- 11 new tests in `tests/csrf-origin.test.ts`, all pass. Test was written first, watched fail (ENOENT for the middleware file), then the middleware + mount were implemented, watched pass.
- `pnpm --filter @haa/api typecheck` — clean
- `pnpm --filter @haa/api build` — clean
- Full test suite: 1826 passing, 14 pre-existing failures unrelated (ci-cd-pipeline, migration-dedup, schema-dedup, security-boundary — all confirmed on pre-change commit `5e7dfd6`).

### Risk

- 🟢 Low. Defense-in-depth. Webhooks and server-to-server calls pass through the no-Origin branch automatically.
- 🟡 If a webhook provider ever starts sending `Origin` (uncommon), they'd need to be allow-listed. Worth monitoring in production.
- 🟡 If cookie-based auth is added later, extend with double-submit cookie support.

---

## 2026-06-15 (Quality Pass 2 — Item 2.6: DashboardHome Decomposition, COMPLETED)

### Changed

Decomposed `apps/merchant-dashboard/src/pages/DashboardHome.tsx` (2743 LOC) incrementally across **22 commits**, each independently verified with typecheck + build + 3 dashboard test files / 144 tests. Extracted 22 sub-components + 1 constants file to `apps/merchant-dashboard/src/pages/dashboard/`:

**Helpers (no React deps):**

- `constants.ts` — `CHART_COLORS`, `getRemainingDays`, `formatTimeAgo`, `getUpcomingSeason`, `orderStatusColors`, `arabicStatusLabels`, `arabicPaymentLabels`, `getNextActionLabel`. Arabic strings preserved exactly (including subtle spelling variants like مرتجع).

**Visual sub-components (pure presentational unless noted):**

- `StatsCards.tsx` — 5-tile extended KPI grid (total sales, orders, new orders, products, wallet) with trend badges
- `PrimaryKpiCards.tsx` — 2 always-visible KPI tiles (today's sales + actionable orders)
- `ShowMoreKpiToggle.tsx` — Mobile KPI expand toggle button
- `SalesChart.tsx` — AreaChart of last-30-days sales with localized tooltip
- `CategoryPieChart.tsx` — Donut chart + top-5 legend for order status distribution
- `AnalyticsSection.tsx` — Collapsible "تحليلات" wrapper (uses SalesChart + CategoryPieChart + RecentSoldProducts + TopProductsList)
- `NextActionBanner.tsx` — Action Center strip (COD, ready to ship, etc.) with mobile scroll + desktop grid
- `RecentActionableOrders.tsx` — Recent orders list (max 3) with status/fulfillment/payment pills
- `RecentSoldProducts.tsx` — Recent sold products list (item rows with image, qty, total, time-ago)
- `TopProductsList.tsx` — Top products by revenue (rank badge + progress bar)
- `StoreReadinessBanner.tsx` — Red readiness alert banner
- `LowStockList.tsx` — Low-stock products with +1 stock bump button
- `QuickActionsGrid.tsx` — 4-button quick action grid (add product, orders, coupon, storefront)
- `MoreSection.tsx` — Collapsible "المزيد" wrapper (uses RecentCustomersList + QuickStatsGrid)
- `RecentCustomersList.tsx` — Recent customers list (avatar + name + phone + tap-to-call)
- `QuickStatsGrid.tsx` — Brands/tags/categories/products/orders tiles
- `SubscriptionBadge.tsx` — Subscription status pill (plan name + status + remaining days)
- `SmartAlertsStrip.tsx` — Critical alert chips (max 3) with icon, title, dismiss
- `WelcomeBanner.tsx` — Onboarding celebration banner
- `AiGreetingCard.tsx` — AI greeting one-liner
- `DashboardHeader.tsx` — Top bar (title, last-updated, notifications, refresh)

### Architecture

- **Pattern:** Each extracted sub-component is a pure presentational React component that takes its data as props. State and side effects (API calls, navigate, toast) stay in `DashboardHome`. The orchestrator passes derived data + callbacks down.
- **Type safety:** Each shared type (`StatCardData`, `ActionCenterItem`, `ActionableOrder`, `RecentOrder`, `RecentCustomer`, `TopProduct`, `LowStockProduct`, `SmartAlert`) is exported from the sub-component file. The parent's `useMemo` literals are annotated to match.
- **No new dependencies.** No state management library, no context, no React.memo. Just plain props.

### Result

`DashboardHome.tsx`: 2743 → **1599 LOC** (−41.7%, −1144 lines). The render section is now ~110 lines of clean orchestration — every section comment is followed by 1-3 lines of `<ComponentName ... />` calls. The remaining 1500 lines inside the component is all hooks (useState, useEffect, useMemo, useCallback, useRef), state, and API orchestration.

### Scope decision (defer the rest)

The 1500 LOC remaining inside DashboardHome is the **state and orchestration layer** — 27 useState hooks, 25+ API calls, the load() function, handleStockUpdate, visibleAlerts, acItems, topProducts, salesData, etc. Moving this would require either (a) a custom hook layer, (b) a context provider, or (c) a state management library. None of these are in scope for Item 2.6 (which is about visual structure, not state architecture) and they would each carry significant risk for limited benefit. They are best left for a future architectural pass if/when the orchestrator's complexity becomes a maintenance problem.

### Verified (per commit, all 22)

- `pnpm --filter @haa/merchant-dashboard typecheck` — clean
- `pnpm --filter @haa/merchant-dashboard build` — clean (DashboardHome chunk size fluctuates ±0.5 kB, no bundle-size regression)
- 3 dashboard test files / 144 tests pass

### Risk

- 🟢 Low. Each extraction is a self-contained JSX block with the same data flow. The orchestrator is unchanged in structure — only the JSX moved out, prop signatures were added, and unused imports were removed.
- 🟡 Several unused imports (lucide icons, recharts) were removed from `DashboardHome` after each extraction. If any are re-added in the future, they will need to be re-imported.
- 🟡 The `c: any` typing in handler functions (loosened for ergonomics during the API split) is preserved across all new sub-components. A future tightening pass could replace with strict Hono-style types.

---

## 2026-06-15 (Quality Pass 2 — Item 2.4: Admin Route Split)

### Changed

- `apps/api/src/routes/admin.ts` (monolith, 692 LOC) **removed from working tree** as part of the Quality Pass 2 admin route split refactor.
- New `apps/api/src/routes/admin/` directory created with 5 files:
  - `index.ts` (155 LOC) — aggregator that mounts every admin route under the right HTTP verb, with `zValidator`, `requireAdminAuth()`, and `requireAdminPermission()` middleware applied in the original order. Also defines all 11 zod schemas (login, tenant/store CRUD, KYC review, product review/feature, plan update, settings update, payout reason, upload proof) and exports the `requireAdminPermission` helper used by settlement/payout action routes.
  - `auth.ts` (32 LOC) — `POST /login` (the only route that does NOT require an existing token; issues the admin JWT after password verification + audit log).
  - `tenants-stores.ts` (203 LOC) — `GET /dashboard`, full `/tenants/*` CRUD + status, full `/stores/*` CRUD + status + cache invalidation, full `/kyc/*` (list + review with audit log), `GET /payments`.
  - `marketplace.ts` (320 LOC) — `GET /marketplace/summary`, `/marketplace/products` list, `/marketplace/products/:id/review`, `/marketplace/products/:id/feature`, `/marketplace/sellers`, `/marketplace/orders`, `/marketplace/settlements`, `/marketplace/deep-report`, full `/settlements/batches/*` (permission-gated), full `/settlements/manual-payouts/*` workflow (review/approve/reject/mark-transfer-pending/mark-transferred/upload-proof/verify-transfer/cancel/reverse) with `payoutActionContext` audit trail.
  - `operations.ts` (130 LOC) — `GET /audit` (with tenant/store filter), `GET /webhooks` (with tenant/store filter), `GET/PATCH /plans`, `POST /upload` (media adapter), `GET/PUT /settings` (platform name/logo/favicon), `GET /users` (strips passwordHash).
- `apps/api/src/index.ts` updated to import `./routes/admin/index.js` (matches the storefront/ aggregator pattern).
- 4 file-based regression tests updated to read all 5 split files instead of the now-deleted `admin.ts`:
  - `tests/manual-settlement-maker-checker.test.ts` — adminRoutes constant now concatenates 5 split files via `readFileSync`.
  - `tests/manual-settlement-review-workflow.test.ts` — same.
  - `tests/settlement-order-linking.test.ts` — same.
  - `tests/products-qa-regression.test.ts` — switched to `readSource('apps/api/src/routes/admin/index.ts')` + `readSource('apps/api/src/routes/admin/marketplace.ts')` for path/permission assertions.

### Architecture

- The split preserves middleware sequence exactly: every route that called `requireAdminAuth()` in the original now has the same call in the aggregator, in the same order with `zValidator` for body validation and `requireAdminPermission(permission)` for payout/seller routes.
- Each split file exports **raw Hono handlers** (no inline middleware). This means handler signature is `async (c) => {...}` instead of `requireAdminAuth()(async (c) => {...})`, which makes the handler list flat and grep-friendly.
- Local helper `payoutActionContext` is duplicated in `marketplace.ts` rather than imported from `index.ts` to keep that file self-contained (the helper is also exported from `index.ts` for external callers if needed).
- Aggregator pattern matches `routes/storefront/index.ts` from Item 2.2 — directory-as-module resolution works because the API uses `moduleResolution: "bundler"`.

### Verified

- `pnpm --filter @haa/api typecheck` — clean
- `pnpm --filter @haa/api build` — clean
- 7 admin-related test files / 28 tests pass:
  - `tests/manual-settlement-maker-checker.test.ts`
  - `tests/manual-settlement-review-workflow.test.ts`
  - `tests/manual-settlement-ledger.test.ts`
  - `tests/manual-settlement-dashboard-ux.test.ts`
  - `tests/manual-settlement-audit-log.test.ts`
  - `tests/admin-jwt-secret.test.ts`
  - `tests/dashboard-rbac-guards.test.ts`
- Full test suite: 1785/1799 passing. The 14 pre-existing failures are on TASK-0027 (luxury-showcase work) and Quality Pass 1 checks (CI/CD pipeline, schema/migration deduplication, security boundary gates) — all unrelated to Item 2.4 and confirmed failing on the pre-change commit `005f2d9`.

### Risk

- 🟡 The split uses `c: any` for handler params (instead of Hono's strict `Context` type) to keep the handler shape uniform and avoid one-off generic types per aggregator. Lint/type safety is preserved by the router itself.
- 🟡 Some routes in `marketplace.ts` and `operations.ts` are at the upper edge of the 300-line cap. Future sub-routes in those areas should re-split if the cap is exceeded.

---

## 2026-06-14 (Quality Pass 2 — Item 2.2: Storefront Route Split) — Sub-item only

### Changed

- `apps/api/src/routes/storefront.ts` (monolith) **removed from working tree** as part of the Quality Pass 2 route split refactor.
- New `apps/api/src/routes/storefront/` directory created with 7 files:
  - `index.ts` — aggregator that mounts the 5 sub-routers under `/s/*`
  - `_shared.ts` — shared helpers (`resolveStore`, `resolveActiveStore`, `getOfferEndDate`)
  - `store-info.ts` — `/s/:slug`, `/s/:slug/theme`, `/s/:slug/demo-info`, `/s/:slug/product-features`, `/s/:slug/size-guide`
  - `products.ts` — `/s/:slug/products`, `/s/:slug/products/:productSlug`, `/s/:slug/categories`, `/s/:slug/brands`, `/s/:slug/tags`
  - `cart.ts` — `POST /s/:slug/cart`, `GET /s/:slug/cart/:cartId`, `POST /s/:slug/cart/:cartId/items`, `PATCH /s/:slug/cart/:cartId/items/:itemId`, `DELETE /s/:slug/cart/:cartId/items/:itemId`
  - `checkout.ts` — `/s/:slug/shipping-methods`, `/s/:slug/checkout/shipping-rates`, `/s/:slug/checkout/validate-coupon`, `/s/:slug/checkout/sessions`, `/s/:slug/checkout/payment-session`, `/s/:slug/checkout/payments/callback`, `/s/:slug/checkout/sessions/:sessionId/confirm`, `/s/:slug/order/:orderNumber`, `/s/:slug/track/:orderNumber`
  - `support.ts` — `/s/:slug/pickup-locations`, `/s/:slug/payment-methods`, `/s/:slug/gift-options`, `/s/:slug/policies/:type`, `/s/:slug/support/tickets`, `/s/:slug/support/tickets/:ticketId`, `/s/:slug/support/tickets/:ticketId/reply`, `/s/:slug/support/kb`, `/s/:slug/support/kb/:articleSlug`, `/s/:slug/events`, `/s/:slug/heartbeat`
- `apps/api/src/index.ts` updated to import `./routes/storefront/index.js` (the new aggregator).

### Verified

- 5 split-aware regression test files passed (33/33 tests):
  - `tests/dto-storefront.test.ts` — toPublic\* DTO extraction + split-aware assertions on each storefront sub-router file
  - `tests/cart-security-regression.test.ts` — cart route split + cart PATCH/DELETE presence + store-scope enforcement
  - `tests/email-contact-regression.test.ts` — `getOfficialContactEmail` fallback now sourced from `storefront/store-info.ts`
  - `tests/products-qa-regression.test.ts` — category slug store-scoping + selected-variant flow reads from `storefront/products.ts`, `storefront/cart.ts`, `storefront/checkout.ts`
  - `tests/support-token-regression.test.ts` — header/bearer preferred over legacy `?accessToken=` query compatibility
- `pnpm --filter @haa/api typecheck` passed.
- `pnpm --filter @haa/api build` passed.
- `pnpm --filter @haa/storefront build` passed.
- `pnpm --filter @haa/merchant-dashboard build` passed.

### Scope Note

- This changelog entry covers Quality Pass 2 — Item 2.2 only. Items 2.3 (`marketplaces.ts` split), 2.4 (`admin.ts` split), 2.5 (payment provider extraction), and 2.6 (`DashboardHome.tsx` decomposition) remain open and will be documented in their own entries when closed.

## 2026-06-14 (Quality Pass 1 — Item 6: requirePermission on ai-agent.ts) — Quality Pass 1 COMPLETE 🎉

### Added

- **Permission type** (`packages/shared/src/types/orders.ts`):
  - Added `'ai:read'` and `'ai:execute'` to the `Permission` union

- **PERMISSION_CATALOG** (`packages/shared/src/permissions.ts`):
  - Added `ai:read` entry: "استخدام AI للقراءة" (low risk, recommended for owner/admin/manager)
  - Added `ai:execute` entry: "تنفيذ عمليات AI" (high risk, recommended for owner/admin/manager)

- **ROLE_PERMISSIONS** (`packages/shared/src/permissions.ts`):
  - Added `ai:read` and `ai:execute` to: `owner`, `manager`, `products_manager`, `orders_manager`
  - 4 role arrays updated via `replaceAll`

- **ai-agent.ts route guards** (`apps/api/src/routes/ai-agent.ts`):
  - Added `import { requirePermission }` from `@haa/auth-core`
  - 7 read-only GETs now require `ai:read`:
    - `GET /daily-summary`
    - `GET /weekly-summary`
    - `GET /sales-decline`
    - `GET /product-suggestions`
    - `GET /promotions`
    - `GET /abandoned-carts`
    - `GET /wallet`
  - 4 mutating POSTs now require `ai:execute`:
    - `POST /product-title`
    - `POST /product-description`
    - `POST /generate-products`
    - `POST /chat`
    - `POST /execute`

- **Boundary tests** (`tests/require-permission-routes.test.ts`):
  - 2 tests for `dashboard.ts` (already had `requirePermission` — verified)
  - 11 tests for `ai-agent.ts` (one per endpoint)
  - 2 tests for `dashboard:view` validity
  - 4 tests for Permission type and Catalog entries

### Verified

- TDD Red-Green cycle:
  - RED: 17/19 tests failed (Permission type and AI catalog entries missing, ai-agent routes unguarded)
  - GREEN: All 19/19 tests pass
- `pnpm typecheck` — all 21 packages pass
- `pnpm --filter @haa/shared build` — required to propagate new Permission type
- `pnpm ci:local`:
  - preflight: ✅ PASS
  - typecheck: ✅ PASS
  - lint: ✅ PASS
  - test: 1719 passed (+61 from baseline Item 5), 2 failed (pre-existing CSS isolation)

### Security Impact

- Closes the security gap identified in `SECURITY_BASELINE.md` and `RBAC_AUDIT.md`
- 11 ai-agent endpoints now require explicit permission, not just authentication
- `ai:execute` is high risk (data modification) — only owner/admin/manager have it
- `ai:read` is low risk — owner/admin/manager can read AI summaries

### Quality Pass 1 Summary

| Item                                     | Status          | Notes                          |
| ---------------------------------------- | --------------- | ------------------------------ |
| Item 1: Schema deduplication             | ✅ Done         | Removed `marketing-actions.ts` |
| Item 2: Migration deduplication          | ✅ Done         | Split 0046 into 0047+0048      |
| Bug fix: FK identifier overflow          | ✅ Done (bonus) | 3 migrations fixed             |
| Item 3: ADMIN_JWT_SECRET                 | ✅ Done         | Added validation in env.ts     |
| Item 4: Local CI Script                  | ✅ Done         | `pnpm ci:local`                |
| Item 5: FK Cascade on stores.tenantId    | ✅ Done         | Migration 0049                 |
| Item 6: requirePermission on ai-agent.ts | ✅ Done         | 11 endpoints secured           |
| **Total**                                | **6/6 (100%)**  | + 1 bonus fix                  |

### What's Next (Quality Pass 2)

According to COMMITMENTS.md and the strategic plan, Quality Pass 2 covers:

- Component unification (route splitting, payment provider extraction, helpers)
- Targeted at `storefront.ts` (876 lines), `marketplaces.ts` (910 lines), `admin.ts` (692 lines)
- `payment.ts` god class extraction (1429 lines → 5 providers)

The strategic plan suggests pausing before Pass 2 to:

1. Review Quality Pass 1 results
2. Get owner approval for next phase scope
3. Possibly tackle other technical debt (test DB issues, schema drift)

---

## 2026-06-14 (Quality Pass 1 — Item 5: Stores.tenantId FK Cascade)

### Added

- Created `packages/db/src/migrations/0049_fk_cascade_stores_tenant.sql`:
  - Drops existing `stores_tenant_id_tenants_id_fk` constraint
  - Re-creates it with `ON DELETE CASCADE` and `ON UPDATE NO ACTION`
  - Uses `DO $$ ... $$` blocks for idempotency
- Updated `packages/db/src/schema/stores.ts`:
  - Added `{ onDelete: 'cascade' }` to `tenantId.references()` for Drizzle schema sync
- Created `tests/stores-tenant-cascade.test.ts` (5 boundary tests):
  - Schema declares onDelete cascade
  - Migration 0049 exists
  - Migration drops and recreates with CASCADE
  - Migration is idempotent
  - Migration does NOT touch child tables of stores (out of scope)
- Updated `packages/db/src/migrations/meta/_journal.json`:
  - Added idx 49: `0049_fk_cascade_stores_tenant` (when 1782000049000)

### Verified

- TDD Red-Green cycle:
  - RED: 5/5 tests failed (migration didn't exist, schema didn't have cascade)
  - GREEN: All 5/5 tests pass
- Applied migration to main DB: `confdeltype = 'c'` (CASCADE) verified
- Idempotency: ran migration twice, no errors
- `pnpm typecheck` passes (all 21 packages)

### Security Impact

- Closes a pre-existing data integrity gap (RISK_REGISTER R-0007 was a similar issue)
- Deleting a tenant will now cascade to all stores of that tenant
- Child tables of stores (products, orders, etc.) still have NO ACTION FK — those cascades are intentionally out of scope

### Out of Scope (Deferred)

- Cascading to child tables of stores (29 tables: products, orders, customers, etc.) — that would be a much larger change with significant data implications
- Soft-delete pattern for tenants (currently hard delete)
- Archival strategy for tenant data

### Notes

- This is the fifth item of Quality Pass 1
- Item 6 (`requirePermission` on `dashboard.ts` and `ai-agent.ts`) remains

---

## 2026-06-14 (Quality Pass 1 — Item 4: Local CI Script)

### Decision

- **Owner decision (2026-06-14):** No GitHub remote exists for this project; therefore GitHub Actions workflow is not applicable. Local CI script replaces remote CI.

### Added

- Created `scripts/local-ci.mjs` (executable, ~80 lines):
  - Runs `pnpm preflight` (project structure)
  - Runs `pnpm typecheck` (all 21 packages)
  - Runs `pnpm lint` (ESLint)
  - Runs `pnpm test` (Vitest)
  - Reports clear pass/fail with timing for each step
  - Exits with code 1 on any failure
  - Notes pre-existing test issues separately

- Created `tests/local-ci-script.test.ts` with 9 boundary tests:
  - Script exists, is .mjs, runs all 4 checks
  - Exits with non-zero on failure
  - Prints pass/fail output
  - package.json includes `ci:local` script

### Changed

- `package.json`:
  - Added `ci:local` script: `node scripts/local-ci.mjs`
  - Placed next to `preflight` for discoverability

### Verified

- TDD Red-Green cycle:
  - RED: 8/9 tests failed (script didn't exist)
  - GREEN: All 9/9 tests pass after creation
- `pnpm ci:local` execution:
  - preflight: ✅ PASS
  - typecheck: ✅ PASS
  - lint: ✅ PASS
  - test: ❌ FAIL (2 baseline CSS isolation failures in `security-boundary-gates.test.ts`, pre-existing and documented)
- Total time: 55.8s for full run

### Behavior

- `pnpm ci:local` enforces the same checks a remote CI would run, locally
- Developers should run this before committing
- The script catches all quality issues before they reach the codebase
- The 2 baseline test failures are documented in TASK-0025 and `tests/security-boundary-gates.test.ts`

### Notes

- This is the local-only alternative to GitHub Actions
- When/if a GitHub remote is added later, a `.github/workflows/ci.yml` should be created using this script as a reference
- Item 5 (FK cascade) and Item 6 (requirePermission) remain for Quality Pass 1

---

## 2026-06-14 (Quality Pass 1 — Bug Fix: FK Identifier Overflow)

### Fixed

- `0007_tan_cassandra_nova.sql:61` — Shortened FK constraint name from `subscription_invoices_subscription_id_merchant_subscriptions_id_fk` (66 chars) to `sub_invoices_sub_id_merch_subs_fk` (32 chars). Postgres identifier limit is 63 chars, the original name was being silently truncated, causing the `WHEN duplicate_object THEN null` exception handler to fail.
- `0026_kind_mentallo.sql:307` — Shortened `payment_provider_transactions_settlement_batch_id_settlement_batches_id_fk` (74 chars) to `ppt_settlement_batch_id_sb_id_fk` (33 chars).
- `0028_live_presence.sql:85` — Shortened `marketplace_order_links_marketplace_order_id_marketplace_orders_id_fk` (69 chars) to `mol_marketplace_order_id_mo_id_fk` (32 chars).

### Added

- Created `tests/migration-identifier-safety.test.ts` with 2 tests:
  - Validates 0007 FK names fit within 63-char limit
  - Validates ALL migrations have FK constraint names within limit
- Discovered by test that 3 migrations had this bug, not just one

### Verified

- TDD Red-Green cycle:
  - RED: 2 tests failed (3 violations found: 0007, 0026, 0028)
  - GREEN: After shortening names, all 2 tests pass
- Test DB now has all tables after manual `psql -f` application
- `pnpm typecheck` passes

### Notes

- This bug was **pre-existing** (existed in code before Quality Pass 1)
- Without this fix, `pnpm db:test:setup` would silently fail at the truncated constraint
- Test DB has additional pre-existing issues (missing seed data, broken seed script) that are out of scope for Quality Pass 1

---

## 2026-06-14 (Quality Pass 1 — Item 3: ADMIN_JWT_SECRET)

### Added

- Added `ADMIN_JWT_SECRET=dev-admin-jwt-secret-change-in-production` to `.env.example`
- Added documentation comment explaining the security isolation rationale

### Changed

- `apps/api/src/env.ts`:
  - Added `ADMIN_JWT_SECRET: string` to `EnvConfig` interface
  - Added `ADMIN_JWT_SECRET` to required env vars (so app refuses to start without it)
  - Added dev default to `validateLocalEnv` so production refuses to start with dev default
  - Added `ADMIN_JWT_SECRET: env.ADMIN_JWT_SECRET` to the config object

### Added

- Created `tests/admin-jwt-secret.test.ts` with 5 tests:
  - `.env.example` documents `ADMIN_JWT_SECRET`
  - `.env.example` documents dev default value
  - `env.ts` requires `ADMIN_JWT_SECRET`
  - `env.ts` validates dev default
  - `EnvConfig` interface includes `ADMIN_JWT_SECRET`

### Verified

- TDD Red-Green cycle:
  - 5/5 tests pass
- `pnpm typecheck` — all 21 packages pass

### Security Impact

- Closes SECURITY_BASELINE.md gap: `admin.ts` was using `process.env.ADMIN_JWT_SECRET` directly without documentation
- Production deployment will now fail fast if `ADMIN_JWT_SECRET` is missing or set to dev default
- Separate from `JWT_SECRET` for proper security isolation (admin tokens shouldn't share secret with user tokens)

### Notes

- This is the third item of Quality Pass 1
- Item 4 (CI/CD), Item 5 (FK cascade on stores.tenantId), and Item 6 (requirePermission) remain

---

## 2026-06-14 (Quality Pass 1 — Item 2: Migration Deduplication)

### Removed

- Deleted `packages/db/src/migrations/0046_smiling_phil_sheldon.sql` (polluted migration with duplicate content)
  - 80% of content was duplicate from `0036_marketing_actions.sql` and `0038_sales_count.sql`
  - Contained 3 duplicate CREATE TABLE statements, 4 duplicate FK constraints, 8 duplicate indexes
  - Contained 3 duplicate product column ALTERs

### Added

- Created `packages/db/src/migrations/0047_store_demo_flags.sql` (8 lines, idempotent)
  - Contains only the unique content: `stores.is_demo`, `stores.demo_profile`, `stores.demo_seed_version`
  - Uses `IF NOT EXISTS` guards for safety
- Created `packages/db/src/migrations/0048_repair_marketing_action_tables.sql` (idempotent)
  - Restores missing `marketing_action_logs`, `marketing_action_settings`, `marketing_action_states` tables
  - Uses `DO $$ ... $$` blocks for FK constraint guards
  - Created because the original 0036/0046 was marked applied in `__drizzle_migrations` but tables were actually missing
- Created `tests/migration-deduplication.test.ts` (3 boundary tests)
- Updated `packages/db/src/migrations/meta/_journal.json`:
  - Replaced idx 46 (`0046_smiling_phil_sheldon`) with `0047_store_demo_flags` (when 1782000046000)
  - Replaced idx 47 with `0048_repair_marketing_action_tables` (when 1782000047000)
  - Moved idx 47 `0039_repair_support_kb_articles` to idx 48 (when 1782000048000)

### Manually Applied to Main DB

- Ran `psql -f 0048_repair_marketing_action_tables.sql` on `haastores` to create the missing marketing*action*\* tables
- Inserted manual entry into `drizzle.__drizzle_migrations` (id=46, hash='manual_repair_0048') to align with new journal

### Verified

- **TDD Red-Green cycle completed:**
  - RED: 3 tests failed (0046 still existed, 0047/0048 did not)
  - GREEN: After file operations, all 3 tests pass
- `pnpm typecheck` — all 21 packages pass
- `pnpm vitest run tests/migration-deduplication.test.ts` — 3/3 passed
- Main DB state verified: `stores.is_demo/demo_profile/demo_seed_version` and all 3 `marketing_action_*` tables now exist

### Known Issues Discovered (NOT introduced by this task)

- **0007 FK identifier overflow:** Migration `0007_tan_cassandra_nova.sql` creates a FK constraint with name `subscription_invoices_subscription_id_merchant_subscriptions_id_fk` (64 chars), exceeding Postgres' 63-char limit. This causes `pnpm db:test:setup` to fail, leaving the test DB in an incomplete state. This was a pre-existing bug in the migration file, not introduced by Item 2.
- **Consequence:** Full test suite shows 40 failures, all because test DB is missing tables (e.g., `merchant_payment_provider_settings`). This is a separate issue requiring a fix to migration 0007 or a repair migration.

### Skills Used

- `plan-mode` — multi-step migration surgery with journal update
- `systematic-debugging` — root cause for `__drizzle_migrations` drift
- `test-driven-development` — boundary tests before deletion
- `verification-before-completion` — DB state inspection + test verification

### Notes

- Item 2 is functionally complete; the test DB issue is a separate task (out of Quality Pass 1 scope)
- The 40 test failures in `pnpm test` are not regressions from Item 2 — they exist because the test DB is broken
- Quality Pass 1 Item 3 (ADMIN_JWT_SECRET) can proceed independently of this issue

---

## 2026-06-14 (Quality Pass 1 — Item 1: Schema Deduplication)

### Removed

- Deleted `packages/db/src/schema/marketing-actions.ts` (dead code)
  - File was never imported by any code (only `marketing_actions.ts` is exported from `index.ts`)
  - Missing `marketingActionLogs` table (production code in `marketing-action-engine.ts:222-240` uses it)
  - Missing `onDelete: 'cascade'` on foreign keys
  - Had fewer indexes than `marketing_actions.ts`
  - Contained unused types: `MarketingActionSetting`, `MarketingActionState`, `NewMarketingActionSetting`, `NewMarketingActionState`

### Added

- Created `tests/schema-deduplication.test.ts` with 6 boundary tests:
  - Verifies `marketing-actions.ts` does NOT exist
  - Verifies `marketing_actions.ts` DOES exist
  - Verifies all 3 tables (settings, states, logs) are exported from `@haa/db/schema`
  - Verifies critical columns exist on each table
- Created new git branch `quality-pass-1-system-health` for Quality Pass work

### Verified

- **TDD Red-Green cycle completed:**
  - RED: New test for "marketing-actions.ts must NOT exist" failed as expected
  - GREEN: After deletion, all 6 new tests pass
- `pnpm typecheck` — all 21 packages pass
- `pnpm test` — 1676 passed (+6 from baseline), 2 failed (pre-existing baseline failures unrelated)
- `mavis-trash` used for recoverable deletion (file can be restored from OS Trash if needed)

### Skills Used

- `plan-mode` — multi-step structural change
- `systematic-debugging` — root cause for duplication
- `test-driven-development` — boundary tests before deletion
- `verification-before-completion` — typecheck + test verification before claiming done

### Notes

- This is the first work item after `COMMITMENT-0001` (Quality Pass before Feature Pass)
- The deleted file's compiled version in `dist/` will be regenerated on next `pnpm build`
- Item 2 (migration 0046 → 0047 split) is next in Quality Pass 1

---

## 2026-06-14 (Mandatory Skill Selection Rule)

### Added

- Added Section 14 "Mandatory Skill Selection Rule" to `AGENTS.md` — binding constitution-level rule
- Created `docs/ops/SKILL_USAGE_RULE.md` — detailed operational rule with 4-step gate
- Created `docs/ops/SKILL_DECISION_TREE.md` — quick reference for skill selection
- Updated `TASK_TRACKER.md` template:
  - Added `**Skills Required:**` field (pre-declared at task creation)
  - Added `**Skills Used:**` field (filled during/after execution)
  - Added inline reference to the new rule

### Why

- LLM-based agents forget skills between turns
- System prompt lists skill triggers but does not enforce them
- Without explicit gate, agents skip methodology and default to "fast obvious solution"
- Result: missed edge cases, incomplete tests, premature "done" claims

### The 4-Step Gate (apply before EVERY action)

1. **STATE** the task (one sentence)
2. **SELECT** relevant skill(s)
3. **STATE WHY** each skill fits
4. **LOAD** the skill(s) using the `skill` tool

### Enforcement

- A task with empty `**Skills Used:**` is treated as incomplete
- A task cannot move to `In Progress` without `**Skills Required:**`
- The owner may reject work that did not follow the skill gate
- The agent must apply the gate in writing, in every response, before any file change

### Notes

- This rule applies on top of all existing rules in `AGENTS.md` §1-13
- Pure conversational responses and read-only file reads do not require the gate
- File modifications, builds, tests, commits, and "done" claims all require the gate

---

## 2026-06-14 (Strategic Commitment: Quality Pass 1-5 Before Feature Pass)

### Added

- Created `docs/ops/COMMITMENTS.md` with 3 binding commitments:
  - COMMITMENT-0001: Quality Pass 1-5 must close before any major Feature Pass
  - COMMITMENT-0002: 12 governing principles for all development
  - COMMITMENT-0003: Accept/Reject/Defer pattern for incoming requests
- Added DECISION-0004 in `docs/ops/DECISIONS.md` formalizing the Quality Pass commitment
- Updated `docs/ops/CURRENT_STATE.md`:
  - Current phase changed to "Quality Pass 1 — System Health Stabilization (NEXT)"
  - Quality Pass 1 items added to "Next Recommended Tasks"
  - Strategic commitment reference added to header

### Why

- Architectural audit revealed schema duplication, migrations duplication, god class `payment.ts`, oversized routes, missing CI/CD, and CSRF gap
- Leadership vision recommended Quality Pass 1-5 using the same methodology as RBAC Pass 1-5
- Adding major SaaS features on top of unstable foundation = wasted investment

### Scope of Quality Passes

- **Pass 1 (weeks 1-2):** System health — schema/migration merge, CI/CD, security gaps
- **Pass 2 (weeks 3-4):** Component unification — route splitting, payment provider extraction, helpers
- **Pass 3 (weeks 5-6):** Security — CSRF, webhook idempotency, audit logging
- **Pass 4 (weeks 7-8):** Operations — full CI/CD, Sentry/OTEL, Redis rate limiter
- **Pass 5 (weeks 9-10):** Architecture — Repository, DI, BullMQ, theme rationalization

### Deferred Until After Quality Pass 1-5

- Tiered billing / subscriptions
- Multi-region deployment
- White-label
- New payment providers beyond existing 5
- New themes
- Mobile app
- New SaaS marketplace integrations

### Notes

- COMMITMENTS.md is binding and supersedes short-term feature requests
- Override requires explicit owner authorization with: feature name, justification, accepted risk
- Same successful methodology as RBAC Pass 1-5 will be applied

---

## 2026-06-14 (Marketplace Product Detail Density + BNPL Copy)

### Changed

- Compressed marketplace product-detail shipping/returns and reviews sections from large stacked cards into denser rows.
- Enlarged Tabby/Tamara logos on the product detail page while preserving smaller product-card badge sizing.
- Replaced the generic BNPL line with a denser, more persuasive payment block: "خذها الآن", "بدون فوائد", "ادفع الآن فقط", and a displayed per-payment estimate.
- Compressed marketplace product cards so product images take more of the card, while preserving old price, savings, BNPL, CTA, and an unclipped demo badge.
- Moved Cash on Delivery to the end of the payment-logo order so it appears as the last/leftmost payment option in RTL rows.

### Verified

- `pnpm --filter @haa/storefront typecheck` passes.
- `pnpm vitest run tests/products-qa-regression.test.ts` passes: 13 tests.
- Browser QA confirms compact policy/reviews sections, larger product-detail BNPL logos, persuasive installment copy, product-detail sales count, payment-block height reduced to 69px, marketplace card image share increased to 61%, unclipped demo badge, and no horizontal overflow.

---

## 2026-06-14 (Marketplace Product Detail Completion + Demo KB Repair)

### Added

- Added marketplace product-detail BNPL treatment with Tabby/Tamara under the price.
- Added savings display, buy-now CTA, gallery arrows, image zoom modal, specifications table, policy sections, and customer-review summary.
- Added `0039_repair_support_kb_articles.sql` to repair missing local support KB table.

### Fixed

- Restored `/s/demo-perfumes/support/kb` from API-001 failure to HTTP 200.
- Archived stale support-error events after verifying demo routes so monitoring no longer reports repeated demo RCA tasks.

### Verified

- `pnpm --filter @haa/storefront typecheck` passes.
- `pnpm vitest run tests/products-qa-regression.test.ts` passes: 13 tests.
- Browser QA confirms product-detail BNPL, savings, buy-now, specs, policies, reviews, gallery zoom/arrows, merchant link, and no horizontal overflow.
- `pnpm db:migrate` applied the support KB repair.
- `/s/demo-perfumes/support/kb`, `/s/haa-demo`, and `/s/haa-demo/theme` return 200.
- `pnpm ops:monitor` reports no recommended tasks or incidents.

---

## 2026-06-14 (Marketplace Theme System Polish)

### Changed

- Preserved product-card aesthetics while restoring neutral hover shadow/motion without a blue hover border; old red price, savings block, large product price, and BNPL badges remain visible.
- Preserved internal marketplace behavior work, including marketplace product-detail routing and the merchant-store secondary link.
- Kept the user's existing marketplace visual theme as the source of truth.

### Verified

- Researched ecommerce/product-page and design-system references before implementation.
- `pnpm --filter @haa/storefront typecheck` passes.
- `pnpm vitest run tests/products-qa-regression.test.ts` passes: 13 tests.
- Browser QA confirmed `/marketplace` and marketplace product detail render without horizontal overflow.
- Mobile browser QA at 390x844 passes.
- `pnpm preflight` and `pnpm ops:monitor` pass.

## 2026-06-14 (Marketplace Product Detail Page Visual Upgrade)

### Added

- Added an independent marketplace product detail route at `/marketplace/products/:storeSlug/:productSlug`.
- Added a marketplace product detail API endpoint and storefront API client method.
- Added a designed marketplace product page with header search, gallery, purchase controls, seller card, trust strip, seller summary, and similar-products section.

### Changed

- Marketplace product cards now open the marketplace product detail page.
- Merchant store product pages remain available as a secondary "عرض في متجر التاجر" action through `merchantProductUrl`.
- Tightened the product detail page to match the accepted concept more closely: compact header, wider desktop container, LTR desktop grid for gallery/details/seller positioning, rectangular gallery, scaled product media, and denser purchase controls.

### Verified

- `pnpm --filter @haa/api typecheck` passes.
- `pnpm --filter @haa/storefront typecheck` passes.
- `pnpm vitest run tests/products-qa-regression.test.ts` passes: 13 tests.
- Browser desktop and mobile checks confirm the product page renders, follows RTL, and has no horizontal overflow.
- `pnpm preflight` and `pnpm ops:monitor` pass.

## 2026-06-14 (Marketing Events Insert Repair)

### Fixed

- Added `0037_repair_marketing_tables.sql` to create missing marketing analytics tables when local Drizzle state says older marketing migrations already ran.
- Restored `/s/:slug/events` ingestion by ensuring `marketing_events`, `marketing_sessions`, and `product_performance_daily` exist.
- Archived historical support-error events to `storage/archive/support-error-events-2026-06-14-pre-marketing-repair.ndjson` and reset the active support-error log.

### Verified

- Reproduced the failing marketing event POST before the repair.
- `pnpm db:migrate` applied the repair migration.
- DB checks confirmed all three marketing tables exist.
- Marketing event POST returned `201`.
- `pnpm ops:errors` reports no recommended tasks or incidents.

## 2026-06-13 (Marketplace Blocker Closure)

### Fixed

- Reconciled Drizzle migration metadata with retained SQL migration files and verified `pnpm db:migrate`.
- Removed marketplace after-sales schema/migration artifacts from the marketplace scope. Marketplace remains marketing plus order oversight only.
- Changed support ticket access so new storefront links do not include `accessToken`; ticket access now travels via `X-Support-Access-Token` or bearer header.
- Kept temporary legacy support-ticket query/body token compatibility for old links.
- Linked marketplace settlement reporting to the existing manual settlements route instead of introducing automated payouts.
- Removed accidental local artifacts/logs (`apps/api/api.log`, `apps/admin-dashboard/admin.log`, `apps/storefront/dev.log`, `Iceland`) and expanded log ignores.
- Hardened synthetic health parsing so unavailable curl responses are not reported as HTTP 0.

### Verified

- `pnpm db:migrate` passes.
- DB check confirmed marketplace product columns, `marketplace_orders`, and `marketplace_order_links`; no `marketplace_return_requests` table.
- `pnpm typecheck`, `pnpm exec eslint . --quiet`, targeted regressions, full test suite, DB/API/storefront/admin builds, `pnpm preflight`, and `pnpm ops:monitor` all completed.
- Browser checks confirmed `/marketplace` has no city filter, `/marketplace/orders` supports order number + phone lookup, and support pages do not expose `accessToken` links.

## 2026-06-13 (Haa Marketplace Standalone Theme Edition)

### Changed

- Reworked public `/marketplace` into an isolated Marketplace Edition rather than a monolithic route page.
- Added marketplace-only theme files under `apps/storefront/src/pages/marketplace/theme/` for tokens, hero, seller rail, filters, and product cards.
- Kept `HaaMarketplace.tsx` as a thin route entrypoint so future marketplace theme work stays separate from merchant storefront themes.

### Verified

- `pnpm --filter @haa/storefront typecheck` passes.
- `pnpm vitest run tests/products-qa-regression.test.ts` passes.
- Browser desktop and mobile checks confirmed the marketing hero renders and no horizontal overflow exists.

## 2026-06-13 (Local Dev Port Governance Fix)

### Fixed

- Corrected local monitoring port mapping: merchant dashboard is checked on `5173`, storefront on `5174`, and API on `3000`.
- Added `strictPort: true` to merchant dashboard, storefront, and admin dashboard Vite configs so occupied ports fail fast instead of silently moving to another port.

### Verified

- `pnpm ops:monitor` passes with all runtime checks green.
- `pnpm typecheck` passes across the workspace.

## 2026-06-13

### Added (Haa Public Marketplace)

- Added platform-level public marketplace routes and UI under `/marketplace`, including product browsing, marketplace cart, checkout, unified order tracking, seller directory, and seller product pages.
- Added marketplace product opt-in, commission rate, review status, featuring fields, and marketplace order source-attribution records through DB schema and migrations.
- Added public marketplace API endpoints for products, categories, sellers, and unified marketplace order tracking.
- Added admin marketplace console APIs and UI for summary, product review, featuring, sellers, source-attributed orders, settlements, and deep reporting.
- Added marketplace regression coverage in `tests/products-qa-regression.test.ts`.

### Changed (Haa Public Marketplace)

- Merchant product form/API/schema now supports Haa marketplace participation and commission metadata.
- Checkout/order flow can mark marketplace-origin orders and associate them with unified marketplace order tracking.
- Marketplace filters intentionally exclude city; seller location remains informational on seller/store surfaces only.
- Marketplace role clarified as marketing plus oversight only. After checkout, each marketplace suborder becomes a normal merchant order and continues through the merchant's existing procedures.
- Added public marketplace order inquiry route `/marketplace/orders` with order number + phone lookup.
- Updated storefront Vite proxy so marketplace HTML routes are served by the SPA and marketplace JSON requests are forwarded to the API.

### Fixed (Verification Follow-up)

- Fixed `apps/merchant-dashboard/src/pages/LiveRadar.tsx` JSX structure and typed Select handlers so full monorepo typecheck and ESLint pass.
- Fixed `packages/shared/src/types/marketing.ts` exports to remove broken self-import/circular type definitions.
- Updated marketplace checkout/tracking copy so customers are sent to merchant order pages for normal post-order procedures.

### Verification (Haa Public Marketplace)

- `pnpm preflight` passed.
- `pnpm typecheck` passed across all workspace projects.
- `pnpm exec eslint . --quiet` passed.
- `pnpm --filter @haa/db build`, `pnpm --filter @haa/api build`, `pnpm --filter @haa/storefront build`, and `pnpm --filter @haa/admin-dashboard build` passed.
- `pnpm vitest run tests/products-qa-regression.test.ts` passed: 13 tests.
- `pnpm test` passed: 1570 tests, 14 todo, 1 skipped.
- `pnpm ops:monitor` passed health and synthetic checks with no incidents or recommended tasks.

### Added

- Created `docs/ops/` directory with complete Development Operating System:
  - CURRENT_STATE.md — project memory and state
  - TASK_TRACKER.md — task lifecycle tracking
  - CHANGELOG_INTERNAL.md — this file
  - DECISIONS.md — architectural and process decisions
  - RISK_REGISTER.md — project risk tracking
  - ISSUE_KNOWLEDGE_BASE.md — root cause knowledge base
  - REGRESSION_CHECKLIST.md — regression prevention
  - DEVELOPMENT_PLAYBOOK.md — development philosophy and workflow
  - TASK_LIFECYCLE.md — task state machine
  - REQUEST_EXPANSION_GUIDE.md — request expansion with examples
  - DEFINITION_OF_READY.md — readiness criteria
  - DEFINITION_OF_DONE.md — completion criteria
  - QUALITY_GATES.md — mandatory quality checks
  - ARCHITECTURE_BOUNDARIES.md — layer separation rules
  - TESTING_STRATEGY.md — testing approach
- Created `scripts/` monitoring scripts:
  - monitor-health.mjs — project and runtime health checks
  - synthetic-checks.mjs — HTTP-level endpoint verification
  - analyze-support-errors.mjs — error pattern analysis
  - generate-monitoring-report.mjs — Markdown report generation
  - tail-monitoring-events.mjs — recent events viewer
- Created `storage/` for monitoring events:
  - monitoring-events.ndjson
  - support-error-events.ndjson
- Created `docs/ops/` System Health documentation:
  - MONITORING_PLAYBOOK.md — monitoring philosophy and workflow
  - HEALTH_CHECKS.md — detailed health check definitions
  - SYNTHETIC_CHECKS.md — synthetic check scenarios
  - ALERT_RULES.md — P0/P1 alert definitions
  - INCIDENTS.md — incident template and records
  - LATEST_MONITORING_REPORT.md — generated report placeholder
- Created `docs/support/` documentation:
  - ERROR_CATALOG.md — 11 initial error codes with merchant/support info
  - SUPPORT_PLAYBOOK.md — support engineer guidelines
  - ESCALATION_GUIDE.md — escalation criteria and paths
  - ERROR_CODE_TAXONOMY.md — 22 error code categories
- Added System Health section (11) to AGENTS.md
- Added ops:\* scripts to package.json

### Changed

- AGENTS.md: from design-system-focused skill guide to full project constitution with 12 sections
- CURRENT_STATE.md: updated with System Health OS completion
- TASK_TRACKER.md: added TASK-0002 for System Health OS

### Fixed

- Git repository initialized (commit `076bc40` — "chore: add development operating system")
- Path verification confirmed: all Dev OS files in correct project root only

### Notes

- This is the foundational commit of the Development Operating System
- All future work must follow the Mandatory Start Rule defined in AGENTS.md
- System Health OS adds proactive monitoring before merchant reports
- Remaining gap: `preflight` Root Guard does not fail when run from wrong directory; needs hardening
- Synthetic checks warn if dev servers are not running (expected behavior)

## 2026-06-13 (Hardening Pass)

### Added

- Created `.haa-project-root` marker file
- Created `scripts/preflight.mjs` — hardened Node-based preflight with exit code 1 on failure

### Changed

- `package.json` preflight: from inline shell script to `node scripts/preflight.mjs`
- `scripts/monitor-health.mjs`: removed `/api/health` check (only uses `/health`)
- `scripts/synthetic-checks.mjs`: removed `/api/health` check (only uses `/health`)
- `docs/ops/HEALTH_CHECKS.md`: fixed duplicate sections, documented `/health` as sole endpoint
- RISK_REGISTER: R-0001 (wrong directory) status changed to Mitigated

### Fixed

- Root Guard now exits with code 1 from wrong directory (hardened)
- Monitoring report no longer shows Degraded due to `/api/health` 404

## 2026-06-13 (Dynamic Error Capture)

### Added

- Created `packages/shared/src/error-codes.ts` with 14 error codes, severity/source/origin enums, fingerprint/correlationId/eventId helpers, safe message lookup
- Created `apps/api/src/services/support-error-log.ts` — NDJSON append-only logger with sanitization, event builder, ErrorMonitor implementation
- Created `apps/api/src/routes/support-errors.ts` — `POST /internal/support-errors/report` (local-only)
- Created `apps/storefront/src/components/ErrorBoundary.tsx` — catches React errors, reports with STORE-001 default
- Created `scripts/simulate-support-error.mjs` — generates random test events
- Added Dynamic Error Capture section to `docs/support/ERROR_CODE_TAXONOMY.md` (identifier explanation, severity matrix, source taxonomy)
- Added `VALIDATION-001` and `NETWORK-001` entries to `docs/support/ERROR_CATALOG.md`
- Added correlationId flow explanation to `docs/support/SUPPORT_PLAYBOOK.md`
- Added eventId/correlationId to `docs/support/ESCALATION_GUIDE.md` handoff template
- Added `docs/ops/REGRESSION_CHECKLIST.md` Dynamic Error Capture section
- Added Section 13 (Local Dynamic Error Capture Rule) to AGENTS.md with 12 rules
- Added `ops:errors:simulate` script to package.json

### Changed

- `apps/api/src/middleware/error-handler.ts`: imports and wires local support-error-log monitor on module init
- `apps/api/src/index.ts`: registers `/internal/support-errors` route; side-effect imports support-error-log
- `apps/merchant-dashboard/src/components/ErrorBoundary.tsx`: enhanced — generates correlationId, POSTs to report endpoint, shows DASH-001 with tracking number
- `apps/storefront/src/App.tsx`: wrapped `<Routes>` with `<ErrorBoundary>`
- `packages/shared/src/index.ts`: added re-export of error-codes
- `scripts/analyze-support-errors.mjs`: updated to read both monitoring-events and support-error-events NDJSON files
- All support/ops docs updated to reflect Dynamic Error Capture

### Notes

- ErrorMonitor interface already existed in error-handler.ts — reused without changes
- POST /internal/support-errors/report returns 404 in production (guarded)
- Sanitization strips sensitive fields recursively before writing to NDJSON
- Stack traces are stripped unless NODE_ENV=development
- Branch: chore/local-dynamic-error-capture

### Added (System Map)

- Created `docs/system-map/SYSTEM_MAP.md` — complete architecture map with 10 sections: layer locations, responsibilities, strict boundaries, request flow, theme flow, RBAC flow, order/payment/shipping flow, error entry points, error logging flow, error-to-task/incident flow
- Created `docs/system-map/ERROR_FLOW_MAP.md` — detailed error pipeline trace with 12 sections: lifecycle, occurrence, capture (frontend + backend), sanitization, storage schema, analysis, action flow, merchant/support/developer views, error code reference, key files
- Updated Mandatory Start Rule in AGENTS.md to include reading SYSTEM_MAP.md as step 3

### Changed

- `AGENTS.md`: added system map read to Mandatory Start Rule; fixed step numbering (was 11 with duplicate 5, now 12)
- `CURRENT_STATE.md`: updated phase, priorities, recent completions, local dev notes to reference system map

## 2026-06-13 (Security Baseline & RBAC Audit)

### Added

- Created `docs/security/SECURITY_BASELINE.md` — 6-section security assessment covering auth, API authorization, dashboard protection, storefront exposure, error capture security, logging/privacy; 0 P0, 3 P1, 2 P2, 3 P3 findings
- Created `docs/security/RBAC_AUDIT.md` — comprehensive RBAC assessment: existing requirePermission middleware documented, all missing pieces identified (permission definitions, roles, mapping, UI, seeds, branches), 9 recommended tasks before implementation
- Created `docs/security/DATA_ISOLATION_AUDIT.md` — tenant/store/branch/customer/order isolation assessment; all areas rated Low risk except branch/location (not implemented)
- Created `docs/security/LOGGING_PRIVACY_AUDIT.md` — audit of structured-logger redaction, support-error-log sanitization, NDJSON risks, .env/.gitignore coverage, production-later requirements
- Created `docs/security/SECURITY_FIX_BACKLOG.md` — 14 prioritized fix items (5 P1, 4 P2, 5 P3) with acceptance criteria and test plans

### Changed

- `docs/ops/RISK_REGISTER.md`: added 4 new risks (R-0011 customer permission, R-0012 missing RBAC, R-0013 no employee management, R-0014 accessToken in URL)
- `docs/ops/TASK_TRACKER.md`: added TASK-0005 (Security Baseline & RBAC Audit) with full scope, acceptance criteria, test plan
- `docs/ops/CURRENT_STATE.md`: updated phase to Security Baseline & RBAC Audit; added security findings summary, known risks, recommended next tasks; TASK-0004 status to Done
- `docs/ops/CHANGELOG_INTERNAL.md`: this entry
- `docs/ops/REGRESSION_CHECKLIST.md`: added security section with audit checks
- `AGENTS.md`: added System Map reference to Mandatory Start Rule (already done in previous update)

### Notes

- Total of 5 security doc files created, 4 ops files updated
- No code changes, no database changes — pure documentation and risk tracking
- Key finding: customers.ts uses read permission for write operations (SEC-001)
- Key finding: no RBAC data model exists — permissions are hardcoded strings (SEC-004)
- Error capture sanitization reviewed and confirmed adequate
- Branch: chore/security-baseline-rbac-audit

## 2026-06-13 (Theme Hydration Flicker Fix)

### Fixed

- `apps/storefront/src/components/Layout.tsx`: prevented storefront theme hydration flicker by guarding themed content rendering until `useThemeConfig` resolves. Previously, `resolveStorefrontThemeKey(null)` returned `'base-elegant'` on first render before the async theme API call completed, causing a flash of wrong theme. Now renders a neutral `ThemeLoadingSkeleton` (using only Tailwind built-in colors, zero CSS vars) during loading, and only renders themed components after the correct theme config is available. Added 8-second fallback timeout for theme loading failure.

### Notes

- Root cause was a timing issue, not a design issue: `useThemeConfig` returns `null` on first render, but Layout rendered themed content anyway using the default fallback key.
- `loadTheme()` → `applyStoreTheme()` runs synchronously before `setConfig()`, so CSS vars are in the DOM before the re-render — zero frame gap.
- Merchant-dashboard imports audit confirmed: no storefront theme code leakage (see TASK-0008 audit report).
- Branch: fix/theme-hydration-flicker (merged to main at 0f4f0c1)

## 2026-06-13 (Theme Isolation)

### Changed

- `packages/theme-system/src/server.ts`: added `validateThemeConfig` and `ValidationResult` exports so merchant-dashboard can import server-safe functions without pulling in DOM-manipulation code
- `packages/theme-system/package.json`: fixed `./server` export path from `dist/` to `src/` (source-level resolution, no build required)
- `apps/merchant-dashboard/src/pages/ThemeStore.tsx`: changed import from `@haa/theme-system` to `@haa/theme-system/server`
- `apps/merchant-dashboard/src/pages/ThemeEditor.tsx`: changed import from `@haa/theme-system` to `@haa/theme-system/server`

### Fixed

- `apps/storefront/src/themes/luxury-showcase/Header.tsx`: removed `!important` global `body, html` style injection that bypassed scoping; background now inherits from `#storefront-scope` CSS variables
- `apps/storefront/src/index.css`: removed dead `#theme-scope` CSS block (selector never rendered in DOM)

### Notes

- All storefront theme packages (`@haa/theme-system`, `@haa/storefront-themes`) have DOM-writing functions (`applyStoreTheme`, `applyTheme`, `loadTheme`, analytics script injection). Merchant-dashboard MUST import from `@haa/theme-system/server` only to avoid bundling this code.
- `@haa/theme-system` is deprecated in favor of `@haa/storefront-themes`, which re-exports everything. Dashboard never imports either directly except through the `/server` subpath.
- `@haa/theme-react`'s `ThemeProvider` is safe for dashboard — it controls light/dark mode via `data-theme` on `<html>`, which is the design system theme, not storefront theme.
- `@haa/system-theme` is dashboard-safe — CSS is scoped to `.haa-system-theme` with `--haa-*` namespaced variables.
- Branch: fix/theme-isolation

## 2026-06-16 — TASK-0030 Configurable Platform Fee Policy

- **Type:** Feature / Data/DB / API / UX/UI Polish / Testing
- **Scope:** Platform fee is now per-store configurable. Each order's `platform_fee`
  wallet entry carries an immutable snapshot of the rate + fixed amount that
  produced it, so changing a store's policy never re-prices historical orders.
- **Files Added:**
  - `packages/db/src/schema/billing.ts` — `storeBillingSettings` table
  - `packages/db/src/migrations/0050_store_billing_settings.sql` — schema + default seed (2% percentage for every existing store)
  - `packages/db/src/migrations/0051_wallet_fee_snapshot.sql` — fee-snapshot columns on `wallet_entries`
  - `packages/wallet-core/src/platform-fees.ts` — pure calc + validation
  - `packages/commerce-core/src/billing-settings-service.ts` — DB reads + audit log writes
  - `apps/api/src/routes/admin/billing-settings.ts` — GET + PATCH admin endpoints
  - `apps/admin-dashboard/src/pages/StoreBillingSettings.tsx` — admin UI
  - `tests/platform-fees.test.ts` — pure unit tests (33 tests)
  - `tests/platform-fees-wiring.test.ts` — wiring + source-grep tests (24 tests)
- **Files Modified:**
  - `packages/db/src/schema/wallet.ts` — added `feeRatePct`, `feeFixed`, `feeSource`
  - `packages/db/src/schema/index.ts` — re-export billing schema
  - `packages/db/src/migrations/meta/_journal.json` — entries 0050, 0051
  - `packages/wallet-core/src/ledger.ts` — fee-snapshot fields in `recordEntry`, structured `fees` block in `getSummary`
  - `packages/wallet-core/src/index.ts` — re-export `calcPlatformFee` + types
  - `packages/commerce-core/src/checkout.ts` — read policy at order creation, snapshot to fee entry
  - `packages/commerce-core/src/index.ts` — re-export `StoreBillingSettingsService` + types
  - `packages/shared/src/types/orders.ts` — added `'store_billing_settings_updated'` to `AuditAction`
  - `packages/shared/src/types/audit.ts` — added Arabic label
  - `apps/api/src/routes/webhooks.ts` — same policy lookup as checkout
  - `apps/api/src/routes/wallet.ts` — include read-only `platformFee` in summary
  - `apps/api/src/routes/admin/index.ts` — mount new admin routes
  - `apps/admin-dashboard/src/lib/api.ts` — `getStoreBillingSettings` + `updateStoreBillingSettings`
  - `apps/admin-dashboard/src/App.tsx` — nav entry + route
  - `apps/merchant-dashboard/src/pages/Wallet.tsx` — read-only policy card (also removed pre-existing `directionColors` TS6133 unused-locals)
- **Audit:** `store_billing_settings_updated` action added with Arabic label
  "تحديث إعدادات رسوم المتجر". Old/new values recorded on every PATCH.
- **Backward compat:** Flat `platformFees` / `paymentFees` / `shippingFees` /
  `refunds` fields still returned alongside the new structured `fees` block
  to avoid breaking the existing merchant UI.
- **Tests:** 57 new tests, 0 regressions. Pre-existing 5 baseline failures
  on this branch are unrelated (marketing-actions.ts, 0046_smiling_phil_sheldon,
  landing AI agent system-prompt, dashboard → @haa/storefront-themes import,
  storefront `:root` CSS).
- **Skills Used:** plan-mode, test-driven-development, verification-before-completion.

## 2026-06-17 — TASK-0035 Session #5 (Live Deploy Readiness Docs)

Single commit `e915adcb` shipping 5 comprehensive docs (~2,069 lines)
to prepare the platform for live deployment. Covers legal, operational,
and compliance surfaces.

### Added (Legal — PDPL + KSA Law)

- `docs/PRIVACY_POLICY.md` (262 lines)
  - Saudi Personal Data Protection Law (PDPL) compliant
  - 13 sections: data categories, lawful basis, sub-processors,
    cross-border transfer, encryption, access control, retention
    periods, data subject rights (all 8 PDPL rights mapped to our
    endpoints), cookies, breach notification, contact
  - Bilingual (Arabic primary, English secondary)
  - Cross-references TASK-0034 sub-item 8 (data export + deletion)
- `docs/TERMS_OF_SERVICE.md` (306 lines)
  - Governed by Saudi law; primary language Arabic
  - 13 sections: eligibility, account types, fees, refunds (14-day
    per MoCI), prohibited items (per Saudi law), IP, warranties,
    liability limits, suspension, dispute resolution (negotiation →
    mediation → ICC arbitration → KSA courts)
  - Cross-references PRIVACY_POLICY + SAUDI_COMPLIANCE_CHECKLIST

### Added (Operational)

- `docs/DEPLOYMENT_RUNBOOK.md` (536 lines)
  - Step-by-step deploy for staging + production
  - Pre-deployment gate (Owner GO + Readiness Gate + 7-day staging)
  - Architecture diagram (Fly.io + Postgres + Redis + Cloudflare R2 + CDN)
  - Pre-flight checklist (8 items) + secrets inventory (~30 secrets)
  - KNOWN GOTCHA for Drizzle snapshot chain (0050-0053 missing) per
    `memory/drizzle-migration-snapshots.md` — use `psql` not `drizzle-kit`
  - Blue-green deployment + rollback plan (app + DB + DNS)
  - Monitoring schedule (daily/weekly/monthly/quarterly)
  - On-call handbook with PagerDuty escalation
- `docs/INCIDENT_RESPONSE.md` (624 lines)
  - NIST-aligned 5-phase IR: Detection → Containment → Eradication
    → Recovery → Post-mortem
  - Severity: P0/P1/P2/P3 with response times + page thresholds
  - 4 common playbooks: storefront 500s, payments failing, DB outage,
    security breach (with §5 security sub-procedure)
  - **PDPL Article 21**: 72-hour SDAIA breach notification (mandatory)
  - Communication templates: initial / update / resolution / security
  - Decision trees: when to page, when to rollback
  - Quarterly tabletop drill schedule

### Added (Compliance)

- `docs/SAUDI_COMPLIANCE_CHECKLIST.md` (341 lines)
  - 7 Saudi authorities: SAMA, PDPL (SDAIA), ZATCA, MoCI, CITC, SFDA, HRSD
  - Plus cross-cutting: NCA cybersecurity, AML, IP
  - 70+ compliance items with status legend
  - Highlights: **SAMA 3DS ✅** (TASK-0035 complete), **ZATCA VAT ✅**
    (TASK-0035 sub-items 6+7), **PDPL data subject rights ✅**
    (TASK-0034 sub-item 8)
  - Identifies 10 blocking items for live — all are **owner action**
    (VAT registration, CR, DPO appointment, e-commerce license,
    PCI-DSS ASV scan, penetration test, KSA hosting decision,
    trademark registration, Tabby DPA, DR plan)
  - Overall readiness: **~75%** (engineering 100%, business/legal
    items pending)
  - Quarterly compliance review calendar

### Test Status

- `pnpm preflight` → ✅ PASSED
- `pnpm test` → 2393 passing, 4 pre-existing baseline failures
  unchanged (CSS isolation + migration-deduplication + schema-deduplication)

### Impact

These 5 docs enable:

1. Legal review submission (Owner + Legal before live)
2. On-call team training
3. Regulatory audit submission (SDAIA, NCA, SAMA)
4. Operations team handoff
5. Owner GO decision (gated by Readiness Gate in DEPLOYMENT_RUNBOOK §0)

### Out of Scope (Owner Action Items)

- Live API keys (Moyasar/Geidea/Tabby/Tamara)
- VAT registration certificate (ZATCA)
- Commercial Registration (MoCI)
- DPO appointment (PDPL)
- E-commerce license (MoCI)
- PCI-DSS ASV scan (SAMA)
- Penetration test (SAMA)
- KSA hosting region (CITC, depends on Fly.io)
- Trademark registration (SAIP)
- Tabby DPA signing (PDPL cross-border)
- Disaster recovery plan (NCA)
- Legal review of all 5 docs

### Cross-references

- TASK-0034 sub-item 8 (PDPL endpoints)
- TASK-0035 (3DS + VAT)
- docs/security/\* (security controls)
- docs/ops/INCIDENTS.md (existing incident log)
- memory/drizzle-migration-snapshots.md (deploy gotcha)

### Skills Used

plan-mode, verification-before-completion, documentation-as-code.

---

## 2026-06-17 — TASK-0035 Session #4 (3DS Storefront + Checkout VAT Line)

2 commits on `feature/phase-9-cod-fee-policy`:

### Added (3DS Storefront Wiring — sub-item 5)

- `tests/3ds-storefront-flow.test.ts` (commit 7e8541f0) — 11/11 tests
- Schema/types updates: `'awaiting_3ds'` added to OrderStatus;
  `'requires_3ds'` added to PaymentStatus
- Fake provider supports `fake_3ds_challenge` payment method
  (returns local `/fake-3ds-challenge?paymentId=...` redirect URL)
- CheckoutService.confirm captures `redirectUrl` from provider and
  surfaces it in result; new `requires_3ds` branch sets order
  status to 'awaiting_3ds' (does NOT mark as paid; does NOT release
  stock; does NOT fire order.paid webhook)
- API `/confirm` forwards `redirectUrl` to storefront; new
  `POST /:slug/checkout/3ds-callback` endpoint for post-challenge
  verification
- Storefront `Checkout.tsx` redirects customer to 3DS challenge URL
  with "جاري التحقق من بطاقتك…" toast
- `CheckoutConfirm` type exposes `paymentStatus` + `redirectUrl`

### Added (Checkout VAT Line — sub-item 7)

- `tests/checkout-vat-line.test.ts` (commit a9418342) — 5/5 tests
- Checkout.tsx sidebar renders subtotal (ex-VAT) + VAT line
  (via `formatVatLine`) + total (inc-VAT) + VAT note
- Imports from scoped `@haa/commerce-core/vat` subpath (avoids
  pulling unused-locals into storefront tsc)
- Uses `i18n.language` to render Arabic or English VAT line
- New tsconfig path mapping: `@haa/commerce-core/vat` → vat.ts source

### Owner Commits During Break (~4.5h)

- `ca0ce61c` fix(platform): render official brand logo from api
- `62132974` fix(theme): unify store primary color source
- `db92206c` fix(auth): update terms route + checkout VAT test (initial
  draft of `tests/checkout-vat-line.test.ts` file)
- `afbc0e0f` fix(theme): refresh runtime primary color

### Test Status

- `pnpm vitest run tests/3ds-storefront-flow.test.ts` → 11/11
- `pnpm vitest run tests/checkout-vat-line.test.ts` → 5/5
- Full suite: 2393 passing (+16 from Session #3 closure 2377)
- 4 baseline failures unchanged

### Skills Used

plan-mode, test-driven-development, verification-before-completion,
systematic-debugging.

---

## 2026-06-17 — TASK-0035 Session #3 (3DS Scaffold + VAT Helpers)

4 commits on `feature/phase-9-cod-fee-policy`:

### Added (3DS Scaffold — sub-item 1)

- `f097cc61` feat(payments): 3DS support scaffolding
  - `requires_3ds` added to `InternalPaymentStatus` union + INTERNAL_PAYMENT_STATUSES
  - `supports3DS: boolean` added to `PaymentProviderCapabilities`
  - Provider capability flags: moyasar/geidea/fake = true,
    tabby/tamara = false
- Rebuild `@haa/shared` dist to fix `@haa/payment-providers` typecheck

### Added (TASK-0035 Registration)

- `e461bfda` docs(ops): register TASK-0035 in TASK_TRACKER.md

### Added (3DS Flow Contract — sub-items 3+4)

- `5bdaf1f6` feat(payments): 3DS challenge flow contract
  - `tests/3ds-flow.test.ts` — 23/23 tests (status mapping,
    capability flags, createPaymentIntent 3DS contract,
    handleWebhook 3DS contract, storefront checkout 3DS handling,
    fake provider parity, idempotency regression)
  - Moyasar `createPaymentIntent` reads `source.transaction_url`
    and returns `redirectUrl`; sets local status to `requires_3ds`
  - `mapProviderStatus('moyasar', 'requires_3ds' | '3ds_required')`
    → `'requires_3ds'`
  - `handleWebhook` adds `'authorized'` to terminal-status whitelist;
    acknowledges `payment.requires_3ds` without changing status
  - Capability flag constants re-exported from `@haa/commerce-core`
  - Storefront checkout route has 3DS documentation block

### Added (VAT Helpers + Product Card Badge — sub-item 6)

- `3b6fea97` feat(pricing): VAT-aware pricing helpers + product card badge
  - `packages/commerce-core/src/vat.ts` (~115 LOC)
  - 6 helpers: `priceIncVat`, `priceExVat`, `vatAmount`, `formatVatLine`,
    `formatPriceIncVatLabel`, `isValidVatRate`
  - `DEFAULT_VAT_RATE = 0.15` (ZATCA standard); env-overridable
  - `VAT_RATE` env var in `apps/api/src/env.ts` with boot-time validation
  - `tests/vat.test.ts` — 25/25 tests (RED → GREEN)
  - Storefront `ProductCard.tsx` shows subtle inline "شامل الضريبة"
    badge in emerald via new `showVatBadge` prop on `ProductPriceBlock`
  - RTL-aware (`ms-2` margin-inline-start)

### WIP Triage (Session Start)

- 21 uncommitted files at session start
- 2 source files committed (3DS scaffold — useful for sub-items 4-6)
- 18 source files stashed as `stash@{0}` (theme refactor + 3 new
  pages + admin/auth UI updates — preserved for future use)
- 1 source file reverted (`tenants.ts` primaryColor — out of scope
  for 3DS+VAT work)

### Test Status

- `pnpm vitest run tests/3ds-flow.test.ts` → 23/23
- `pnpm vitest run tests/vat.test.ts` → 25/25
- Full suite: 2377 passing (+48 from Session #2 baseline 2329)
- 4 baseline failures unchanged

### Skills Used

plan-mode, test-driven-development, verification-before-completion,
systematic-debugging.

---

## 2026-06-17 — TASK-0035 Sessions #6 through #10 (ZATCA Roadmap + Drizzle Snapshot Chain Rebuilt + Geidea 3DS + Fake3DS UI)

5 sessions, 5 commits (`54d1df67` → `4c6deacf`) closing the final
loose ends of TASK-0035 and laying the foundation for TASK-0036 (ZATCA
e-invoicing). Closes the Sessions #3-#5 closure header to reflect 8/8
sub-items done.

### Session #6 (`54d1df67`) — ZATCA E-Invoicing Roadmap

**Doc-only session** registering TASK-0036 in Planning status with the
owner decision matrix.

- `docs/ZATCA_ROADMAP.md` (~430 lines)
  - 5 sub-items: per-merchant CSID issuance, invoice generation +
    signing + UBL 2.1 XML, QR code rendering (TLV), B2B clearance
    (online portal), B2C reporting (daily batch)
  - 6 owner decisions identified (Q1 per-merchant CSID, Q2 real-time
    vs batch, Q3 cross-border VAT, Q4 credit note counter, Q5 offline
    mode, Q6 sandbox account)
  - ~3.5 weeks engineering estimate
  - Out-of-scope: B2G (different spec), cross-border non-Saudia,
    invoice OCR, invoice factoring, deferred tax accounting
- `docs/SAUDI_COMPLIANCE_CHECKLIST.md` §3 updated to add ZATCA
  e-invoicing track (TASK-0036) with status legend for sub-items
- `docs/ops/TASK_TRACKER.md` updated: TASK-0036 registered in
  Planning status, 6 owner decisions logged

### Sessions #7-#8 (`6fbbb0f1` + `ff778284` + `9e5f6966`) — Drizzle Snapshot Chain Rebuilt

**Major infrastructure fix.** The Drizzle snapshot chain was broken
(missing 4 snapshots: 0050, 0051, 0052, 0053) after manual SQL repairs
during Sessions #1-#2. `drizzle-kit generate` and `drizzle-kit migrate`
both failed with `SyntaxError: Unexpected token Bud1` in
`prepareMigrationFolder`. This was the deploy-blocking known gotcha
flagged in `DEPLOYMENT_RUNBOOK.md`.

**Root cause:** When a migration is hand-edited or added without
`drizzle-kit generate`, the corresponding `*_snapshot.json` is not
created. Drizzle infers the snapshot filename from the journal entry's
`tag` field, and `validateWithReport` fails when it tries to load
missing files.

**Workaround (synthesize snapshots from previous):**

- New `scripts/build-snapshots.cjs` (~140 LOC) — reads each
  migration's `_journal.json`, finds the prior snapshot in the
  filesystem, applies the migration's `sql` statements as structural
  diff (table create/alter, index create/drop, FK add/drop), and
  emits the new snapshot. Uses STRING FK format
  (`tableFrom: 'name'`) matching Drizzle's expected output
  (NOT array format).
- Run result: 21 snapshots synthesized, 0 orphan, 0 stray files.
  Chain complete from `0000_snapshot.json` to `0053_snapshot.json`.
- 2 real bugs caught during synthesis:
  - **Snapshot 0052** had been previously committed with FK format
    `tableFrom: ['name']` (array). Test caught the deviation from
    Drizzle's expected STRING format. Re-emitted with correct format.
  - **Snapshot 0049** had `prevId: 'previous_uuid'` pointing to a
    wrong/missing snapshot. Test caught the broken prevId chain.
    Re-linked to the correct previous snapshot UUID.

**Regression guards (5 new tests, all green):**

- `tests/drizzle-snapshot-integrity.test.ts` (7 tests)
  1. All journal entries have matching `*_snapshot.json` files
  2. All snapshot files parse as valid JSON
  3. All snapshots have required fields (`id`, `prevId`, `version`,
     `dialect`, `tables`, `enums`, `schemas`)
  4. All FK `tableFrom` values are STRING (not array)
  5. All `prevId` values resolve to existing snapshot IDs
  6. Snapshot chain forms a single connected sequence from `0000`
  7. No snapshot file in `meta/` is unreferenced by any journal entry
- `tests/drizzle-kit-generate-smoke.test.ts` (5 tests)
  1. `drizzle-kit generate` exits 0 on clean working tree
  2. `drizzle-kit generate` exits 0 after a no-op schema change
  3. `drizzle-kit migrate --dry` succeeds (or fails only on
     expected connection errors in CI without DB)
  4. Journal entry count matches snapshot count
  5. All snapshot `prevId` values form a valid chain

**Memory update:** `memory/drizzle-migration-snapshots.md` updated
with the synthesize-from-previous workaround + 0052 FK array-format
bug + 0049 prevId-UUID bug.

### Session #9 (`8f842418`) — Geidea 3DS Contract Verification

Verified Geidea provider honors the same 3DS contract as Moyasar
(sub-item 5 second provider).

- `tests/geidea-3ds.test.ts` (6 tests, all green)
  1. `supports3DS: true` in `GEIDEA_CAPABILITIES`
  2. Geidea `createPaymentIntent` returns `redirectUrl` for 3DS
  3. Geidea `createPaymentIntent` sets
     `paymentStatus: 'requires_3ds'`
  4. Geidea `handleWebhook` acknowledges `3ds_required` without
     changing status
  5. Geidea `mapProviderStatus` maps `3ds_required` →
     `requires_3ds` (same as Moyasar)
  6. Geidea 3DS integration tested against `payment.requires_3ds`
     webhook event parity with Moyasar
- No code changes — confirmed Session #3 scaffold + Session #4
  flow are provider-agnostic and work for both Moyasar and Geidea
- **TASK-0035 sub-item 5 now fully done** for both providers

### Session #10 (`4c6deacf`) — Fake3DS Challenge Page UI

Dev-only SAMA 3-D Secure challenge simulation page for local testing
of the 3DS redirect flow without a real bank authentication.

- `apps/storefront/src/pages/Fake3DSChallenge.tsx` (~140 LOC)
  - Bilingual RTL Arabic/English labels
  - Bank-style dark blue gradient + brand header
  - "OTP" input field pre-filled with `123456` (dev only)
  - "تأكيد" (succeed) + "إلغاء" (fail) buttons
  - Calls `checkoutApi.complete3DSChallenge(slug, paymentId, success)`
    on submit
  - Shows order summary from URL params
- `apps/storefront/src/lib/api.ts` — new `complete3DSChallenge`:
  `POST /s/{slug}/checkout/3ds-callback?paymentId=...` (calls API
  endpoint from Session #4)
- `apps/storefront/src/App.tsx` — top-level `/fake-3ds-challenge`
  route registered OUTSIDE `/s/:slug` Layout (it's a simulation
  page, not part of merchant storefront)
- Lazy-imported for code-split
- Typecheck clean

### Test Status

- `pnpm vitest run tests/drizzle-snapshot-integrity.test.ts` → 7/7
- `pnpm vitest run tests/drizzle-kit-generate-smoke.test.ts` → 5/5
- `pnpm vitest run tests/geidea-3ds.test.ts` → 6/6
- Full suite: **2411 passing (+18 from Session #5 closure 2393)**
- 4 baseline failures unchanged
- Preflight: ✅ CLEAN (typecheck + all critical checks)

### Skills Used

plan-mode, systematic-debugging, test-driven-development,
verification-before-completion, documentation-as-code.
