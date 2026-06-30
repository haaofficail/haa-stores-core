# Issue Knowledge Base

> Root cause database for bugs and issues.
> Every fixed issue with a known root cause should be recorded here.

---

### ISSUE-0077: Financial Admin Export and Settlement Readiness Drifted From Safe Operations

- **ID:** ISSUE-0077
- **Date:** 2026-06-30
- **Severity:** High (financial data exposure / auditability / admin decision safety)
- **Area:** Admin Dashboard / Admin API / Payments / Settlements / Settlement Readiness
- **Related Tasks:** TASK-0140
- **Symptoms:** `/payments` fetched raw payment rows and exported them locally under `payments.read`, including fields the page did not need. Existing finance CSV exports were permission-gated but did not record an audit entry. Settlement Readiness UI offered SAMA values that the API rejected. Accountant detail could show transfer/upload actions from the finance detail route without checking the exact mutation permission in the UI. Settlement proof upload copy said the file was optional even though backend validation requires it.
- **Expected:** Admin finance exports should be explicit, permission-gated, audited, and based on safe read models. The UI should only show financial mutation actions when the admin has the exact server permission, and readiness controls should save values accepted by the API.
- **Actual:** Some finance surfaces looked operational but could either export too much, export without traceability, fail at save time, or invite an admin to click an action that the API would later reject.
- **Root Cause:** Earlier finance hardening focused on settlement report exports and payout ledger safety, but the broader admin finance surface still had old local-export and read-model assumptions. Settlement readiness evolved independently between frontend labels and API validator values.
- **Fix:** Added audited financial export helper, moved Payments CSV to a `wallet.payout.export` API route with explicit columns and query validation, narrowed payments read data, audited settlement CSV exports, aligned SAMA statuses, gated settlement readiness edits by `wallet.payout.approve`, gated accountant transfer/proof UI actions by exact mutation permissions, corrected proof-file required copy, added dialog semantics, and redacted stored proof file keys from manual payout detail read responses.
- **Verification:** `pnpm vitest run tests/admin-financial-actions-safety.test.ts` passed. Workspace `pnpm typecheck`, final `pnpm preflight`, `pnpm check:skills`, and `git diff --check` passed.
- **Prevention:** Keep `tests/admin-financial-actions-safety.test.ts` guarding payments export permission/audit, safe payment read/export columns, settlement readiness status alignment, exact mutation permission UI gates, payout dialog/proof-copy safety, and proof-file-key redaction.
- **Status:** Fixed locally in TASK-0140. No deploy, migration, DB mutation, secret handling, production action, or live provider call occurred. Split from TASK-0139 before push/staging.

---

### ISSUE-0076: Tenant Operations Were Split Across Pages Without a Single Dossier

- **ID:** ISSUE-0076
- **Date:** 2026-06-30
- **Severity:** High (admin operations / merchant lifecycle visibility)
- **Area:** Admin Dashboard / Tenant Operations / Merchant Verification / Finance Read Models
- **Related Tasks:** TASK-0139
- **Symptoms:** Admin reviewers could inspect merchants through separate pages, but there was no single tenant operating file that tied together stores, verification readiness, finance snapshots, payouts, settlements, audits, and next actions.
- **Expected:** A platform admin should be able to open one tenant from `/tenants` and see the tenant's operational state with safe, read-only finance context and clear links to the right review surfaces.
- **Actual:** Tenant operations were scattered across list pages and detail panels, increasing review friction and making it easier to miss blockers or confuse overview context with destructive finance actions.
- **Root Cause:** TASK-0134..0138 improved Merchant Verification and admin action contracts first, but did not yet create a tenant-level dossier entry point from the tenant list.
- **Fix:** Added `/tenants/:tenantId`, linked tenant names and `ملف التاجر` actions to it, and built a read-only dossier aggregating tenant stores, Merchant Verification context, masked bank state, payout/extract rows, and audit history. PR #348 review follow-up keeps payment totals, settlement-batch counts, and publish-readiness blockers unavailable unless backed by trusted scoped source data.
- **Verification:** Focused tenant dossier regression passed. Admin-dashboard typecheck and build passed. `pnpm check:skills` and `git diff --check` passed.
- **Prevention:** Keep `tests/admin-tenant-dossier.test.ts` guarding the `/tenants/:tenantId` route, table links, source scoping, finance read-only behavior, no full IBAN, no misleading payment/settlement totals, and no destructive finance actions from the dossier overview.
- **Status:** Fixed locally in TASK-0139. No deploy, migration, DB mutation, secret handling, production action, or live provider call occurred.

---

### ISSUE-0075: Main Change-password Route Failed Against Stale Commerce-core Declaration

- **ID:** ISSUE-0075
- **Date:** 2026-07-01
- **Severity:** High (main CI/preflight blocker / auth route)
- **Area:** API Auth / Commerce Core Type Contract / Local Package Declarations
- **Related Tasks:** TASK-0141
- **Symptoms:** `pnpm typecheck` and `pnpm preflight` failed on `origin/main` with `apps/api/src/routes/auth.ts(452,9): 'tenantId' does not exist in type 'ChangePasswordInput'`.
- **Expected:** `/auth/change-password` should pass the signed-in user's `tenantId` and active store as server-side context to the service for audit logging, while the request payload schema stays limited to current and new password fields.
- **Actual:** The route passed an inline object literal with `tenantId` and `storeId` directly to `AuthFlowService.changePassword()`. The commerce-core source interface already had these fields, but the ignored local `packages/commerce-core/dist/auth-flow.d.ts` declaration was stale and did not include them, so TypeScript excess-property checking blocked API typecheck.
- **Root Cause:** PR #345 updated source-level `ChangePasswordInput`, but the API package consumes `@haa/commerce-core` through package export declarations. The ignored local `dist` declaration can lag behind source, and direct inline object literals trigger excess-property checks against that stale declaration.
- **Fix:** Build the change-password input as a local server-side object before passing it into `service.changePassword()`, preserving runtime `tenantId`/`storeId` context without expanding the public request schema. Added a regression guard that `changePasswordSchema` does not accept `tenantId` or `storeId`.
- **Verification:** PR #346 merged at `f5af0cbc86681f5d1edbb703e03638b02a7180e5`; post-merge GitHub CI passed, staging deploy passed, staging smoke passed 5/5, production deploy was skipped, and local `pnpm typecheck` plus `pnpm preflight` passed.
- **Prevention:** Keep `tests/merchant-account-security.test.ts` asserting password-change tenant/store context comes from JWT/server context and not from the request schema. Rebuild workspace package declarations when package export types drift during local verification.
- **Status:** Fixed and merged via PR #346. No production deploy, manual migration, secret handling, production config change, or live provider call occurred.

---

### ISSUE-0074: Admin Routes and Store Actions Drifted From Operational Contracts

- **ID:** ISSUE-0074
- **Date:** 2026-06-30
- **Severity:** High (admin operations / local schema readiness / merchant setup correctness)
- **Area:** Admin Dashboard / Admin API / Store Management
- **Related Tasks:** TASK-0138
- **Symptoms:** Deep admin QA found that the `المستخدمون` sidebar link pointed to `/admin-users`, which the browser blocked before React could render. Store create/edit appeared usable but sent `domain` while the API required `slug`, lacked the required store email field, and asked the admin to type raw Tenant ID. Local support-error history also showed failed admin list/settings queries caused by broad selects on evolving schemas.
- **Expected:** Admin links should use stable routes, store create/edit should match the API and product language, and admin list/settings/user routes should select only fields needed by the UI so optional migrations do not lock out local/staging review.
- **Actual:** The route/action surface looked present but several actions could fail or mislead the admin at execution time.
- **Root Cause:** Admin UI and API evolved independently: the store URL field moved to canonical `slug`, while the page kept `domain`; user management used an ad/filter-sensitive route name; and split admin route handlers still carried broad select patterns from earlier monolithic routes.
- **Fix:** Moved the UI users route to `/users` with `/admin-users` kept as a redirect alias. Updated Stores page to use `slug`, merchant select, store email, and phone. Added API compatibility for old `domain` input while normalizing to `slug`. Added explicit select maps for tenants, stores, platform settings, and admin user list.
- **Verification:** Focused source tests passed 5 files / 37 tests, including the new `tests/admin-action-routing-integrity.test.ts`. API and admin-dashboard typechecks passed. Admin-dashboard build passed. Browser route smoke across 21 primary admin routes passed with no visible failed-query errors or full IBAN patterns; `/stores` add modal showed the corrected fields and empty-save validation.
- **Prevention:** Keep `tests/admin-action-routing-integrity.test.ts` guarding `/users` navigation, Stores slug/email/tenant-select contract, `domain` alias normalization, and no broad selects for high-traffic admin list/settings/user routes.
- **Status:** Fixed locally in TASK-0138. No deploy, migration, DB mutation, secret handling, production action, or live provider call occurred.

---

### ISSUE-0073: Merchant Verification List Was Still Carrying File-Level Work

- **ID:** ISSUE-0073
- **Date:** 2026-06-30
- **Severity:** High (admin review ergonomics / merchant onboarding trust)
- **Area:** Admin Dashboard / Merchant Verification / Information Architecture
- **Related Tasks:** TASK-0137
- **Symptoms:** After merchant verification became actionable, the admin still lacked a professional "merchant file" mental model. Reviewers expected to select a merchant from the table and then see that merchant's verification, operational activation, financial activity, settlement/payout state, review history, audit trail, and internal notes in one focused place.
- **Expected:** `/compliance` should behave as an index. A selected merchant should open a dedicated route with approval stages and all relevant merchant-file sections. The reviewer should not see every merchant's detail workflow stacked under the global table.
- **Actual:** The earlier page was improved, but the list/detail boundary was still too close to a dashboard detail panel. That made the journey feel less professional and made it harder to reason about the lifecycle of one merchant from documentation through publish readiness and financial operations.
- **Root Cause:** TASK-0134/TASK-0136 focused first on concept separation, readiness calculation, and decision safety. They did not yet complete the information architecture step that separates merchant discovery from merchant dossier work.
- **Fix:** Added `/compliance/:recordId`, linked store names and review actions to that route, treated child routes as active under "توثيق المتاجر", and built a merchant dossier with approval stages, profile/owner/phone/email/registry/bank/documents, operational activation, publish readiness, sales/payments, payouts/extracts, settlement batches, review decisions, audit logs, and internal notes. Bank display remains masked with `ibanLast4` only.
- **Verification:** Browser verification passed on `http://localhost:5175/compliance` and `http://localhost:5175/compliance/store-1`: the list is table-only with merchant-file links, the merchant file renders approval/profile/operations/finance/history/notes tabs, and full IBAN patterns are absent. `pnpm --filter @haa/admin-dashboard typecheck` passed. Focused regression suite passed 6 files / 56 tests.
- **Prevention:** Keep `tests/admin-merchant-verification.test.ts` guarding the `/compliance/:recordId` route, `merchantFilePath()`, route-param detail behavior, no `setSelectedId(record.id)` inline-detail regression, full-IBAN non-exposure, and absence of platform-only compliance vocabulary.
- **Status:** Fixed locally in TASK-0137. No deploy, migration, DB mutation, secret handling, production action, or live provider call occurred.

---

### ISSUE-0072: Admin Merchant Verification Was Diagnostic Before It Was Actionable

- **ID:** ISSUE-0072
- **Date:** 2026-06-30
- **Severity:** High (admin review operations / merchant onboarding trust)
- **Area:** Admin Dashboard / Merchant Verification / Admin API
- **Related Tasks:** TASK-0136
- **Symptoms:** Admin `/compliance` correctly stopped showing platform-only PCI/Pentest/ASV/DR requirements after TASK-0134, but the page still did not fully operate like a review station. Admins could see blockers, yet the UI did not consistently tell them which internal page to open, what to ask the merchant to fix, or how to record a "request changes" decision. Filters could also leave the detail panel showing a previously selected store even when the table had no matching rows.
- **Expected:** Merchant verification should tell admin reviewers what is blocking publication, where to review/fix each blocker, what message/instruction belongs to the merchant, and which review decisions are permitted. The API should persist reasons for both rejection and requested changes.
- **Actual:** The first redesigned page was closer to a diagnostic dashboard. Approval/rejection actions existed, but requested changes were not first-class, readiness blockers were not translated into next actions, and non-approved KYC reasons were not persisted uniformly.
- **Root Cause:** The first merchant-verification model focused on separating concepts and calculating readiness. It did not yet close the operations loop between readiness findings, admin decision capture, merchant-facing remediation instructions, and route-level persistence semantics.
- **Fix:** Added action metadata to publish-readiness checklist items, including admin destinations and merchant instructions. Hardened the admin page search/metrics/selected-detail behavior, added an explicit verification decision workflow, blocked approval while readiness blockers remain, added `needs_more_info` as a typed KYC review status, required reasons for reject/request-changes, persisted non-approved review reasons, and added a masked bank review action panel.
- **Verification:** `pnpm vitest run tests/admin-merchant-verification.test.ts` passed 1 file / 13 tests. Focused regression suite passed 6 files / 55 tests. `pnpm --filter @haa/admin-dashboard typecheck`, `pnpm --filter @haa/api typecheck`, `pnpm --filter @haa/admin-dashboard build`, and `pnpm check:skills` passed. Browser verification on `http://localhost:5175/compliance` confirmed the decision workflow, merchant instructions, disabled unsafe actions for incomplete local stores, empty no-selected state for no-result filters, and no full IBAN exposure.
- **Prevention:** Keep `tests/admin-merchant-verification.test.ts` guarding actionable checklist metadata, no stale detail panel when filters are empty, `needs_more_info` API validation/persistence, bank review action wiring, full-IBAN non-exposure, and absence of platform-only compliance vocabulary from the merchant verification page.
- **Status:** Fixed locally in TASK-0136. No deploy, migration, secret handling, DB mutation, production action, or live provider call occurred.

---

### ISSUE-0071: Local Admin Login Selected Optional admin_role Before Schema Was Ready

- **ID:** ISSUE-0071
- **Date:** 2026-06-30
- **Severity:** High (local admin access blocker)
- **Area:** Auth Core / Admin API / Local Development Schema Readiness
- **Related Tasks:** TASK-0135
- **Symptoms:** The admin login page returned "استجابة غير متوقعة من الخادم". API logs showed `/admin/login` failing with `column "admin_role" does not exist` while selecting the admin user by email.
- **Expected:** Admin login should continue to work in local/dev environments where optional admin-role migration columns are not applied yet, matching the existing readiness strategy used for TOTP columns. Migrated environments should still use `admin_role` for role-scoped permissions.
- **Actual:** `AdminAuthService.login()` selected `users.admin_role` in the base credential query, so an unapplied local schema failed before password verification or graceful fallback.
- **Root Cause:** The admin-role permission work added `admin_role` to the base user select, but the query was not split into a migration-stable base select plus optional role select.
- **Fix:** Removed `adminRole` from `ADMIN_BASE_USER_SELECT`, added a separate `ADMIN_ROLE_SELECT`, and resolved the role after password/TOTP checks through `getAdminRole()`. Missing `admin_role` column errors are treated as schema readiness and return `null`, preserving the legacy default-admin permission fallback.
- **Verification:** `pnpm vitest run tests/admin-accountant-login.test.ts` passed 1 file / 5 tests. `pnpm --filter @haa/auth-core typecheck` passed. `pnpm --filter @haa/api typecheck` passed. `pnpm --filter @haa/auth-core build` passed. Local POST through `http://localhost:5175/admin/login` returned 200 with token redacted, and the in-app browser opened `http://localhost:5175/compliance`.
- **Prevention:** Keep `tests/admin-accountant-login.test.ts` covering missing `admin_role` during login. Avoid broad `users` selects in auth-sensitive admin paths when newly added columns may not be applied in local/staging schemas yet.
- **Status:** Fixed locally in TASK-0135. No deploy, migration, DB mutation, secret handling, or live provider call occurred. Broader `/admin/users` readiness is still a separate follow-up if local schemas remain behind.

---

### ISSUE-0070: Merchant Verification Drifted From KYC/Bank Contract and Admin Page Concept

- **ID:** ISSUE-0070
- **Date:** 2026-06-30
- **Severity:** High (merchant onboarding, publish readiness, payout safety, and admin review clarity)
- **Area:** Merchant Dashboard / Compliance API / Admin Merchant Verification
- **Related Tasks:** TASK-0134
- **Symptoms:** Merchant compliance readiness stayed incomplete even when data existed or could be saved. The admin `/compliance` page also showed owner/platform operational gates as if they were merchant verification requirements, which made the admin journey look like PCI-style platform readiness instead of store documentation review.
- **Expected:** Merchant KYC fields should save and reload through one canonical API contract while preserving compatibility for existing clients. Bank readiness should use masked bank-account summaries without exposing full IBAN. Admin `/compliance` should help platform staff review each store's merchant verification journey: store/owner data, phone/email, commercial registration or freelance document, bank account, documents, payment, shipping, policies, publish readiness, review decisions, and internal notes.
- **Actual:** The merchant page sent `crNumber`, `nationalId`, and `freelanceDocNumber`, but the API persisted `commercialRegistrationNumber`, `nationalIdOrIqama`, and `freelanceDocumentNumber`. The bank endpoint returned an array of safe summaries with `ibanLast4` and `status`, while the page expected one object with full `iban`. The admin page previously reused Platform Launch Gate requirements in the store-verification route.
- **Root Cause:** Frontend and API contract names diverged over time, and the UI kept legacy assumptions after the API moved to safer masked banking responses. Separately, admin `/compliance` had no merchant-verification model, so platform/owner operational gates were used in the wrong review journey.
- **Fix:** Added merchant compliance model helpers for canonical/legacy KYC fields and safe bank summaries. Added admin `merchantVerification.ts` pure functions for bank status, phone/email verification, registry/freelance document state, risk, payout status, and publish readiness. Rebuilt admin `/compliance` as "توثيق المتاجر" with a merchant verification table and detail panel. Kept Platform Launch Gate logic separated in `platformComplianceGates.ts` and removed it from the merchant verification page.
- **Verification:** Focused TASK-0134 tests passed 5 files / 47 tests (`tests/admin-merchant-verification.test.ts`, `tests/admin-platform-compliance-gates.test.ts`, `tests/admin-permission-reflection.test.ts`, `tests/merchant-compliance-contract.test.ts`, `tests/g1-g10-engineering-prep.test.ts`). `pnpm --filter @haa/admin-dashboard typecheck` passed. `pnpm --filter @haa/admin-dashboard build` passed. `pnpm check:skills` passed 43/43. `git diff --check` was clean. Final `pnpm preflight` passed, including workspace TypeScript.
- **Prevention:** Keep `tests/merchant-compliance-contract.test.ts` guarding canonical KYC names, safe bank readiness, and no full IBAN reliance. Keep `tests/admin-merchant-verification.test.ts` guarding publish readiness, bank masking, phone/email, registry/freelance document state, and absence of platform-only operational gate vocabulary from the merchant verification page. Keep `tests/admin-platform-compliance-gates.test.ts` guarding the separate Platform Launch Gate engine.
- **Status:** Fixed locally in TASK-0134 and locally verified. No deploy, migration, secret handling, or live provider call occurred.

---

### ISSUE-0069: Merchant WhatsApp Campaign Backend Was Hidden Behind QR-only UI

- **ID:** ISSUE-0069
- **Date:** 2026-06-30
- **Severity:** High (merchant growth workflow / campaign operations)
- **Area:** Merchant Dashboard / WhatsApp Campaigns / API Contract / Commerce Core
- **Related Tasks:** TASK-0133
- **Symptoms:** The merchant dashboard WhatsApp page only supported local QR pairing/status. Existing WhatsApp campaign routes and commerce-core service behavior were not exposed to merchants, so merchants could not preview recipients, create/schedule campaigns, start sends, or inspect delivery counters from the dashboard.
- **Expected:** A merchant with the existing promotions permissions should be able to manage WhatsApp campaigns end-to-end from the WhatsApp page, with consent/opt-out expectations visible before creation and API response contracts matching the dashboard client helper.
- **Actual:** Campaign capability existed mostly as backend/API surface. The page was QR-only. `POST /whatsapp-campaigns/:id/send` and `DELETE /whatsapp-campaigns/:id` returned success envelopes without `data`, while the merchant dashboard `request<T>()` helper unwraps `data`. Scheduled campaign creation also persisted `draft`, so scheduled rows would not match the worker's `status = 'scheduled'` selection.
- **Root Cause:** Earlier WhatsApp work focused on pairing, service, consent, delivery, and transport wiring, but did not add the merchant campaign management UI or lock the client/route response contract. The scheduled creation path saved the timestamp but did not mirror it into the status field the worker uses.
- **Fix:** Added typed merchant campaign API helpers, a dedicated React Query key, and a full campaign surface in `WhatsApp.tsx` for preview/create/schedule/send/delete/list with `promotions:read/create/delete` gating. Updated send/delete routes to return `data` payloads and updated `createCampaign()` to persist scheduled rows as `scheduled`.
- **Verification:** `pnpm vitest run tests/whatsapp-campaign-ui-contract.test.ts tests/whatsapp-campaigns-baileys-wire.test.ts tests/whatsapp-delivery.test.ts tests/whatsapp-consent.test.ts` passed 4 files / 21 tests. `pnpm --filter @haa/merchant-dashboard typecheck`, `pnpm --filter @haa/api typecheck`, `pnpm --filter @haa/commerce-core typecheck`, and `pnpm --filter @haa/merchant-dashboard build` passed.
- **Prevention:** Keep `tests/whatsapp-campaign-ui-contract.test.ts` asserting the merchant page consumes the campaign API, gates actions with matching permissions, displays consent/opt-out copy, returns `data` envelopes for send/delete, and persists scheduled campaigns as `scheduled`.
- **Status:** Fixed locally in TASK-0133 and opened as draft PR #344. Remote checks are pending; no deploy, production action, migration, secret, or live provider call occurred.

---

### ISSUE-0068: Admin Payment Settings Save Contract Rejected Page Payload

- **ID:** ISSUE-0068
- **Date:** 2026-06-30
- **Severity:** High (admin payment configuration / operational correctness)
- **Area:** Admin Dashboard / Admin API / Store Payment Settings
- **Related Tasks:** TASK-0131
- **Symptoms:** The Store Payment Settings page appeared to let admins enable/disable payment providers and set status per store, but the API validator did not match the page payload. The page sent `enabled`, `status: 'suspended' | 'not_configured'`, and `supportedPaymentMethod: 'card'`; the validator accepted `isEnabled`, status values `active | inactive | pending_review`, and stripped `supportedPaymentMethod`. Review also caught that validated provider rows can legitimately hold `configured` or `invalid`, and the admin page must not normalize those statuses down to `not_configured` during unrelated saves.
- **Expected:** Admin dashboard save payload, API validator, and persistence route should share the same field names and status vocabulary. New rows should always have the required `supportedPaymentMethod`, existing rows should update `enabled` when the UI toggles it, and status-service values such as `configured`/`invalid` should be preserved unless the admin intentionally changes status.
- **Actual:** `enabled` could be stripped by validation, page status values could be rejected, and new insert attempts could lose `supportedPaymentMethod` before reaching the DB insert path.
- **Root Cause:** The payment-settings route schema drifted from the admin page and the underlying `merchant_payment_provider_settings` defaults. It kept a legacy `isEnabled` field and non-page status vocabulary while the page had moved to `enabled`, `suspended`, and `not_configured`.
- **Fix:** The validator now accepts canonical `enabled`, compatibility `isEnabled`, `mode: test|live`, `status: active|suspended|not_configured|configured|invalid`, and optional `supportedPaymentMethod`. The upsert route derives `enabled` from either key, inserts safe defaults, and conflict-updates only explicitly supplied fields. The admin API client/page now use typed payment-setting contracts, preserve `configured`/`invalid` statuses in the local row state, and the page no longer disables `no-explicit-any`.
- **Verification:** Local verification passed: `pnpm vitest run tests/admin-store-payment-settings-contract.test.ts tests/admin-query-cache-review.test.ts` passed 2 files / 5 tests; `pnpm --filter @haa/api typecheck` passed; `pnpm --filter @haa/admin-dashboard typecheck` passed; `pnpm --filter @haa/admin-dashboard build` passed; `pnpm check:skills` passed 43/43; `git diff --check` was clean; `pnpm ops:monitor` exited 0 with no recommended tasks/incidents; and `pnpm preflight` passed. PR #341 merged into `main` at `719b234d9853182f45d7d65d012c1ae3e2fcd68d`; post-merge `main CI` run `28413299676` passed; rerun `main Deploy` job `84327350186` passed staging deploy and the official smoke gate. Public smoke after deploy returned 200 for admin staging, staging `/health`, and the staging root.
- **Prevention:** Keep `tests/admin-store-payment-settings-contract.test.ts` guarding route schema values, insert defaults, update wiring, API client types, and page-local `any` cleanup. Keep `tests/admin-query-cache-review.test.ts` guarding the saved-provider cache patch path so future fixes do not reintroduce broad refetches that wipe sibling unsaved rows.
- **Status:** Fixed and published to staging in TASK-0131.

---

### ISSUE-0067: Admin Store DELETE Still Hard-deleted During Beta

- **ID:** ISSUE-0067
- **Date:** 2026-06-30
- **Severity:** High (admin destructive action / beta deletion policy)
- **Area:** Admin Dashboard / Admin API / Tenants & Stores
- **Related Tasks:** TASK-0130
- **Symptoms:** The admin dashboard exposed delete buttons for tenant/store rows. Tenant delete already returned `FORBIDDEN_BETA_POLICY`, but store delete still called `db.delete(s.stores)` in `storesRoutes.remove`, invalidated cache, and returned `{ deleted: true }`.
- **Expected:** During beta, direct tenant/store deletion should not be a feature. Admins should use reason-gated suspend/deactivate flows or compliance/support handling until an audited soft-delete/archive workflow exists.
- **Actual:** Tenant delete was beta-blocked at the API but still shown in UI. Store delete was both shown in UI and hard-deleted rows through the API despite DECISION-OS-014 saying no hard delete anywhere.
- **Root Cause:** The earlier DECISION-OS-014 implementation covered tenant delete and merchant self-delete, but did not extend the same guard to the admin store delete handler or remove tenant/store delete affordances from the admin tables. Existing regression coverage located tenant and merchant blocks but did not assert the store handler block.
- **Fix:** `storesRoutes.remove` now returns `FORBIDDEN_BETA_POLICY` before any delete path. Tenant/store delete buttons, delete mutations, and delete confirmation dialogs were removed from `Tenants.tsx` and `Stores.tsx`. Regression tests now assert the store beta block and that tenant/store direct delete is not exposed as an admin UI feature.
- **Verification:** `pnpm vitest run tests/deletion-policy-beta.test.ts tests/admin-dangerous-action-reasons.test.ts tests/admin-dangerous-dialog-accessibility.test.ts` passed 3 files / 13 tests. `pnpm --filter @haa/api typecheck`, `pnpm --filter @haa/admin-dashboard typecheck`, `pnpm --filter @haa/admin-dashboard build`, `pnpm check:skills`, `git diff --check`, `pnpm preflight`, and `pnpm ops:monitor` passed locally. CI/staging verification is tracked under TASK-0130.
- **Prevention:** Keep deletion-policy tests asserting tenant, store, and merchant beta blocks; keep admin dangerous-action tests asserting direct tenant/store delete remains hidden from beta UI.
- **Status:** Fixed locally in TASK-0130. Publication and staging verification are pending.

---

### ISSUE-0066: Staging ENV Workflow Masked Dispatch Secrets Too Late

- **ID:** ISSUE-0066
- **Date:** 2026-06-30
- **Severity:** High (staging secret handling / GitHub Actions logs)
- **Area:** GitHub Actions / Staging Ops / Admin TOTP Runtime
- **Related Tasks:** TASK-0129
- **Symptoms:** While setting `ADMIN_TOTP_ENCRYPTION_KEY` on staging, the old `ops-staging-env.yml` workflow placed workflow-dispatch `inputs.value` in job-level `ENV_VALUE`. GitHub printed the job env block for the "Mask the value in logs" step before the mask command ran, exposing the first generated staging TOTP key in run `28405660775`.
- **Expected:** Secret-like workflow inputs must be masked before any step env block can print them, or generated inside the runner so the value never appears as a workflow-dispatch input.
- **Actual:** The workflow tried to mask the value in the first step, but because the value was already a job-level environment variable, GitHub rendered it before `::add-mask::` took effect.
- **Root Cause:** The workflow treated workflow-dispatch input values as safe to store in job-level env. GitHub logs step env before executing the step body, so a "mask first" step cannot mask a value that is already present in that same step's env block.
- **Fix:** Removed `ENV_VALUE` from job-level env; the mask step now reads the dispatch value from `GITHUB_EVENT_PATH` without exposing it as env. The apply step receives `ENV_VALUE` only after the mask is registered. For `ADMIN_TOTP_ENCRYPTION_KEY`, the workflow supports `__GENERATE_32_BYTE_HEX__`, generating the active key inside the runner and masking it before remote transfer. The SSH fallback now uses `StrictHostKeyChecking=accept-new` instead of `ssh-keyscan` probing when known-host secrets are missing.
- **Verification:** `pnpm vitest run tests/ops-workflow-shell-injection.test.ts` passed 1 file / 4 tests. `pnpm check:skills` passed 43/43. `git diff --check` passed. Final env run `28405802128` showed no raw active key, printed `Generated ADMIN_TOTP_ENCRYPTION_KEY in runner`, updated the key, verified presence, and restarted API healthy.
- **Prevention:** Do not put secret-like workflow-dispatch inputs in job-level env. Mask by reading from the event payload before later step env use, or prefer in-runner generation sentinels for newly generated operational secrets. Delete any run that exposes a superseded secret after rotation.
- **Status:** Fixed in TASK-0129. The exposed staging key was rotated by run `28405802128`, and run `28405660775` was deleted from GitHub.

---

### ISSUE-0065: Admin Finance CSV Export Was Not API-enforced by Export Permission

- **ID:** ISSUE-0065
- **Date:** 2026-06-29
- **Severity:** High (finance data export / RBAC boundary)
- **Area:** Admin Dashboard / Admin API / Finance Reports / Accountant Inbox
- **Related Tasks:** TASK-0128
- **Symptoms:** Finance Reports and Accountant Inbox could be read with `wallet.payout.view_all`, and their CSV buttons generated local files from already-fetched data. The accountant role had `wallet.payout.export`, but the official export action was not enforced by an API route requiring that permission.
- **Expected:** Reading finance reports and exporting official CSV files should be separate permission boundaries: `wallet.payout.view_all` for read pages and `wallet.payout.export` for CSV export routes and UI actions.
- **Actual:** Export was only a frontend button over the read model, so a future role with read-only finance access but no export permission would still see an active export affordance and no server-side export permission check.
- **Root Cause:** The earlier finance-report slice added masked read models and safe CSV generation in the dashboard, but did not convert CSV export into a server route with its own permission guard. Tests asserted the accountant role included `wallet.payout.export`, not that the export path used it.
- **Fix:** Added finance-report and accountant-inbox export endpoints guarded by `wallet.payout.export`, using masked read models and CSV formula-safe cells. Added admin API Blob download helpers and changed Finance Reports / Accountant Inbox buttons to call those guarded routes only when `hasAdminPermission('wallet.payout.export')` is true.
- **Verification:** `pnpm ops:monitor` passed with 0 failures and no recommended tasks/incidents. `pnpm vitest run tests/finance-reports-contract.test.ts tests/admin-accountant-role.test.ts tests/accountant-inbox-route.test.ts tests/accountant-inbox-page.test.ts` passed 4 files / 55 tests. `pnpm --filter @haa/api typecheck` and `pnpm --filter @haa/admin-dashboard build` passed.
- **Prevention:** Keep focused finance export tests asserting `wallet.payout.export` API guards, Blob client usage, and disabled UI export state. Do not add finance CSV exports as client-only transformations of read data.
- **Status:** Fixed locally in TASK-0128. No DB migration, deploy, secrets, production action, or live provider call occurred.

---

### ISSUE-0064: Admin Had Webhook/Idempotency Routes Without an Operational UI

- **ID:** ISSUE-0064
- **Date:** 2026-06-29
- **Severity:** High (admin observability / duplicate-delivery triage)
- **Area:** Admin Dashboard / Webhooks / Idempotency / Operations
- **Related Tasks:** TASK-0127, TASK-0104
- **Symptoms:** `/admin/webhooks`, `/admin/webhooks/dedup-stats`, and `/admin/idempotency-key/stats` existed and were gated by `webhooks.read`, but the admin dashboard had no route, navigation entry, API-client helpers, or page for operators to inspect the data.
- **Expected:** Admin users with `webhooks.read` should have a protected operational page that surfaces webhook delivery events, duplicate rates, provider breakdown, and idempotency-key cache health without leaving the admin dashboard.
- **Actual:** The API routes were available only as raw endpoints. Admin route/sidebar permission reflection covered the server gates, but there was no UI consuming the routes.
- **Root Cause:** TASK-0104 focused on RBAC correctness for previously auth-only operational routes. It did not add dashboard screens for every operational endpoint, so the webhooks/idempotency diagnostics remained backend-only.
- **Fix:** Added typed admin API helpers for webhook events, webhook dedup stats, and idempotency-key stats; added a dedicated `operationalWebhooks` query key; added a protected `/operations/webhooks` page and sidebar item gated by `webhooks.read`; and built the page with tenant/store filters, current-page search, sortable table columns, loading/error/empty states, provider metrics, stats cards, and `TablePager`.
- **Verification:** `pnpm ops:monitor` passed with 0 failures and no recommended tasks/incidents. `pnpm vitest run tests/admin-api-rbac-alignment.test.ts tests/admin-permission-reflection.test.ts` passed 2 files / 12 tests. `pnpm --filter @haa/admin-dashboard build` passed.
- **Prevention:** Keep `tests/admin-api-rbac-alignment.test.ts` and `tests/admin-permission-reflection.test.ts` asserting that admin operational API client/page wiring and route/sidebar permission keys stay aligned with server `requireAdminPermission(...)` gates.
- **Status:** Fixed locally in TASK-0127. No DB migration, deploy, secrets, production action, or live provider call occurred.

---

### ISSUE-0063: Admin Could Not Configure Policy-driven COD Fees

- **ID:** ISSUE-0063
- **Date:** 2026-06-29
- **Severity:** High (financial admin configuration / COD wallet fees)
- **Area:** Admin Dashboard / Admin API / Commerce Core / Wallet Policy
- **Related Tasks:** TASK-0126, TASK-0032
- **Symptoms:** COD fee calculation was policy-driven in the backend, but platform admins could not view or update COD fee policy from Store Billing Settings. The route, API client, and page exposed platform fee fields only.
- **Expected:** Admin Store Billing Settings should expose platform fee and COD fee as separate per-store policies. COD changes should use the existing wallet-core validation/cap rules and be audited with the same required change reason as platform fee changes.
- **Actual:** TASK-0032 added COD schema, wallet-core policy helpers, and collectCOD integration, but explicitly deferred the admin dashboard UI. Later billing settings work continued to read/write only platform fee fields, leaving COD policy configurable only by direct DB state.
- **Root Cause:** The original COD task intentionally scoped backend correctness first and did not add the admin write/read surface. No follow-up test asserted that `billing-settings.ts`, `StoreBillingSettingsService.updateSettings`, `adminApi.updateStoreBillingSettings`, or `StoreBillingSettings.tsx` included COD policy fields.
- **Fix:** Added COD policy response fields (`effectiveCodPolicy`, `effectiveCodPolicyLabel`) to the admin billing settings GET/PATCH responses. PATCH now validates `codFeeMode`, `codFeePct`, `codFeeFixed`, and `isCodFeeEnabled` through `validateCodFeePolicyInput` and `MAX_COD_FEE_PCT`. `StoreBillingSettingsService.updateSettings` writes COD fields and includes COD old/new values in the audit diff. The admin API client and Store Billing Settings page now expose separate platform-fee and COD-fee sections and submit both policies with one required change reason.
- **Verification:** `pnpm ops:monitor` passed with 0 failures and no recommended tasks/incidents. `pnpm vitest run tests/cod-fees.test.ts tests/cod-fees-wiring.test.ts tests/platform-fees-wiring.test.ts` passed 3 files / 76 tests. `pnpm --filter @haa/commerce-core build`, `pnpm --filter @haa/commerce-core typecheck`, `pnpm --filter @haa/api typecheck`, and `pnpm --filter @haa/admin-dashboard build` passed.
- **Prevention:** Keep `tests/cod-fees-wiring.test.ts` asserting COD route/service/client/UI wiring in addition to the existing wallet-core COD behavior tests. Any future fee policy added to `store_billing_settings` must have admin read/write/audit coverage before the task is closed.
- **Status:** Fixed locally in TASK-0126. Merchant wallet COD display remains optional follow-up; no DB migration, deploy, secrets, production action, or live provider call occurred.

---

### ISSUE-0061: Admin Marketplace Pagination Metadata Was Dropped by the Client

- **ID:** ISSUE-0061
- **Date:** 2026-06-29
- **Severity:** High (admin marketplace operations / large catalog review)
- **Area:** Admin Dashboard / Marketplace / API Client / Pagination
- **Related Tasks:** TASK-0124
- **Symptoms:** `/admin/marketplace/products` supported `page`, `limit`, `total`, and `totalPages`, but the admin Marketplace page still behaved like a local-only paginated table. `/admin/marketplace/orders` had a separate hardcoded `.limit(200)` and no pagination metadata. Admins could not reliably navigate full product or unified-order result sets from the UI.
- **Expected:** The admin Marketplace products and unified orders tables should request explicit `page` and `limit`, preserve server pagination metadata, and drive visible pagers from server `total`/`totalPages`.
- **Actual:** `adminApi.getMarketplaceProducts` called the generic `request<T>()` helper, which strips the API envelope to `data`. That discarded top-level pagination metadata. `Marketplace.tsx` then fed only the returned product rows into `useTableControls`, so `TablePager` reflected local row counts rather than the server dataset. Orders were fetched through the read-only auxiliary query as a plain array, and the backend route returned at most 200 rows.
- **Root Cause:** The backend product pagination fix was only verified at route/source level. The admin API client contract was not updated to expose the route's metadata, the UI regression test did not assert that the page used server metadata, and the sibling orders route/table kept the earlier static-list pattern.
- **Fix:** Added `requestResponse<T>()` and `normalizeMarketplacePage()` so Marketplace products and orders can preserve response-envelope metadata while keeping the existing `request<T>()` behavior for ordinary data-only calls. `getMarketplaceProducts` now accepts `{ status, page, limit }`; `getMarketplaceOrders` accepts `{ page, limit }`; both return `data`, `page`, `limit`, `total`, and `totalPages`. `Marketplace.tsx` now keeps independent server page state/query keys for products and orders, displays full fetched server pages, clamps stale pages, and feeds `TablePager` from server metadata.
- **Verification:** `pnpm vitest run tests/marketplace-p1-2-p1-3.test.ts tests/admin-query-cache-review.test.ts` passed 2 files / 24 tests. `pnpm --filter @haa/api typecheck` passed. `pnpm --filter @haa/admin-dashboard build` passed.
- **Prevention:** Keep `tests/marketplace-p1-2-p1-3.test.ts` asserting backend pagination contracts and admin client/page wiring for both products and orders. When an API route returns top-level metadata outside `data`, do not consume it through `request<T>()` unless the metadata is intentionally irrelevant.
- **Status:** Fixed locally in TASK-0124. Product search/sort remain local to the current fetched page; global server-side search/sort is a separate future enhancement.

---

### ISSUE-0062: Admin Auth Lacked Second Factor and Self-serve Recovery

- **ID:** ISSUE-0062
- **Date:** 2026-06-29
- **Severity:** High (platform-admin account takeover / sensitive admin mutations)
- **Area:** Admin Auth / Admin API / Admin Dashboard / DB Schema
- **Related Tasks:** TASK-0125
- **Symptoms:** Platform admins had password-only `/admin/login`, no admin-owned self-serve reset flow, no account-level TOTP enrollment, and no second-factor checkpoint for high-impact admin mutations after a user opted into 2FA.
- **Expected:** Admin auth should remain separate from merchant auth, support recovery without owner intervention, store TOTP secrets encrypted only, require a TOTP code at login for enrolled accounts, and block sensitive mutations unless the admin JWT came from a 2FA-verified login.
- **Actual:** The merchant password-reset OTP flow existed in `AuthFlowService`, but admin auth was intentionally isolated in `AdminAuthService`. Reusing the merchant service would cross the admin/merchant boundary. Sensitive admin mutations were guarded by auth and permissions but not by a second-factor state.
- **Root Cause:** Admin auth had been split into its own service for route hygiene, but the operational hardening backlog item for TOTP enrollment and reset recovery had not been implemented in the admin-owned path. The generic admin API client and login page also had only a single password-submit state.
- **Fix:** Added `packages/auth-core/src/admin-totp.ts` with crypto-strong Base32 secret generation, TOTP verification, and AES-256-GCM encrypted secret envelopes. Added TOTP columns and unapplied migration/snapshot `0090_admin_totp`. Extended `AdminAuthService` with login TOTP challenge, TOTP enrollment/confirm/disable, and admin password reset request/confirm using `EmailOtpService`. Added `requireAdminTwoFactorIfEnabled()` and wired it to sensitive admin mutations including tenant/store mutations, KYC review, payment settings, marketplace moderation, IBAN reveal, payout state changes, settings/upload/plans, billing updates, and landing-contact updates. Before staging publication, login/reset were made migration-compatible by using base-user selects and guarded TOTP readiness checks, so missing TOTP columns do not lock out admins before owner-applied migration; enrollment reports `READINESS_UNAVAILABLE` until migration/config are present. Updated admin login UI for TOTP/reset and added `/security` for account TOTP management.
- **Verification:** `pnpm preflight` passed at branch start. `pnpm --filter @haa/db build`, `pnpm --filter @haa/shared build`, `pnpm --filter @haa/auth-core build`, `pnpm --filter @haa/auth-core typecheck`, `pnpm --filter @haa/api typecheck`, `pnpm --filter @haa/admin-dashboard build`, and `pnpm vitest run tests/admin-auth-hardening.test.ts tests/route-migration-2-admin-auth.test.ts tests/password-reset.test.ts tests/auth-regression.test.ts` passed 4 files / 49 tests.
- **Prevention:** Keep `tests/admin-auth-hardening.test.ts` and `tests/route-migration-2-admin-auth.test.ts` guarding the admin/merchant auth boundary, TOTP crypto requirements, encrypted DB columns, migration snapshot coverage, sensitive route guards, and admin UI wiring. Do not add admin reset or TOTP logic to merchant `AuthFlowService`.
- **Status:** Fixed locally in TASK-0125 and staging-safe for code-only deploy before migration. Full TOTP enrollment/runtime remains owner-only: apply `0090_admin_totp.sql`, set `ADMIN_TOTP_ENCRYPTION_KEY`, and configure email delivery. No `db:migrate`, deploy, secrets, production action, or live provider call occurred.

---

### ISSUE-0060: Post-financial Handoff Worktree Requires Sequenced Integration

- **ID:** ISSUE-0060
- **Date:** 2026-06-29
- **Severity:** High (GitHub readiness / reviewability / admin finance integration)
- **Area:** Git / Admin Dashboard / Admin API / RBAC / Wallet-Core / Documentation
- **Related Tasks:** TASK-0123
- **Symptoms:** After the financial agent completed the accountant-settlement handoff, `pnpm preflight` passed, but the first handoff branch remained behind origin by 8 commits and the working tree contained a large mixed set of prior remediation, admin RBAC, accountant settlement, screenshots, storage logs, migrations, docs, and tests. The financial handoff states the accountant feature depends on uncommitted admin RBAC structure (`UnauthorizedState`, `AdminPermissionRoute`, `hasAdminPermission`, permission reflection), so a standalone financial PR would not compile cleanly.
- **Expected:** GitHub publish should stage a coherent, reviewable scope: admin RBAC base first or together with the accountant settlement feature, followed by the non-financial TASK-0122 dialog work, while excluding screenshots, storage logs, and unrelated storefront/merchant noise.
- **Actual:** Local code health is green, but GitHub readiness is blocked by integration hygiene rather than typecheck: the branch is stale relative to origin and the worktree has multiple interdependent topics.
- **Root Cause:** Cross-agent work overlapped across admin RBAC, admin finance, wallet-core, and non-financial admin dialogs. The previous TASK-0122 pause correctly avoided financial files while the financial agent was active, but after financial completion the remaining unit of work became an integration/staging problem, not a single isolated feature patch.
- **Fix:** TASK-0123 records the handoff, corrects stale preflight-blocked state, defines a sequenced integration plan, moved the applied worktree to `codex/apple-grade-finance-integration` from current `origin/main` after PR #324 was confirmed merged, repaired the integration regressions exposed by full `pnpm test` without broadening into production operations, and addressed both PR #325 SonarCloud annotation waves in the same scoped integration branch.
- **Verification:** Current `pnpm preflight` passed. `git fetch origin` updated `origin/main`; PR #324 was confirmed merged. Worktree transfer to `codex/apple-grade-finance-integration` succeeded with `stash@{0}` and `/tmp` patch/tar backups preserving the pre-move state. Targeted integration verification passed 27 files / 214 tests. Full `pnpm test` passed 400 files / 4940 tests. Shared build, wallet-core/API/admin typechecks, admin build, lint, `pnpm check:skills`, diff checks, and `pnpm ops:monitor` passed. The first SonarCloud follow-up additionally passed targeted ESLint, affected typechecks/builds, focused Sonar regression tests 11 files / 88 tests, finance/wallet/settlement suite 42 files / 376 tests with 1 todo, full `pnpm test` 400 files / 4940 tests, `pnpm preflight`, `pnpm check:skills`, `pnpm ops:monitor`, and `git diff --check`. The second SonarCloud cleanup against check run `83968206453` passed targeted ESLint on all annotation files, API/shared/admin/merchant/storefront typechecks, shared/admin/merchant/storefront builds, focused regression suite 24 files / 215 tests with 1 skipped, full `pnpm test` 400 files / 4940 tests, `pnpm preflight`, `pnpm check:skills`, `pnpm ops:monitor`, `git diff --check`, and repo-wide `pnpm lint` exit 0 with the same 331 legacy warnings. After commit `f2e03a51` was pushed, PR #325 project-owned GitHub checks passed: Required Merge Gate, Preflight, Lint, Typecheck, Test, E2E Tests, API/admin/merchant/storefront builds, Secret Scan (G4), Secrets Scan, Dependency Audit, License Check, Outdated Dependencies, and SonarCloud Code Analysis.
- **Prevention:** Use `git add -p`/path-specific staging only after the integration plan is applied. Do not stage screenshots, `storage/*.ndjson`, or unrelated app changes. Run targeted RBAC/accountant/dialog tests and final `pnpm preflight` before any push.
- **Status:** Locally verified in TASK-0123; draft PR #325 project-owned checks are green. Remaining red checks are external/account-state tooling blockers: TestSprite Pre-Check `No tests detected`, and Snyk private-test limit. No `db:migrate`, deploy, secrets, live provider calls, or production action occurred.

---

### ISSUE-0059: Non-financial Admin Dangerous-action Dialogs Lacked Shared Accessibility Semantics

- **ID:** ISSUE-0059
- **Date:** 2026-06-29
- **Severity:** Medium (admin accessibility / high-impact non-financial operations)
- **Area:** Admin Dashboard / Marketplace, Stores, Tenants / Accessibility
- **Related Tasks:** TASK-0122
- **Symptoms:** Earlier remediation closed the functional confirmation/reason gates for tenant/store status and marketplace moderation, but the dialog wrappers remained page-local fixed overlays without a shared accessibility contract.
- **Expected:** High-impact non-financial admin dialogs should expose dialog semantics (`role="dialog"`, `aria-modal`, title linkage, description linkage) and predictable close/scroll behavior while preserving the existing reason/confirmation/API contracts.
- **Actual:** Dialog content existed visually, but the overlay wrappers were repeated in page files and did not consistently provide `aria-labelledby`, `aria-describedby`, Escape close, overlay close, or scroll locking.
- **Root Cause:** Dangerous-action dialogs grew incrementally inside admin pages before a local admin dialog wrapper existed. The prior fixes focused on business safety gates first, leaving accessibility semantics duplicated and uneven.
- **Fix:** Added `AdminDialog` as a local admin-dashboard wrapper and migrated scoped non-financial dangerous-action dialogs in marketplace reject/suspend, store status/delete, and tenant status/delete. Reason textareas now expose accessible names. Added `tests/admin-dangerous-dialog-accessibility.test.ts` and extended existing admin reason source guards. A finance-inclusive draft was saved to `/tmp/haa-task-0122-full-before-finance-split.patch` but is intentionally not active because another agent owns the financial Batch 4 stream.
- **Verification:** After finance split, `pnpm vitest run tests/admin-dangerous-dialog-accessibility.test.ts tests/admin-dangerous-action-reasons.test.ts tests/manual-settlement-dashboard-ux.test.ts` passed 3 files / 11 tests. Admin-dashboard typecheck/build passed. Mocked local Playwright QA verified marketplace desktop and stores mobile dialogs. Final post-split verification is tracked in TASK-0122 compliance.
- **Prevention:** Keep `tests/admin-dangerous-dialog-accessibility.test.ts` asserting the shared wrapper and affected page usage. Future high-impact admin dialogs should use `AdminDialog` instead of page-local fixed overlays.
- **Coordination:** The owner provided another agent's financial Batch 4 conversation. This task excludes bank accounts, settlement/manual payout pages, accountant inbox/detail pages, admin-dashboard financial API-client actions, wallet-core, upload/PDF allowlist, admin finance API routes, IBAN reveal, payout tests, wallet tests, settlement tests, and accountant tests.
- **Status:** Fixed locally for scoped non-financial admin dialog accessibility in TASK-0122. The earlier external financial preflight blocker has cleared in the post-financial handoff takeover run; remaining GitHub readiness is tracked separately by ISSUE-0060/TASK-0123. Full admin WCAG audit, finance-dialog migration, and non-danger CRUD modal migration remain outside TASK-0122.

---

### ISSUE-0058: Admin IBAN Reveal Route Used Untyped Audit Actions

- **ID:** ISSUE-0058
- **Date:** 2026-06-29
- **Severity:** Medium (preflight / sensitive admin finance route)
- **Area:** API / Admin Settlements / IBAN Reveal / Audit Typing
- **Related Tasks:** TASK-0121
- **Symptoms:** Starting the next larger remediation batch failed immediately at `pnpm preflight`. API typecheck reported that `bank_account.iban_copied_for_payout | bank_account.iban_revealed_for_payout` was not assignable to `AuditAction`, and that `merchant.bank_accounts.reveal_iban_for_payout` was not assignable to `AdminPermission`.
- **Expected:** Sensitive full-IBAN reveal/copy events must be typed audit actions with labels, and the dedicated reveal permission must be part of the shared admin permission type/catalog consumed by API typecheck.
- **Actual:** The route used new audit action literals before the shared `AuditAction` union and `AUDIT_ACTION_LABELS` were extended. The permission existed in `src`, but local `@haa/shared/dist` artifacts were stale, so API typecheck consumed an older `AdminPermission` declaration.
- **Root Cause:** Cross-package type vocabulary and local package build output drifted apart during the IBAN reveal work. The route was added before the shared package audit vocabulary and generated dist artifacts were synchronized.
- **Fix:** Added `bank_account.iban_revealed_for_payout` and `bank_account.iban_copied_for_payout` to the shared `AuditAction` union, added Arabic labels, rebuilt `@haa/shared` locally, and added `tests/admin-iban-reveal-typing.test.ts` to guard permission typing, audit labels, route use, and audit-payload IBAN minimization.
- **Verification:** `pnpm --filter @haa/shared build` passed. `pnpm vitest run tests/admin-iban-reveal-typing.test.ts` passed 1 file / 3 tests. `pnpm --filter @haa/api typecheck` passed.
- **Prevention:** Keep `tests/admin-iban-reveal-typing.test.ts` and rebuild workspace packages after shared type changes before running API typecheck/preflight. New admin financial audit action literals must be added to both `AuditAction` and `AUDIT_ACTION_LABELS`.
- **Status:** Fixed locally in TASK-0121. No IBAN reveal business logic, UI, DB, deploy, secrets, production, or live provider behavior changed.

---

### ISSUE-0057: Merchant Theme Editor Controls Lacked Complete ARIA Contracts

- **ID:** ISSUE-0057
- **Date:** 2026-06-29
- **Severity:** Low (merchant accessibility polish)
- **Area:** Merchant Dashboard / Theme Editor / ARIA
- **Related Tasks:** TASK-0120
- **Symptoms:** The Apple-grade remediation matrix still carried theme-editor/admin/full WCAG accessibility follow-up after storefront and product-form ARIA batches. Source inspection found theme-editor controls with incomplete semantics: preview device buttons used English labels and no selected state, desktop zoom buttons had no pressed state, section rows exposed `role="button"` without disclosure linkage or Enter/Space activation, icon-only section/image/brand controls relied on title or visible X/icons, and choice chips changed visual state without `aria-pressed`.
- **Expected:** Theme-editor controls should expose Arabic accessible names, selected/expanded state where applicable, and keyboard activation for custom role-based controls without nested-button key-event leakage.
- **Actual:** Several local raw buttons/chips/labels worked visually but did not have stable accessible-name/state contracts, and the section row keyboard handler did not explicitly support Enter/Space before this task.
- **Root Cause:** Theme-editor UI controls were implemented directly in page/editor files instead of through shared named icon-button, pressed-chip, and disclosure primitives, so accessibility contracts were uneven across preview, section management, image removal, and choice selection controls.
- **Fix:** Added Arabic labels and `aria-pressed` to preview device/zoom controls, made preview icons decorative and target sizes stable, added `aria-expanded`/`aria-controls` plus Enter/Space handling to homepage section controls, added nested-key guards for section rows, named section/image/brand remove actions, moved touched absolute remove buttons to logical `end-0.5`, and added `aria-pressed` to theme-editor link/source/category chips. Added `tests/merchant-theme-editor-aria-controls.test.ts`.
- **Verification:** `pnpm vitest run tests/merchant-theme-editor-aria-controls.test.ts` passed 1 file / 4 tests. `pnpm --filter @haa/merchant-dashboard typecheck` and `pnpm --filter @haa/merchant-dashboard build` passed.
- **Prevention:** Keep `tests/merchant-theme-editor-aria-controls.test.ts` asserting theme-editor preview, disclosure, action-button, removal-button, and pressed-chip ARIA contracts. Future theme-editor icon-only or stateful controls should use explicit Arabic `aria-label`s and expose `aria-pressed`/`aria-expanded` as appropriate.
- **Status:** Fixed locally for scoped merchant theme-editor controls in TASK-0120. Admin-dashboard and full WCAG/browser audits remain separate follow-ups.

---

### ISSUE-0056: Merchant Product Form Controls Lacked Complete ARIA Contracts

- **ID:** ISSUE-0056
- **Date:** 2026-06-29
- **Severity:** Low (merchant accessibility polish)
- **Area:** Merchant Dashboard / Products / Product Form
- **Related Tasks:** TASK-0119
- **Symptoms:** The Apple-grade remediation matrix still carried broader ARIA polish after storefront-focused work. Source inspection found product-form media/options controls whose semantics were incomplete: a clickable upload `div`, icon-only image/variant remove buttons, and selectable tag/category chips without pressed state.
- **Expected:** Product media and selection controls should be keyboard-addressable where interactive, have explicit accessible names, and expose selected state where they act as toggles.
- **Actual:** Upload used a clickable non-button container; queued/saved image and variant option removal relied on icon/X affordances; tag/category chips changed visual style but did not expose `aria-pressed`.
- **Root Cause:** Product-form controls were implemented locally with raw buttons/chips instead of a shared named icon-button/pressed-chip primitive, so accessible-name/state contracts were uneven.
- **Fix:** Converted the upload affordance to a named `type="button"` that still opens the hidden file input, added Arabic accessible names/titles to queued/saved image and variant option remove controls, and added `aria-pressed` plus action-oriented labels to tag/category chips. Added `tests/merchant-product-form-aria-controls.test.ts`.
- **Verification:** `pnpm vitest run tests/merchant-product-form-aria-controls.test.ts` passed 1 file / 4 tests. `pnpm --filter @haa/merchant-dashboard typecheck` and `pnpm --filter @haa/merchant-dashboard build` passed.
- **Prevention:** Keep `tests/merchant-product-form-aria-controls.test.ts` asserting product form upload/remove/selection ARIA contracts. Future icon-only product-form controls should use explicit Arabic `aria-label`s and expose toggle state with `aria-pressed`.
- **Status:** Fixed locally for scoped merchant product-form controls in TASK-0119. Theme editor, admin-dashboard, and full WCAG/browser audits remain separate follow-ups.

---

### ISSUE-0055: Storefront Buyer Controls Lacked ARIA State Contracts

- **ID:** ISSUE-0055
- **Date:** 2026-06-29
- **Severity:** Low (accessibility polish)
- **Area:** Storefront / Buyer Controls / ARIA
- **Related Tasks:** TASK-0118
- **Symptoms:** The Apple-grade remediation matrix still carried broader ARIA polish after phone-field RTL and Fake 3DS badge work. Source inspection found several buyer-facing raw controls whose state/name semantics were not locked: carousel dots, FAQ disclosures, product option selections, and spinner-only loading add-to-cart controls.
- **Expected:** Visual-only or stateful controls should preserve accessible names and expose selected/expanded/current/loading state where applicable.
- **Actual:** Homepage carousel dot buttons had no accessible name/current state; homepage FAQ buttons did not expose disclosure state; product option buttons did not expose selected state; and the luxury product-card add-to-cart loading state could render only a spinner without an explicit accessible name.
- **Root Cause:** These controls were implemented locally in theme/page files instead of through the stricter `StoreIconButton` API, so ARIA contracts varied by component and lacked a focused regression guard.
- **Fix:** Added accessible names/current state/hit target treatment to carousel dots, `aria-expanded`/`aria-controls` for FAQ disclosure buttons, `aria-pressed` plus option/value names for base-elegant and luxury product option buttons, and `aria-label`/`aria-busy` with hidden spinner decoration for the luxury product-card add-to-cart loading state. Added `tests/storefront-aria-controls.test.ts`.
- **Verification:** `pnpm vitest run tests/storefront-aria-controls.test.ts` passed 1 file / 5 tests. `pnpm --filter @haa/storefront typecheck` and `pnpm --filter @haa/storefront build` passed; build kept the pre-existing `MarketplaceProductCard` Rollup warning. Browser QA loaded demo home/product pages with local servers, confirmed no framework overlay, confirmed luxury `aria-busy` controls, and Playwright keyboard fallback reached 10/10 focused interactive elements.
- **Prevention:** Keep `tests/storefront-aria-controls.test.ts` asserting source-level ARIA contracts for these controls, and use `StoreIconButton` or explicit ARIA attributes for future icon-only/stateful raw buttons.
- **Status:** Fixed locally for scoped storefront buyer controls in TASK-0118. Admin-dashboard, merchant-dashboard, and full WCAG/browser audits remain separate follow-ups.

---

### ISSUE-0054: Fake 3DS Challenge Lacked a Stable DEV Badge Contract

- **ID:** ISSUE-0054
- **Date:** 2026-06-29
- **Severity:** Low (dev/test payment UX clarity)
- **Area:** Storefront / Fake 3DS / Payment Test UX
- **Related Tasks:** TASK-0117
- **Symptoms:** The Apple-grade remediation matrix carried a P3 item for a DEV badge on the Fake3DS page. The page had `DEV ONLY` text, but no stable visible badge/test contract.
- **Expected:** The fake challenge page should clearly tell developers/testers this is a local simulation and not a real bank/payment challenge, while preserving the DEV-only route guard.
- **Actual:** The header text was easy to restyle away and no regression test locked it.
- **Root Cause:** Fake payment test UX depended on prose inside the header instead of a stable badge element and source-regression guard.
- **Fix:** Added a visible amber `DEV TEST` badge with `data-testid="fake-3ds-dev-badge"`, `role="status"`, and Arabic copy stating it is a local simulation only. Added `tests/fake-3ds-dev-badge.test.ts` to lock the badge and DEV route guard.
- **Verification:** `pnpm vitest run tests/fake-3ds-dev-badge.test.ts tests/3ds-storefront-flow.test.ts` passed 2 files / 13 tests. `pnpm --filter @haa/storefront typecheck` and `pnpm --filter @haa/storefront build` passed.
- **Prevention:** Keep `tests/fake-3ds-dev-badge.test.ts` asserting the badge text, stable test id, and `import.meta.env.DEV` route guard.
- **Status:** Fixed locally in TASK-0117. Real provider 3DS flows were not changed.

---

### ISSUE-0053: Storefront Buyer Phone Inputs Needed RTL-safe Tel Semantics

- **ID:** ISSUE-0053
- **Date:** 2026-06-29
- **Severity:** Low (RTL/mobile polish)
- **Area:** Storefront / Buyer Phone Inputs
- **Related Tasks:** TASK-0116
- **Symptoms:** The Apple-grade diagnostic flagged phone-field RTL review. Several phone inputs were visually LTR but did not consistently declare telephone input semantics, while the support ticket phone input used `type="tel"` without explicit LTR direction.
- **Expected:** Buyer phone fields in checkout/tracking/support flows should remain LTR under the Arabic shell and request the mobile telephone keyboard/autofill path.
- **Actual:** Attribute coverage varied across checkout, marketplace checkout, tracking/recovery, and support fields.
- **Root Cause:** Phone field attributes were added page by page rather than guarded by a shared source-regression contract.
- **Fix:** Added `type="tel"`, `inputMode="tel"`, `autoComplete="tel"` where appropriate, and explicit `dir="ltr"` / `text-start` on scoped storefront buyer phone inputs. Added `tests/storefront-phone-input-rtl.test.ts`.
- **Verification:** `pnpm vitest run tests/storefront-phone-input-rtl.test.ts tests/storefront-order-confirmation-recovery.test.ts` passed 2 files / 9 tests. `pnpm --filter @haa/storefront typecheck` and `pnpm --filter @haa/storefront build` passed.
- **Prevention:** Keep `tests/storefront-phone-input-rtl.test.ts` asserting telephone semantics and LTR direction on scoped buyer phone inputs.
- **Status:** Fixed locally for checkout/tracking/support/marketplace buyer phone inputs in TASK-0116. Merchant/admin/auth/landing phone fields remain outside this scoped P3 closure.

---

### ISSUE-0052: Subscription Plan-change Dialog Lacked Financial Impact Detail

- **ID:** ISSUE-0052
- **Date:** 2026-06-29
- **Severity:** Medium (merchant billing decision clarity)
- **Area:** Merchant Dashboard / Subscriptions / Billing UX
- **Related Tasks:** TASK-0115
- **Symptoms:** The Apple-grade diagnostic scored Subscriptions 3/5 because merchants had confirmation before changing plans but no clear price delta, proration, or effective-date explanation.
- **Expected:** Before confirming a plan change, the merchant should see current price, new price, price delta, estimated prorated charge, effective timing, and the relevant next/current period date.
- **Actual:** The confirmation dialog showed current/new plan, cycle, new price, and direction only.
- **Root Cause:** The UI fix for one-click billing safety added a confirmation modal, but did not surface the existing backend proration behavior or period timing in merchant-facing terms.
- **Fix:** Added display-only `getPlanChangeImpact()` helpers to compute current/new cycle prices, price delta, remaining days, estimated proration for upgrades, immediate effective timing, and next/current period date. Extended the confirmation dialog with an Arabic financial impact section and a note that final invoice calculation is server-owned after confirmation.
- **Verification:** `pnpm vitest run tests/subscriptions-confirm-modal.test.tsx tests/subscription-proration-days-contract.test.ts` passed 2 files / 13 tests. `pnpm --filter @haa/merchant-dashboard typecheck` and `pnpm --filter @haa/merchant-dashboard build` passed.
- **Prevention:** Keep `tests/subscriptions-confirm-modal.test.tsx` asserting the impact helper, current price, price delta, proration estimate, remaining days, effective timing, next/current period date, and final-invoice note.
- **Status:** Fixed locally for merchant-facing subscription decision clarity in TASK-0115. Backend invoice/proration logic was not changed.

---

### ISSUE-0051: Checkout Stock Depletion Surfaced as Generic Failure

- **ID:** ISSUE-0051
- **Date:** 2026-06-29
- **Severity:** Medium (checkout conversion / inventory clarity)
- **Area:** Storefront / Checkout / Inventory
- **Related Tasks:** TASK-0114
- **Symptoms:** The Apple-grade diagnostic flagged inventory revalidation between cart and payment. Current code showed the backend did lock/decrement stock before payment creation, but a stock race still surfaced to buyers as a generic checkout failure.
- **Expected:** If stock is depleted after the item entered the cart, checkout should return a typed client error and the buyer should be directed back to the cart to update quantities or remove unavailable items.
- **Actual:** `CheckoutService` threw `Insufficient stock for product`, but the storefront checkout-session route only classified messages containing "not found", "required", or "invalid" as 400. The stock error could become a generic 500 `CHECKOUT_ERROR`, and the checkout UI had no stock-specific recovery surface.
- **Root Cause:** Backend inventory locking existed, but the route error classifier and storefront recovery state did not recognize the stock-depletion error.
- **Fix:** Added `INSUFFICIENT_STOCK` to shared user-friendly messages; mapped `Insufficient stock for product` to `new AppError(400, 'INSUFFICIENT_STOCK', ...)` in the storefront checkout-session route; added `stock_unavailable` recovery handling in storefront checkout with buyer copy and a return-to-cart action.
- **Verification:** `pnpm vitest run tests/storefront-checkout-stock-recovery.test.ts tests/checkout-shipping-race.test.ts tests/storefront-cart-shipping-estimate.test.ts` passed 3 files / 10 tests. `pnpm --filter @haa/api typecheck`, `pnpm --filter @haa/storefront typecheck`, `pnpm --filter @haa/shared typecheck`, `pnpm --filter @haa/shared build`, `pnpm --filter @haa/api build`, and `pnpm --filter @haa/storefront build` passed.
- **Prevention:** Keep `tests/storefront-checkout-stock-recovery.test.ts` asserting stock lock before payment creation, typed API mapping, shared message registration, and storefront return-to-cart recovery.
- **Status:** Fixed locally for typed checkout stock-depletion recovery in TASK-0114. A future reservation/hold-stock system remains a separate product decision.

---

### ISSUE-0050: Cart Had No Pre-checkout Shipping Estimate

- **ID:** ISSUE-0050
- **Date:** 2026-06-29
- **Severity:** Medium (checkout confidence / cart UX)
- **Area:** Storefront / Cart / Shipping Estimate
- **Related Tasks:** TASK-0113
- **Symptoms:** The Apple-grade diagnostic flagged shipping estimate before checkout as missing. Cart showed free-shipping progress and said shipping would be calculated during checkout, but gave no way to preview available shipping options.
- **Expected:** Buyers should be able to enter a city and see estimated shipping methods/prices before moving to checkout, while still understanding final shipping is confirmed during checkout.
- **Actual:** The cart had no city input or estimate action despite an existing storefront shipping-rates endpoint.
- **Root Cause:** Shipping-rate lookup existed for checkout, but cart summary only presented a static free-shipping threshold and deferred all shipping discovery to checkout.
- **Fix:** Added a cart shipping estimate section that collects city, calls `checkoutApi.getShippingRates(slug, cart.id, city)`, displays method/ETA/price/free-above details, handles empty/error states, and keeps a final-price caveat visible.
- **Verification:** `pnpm vitest run tests/storefront-cart-shipping-estimate.test.ts tests/checkout-shipping-race.test.ts` passed 2 files / 6 tests. `pnpm --filter @haa/storefront typecheck` and `pnpm --filter @haa/storefront build` passed.
- **Prevention:** Keep `tests/storefront-cart-shipping-estimate.test.ts` asserting shipping endpoint wiring, city input, rate display, empty/error states, and final-price caveat copy.
- **Status:** Fixed locally for cart-level estimate in TASK-0113. Checkout remains the final source of truth for selected shipping method and final cost.

---

### ISSUE-0049: Coupon Catch-path Errors Were Too Generic

- **ID:** ISSUE-0049
- **Date:** 2026-06-29
- **Severity:** Medium (checkout conversion / buyer clarity)
- **Area:** Storefront / Cart / Coupons
- **Related Tasks:** TASK-0112
- **Symptoms:** The Apple-grade diagnostic flagged coupon errors as lacking explanation. The backend returns Arabic reasons for invalid/inactive/expired/usage/minimum-order cases, but cart catch-path failures still collapsed to a generic error and the UI rendered only a terse red line.
- **Expected:** Coupon failures should preserve the most specific available reason and present it as a durable, actionable error near the coupon field.
- **Actual:** Normal `{ valid: false, reason }` responses were preserved, but thrown API/client errors used `t('common.error')`. The visible UI had no extra guidance for common failure causes.
- **Root Cause:** The cart page treated coupon validation catch paths like generic network errors and did not inspect `Error.message` from the API client.
- **Fix:** Added `getCouponErrorMessage()` to preserve `Error.message` when present; changed the catch path to clear coupon data and set that message with an Arabic fallback; rendered coupon errors as a `role="alert"` block with guidance to verify the code, minimum order, or expiry.
- **Verification:** `pnpm vitest run tests/storefront-coupon-error-reasons.test.ts tests/storefront-validation-money.test.ts` passed 2 files / 9 tests. `pnpm --filter @haa/storefront typecheck` and `pnpm --filter @haa/storefront build` passed.
- **Prevention:** Keep `tests/storefront-coupon-error-reasons.test.ts` asserting backend reason pass-through, catch-path API message preservation, and persistent alert rendering.
- **Status:** Fixed locally for actionable storefront coupon errors in TASK-0112. Coupon business rules and discount math were not changed.

---

### ISSUE-0048: Order Confirmation Cache Miss Had No Support Recovery Path

- **ID:** ISSUE-0048
- **Date:** 2026-06-29
- **Severity:** Medium (buyer confirmation / guest tracking UX)
- **Area:** Storefront / Order Success / Order Tracking
- **Related Tasks:** TASK-0111
- **Symptoms:** The Apple-grade diagnostic flagged the order success/track flow as a 3.5/5 because losing the cached phone token dropped the buyer into a phone gate with no "resend confirmation" or support recovery path.
- **Expected:** When the confirmation page cannot load the order automatically, the buyer should still see a clear next action to recover the confirmation through support, and tracking forms should share one phone-token storage contract.
- **Actual:** `OrderSuccess` asked for the phone again and linked only back to the store. `TrackOrder` wrote `track_phone_${slug}_${orderNumber}` directly while the shared helper used `track_phone_${orderNumber}`.
- **Root Cause:** Guest order tracking storage had grown in two places: a shared helper used by checkout/confirmation, and a page-local slug-scoped key in manual tracking. The missing-order confirmation state also treated phone entry as the only recovery path.
- **Fix:** Added an Arabic support fallback card to `OrderSuccess` when the order is not loaded, displaying the order number and linking to the store support page for confirmation/resend help. Updated `TrackOrder` to call `saveTrackPhone(normalizedOrderNumber, normalizedPhone)` from `order-track-storage`.
- **Verification:** `pnpm vitest run tests/storefront-order-confirmation-recovery.test.ts tests/storefront-return-request-intake.test.ts` passed 2 files / 6 tests. `pnpm --filter @haa/storefront typecheck` and `pnpm --filter @haa/storefront build` passed.
- **Prevention:** Keep `tests/storefront-order-confirmation-recovery.test.ts` asserting support fallback copy/link, order-number visibility, shared `saveTrackPhone()` usage, and canonical order-number key behavior.
- **Status:** Fixed locally for support fallback and storage-key unification in TASK-0111. Real resend email/SMS automation remains a separate integration follow-up.

---

### ISSUE-0047: Buyer Privacy Rights Had No Explicit Storefront Intake

- **ID:** ISSUE-0047
- **Date:** 2026-06-29
- **Severity:** High (privacy rights / buyer trust)
- **Area:** Storefront / Support / Privacy Requests
- **Related Tasks:** TASK-0110
- **Symptoms:** The Apple-grade remediation matrix carried MS8 as a P1 data export/delete privacy flow gap. PDPL/privacy artifacts existed elsewhere, but the storefront buyer had no explicit action to request a personal-data copy or deletion from the support surface.
- **Expected:** Buyers should have a visible support-page path for data-export and deletion requests, with enough structured context for support triage and clear copy that identity verification and legally required retention may apply.
- **Actual:** Buyers could only open a generic support ticket and manually describe a privacy request. That made privacy-right discovery and triage dependent on user wording.
- **Root Cause:** Privacy/compliance documentation and some platform-side artifacts existed, but the customer-facing storefront support page did not expose privacy-right request templates or actions.
- **Fix:** Added explicit privacy request actions to `apps/storefront/src/pages/Support.tsx`; each action prefills a structured Arabic subject/message for data export or deletion, including verification fields and expectation-setting copy. The form still submits through the existing support-ticket API and keeps support access tokens out of URLs.
- **Verification:** `pnpm vitest run tests/storefront-privacy-request-intake.test.ts tests/support-token-regression.test.ts` passed 2 files / 6 tests. `pnpm --filter @haa/storefront typecheck` and `pnpm --filter @haa/storefront build` passed.
- **Prevention:** Keep `tests/storefront-privacy-request-intake.test.ts` asserting explicit privacy actions, structured templates, identity-verification/retention copy, existing support-ticket creation, local token persistence, and token-free follow-up links.
- **Status:** Fixed locally for buyer-facing privacy request intake in TASK-0110. Automated export/deletion fulfillment, retention workflows, and legal owner review remain separate launch-readiness follow-ups.

---

### ISSUE-0046: Pre-launch Smoke Lacked Local Provider Safety Gates

- **ID:** ISSUE-0046
- **Date:** 2026-06-29
- **Severity:** High (provider smoke / launch readiness)
- **Area:** Tests / Pre-launch Smoke / Payment and Shipping Providers
- **Related Tasks:** TASK-0109
- **Symptoms:** The Apple-grade remediation matrix kept critical E2E/provider smoke open. `pnpm smoke` is DB-backed and currently blocked by local migration drift, while `pnpm test:smoke` did not explicitly guard fake-payment/manual-shipping provider safety contracts.
- **Expected:** A no-network pre-launch smoke should still prove that local fake payment scenarios exist, live provider modes are blocked, demo checkout cannot hit live payment APIs, manual/haa_mock shipping remains local-safe, and provider-status readiness remains mounted.
- **Actual:** Provider behavior was covered by scattered focused tests, but the launch smoke gate did not include a consolidated provider safety section.
- **Root Cause:** Smoke coverage grew around auth, marketplace, compliance, security, SEO, accessibility, and DR. Payment/shipping provider smoke remained in adjacent tests and local runtime checks rather than the single pre-launch smoke command.
- **Fix:** Added a "Payment + Shipping providers" section to `tests/pre-launch-smoke.test.ts` covering FakePaymentProvider scenarios, payment live blocking, demo checkout fake-provider forcing, shipping live blocking, manual/haa_mock `mock_ready`, and provider-status route mounting.
- **Verification:** `pnpm test:smoke` passed 1 file / 34 tests. `pnpm vitest run tests/pre-launch-smoke.test.ts tests/payment-test-environment.test.ts tests/shipping-readiness.test.ts tests/provider-status-regression.test.ts` passed 4 files / 58 tests.
- **Prevention:** Keep provider safety assertions in `tests/pre-launch-smoke.test.ts` and adjacent provider regression tests. Do not treat this as full E2E; DB-backed `pnpm smoke` and Playwright critical journeys remain separate gates.
- **Status:** Fixed locally for no-network provider smoke in TASK-0109. Full DB-backed smoke remains blocked by ISSUE-0027 until owner-approved local migration/rebuild.

---

### ISSUE-0045: Monitoring Had Recommendations but No Local Alert Sink

- **ID:** ISSUE-0045
- **Date:** 2026-06-29
- **Severity:** High (observability / launch readiness)
- **Area:** Ops Scripts / Monitoring / Alerting
- **Related Tasks:** TASK-0108
- **Symptoms:** The Apple-grade remediation matrix kept real monitoring/alerting open. Current code had NDJSON events, `ops:errors`, and a generated monitoring report, but no structured local alert artifact for incident/task/RCA triggers.
- **Expected:** When local monitoring sees an active P0, repeated P1, or repeated fingerprint in the active action window, it should persist a structured alert candidate that future agents/operators can inspect, dedupe, and route to INCIDENTS/TASK_TRACKER/ISSUE_KNOWLEDGE_BASE.
- **Actual:** `ops:errors` printed recommendations to stdout only. `ops:monitor` ended after health, synthetic, and error analysis. External alert delivery also remained owner-gated because it needs accounts/secrets.
- **Root Cause:** Event classification existed in `scripts/ops-events.mjs`, but there was no alert-emission layer consuming that classification. The system therefore had analysis without a durable alert handoff artifact.
- **Fix:** Added `buildOpsAlerts()` to the shared ops-event classifier; added `scripts/emit-monitoring-alerts.mjs` to write new local alerts to `storage/monitoring-alerts.ndjson` with stable `dedupeKey` values; wired `pnpm ops:alerts`; and extended `pnpm ops:monitor` to run alerts after error analysis.
- **Verification:** `pnpm vitest run tests/ops-monitoring-alerts.test.ts tests/ops-errors-analyzer.test.ts` passed 2 files / 12 tests. `pnpm ops:alerts` emitted 0 alert candidates on current local P2-only state. `pnpm ops:monitor` exited 0 and now includes the alert-emission step.
- **Prevention:** Keep `tests/ops-monitoring-alerts.test.ts` asserting P0 incident alerts, repeated P1 task alerts, repeated-fingerprint RCA alerts, quiet no-alert behavior, dedupe behavior, and package script wiring.
- **Status:** Fixed locally for local alert emission in TASK-0108. External alert delivery remains owner/environment-gated.

---

### ISSUE-0044: Order Tracking Had Return/Refund Statuses but No Buyer Intake

- **ID:** ISSUE-0044
- **Date:** 2026-06-29
- **Severity:** High (buyer after-sales / support trust)
- **Area:** Storefront / Order Tracking / Support Tickets
- **Related Tasks:** TASK-0107
- **Symptoms:** The Apple-grade diagnostic flagged returns/refunds as a 1/5 flow. Current storefront order tracking could display `returned`, `refunded`, and `partially_refunded` states, but a buyer viewing a fulfilled order had no clear way to start a return/refund request.
- **Expected:** A buyer with a delivered, picked-up, or completed order should have an obvious, durable action to submit a return/refund request and follow it up without leaking an access token in the URL.
- **Actual:** The page showed tracking details and status history only. Buyers had to infer that they should contact support manually.
- **Root Cause:** The product had status vocabulary for returns/refunds and an existing support-ticket system, but no order-tracking bridge from a fulfilled order to a structured after-sales request. A full RMA system would require schema and merchant operations design, so the no-migration intake path had not been connected.
- **Fix:** Added a return/refund request card to `TrackOrderResult.tsx` for `delivered`, `picked_up`, and `completed` orders; created structured support tickets with order/payment/fulfillment/line-item context; saved the support token under the existing `support-ticket-token:${slug}:${ticketId}` localStorage key; and linked to the existing support ticket page without `accessToken` in the URL.
- **Verification:** `pnpm vitest run tests/storefront-return-request-intake.test.ts` passed 1 file / 3 tests. `pnpm --filter @haa/storefront typecheck` and `pnpm --filter @haa/storefront build` passed.
- **Prevention:** Keep `tests/storefront-return-request-intake.test.ts` asserting eligible statuses, blocked statuses, structured support-ticket payload context, token persistence, and no `accessToken` in follow-up URLs.
- **Status:** Fixed locally for buyer-facing intake in TASK-0107. Full RMA lifecycle remains open: no new RMA tables, return labels, automated refund execution, or dedicated merchant returns queue.

---

### ISSUE-0043: Public API Scope Checks Lived Inside Handlers

- **ID:** ISSUE-0043
- **Date:** 2026-06-29
- **Severity:** Medium (API-key authorization / future bypass risk)
- **Area:** API / Public API / API Keys
- **Related Tasks:** TASK-0106
- **Symptoms:** The Apple-grade remediation matrix carried S5 as a security follow-up because `public-api.ts` performed scope checks inside each route handler.
- **Expected:** Public API-key authorization should be visible at route declaration time through middleware, so each endpoint binds the required scope before business logic/query code runs.
- **Actual:** `publicApiRouter.use('*', ...)` validated the API key, but `GET /products`, `GET /orders`, and `POST /orders` repeated `meta.scopes.includes(...)` inside handlers. Current endpoints were protected, but future endpoint additions could accidentally skip the inline check.
- **Root Cause:** The public API used a router-level API-key authentication middleware, but did not have an equivalent reusable scope middleware. Authorization therefore drifted into route bodies instead of the Hono middleware chain.
- **Fix:** Added typed `PublicApiScope` and `requireApiKeyScope(...)` middleware in `apps/api/src/routes/public-api.ts`; attached it to `/products`, `/orders`, and `POST /orders`; and removed inline scope checks from handler bodies while preserving the existing `FORBIDDEN` response.
- **Verification:** `pnpm vitest run tests/public-api-scope-middleware.test.ts tests/dto-storefront.test.ts tests/rbac-coverage.test.ts` passed 3 files / 17 tests. `pnpm --filter @haa/api typecheck` passed.
- **Prevention:** Keep `tests/public-api-scope-middleware.test.ts` asserting route-level `requireApiKeyScope(...)` coverage and no inline handler-body scope checks for public API routes.
- **Status:** Fixed locally in TASK-0106.

---

### ISSUE-0042: Audit Diff Masking Missed Compound PII Keys

- **ID:** ISSUE-0042
- **Date:** 2026-06-29
- **Severity:** Medium (audit privacy / PII minimization)
- **Area:** Shared Utilities / Integration Core / Audit Logs
- **Related Tasks:** TASK-0105
- **Symptoms:** The Apple-grade remediation matrix carried uncertainty around `maskObject()` because `AuditLogService` writes masked `oldValue`/`newValue` into audit logs, but the masking logic was mostly exact-key based.
- **Expected:** Audit old/new diffs should mask common PII, financial identifiers, card data, and secret variants even when keys are compound or use camelCase/snake_case prefixes.
- **Actual:** Exact keys like `email`, `phone`, `apiKey`, `iban`, and `vatNumber` were handled, but variants such as `customerEmail`, `customerPhone`, `accountNumber`, `cardNumber`, `nationalId`, and `privateKeyPem` were not all covered by the shared utility.
- **Root Cause:** The masking function used exact key sets first and had no pattern-level coverage for common audit diff field names. UI-level AuditLogs masking existed separately, but persisted audit rows still depended on shared `maskObject()`.
- **Fix:** Added pattern-based sensitive key detection in `packages/shared/src/utils.ts`, while preserving partial masking for legal/financial identifiers and full masking for secrets/card/name/address variants. Added focused tests for compound customer/beneficiary PII, legal/financial identifiers, nested secret/card variants, non-sensitive metadata preservation, and `AuditLogService` old/new wiring.
- **Verification:** `pnpm vitest run tests/audit-mask-object-pii.test.ts tests/compliance-regression-gate.test.ts` passed 2 files / 37 tests. `pnpm --filter @haa/shared typecheck`, `pnpm --filter @haa/integration-core typecheck`, and `pnpm --filter @haa/shared build` passed.
- **Prevention:** Keep `tests/audit-mask-object-pii.test.ts` covering compound PII/secret key variants and non-sensitive metadata preservation whenever audit payload fields change.
- **Status:** Fixed locally in TASK-0105.

---

### ISSUE-0041: Admin API Operational Routes Were Auth-only

- **ID:** ISSUE-0041
- **Date:** 2026-06-29
- **Severity:** High (admin RBAC / platform operations)
- **Area:** Admin API / Admin Dashboard / Platform Permissions
- **Related Tasks:** TASK-0104
- **Symptoms:** After TASK-0103 added UI reflection for routes already guarded by `requireAdminPermission`, several admin operational routes still had only `requireAdminAuth()`: dashboard, payments, marketplace read/report endpoints, audit logs, webhooks/idempotency stats, plans, upload, and settings.
- **Expected:** Admin routes that expose platform operations or sensitive platform data should require explicit fine-grained admin permissions, and admin UI routes/actions should reflect those same keys before fetching or mutating.
- **Actual:** A limited admin token could be authenticated at the API middleware layer for auth-only operational routes. The UI also lacked server-aligned route/action permission keys for those pages because there was no server permission contract to mirror.
- **Root Cause:** Admin route hardening happened incrementally around the highest-risk surfaces first (KYC, tenants/stores, settlements, users, billing, landing inbox). Older operational routes retained the original aggregator pattern of `requireAdminAuth()` only, while shared permission types did not have a platform-admin catalog separate from merchant employee permissions.
- **Fix:** Added shared `AdminPermission` plus `ADMIN_PERMISSION_CATALOG`; typed `requireAdminPermission()` against it; added explicit permissions to dashboard, payments, marketplace reads, audit, webhooks/idempotency stats, plans read/update, upload, and settings read/update; extended admin route/sidebar guards; and reflected Plans, Marketplace, and Settings mutation permissions at button level.
- **Verification:** `pnpm vitest run tests/admin-api-rbac-alignment.test.ts tests/admin-permission-reflection.test.ts tests/security-boundary-gates.test.ts` passed 3 files / 27 tests. `pnpm --filter @haa/shared build` followed by `pnpm --filter @haa/api typecheck` passed. `pnpm --filter @haa/admin-dashboard typecheck` and `pnpm --filter @haa/admin-dashboard build` passed.
- **Prevention:** Keep `tests/admin-api-rbac-alignment.test.ts` asserting admin route guards, no auth-only fragments for targeted routes, shared `ADMIN_PERMISSION_CATALOG` keys, route/sidebar reflection, and action-level disabled states.
- **Status:** Fixed locally in TASK-0104 for current admin dashboard/API operational routes. New admin endpoints must add server permission gates before UI reflection.

---

### ISSUE-0040: Admin Routes Reflected Authentication but Not Fine-Grained Permissions

- **ID:** ISSUE-0040
- **Date:** 2026-06-29
- **Severity:** High (admin permission UX / operator trust)
- **Area:** Admin Dashboard / Route Guards / Sidebar Navigation
- **Related Tasks:** TASK-0103, TASK-0104
- **Symptoms:** The Apple-grade diagnostic kept admin permission-denied UI open. Current `App.tsx` confirmed that the admin dashboard only checked for `admin_token`; all sidebar links and routes were visible even when the JWT lacked the matching server-side permission.
- **Expected:** Pages backed by API routes that already require `requireAdminPermission(...)` should also be reflected in the UI: hide sidebar entries when missing permission, and show an explicit denied state on direct navigation.
- **Actual:** Limited admins could navigate to server-gated pages and then see API errors, empty-looking states, or partial page behavior instead of a clear permission-denied state.
- **Root Cause:** Admin authentication and admin authorization were split: `AdminGuard` handled token presence, while `hasAdminPermission()` existed but was only used by selected action buttons inside financial detail pages. The route map and sidebar had no permission metadata.
- **Fix:** Added shared admin `UnauthorizedState`; added route/sidebar permission metadata for admin pages whose backend routes already have explicit `requireAdminPermission`; filtered sidebar links through `hasAdminPermission`; and wrapped protected routes with `AdminPermissionRoute`.
- **Verification:** `pnpm vitest run tests/admin-permission-reflection.test.ts tests/manual-settlement-dashboard-ux.test.ts tests/admin-dangerous-action-reasons.test.ts` passed 3 files / 13 tests. `pnpm --filter @haa/admin-dashboard typecheck` and `pnpm --filter @haa/admin-dashboard build` passed. `pnpm check:skills` passed 43/43, `git diff --check` was clean, and final `pnpm preflight` passed.
- **Prevention:** Keep source-regression tests asserting admin denied state, sidebar filtering, route wrappers, and server-aligned permission keys. For any new admin page, add the API `requireAdminPermission` gate before UI route/action reflection.
- **Status:** Fixed locally in TASK-0103 for then-existing server-gated admin routes; TASK-0104 closed the auth-only admin API follow-up for current admin dashboard operational routes.

---

### ISSUE-0039: API Health Was Alive but Not Deep Enough for Launch Dependency Readiness

- **ID:** ISSUE-0039
- **Date:** 2026-06-29
- **Severity:** High (observability / launch readiness)
- **Area:** API / Health / Platform Dependencies
- **Related Tasks:** TASK-0102
- **Symptoms:** The Apple-grade diagnostic flagged `/health` as shallow. Current code showed DB, Redis, and queue status, but not storage, payment, shipping, email, or observability readiness.
- **Expected:** `/health` should keep its liveness shape while also exposing non-secret readiness for platform dependencies that affect launch confidence. It must not leak secrets or call live payment/shipping providers.
- **Actual:** Operators could see `api: ok` and DB/Redis/queue status, but missing S3, PSP, carrier, email, or observability configuration was invisible from the health surface.
- **Root Cause:** Earlier health hardening expanded from DB-only to DB/Redis/queue, but provider readiness stayed scattered across env schema, provider factories, and dashboard-specific status services instead of being summarized in the API health response.
- **Fix:** Added `apps/api/src/services/platform-health.ts` with typed readiness classifiers for storage, payment, shipping, email, and observability. Wired `/health` to include a `dependencies` block with aggregate/per-dependency status, configured flags, reasons, and missing key names where useful. The classifiers never return raw secret values and do not call external providers.
- **Verification:** `pnpm vitest run tests/platform-health-readiness.test.ts tests/queue-reliability.test.ts tests/route-migration-3-health.test.ts tests/pre-launch-smoke.test.ts` passed 4 files / 63 tests. `pnpm --filter @haa/api typecheck` and `pnpm --filter @haa/api build` passed. `pnpm check:skills` passed 43/43, `git diff --check` was clean, final `pnpm preflight` passed, and final `pnpm ops:monitor` exited 0 with no recommended incidents/tasks.
- **Prevention:** Keep platform health tests asserting dependency readiness coverage, missing-key reporting, secret-value non-disclosure, route service wiring, and no direct secret env reads inside `health.ts`.
- **Status:** Fixed locally in TASK-0102 for deep `/health`; external alerting/uptime/Sentry evidence remains an open observability task.

---

### ISSUE-0038: Employees Permission Denial Could Fall Through to Normal Page States

- **ID:** ISSUE-0038
- **Date:** 2026-06-28
- **Severity:** High (permission UX / employee-management trust)
- **Area:** Merchant Dashboard / Employees / Permissions UX
- **Related Tasks:** TASK-0101
- **Symptoms:** The Apple-grade diagnostic flagged that the Employees page could make no-permission look like an empty employees state, and that the last-owner guard was not explained clearly.
- **Expected:** Missing `employees:view` should show a clear permission-denied state and avoid employee API fetches. The last-owner guard should explain why edit/delete is blocked and what action unlocks it.
- **Actual:** The page relied on the route guard and did not have a page-local `UnauthorizedState` fallback. The last-owner protection rendered a short "آخر مالك" label with a hover title only.
- **Root Cause:** The page treated permission denial as an outer routing concern and did not encode the permission state in its own loading/empty/error state model. The last-owner guard enforced safety but did not surface an actionable explanation.
- **Fix:** Added `canViewEmployees`; skipped employee fetches and returned shared `UnauthorizedState` when `employees:view` is missing; introduced `canManageEmployeePermissions` for save branches; and expanded the last-owner guard with visible inline guidance to assign another owner before edit/delete.
- **Verification:** `pnpm vitest run tests/employee-permission-denied-ux.test.ts tests/employee-management.test.ts tests/employee-ui-api-wire.test.ts tests/dashboard-rbac-guards.test.ts` passed 4 files / 60 tests. `pnpm --filter @haa/merchant-dashboard typecheck` and `pnpm --filter @haa/merchant-dashboard build` passed. `pnpm check:skills` passed 43/43, `git diff --check` was clean, and final `pnpm preflight` passed.
- **Prevention:** Keep source-regression tests asserting `UnauthorizedState`, no employee fetch without `employees:view`, and visible last-owner next-step copy.
- **Status:** Fixed locally in TASK-0101 with verification recorded in `docs/ops/SKILL_COMPLIANCE_REPORT_TASK_0101.md`.

---

### ISSUE-0037: Products Empty Catalog CTA Was Not Locked to First Product Creation

- **ID:** ISSUE-0037
- **Date:** 2026-06-28
- **Severity:** High (merchant activation / first catalog setup)
- **Area:** Merchant Dashboard / Products
- **Related Tasks:** TASK-0100
- **Symptoms:** The Apple-grade diagnostic flagged the Products page empty state as a dead end for new merchants. Current code had an `EmptyState` foundation, but the remediation matrix still carried the item as open and no focused guard proved that the true empty catalog state opened first-product creation while filtered no-results stayed search/filter-oriented.
- **Expected:** A merchant with zero products should get an explicit first-product CTA that opens the existing create-product dialog. A merchant with active filters that yield no results should not see the first-product CTA as the primary action.
- **Actual:** The empty-state action used the generic product-create copy, the filter condition was repeated inline, and no dedicated regression test locked the empty-catalog/no-results distinction.
- **Root Cause:** The page had a reusable empty-state shell but lacked a source-of-truth boolean and test contract for first-run catalog activation.
- **Fix:** Added `hasActiveProductFilters`, changed the true empty catalog action to `products.createFirst` with a `Plus` icon and `openCreate`, kept filtered no-results free of the first-product CTA, and added Arabic copy plus `tests/products-empty-state-cta.test.ts`.
- **Verification:** `pnpm vitest run tests/products-empty-state-cta.test.ts tests/products-final-qa.test.ts tests/merchant-dashboard-full-sweep.test.ts` passed 3 files / 86 tests. `pnpm --filter @haa/merchant-dashboard typecheck` and `pnpm --filter @haa/merchant-dashboard build` passed. `pnpm check:skills` passed 43/43, `git diff --check` was clean, and final `pnpm preflight` passed.
- **Prevention:** Keep the source-regression test asserting `hasActiveProductFilters`, explicit `products.createFirst`, permission-gated `openCreate`, and no first-product CTA in the filtered no-results branch.
- **Status:** Fixed locally in TASK-0100 with verification recorded in `docs/ops/SKILL_COMPLIANCE_REPORT_TASK_0100.md`.

---

### ISSUE-0036: Onboarding Skip Did Not Preserve a Resume Point

- **ID:** ISSUE-0036
- **Date:** 2026-06-28
- **Severity:** High (merchant activation / first-run UX)
- **Area:** Merchant Dashboard / Onboarding Wizard / Getting Started
- **Related Tasks:** TASK-0099
- **Symptoms:** The Apple-grade diagnostic flagged that onboarding skip used `window.confirm` and then navigated away, with no resumable wizard state or visible resume entry.
- **Expected:** A merchant who skips setup should be able to resume from the same onboarding context without retyping store details or losing generated/selected products.
- **Actual:** The skip path confirmed and navigated to `/dashboard`, but the wizard state was held only in React memory.
- **Root Cause:** The earlier fix protected against accidental clicks but did not persist the wizard draft or surface a resume affordance outside the wizard.
- **Fix:** Added a local onboarding draft keyed by `storeId`; skip writes the draft and clears `onboarding_done`; reopening `/onboarding` restores step, store form fields, generated products, selected product indexes, product-step mode, and checklist state; completion clears the draft; Getting Started displays a resume CTA when a draft exists.
- **Verification:** `pnpm vitest run tests/merchant-dashboard-apple-grade-fixes.test.ts tests/getting-started-page-contract.test.ts tests/onboarding-wizard-batch-save.test.ts` passed 3 files / 31 tests with 1 skipped. `pnpm --filter @haa/merchant-dashboard typecheck` and `pnpm --filter @haa/merchant-dashboard build` passed. `pnpm check:skills` passed 43/43, `git diff --check` was clean, and final `pnpm preflight` passed.
- **Prevention:** Keep source-regression tests asserting skip writes a resumable draft, reopening onboarding restores state, completion clears the draft, and Getting Started has a resume CTA.
- **Status:** Fixed locally in TASK-0099 with verification recorded in `docs/ops/SKILL_COMPLIANCE_REPORT_TASK_0099.md`.

---

### ISSUE-0035: Public Marketplace Order Lookup and Category Guard Were Not Fully Closed

- **ID:** ISSUE-0035
- **Date:** 2026-06-28
- **Severity:** Critical (public marketplace privacy/compliance)
- **Area:** Public Marketplace API / Storefront Marketplace Tracking / Compliance Filtering
- **Related Tasks:** TASK-0098
- **Symptoms:** The Apple-grade remediation matrix still carried marketplace P0 risk around public order lookup and compliance filtering. Current code confirmed that `GET /marketplace/orders/:marketplaceOrderNumber` still accepted `?phone=` as a legacy ownership fallback, and the storefront API still exposed `getOrderLegacy`. The seller detail route selected store email/phone even though it did not return them. Prohibited-category filtering existed in category display/facet subqueries, but there was no product-level `NOT EXISTS` guard across every public marketplace product/seller/stat query.
- **Expected:** Public marketplace order tracking should require the cryptographic `access_token` only. Public marketplace seller APIs should not select or return merchant email/phone. Products in any prohibited marketplace category should be excluded from all public marketplace browse, detail, seller, stats, and category surfaces.
- **Actual:** Phone fallback remained in the public order-tracking route/client. Seller detail selected unnecessary PII. A product in a prohibited category could slip through if the prohibited category was filtered out of the displayed category fields instead of disqualifying the product itself.
- **Root Cause:** Earlier hardening introduced access tokens and category display filters but retained transitional backward compatibility and treated category compliance as a presentation/facet filter, not a single product-eligibility predicate.
- **Fix:** Removed the `phone` fallback from `GET /marketplace/orders/:marketplaceOrderNumber`; removed `getOrderLegacy` and `?phone=` lookup construction from storefront marketplace tracking; removed seller email/phone from the seller detail select; added `noProhibitedMarketplaceCategoryCondition()` and applied it to marketplace stats, product list, product detail, seller detail counts, seller list real/demo queries, and categories; and changed product mapping to validate against all category slugs.
- **Verification:** `pnpm vitest run tests/marketplace-p0-3-access-token.test.ts tests/marketplace-p0-2-category-blocklist.test.ts tests/marketplace-p0-1-sfda-workflow.test.ts tests/marketplace-t5-t10-integration.test.ts tests/products-qa-regression.test.ts` passed 5 files / 52 tests with 1 skipped. `pnpm --filter @haa/api typecheck`, `pnpm --filter @haa/storefront typecheck`, `pnpm --filter @haa/api build`, and `pnpm --filter @haa/storefront build` passed. `pnpm check:skills` passed 43/43, `git diff --check` was clean, and final `pnpm preflight` passed.
- **Prevention:** Keep source-regression tests forbidding `phone` parsing in the marketplace order-tracking route, forbidding `getOrderLegacy` / `?phone=` in storefront marketplace tracking, asserting seller PII is not selected or returned, and asserting the product-level prohibited-category guard stays wired into public marketplace queries.
- **Status:** Fixed locally in TASK-0098 with verification recorded in `docs/ops/SKILL_COMPLIANCE_REPORT_TASK_0098.md`.

---

### ISSUE-0034: Admin Status and Marketplace Moderation Actions Lacked Server-required Reasons

- **ID:** ISSUE-0034
- **Date:** 2026-06-28
- **Severity:** High (admin trust / merchant-impacting operations)
- **Area:** Admin Dashboard / Admin API / Marketplace Moderation
- **Related Tasks:** TASK-0097
- **Symptoms:** Tenant suspension/activation and store disable/enable were available as inline one-click actions. Marketplace product rejection had an optional note, and product suspension was a direct API call with no note.
- **Expected:** Merchant-impacting status or moderation decisions should require an explicit reason in the UI and the API contract. The reason should be audit-visible server-side, not only a client-side convention.
- **Actual:** Tenant/store status endpoints only accepted the target status, and marketplace review validation accepted rejected/suspended decisions with no note. Store status changes also did not return 404 for missing stores or write an admin audit entry.
- **Root Cause:** The admin dashboard treated tenant/store/product moderation state changes as simple toggles. The API enforced authentication/permission but did not enforce an operator rationale for these high-impact actions.
- **Fix:** Added tenant/store status confirmation dialogs with required `statusReason`, removed status mutation from normal edit-save payloads, required `statusReason` in Hono validators, and included the reason in audit `newValue`. Store status now checks existence, no-ops cleanly, audits via `admin_store_suspended`, and invalidates the store tenant cache. Marketplace rejected/suspended reviews now require a note in both UI and API validation.
- **Verification:** Covered by `tests/admin-dangerous-action-reasons.test.ts`. Final TASK-0097 verification passed: focused remediation tests 2 files / 7 tests; expanded affected regression tests 5 files / 48 passed with 1 skipped; admin-dashboard typecheck; API typecheck; admin-dashboard build; `pnpm check:skills` 43/43; `git diff --check`; and final `pnpm preflight`.
- **Prevention:** Keep source-regression tests asserting tenant/store status changes cannot bypass the reason dialog, status endpoints require `statusReason`, and marketplace negative moderation cannot send an empty note.
- **Status:** Fixed locally in TASK-0097 with verification recorded in `docs/ops/SKILL_COMPLIANCE_REPORT_TASK_0097.md`.

---

### ISSUE-0033: High-Trust UX Paths Lacked Persistent Recovery and Operator Confirmation

- **ID:** ISSUE-0033
- **Date:** 2026-06-28
- **Severity:** High (checkout conversion / financial operations trust)
- **Area:** Storefront Checkout / Admin Settlements / Admin Bank Accounts
- **Related Tasks:** TASK-0096
- **Symptoms:** The Apple-grade diagnostic found that failed checkout payment ended as transient toast feedback, while admin payout approval/transfer/verification and bank-account review could be triggered directly from action buttons.
- **Expected:** A buyer who hits payment failure should see a persistent recovery surface with retry, payment-method change, and support options. An operator performing money-moving or bank-verification decisions should confirm the action and capture a reason where appropriate before the API call.
- **Actual:** Checkout `catch` only emitted a toast for payment-like failures. `SettlementBatchDetail.tsx` called payout approve/transfer/verify API methods directly from buttons. `BankAccounts.tsx` called bank verify/reject directly and the API schema only accepted `status`.
- **Root Cause:** Backend workflow/RBAC primitives were stronger than the surrounding trust UX. The UI treated high-trust failures and operator decisions as ordinary button/toast interactions instead of durable decision points with visible recovery, confirmation, and reason capture.
- **Fix:** Added checkout `PaymentRecoveryState` and a persistent recovery alert with retry, change-payment, and support paths. Added a generic payout confirmation modal for approve, mark-transfer-pending, mark-transferred, and verify-transfer actions. Added a bank-account review dialog requiring a reason, extended the admin API client/schema with `reviewReason`, and recorded the reason in `bank_account_changed` audit `newValue` plus notification context.
- **Verification:** Covered by `tests/apple-grade-remediation.test.ts`; final verification recorded in `docs/ops/SKILL_COMPLIANCE_REPORT_TASK_0096.md`.
- **Prevention:** Keep regression checks that failed payment is not toast-only, money-moving payout actions are not one-click API calls, and bank-account review reason is API-validated and audit-visible.
- **Status:** Fixed locally in TASK-0096 first batch; the tenant/store suspension and marketplace negative-moderation follow-up from this issue family was closed in TASK-0097. Continue broad dangerous-action review as new admin actions are added.

---

### ISSUE-0032: Merchant Role Model Lacked Warehouse Staff Role

- **ID:** ISSUE-0032
- **Date:** 2026-06-28
- **Severity:** Medium (merchant operations / permission UX)
- **Area:** Merchant Dashboard / Employees / Shared RBAC
- **Related Tasks:** TASK-0095
- **Symptoms:** The employee role selector offered owner/admin/manager/products/orders/accountant/support/viewer roles, but no plain warehouse staff role for merchants who only need a worker to prepare orders, read products, update fulfillment status, and handle shipping.
- **Expected:** A simple merchant should be able to choose a clear "موظف المستودع" role without granting finance, reports, settings, customer export, refund, or employee-management powers.
- **Actual:** The closest available roles were broader than a warehouse worker's job, so merchants had to choose a less accurate role or manually reason through granular permissions.
- **Root Cause:** `UserRole` / `ROLE_PERMISSIONS` had operational manager roles but no fulfillment-only warehouse worker preset, and the employee dialog hardcoded role labels rather than deriving the options from the shared role map.
- **Fix:** Added `warehouse_staff` to the shared `UserRole`, `ROLE_PERMISSIONS`, and permission presets. Updated merchant employee role labels and permission presets to include "موظف المستودع"; role changes now seed the matching permissions automatically. Regression tests assert the role has fulfillment permissions and lacks finance/settings/employee-management powers.
- **Verification:** Covered by focused employee/RBAC tests in TASK-0095; final verification is recorded in `docs/ops/SKILL_COMPLIANCE_REPORT_TASK_0095.md`.
- **Prevention:** Keep role-option UI generated from `ROLE_PERMISSIONS`, and keep RBAC catalog tests asserting warehouse staff remains operational-only.
- **Status:** Fixed locally in TASK-0095.

---

### ISSUE-0031: Merchant Membership Permission Routes Used Wrong Store and Client Prefix

- **ID:** ISSUE-0031
- **Date:** 2026-06-28
- **Severity:** High (permission management / multi-store scoping)
- **Area:** Merchant Dashboard / Employees / Permissions API / RBAC
- **Related Tasks:** TASK-0095
- **Symptoms:** The merchant employee dialog attempted to read and update membership permissions, but the client called `/merchant/:storeId/memberships/:membershipId/permissions` while the API router is mounted at `/merchant/:storeId/permissions`. Catalog and preset helpers also missed the mounted prefix. Separately, the permissions route passed `auth.activeStoreId` to membership permission operations, so a multi-store user could operate against the JWT active store instead of the `:storeId` in the URL after `requireStoreAccess()` had validated the URL store.
- **Expected:** All membership permission reads/writes should use the mounted `/merchant/:storeId/permissions/...` URLs, and the route should pass the URL `storeId` into `PermissionService.findMembership()` / `upsertMembershipPermissions()` after access verification.
- **Actual:** The UI permission endpoints could hit non-existent URLs, and the route-level store context could drift from the requested store to `auth.activeStoreId`.
- **Root Cause:** The service-layer store isolation was fixed previously, but the transport/client layer was not synchronized: the route retained `auth.activeStoreId`, and the merchant-dashboard client did not include the permissions router mount prefix. The employee dialog also kept a stale direct localStorage `active_store_id` read.
- **Fix:** Added `getRouteStoreId(c)` in `apps/api/src/routes/permissions.ts` and used it for membership permission GET/PATCH. Corrected merchant-dashboard permission client paths to `/merchant/:storeId/permissions/permissions`, `/permission-presets`, and `/memberships/:membershipId/permissions`. Switched `EmployeeFormDialog` to `useAuth().storeId`, fixed RTL logical positioning for the password visibility button, allowed empty custom permission updates, and corrected the matrix copy to describe store-scoped saving.
- **Verification:** Focused employee/RBAC command passed 7 files / 129 tests. API typecheck passed. Merchant-dashboard typecheck passed. `pnpm preflight` passed.
- **Prevention:** Keep permission-route transport tests asserting URL `storeId` instead of `auth.activeStoreId`; keep merchant API-client tests asserting the mounted `/permissions` prefix; keep employee-dialog tests forbidding direct `Number(localStorage.getItem('active_store_id'))` reads; test empty permission-set saves as a meaningful update.
- **Status:** Fixed locally in TASK-0095.

---

### ISSUE-0030: GitHub Test Source-Grep Contracts Drifted After Shared ErrorState and Print DOM Hardening

- **ID:** ISSUE-0030
- **Date:** 2026-06-28
- **Severity:** Medium (PR CI Test blocker)
- **Area:** CI / Tests / Admin dashboard / Merchant dashboard print flows
- **Related Tasks:** TASK-0093
- **Symptoms:** After TASK-0093 Sonar follow-up commits, the GitHub CI `Test` job failed even though typecheck, lint, and builds passed. Failing assertions expected `LandingInbox.tsx` and `SettlementBatches.tsx` to contain the Arabic retry copy directly, and expected `Orders.tsx` to import `escapeHtmlText` plus build print HTML through the old `document.write` contract.
- **Expected:** Source-grep tests should lock the current product contract: admin pages wire shared `ErrorState` with `onRetry`, shared `ErrorState` owns the retry copy, and merchant print windows build DOM nodes with `textContent`.
- **Actual:** The tests still encoded older implementation details: page-local retry text and string-based print HTML escaping.
- **Root Cause:** The tests were implementation-coupled source-grep contracts. After TASK-0093 improved the runtime code by centralizing retry UI and replacing `document.write` with DOM/textContent output, the tests were not updated in the same commit.
- **Fix:** Updated `tests/admin-landing-inbox.test.tsx` and `tests/scheduled-settlement-admin-batches-ui.test.ts` to assert `ErrorState` wiring plus shared retry copy. Updated `tests/pii-gating-orders-contract.test.ts` to assert `preparePrintDocument`, `customer.textContent`, sensitive-phone gating, and absence of `document.write` / `innerHTML`. Corrected the `Orders.tsx` print comment so it no longer claims CSV escaping is used in the print path.
- **Verification:** Focused CI contract command passed 4 files / 46 tests with 1 skipped. Full `pnpm test` passed 354 files / 4618 tests with 3 skipped and 14 todo. `pnpm --filter @haa/admin-dashboard typecheck`, `pnpm --filter @haa/merchant-dashboard typecheck`, `pnpm preflight`, `pnpm check:skills`, and `git diff --check` passed.
- **Prevention:** When source-grep tests assert UI implementation details, update the test in the same commit as the implementation change. Prefer asserting stable contracts such as shared component wiring, permission gates, and dangerous sink absence over matching old local copy or helper names.
- **Status:** Fixed locally in TASK-0093; awaiting refreshed GitHub CI after push.

---

### ISSUE-0029: SonarCloud PR Gate Counted Templated Docs and Inherited Admin Code Smells

- **ID:** ISSUE-0029
- **Date:** 2026-06-28
- **Severity:** Medium (PR quality-gate blocker)
- **Area:** CI / SonarCloud / Admin dashboard / Hook scripts / Documentation
- **Related Tasks:** TASK-0093
- **Symptoms:** After TASK-0093 was pushed to PR #320, GitHub reported SonarCloud Quality Gate failure with `5.8% Duplication on New Code` (required <= 3%) and `B Reliability Rating on New Code` (required A). Sonar annotations highlighted `StorePaymentSettings.tsx` nested functions and `scripts/hooks/pre-edit-frontend.sh` using `[` instead of `[[`. After the first reliability fixes, the refreshed gate narrowed to `5.7% Duplication on New Code` from repeated admin-dashboard UI blocks.
- **Expected:** Templated compliance/runbook docs should not count against code duplication, inherited admin payment settings should keep async mapping logic shallow enough for static analysis, and shell hooks should use safer bash conditionals.
- **Actual:** The PR introduced several similarly structured compliance reports and runbooks, while the inherited admin page nested response normalization inside a hook callback. The frontend hook used POSIX `[` in a bash script even though the rest of the hook uses `[[`. Sonar also flagged merchant HTML escaping because `escapeHtmlText(unknown)` could stringify objects as `[object Object]`. The remaining duplication came from repeated admin nav item object shapes, repeated loading skeletons, repeated CSV export functions, and duplicated store selector markup.
- **Root Cause:** Sonar's new-code quality gate was treating governance docs as CPD input, and inherited admin code kept repeated UI scaffolding inline instead of centralizing it behind small shared helpers.
- **Fix:** Added `.sonarcloud.properties` for SonarCloud Automatic Analysis plus `sonar-project.properties` for scanner-based runs, both with `docs/**` / Markdown CPD exclusions. Extracted provider-settings normalization helpers outside `StorePaymentSettings`, changed the hook file-existence test to `[[ -f "$INDEX_CSS" ]]`, replaced merchant print `document.write` HTML strings with DOM/textContent construction, and changed the Plans modal backdrop from clickable `div` elements to a native backdrop button. Follow-up Sonar CPD reduction extracted `AdminTableSkeleton`, `StoreSelectorPanel`, `downloadRowsAsCsv`, and a typed admin nav helper.
- **Verification:** `pnpm --filter @haa/admin-dashboard typecheck` passed; `pnpm --filter @haa/admin-dashboard build` passed; `pnpm --filter @haa/merchant-dashboard typecheck` passed; focused settlement/geidea tests passed 3 files / 24 tests; focused admin wiring/source-grep tests passed 3 files / 60 tests with 1 skipped; dashboard print HTML escape tests passed 3/3; `bash -n scripts/hooks/pre-edit-frontend.sh` passed; `pnpm check:skills` passed 43/43; `pnpm preflight` passed; `git diff --check` passed.
- **Prevention:** Keep generated/templated docs out of Sonar CPD scope, keep admin API response normalization in top-level helpers, extract repeated admin UI scaffolding into shared helpers, use bash `[[ ]]` conditionals in repo hook scripts, build print views with DOM/textContent instead of `document.write`, and use native controls for modal backdrops.
- **Status:** Fixed locally in TASK-0093; awaiting refreshed SonarCloud result after the admin UI duplication refactor push.

---

### ISSUE-0028: Admin Settlement Batches TSX Comment Broke Preflight

- **ID:** ISSUE-0028
- **Date:** 2026-06-28
- **Severity:** Medium (admin-dashboard build/preflight blocker)
- **Area:** Admin dashboard / Settlement batches / TSX parsing
- **Related Tasks:** TASK-0093
- **Symptoms:** `pnpm preflight` failed during the inherited admin handoff with TypeScript parser errors in `apps/admin-dashboard/src/pages/SettlementBatches.tsx`: `TS1005 ')' expected`, `TS1382 Unexpected token`, and `TS1381 Unexpected token`.
- **Expected:** The settlement batches page should render its loading, error, empty, and table branches as valid TSX and should not block root preflight.
- **Actual:** The error branch of the ternary expression contained a standalone JSX comment immediately before `<ErrorState />`, leaving the branch without a single valid returned expression.
- **Root Cause:** A handoff edit inserted a JSX comment directly inside a ternary branch instead of wrapping the branch in a fragment or leaving the comment outside the expression.
- **Fix:** Removed the invalid comment from the inherited staged handoff and kept the branch as a single `<ErrorState />` expression. Cleaned the matching no-value comment noise from the inherited landing inbox handoff before staging the final version; both reconciled files match valid `HEAD` source in the final publish scope.
- **Verification:** `pnpm --filter @haa/admin-dashboard typecheck` passed; focused settlement/geidea tests passed 3 files / 24 tests; `pnpm --filter @haa/admin-dashboard build` passed; `pnpm check:skills` passed 43/43; `pnpm preflight` passed.
- **Prevention:** In JSX ternary branches, return one valid expression; if a comment is needed, wrap the branch in a fragment or move the comment outside the ternary. Run app-level typecheck before staging handoff edits.
- **Status:** Fixed locally in TASK-0093.

---

### ISSUE-0027: Local Full Smoke Blocked by Unapplied Order Preparation Migration

- **ID:** ISSUE-0027
- **Date:** 2026-06-28
- **Severity:** Medium (local launch-readiness smoke blocker)
- **Area:** Local DB / Orders / Smoke tests / Launch readiness
- **Related Tasks:** TASK-0091
- **Symptoms:** `pnpm smoke` failed 9/46 during local app smoke. Order-list and tracking checks returned `500` with `API-001`, and API logs showed PostgreSQL error `column "preparation_status" does not exist` while querying `orders`.
- **Expected:** Local smoke should be able to query orders and public tracking after the repo schema and local DB are aligned. If migrations are missing, the smoke path should stop before mutating flows and report the required owner action.
- **Actual:** The current code and schema reference `orders.preparation_status`, and migration `packages/db/src/migrations/0077_order_preparation_status.sql` exists, but the current local database has not applied that migration. Related smoke assertions also still expect older product response shapes such as `body.data.data`.
- **Root Cause:** Local DB schema drift: the working code is ahead of the local database migration state. The full smoke suite also contains stale API-response assumptions from an earlier contract.
- **Fix:** Not applied in TASK-0091 because `db:migrate` is owner-only under AGENTS.md §14.7. The safe follow-up is owner-approved local-only migration/rebuild, then a dedicated testing task to refresh stale `tests/smoke.test.ts` response-shape assertions if they still fail.
- **Verification:** `pnpm ops:monitor` passed before the full smoke failure; sanitized local provider/status probes returned 200; `pnpm test:smoke` passed 29/29. `pnpm smoke` reproduced the blocker, and API logs confirmed the missing `preparation_status` column. `pnpm ops:errors` then reported 3 actionable P2 `API-001` events and no recommended incident/task.
- **Prevention:** Before running full DB-backed local smoke after schema work, confirm the local DB has applied pending migrations or intentionally rebuild the local DB with owner approval. Keep smoke-test response-shape assertions aligned with the current public API contract.
- **Status:** Open — owner action required before full local smoke can pass.

---

### ISSUE-0026: Audit Hardening Gaps in Workflow Shell Inputs, Credential Cipher Validation, and Print HTML Encoding

- **ID:** ISSUE-0026
- **Date:** 2026-06-28
- **Severity:** High (defense-in-depth / CI static-analysis failure risk)
- **Area:** GitHub Actions / Credential encryption helpers / Merchant dashboard print flows
- **Related Tasks:** TASK-0087
- **Symptoms:** Defensive audit found three confirmed P1-quality hardening gaps: staging ops workflows interpolated GitHub Actions expressions directly inside shell `run:` blocks; AES-GCM helpers did not explicitly pin the authentication-tag length and accepted weakly validated encrypted payload shapes; merchant dashboard print windows wrote order/customer/gift-message text into HTML with raw or CSV-oriented escaping.
- **Expected:** Workflow inputs should be passed through shell environment variables and quoted safely; encrypted credential helpers should validate key/IV/tag/ciphertext shape before crypto operations and pin the GCM tag length; `document.write` print markup should HTML-escape all user-controlled text.
- **Actual:** The workflows mixed `${{ inputs.* }}` expressions into shell conditionals/remote-command arguments, Semgrep flagged AES-GCM calls without explicit `authTagLength`, and dashboard print markup treated HTML output as plain text or CSV context.
- **Root Cause:** These surfaces lacked context-specific regression contracts: workflow input handling was not tested as shell data, crypto helpers relied on implicit Node defaults and loose parse checks, and print-window code conflated CSV-injection escaping with HTML-output encoding.
- **Fix:** Moved workflow inputs into `env`, used shell variables for conditionals, and base64-encoded remote env payloads before SSH transfer. Added strict 64-hex key validation, IV/tag/ciphertext length/hex checks, malformed encrypted-looking payload rejection, and explicit 16-byte GCM auth tags in both credential helpers. Added `escapeHtmlText` and wired order bulk print plus gift-message print through HTML escaping.
- **Verification:** Focused tests passed for crypto format rejection, workflow shell-injection contracts, PII/CSV/HTML print contracts, and HTML escaping. Post-fix Semgrep no longer reports the workflow shell-injection or AES-GCM findings. Full local verification passed: `pnpm typecheck`, `pnpm test`, and `pnpm build`; `pnpm lint` exited 0 with pre-existing warnings only.
- **Prevention:** Keep regression tests for workflow shell input handling, AES-GCM encrypted payload shape, and dashboard print HTML escaping. Any new `document.write`/print window must use HTML-context escaping, not CSV escaping or raw interpolation.
- **Status:** Fixed locally.

---

### ISSUE-0025: CI E2E Targeted Shared Staging During Deploy

- **ID:** ISSUE-0025
- **Date:** 2026-06-27
- **Severity:** High (main CI can fail while deploy is healthy)
- **Area:** Playwright / CI E2E / Deploy coordination
- **Related Tasks:** TASK-0085
- **Symptoms:** `main` CI run `28296586897` failed in E2E after a newer push cancelled the PR #308 CI run. All four Playwright tests timed out on `page.goto` with `net::ERR_ABORTED` while navigating to `https://staging.haastores.com`, `https://staging.haastores.com/about`, `https://staging.haastores.com/signup`, and `https://merchant.staging.haastores.com/login`.
- **Expected:** CI E2E should test the local dev servers started inside the CI job: API `3000`, storefront `5174`, merchant dashboard `5173`, and admin dashboard `5175`. Shared staging should be tested by Deploy smoke gates or by explicit manual E2E environment variables.
- **Actual:** `playwright.config.ts` defaulted `baseURL` to shared staging, and `e2e/merchant-login.spec.ts` hardcoded the merchant staging subdomain. The CI job started local dev servers, but the tests ignored them.
- **Root Cause:** The E2E workflow evolved to start all local apps, but the Playwright defaults and merchant-login hardcoded URL still reflected an older staging-targeted execution model.
- **Fix:** Playwright now defaults to `http://localhost:5174` when `CI=true`, keeps `E2E_BASE_URL` for explicit staging/manual overrides, and merchant-login now uses `E2E_MERCHANT_URL` or local `http://localhost:5173/login` in CI.
- **Verification:** `CI=true pnpm test:e2e` passed 4/4 against local API/storefront/merchant/admin servers. Supporting checks passed: `pnpm typecheck`, `pnpm lint` (0 errors, 514 pre-existing warnings), `pnpm test`, `pnpm check:skills`, `git diff --check`, `pnpm preflight`, and final `pnpm ops:monitor`.
- **Prevention:** Keep CI E2E target selection local by default. Shared staging checks belong in Deploy smoke gates unless the owner explicitly sets staging E2E environment variables.
- **Status:** Fixed.

---

### ISSUE-0024: Gift Messages Lacked Central Plain-Text Sanitization

- **ID:** ISSUE-0024
- **Date:** 2026-06-27
- **Severity:** Medium (stored-text XSS and notification-template hardening risk)
- **Area:** Commerce Core / Shared DTO / Storefront gift messages
- **Related Tasks:** TASK-0084
- **Symptoms:** Deep security review follow-up flagged gift-message input/output sanitization as an unresolved risk. Gift messages were rendered by React as text in the main storefront screens, but server write boundaries accepted raw strings and public DTOs could return legacy stored values unchanged.
- **Expected:** Gift messages should be treated as plain text. HTML/script/style/comment/control characters and dangerous protocol markers should be removed before storage, and public DTO output should sanitize again before sending data to storefront/public consumers.
- **Actual:** `CartService.addItem`, `CheckoutService.createSession`, and `OrdersService.create` passed gift-message strings through mostly unchanged except for max-length checks. `toPublicCart` and `toPublicOrder` returned gift-message fields without output cleanup.
- **Root Cause:** Gift-message handling grew across cart, checkout, order, and DTO layers without a shared plain-text normalization rule or a regression test that followed both input and output boundaries.
- **Fix:** Added plain-text gift-message sanitizers for commerce-core write paths and shared DTO output paths. Wired cart item storage, checkout session metadata, order-level gift options, order item gift messages, public cart DTOs, and public order DTOs through sanitizer calls.
- **Verification:** `tests/gift-message-sanitization.test.ts` covers HTML/script/control-character cleanup, normal Arabic preservation, empty/markup-only handling, cart/checkout/order wiring, public DTO output sanitation, and absence of `dangerouslySetInnerHTML` on public gift-message render surfaces.
- **Prevention:** Keep the gift-message sanitizer regression whenever gift message fields or public storefront DTO serialization changes.
- **Status:** Fixed.

---

### ISSUE-0023: BNPL Callback Payment Lookup Was Not Store-Scoped

- **ID:** ISSUE-0023
- **Date:** 2026-06-27
- **Severity:** Critical (cross-tenant payment/wallet side-effect risk)
- **Area:** Commerce Core / Checkout / BNPL callback / Tenant isolation
- **Related Tasks:** TASK-0083
- **Symptoms:** A deep security review reported that `CheckoutService.handleBNPLCallback(storeId, providerPaymentId)` accepted a store context from the storefront callback route but looked up the local payment row only by `providerPaymentId`.
- **Expected:** A BNPL callback must resolve a payment only when the provider payment reference belongs to the active store. A callback for Store B must not find or act on Store A's payment.
- **Actual:** The payment lookup used `eq(s.payments.providerPaymentId, providerPaymentId)` without `eq(s.payments.storeId, storeId)`. Downstream order updates were store-scoped, but wallet/outbox side effects still used the caller-supplied `storeId` after finding another store's payment.
- **Root Cause:** The callback code trusted the resolved storefront slug/store context but did not bind it to the payment ownership lookup. Provider payment references were treated as globally sufficient identifiers instead of tenant-scoped references.
- **Fix:** Added `and(eq(s.payments.providerPaymentId, providerPaymentId), eq(s.payments.storeId, storeId))` to the BNPL callback payment query and changed the missing-payment error to include ownership mismatch.
- **Verification:** `tests/bnpl-callback-tenant-isolation.test.ts` asserts the store ownership predicate appears before provider confirmation. Adjacent checks passed: wallet idempotency specs, wallet posting wiring, order state machine/hardening, and low-stock BNPL callback source guards.
- **Prevention:** Keep BNPL callback tenant-isolation regression coverage. Any future payment lookup by provider reference must include store ownership unless an explicit admin/reconciliation path documents why it is cross-store.
- **Status:** Fixed.

---

### ISSUE-0022: Saudi Policy Generator Templates Contained CJK Fragments

- **ID:** ISSUE-0022
- **Date:** 2026-06-27
- **Severity:** Medium (merchant-facing trust/compliance issue on staging policy drafts)
- **Area:** Merchant Dashboard / Commerce Core / Saudi policy generator
- **Related Tasks:** TASK-0082
- **Symptoms:** Merchant staging `/policies` displayed Chinese characters inside Arabic policy drafts, including `ت交易` in the privacy retention clause and `除非` in the returns-cost clause. The same output also contained `plus 5` inside Arabic copy and minor typos such as `الععميل` and `كمالياً`.
- **Expected:** Generated Saudi policy drafts should be clean Arabic legal/product copy with no CJK contamination and no mixed-language fragments unless explicitly intentional.
- **Actual:** The non-Arabic fragments were embedded directly in `packages/commerce-core/src/saudi-policy-generator.ts`, so every preview/apply flow inherited the broken text.
- **Root Cause:** Policy copy was edited as static template text without a regression guard for unexpected Unicode ranges or core Saudi compliance phrases.
- **Fix:** Replaced contaminated phrases at the source, corrected Arabic typos, and strengthened privacy/shipping/terms copy with legal-basis, data-subject-rights, retention/deletion, and 15-day delayed-delivery cancellation language.
- **Verification:** `tests/saudi-policy-generator.test.ts` now asserts generated drafts contain no CJK characters, do not contain `plus 5`, and include required Saudi compliance phrases.
- **Prevention:** Keep a source-level generator regression for forbidden CJK characters and required Saudi e-commerce/privacy clauses whenever policy templates change.
- **Status:** Fixed.

---

### ISSUE-0021: P3 Support Fingerprints Were Dropped Before RCA Logic

- **ID:** ISSUE-0021
- **Date:** 2026-06-26
- **Severity:** Low/Medium (does not create false alerts, but can hide repeated reportable support problems)
- **Area:** Observability / Local monitoring / Support error analysis
- **Related Tasks:** TASK-0081
- **Symptoms:** Recent P3 support-error events such as `NETWORK-001` or `VALIDATION-001` were counted as passive events. Three current events with the same P3 support fingerprint produced `Actionable events in window: 0` and did not trigger the repeated-fingerprint RCA recommendation.
- **Expected:** Passive monitoring pass/warn noise should be ignored, but active support-error events through P3 should stay visible in analyzer counts and repeated-fingerprint RCA recommendations.
- **Actual:** `scripts/ops-events.mjs` allowed only P0/P1/P2 support events through `isActionableEvent()`. P3 support events were grouped with passive monitoring noise.
- **Root Cause:** The stale-noise fix correctly filtered passive monitoring events but made the support severity allow-list too narrow. It conflated support P3 events with passive P3 health/check events.
- **Fix:** Extended the support-event actionable severity allow-list to include P3. Added regression coverage that mixes three repeated P3 support events with one passive P3 monitoring pass and asserts only the support events are actionable and RCA-triggering.
- **Verification:** `pnpm vitest run tests/ops-errors-analyzer.test.ts` covers the failing case and the existing stale/passive/recovered cases.
- **Prevention:** Keep support-event classification separate from monitoring pass/warn classification. P3 support errors are reportable; P3 monitoring pass/warn events are passive unless they become explicit failures.
- **Status:** Fixed.

---

### ISSUE-0020: Ops Error Analyzer Recommended Incidents from Stale and Passive Events

- **ID:** ISSUE-0020
- **Date:** 2026-06-26
- **Severity:** Medium (creates false operational urgency and hides current signal)
- **Area:** Observability / Local monitoring / Support error analysis
- **Related Tasks:** TASK-0078
- **Symptoms:** `pnpm ops:monitor`, `pnpm ops:errors`, and `pnpm ops:monitor:report` reported repeated P0/RCA/Critical status even though `pnpm preflight` and the full test suite were clean. The report also ranked passive health-check targets such as `package.json exists` as top affected targets and stayed degraded after later passing checks.
- **Expected:** Historical events should remain visible for context, but incident/RCA recommendations should be based only on recent actionable failures. Current health should represent the latest result per check target.
- **Actual:** `scripts/analyze-support-errors.mjs` and `scripts/generate-monitoring-report.mjs` each merged `storage/monitoring-events.ndjson` and `storage/support-error-events.ndjson` with duplicated, unwindowed classification logic. The report counted every warning inside the active window even if the same target later passed.
- **Root Cause:** Event classification lived in two scripts instead of one shared module, had no active lookback window, and the monitoring report summarized historical/window totals as current state instead of reducing checks to their latest target status.
- **Fix:** Added `scripts/ops-events.mjs` as the single source of truth for NDJSON reading, lookback filtering, actionable-event classification, and count helpers. Refactored both analyzer and report generator to use it. The report now computes current health from the latest check event per source/checkType/app/target.
- **Verification:** `pnpm vitest run tests/ops-errors-analyzer.test.ts` passes 6/6. `pnpm ops:errors` reports no recommended tasks/incidents. `pnpm ops:monitor` reports API/storefront/dashboard runtime and synthetic checks passing. `pnpm ops:monitor:report` reports `Overall Status: Healthy`.
- **Prevention:** Regression coverage asserts shared classification is imported by both scripts, stale P0/RCA events do not trigger recommendations, recent repeated support fingerprints still trigger RCA, passive monitoring pass events do not rank as actionable targets, stale P0s do not make the report Critical, and recovered check targets produce Healthy status.
- **Status:** Fixed.

---

### ISSUE-0012: Fresh PostgreSQL Migration Fails Converting customers.total_spent

- **ID:** ISSUE-0012
- **Date:** 2026-06-20
- **Severity:** High (blocks clean CI databases and fresh deployments)
- **Area:** Database / Drizzle migrations / CI
- **Related Tasks:** TASK-0054
- **Symptoms:** GitHub Actions Test job provisions PostgreSQL successfully, then `pnpm db:migrate` fails in migration 0010 with `column "total_spent" cannot be cast automatically to type numeric`.
- **Expected:** The full migration chain applies to a brand-new PostgreSQL 16 database.
- **Actual:** Migration 0010 used `ALTER COLUMN ... SET DATA TYPE numeric(14, 2)` without telling PostgreSQL how to cast the existing column type.
- **Root Cause:** The generated type-change SQL omitted an explicit `USING` expression and retained a default value whose old type PostgreSQL could not cast automatically. Existing developer databases had already passed this migration, so the defect only surfaced on a clean CI database.
- **Fix:** Migration 0010 now drops the old default, converts with `USING "total_spent"::numeric(14, 2)`, then restores a numeric default.
- **Prevention:** Added a regression assertion in `tests/migration-identifier-safety.test.ts`; CI now prepares a clean PostgreSQL database before the test suite.
- **Status:** Fix pushed for GitHub runner verification.

### ISSUE-0019: E2E Suite Targeted Apps That the Workflow Never Started

- **ID:** ISSUE-0019
- **Date:** 2026-06-20
- **Severity:** High (final CI gate)
- **Area:** E2E orchestration / UI selectors
- **Related Tasks:** TASK-0054
- **Symptoms:** Merchant and admin tests receive connection refused; critical storefront path times out waiting for the old add-to-cart label.
- **Root Cause:** Workflow started only API and storefront although the suite also covers ports 5173 and 5175. The critical path selected hidden carousel markup and then assumed the first product detail was purchasable, although stock state can legitimately remove the add button.
- **Fix:** Start and readiness-check all four applications; begin the purchase flow from the first visible, enabled add-to-cart button, which is the storefront's actual purchasability signal.
- **Prevention:** CI contract coverage requires merchant/admin startup and readiness ports.
- **Status:** Fix pushed for GitHub runner verification.

### ISSUE-0018: E2E Servers Started Before Workspace Packages Were Built

- **ID:** ISSUE-0018
- **Date:** 2026-06-20
- **Severity:** High (only remaining PR check failure)
- **Area:** E2E / Monorepo build order / CI
- **Related Tasks:** TASK-0054
- **Symptoms:** API cannot resolve `@haa/shared/dist/index.js`; storefront cannot resolve `@haa/theme-system`; readiness check times out.
- **Root Cause:** E2E installed dependencies and started source dev servers without compiling workspace packages whose package entries point to `dist`.
- **Fix:** E2E builds workspace packages in deterministic order before database setup and server startup.
- **Prevention:** CI contract test verifies package build precedes API startup.
- **Status:** Fix pushed for GitHub runner verification.

### ISSUE-0017: Test Setup Rewrote CI Database Name

- **ID:** ISSUE-0017
- **Date:** 2026-06-20
- **Severity:** High (tests run after successful seed but connect elsewhere)
- **Area:** Test environment / PostgreSQL / CI
- **Related Tasks:** TASK-0054
- **Symptoms:** Bootstrap and seed succeed on `haa_test`, then DB-backed tests fail because database `haastores_test` does not exist.
- **Root Cause:** `tests/setup.ts` derives `haastores_test` from `DATABASE_URL` unless `TEST_DATABASE_URL` is explicitly set.
- **Fix:** Test and E2E jobs now set `TEST_DATABASE_URL` to the provisioned `haa_test` service database.
- **Prevention:** CI contract coverage requires the explicit test database variable.
- **Status:** Fix pushed for GitHub runner verification.

### ISSUE-0016: Seed Checkout Sessions Referenced Nonexistent Carts

- **ID:** ISSUE-0016
- **Date:** 2026-06-20
- **Severity:** High (blocks clean seed)
- **Area:** Database seed / Referential integrity
- **Related Tasks:** TASK-0054
- **Symptoms:** Clean seed fails on `checkout_sessions_cart_id_carts_id_fk`.
- **Root Cause:** Completed and abandoned checkout-session fixtures assigned random UUIDs to `cartId` without inserting matching `carts` rows.
- **Fix:** Seed now creates a real cart for each checkout-session fixture and uses the returned ID.
- **Prevention:** Seed regression coverage rejects random `cartId` values and requires cart creation.
- **Status:** Fix pushed for GitHub runner verification.

### ISSUE-0015: Fresh Seed Inserts Subscription Plans Twice

- **ID:** ISSUE-0015
- **Date:** 2026-06-20
- **Severity:** High (blocks CI after successful bootstrap)
- **Area:** Database seed / CI
- **Related Tasks:** TASK-0054
- **Symptoms:** `pnpm db:bootstrap` succeeds, then `pnpm db:seed` fails on `subscription_plans_code_unique`.
- **Root Cause:** The seed creates plans near startup, then the fresh-tenant path inserted the same plan codes again.
- **Fix:** The fresh-tenant plan loop now looks up each unique code and reuses the existing row before inserting.
- **Prevention:** Added `tests/seed-subscription-plans-idempotency.test.ts`.
- **Status:** Fix pushed for GitHub runner verification.

### ISSUE-0014: Fresh-DB Hash Recorder Contained a Developer-Machine Absolute Path

- **ID:** ISSUE-0014
- **Date:** 2026-06-20
- **Severity:** High (bootstrap applies SQL but fails before recording hashes)
- **Area:** Database bootstrap / CI portability
- **Related Tasks:** TASK-0054
- **Symptoms:** `pnpm db:bootstrap` applied all 65 SQL migrations, then failed with `ERR_MODULE_NOT_FOUND` referencing `/Users/thwany/Desktop/haa-stores-core/node_modules/...`.
- **Root Cause:** `scripts/record-migration-hashes.mjs` imported `postgres` and located migration files through absolute paths from one developer machine.
- **Fix:** Use the normal `postgres` package import and derive repository paths from `import.meta.url`.
- **Prevention:** CI contract coverage rejects `/Users/` paths in the bootstrap helper.
- **Status:** Fix pushed for GitHub runner verification.

### ISSUE-0013: Clean CI Database Must Use the Documented Bootstrap Path

- **ID:** ISSUE-0013
- **Date:** 2026-06-20
- **Severity:** High (blocks Test and E2E jobs)
- **Area:** Database / Drizzle migrations / CI
- **Related Tasks:** TASK-0054
- **Symptoms:** After repairing the numeric cast, `drizzle-kit migrate` reached a later historical migration and failed because `store_settings.theme_config` already existed.
- **Root Cause:** The retained historical migration set includes intentional/idempotent repair overlap. The project already documents `pnpm db:bootstrap` as the supported clean-database path; CI incorrectly used raw `pnpm db:migrate`.
- **Fix:** CI Test and E2E jobs now use `pnpm db:bootstrap`, followed by seeding. The bootstrap applies SQL with repair overlap tolerated and records migration hashes for future normal migrate calls.
- **Prevention:** CI contract tests require the bootstrap command for clean test databases.
- **Status:** Fix pushed for GitHub runner verification.

### ISSUE-0010: Vite HMR Transient Errors Surfacing as DASH-001 P0 (INC-20260615-001..005)

- **ID:** ISSUE-0010
- **Date:** 2026-06-18
- **Severity:** Low (cosmetic dev-env noise; was misclassified as P0)
- **Area:** Merchant Dashboard / Dev environment / Error capture
- **Related Error Codes:** DASH-001
- **Related Tasks:** INC-20260615-001..005
- **Symptoms:** `pnpm ops:monitor` reported 5 P0 incidents on 2026-06-15 (15:27–15:54 UTC) for `apps/merchant-dashboard/src/pages/Login.tsx`:
  - INC-001 + INC-002: `useRef is not defined` (15:27 + 15:42)
  - INC-003: `tickerRef is not defined` (15:42)
  - INC-004 + INC-005: `Failed to fetch dynamically imported module: http://localhost:5173/src/pages/Login.tsx?t=<timestamp>` (15:53 + 15:54)
- **Expected:** Either (a) real React/JS errors in production code, or (b) no errors at all.
- **Actual:** `apps/merchant-dashboard/src/pages/Login.tsx` (149 LOC) imports `useState, useEffect` from 'react' (correct). No `useRef` or `tickerRef` anywhere in the file. The reported `route` was `/login` (the Login page itself), not `/dashboard` as initially suspected. The dashboard was the **origin of the error report**, not the source of the error.
- **Root Cause:** Vite Fast Refresh transient — when a module is hot-replaced, React's HMR runtime can briefly hold a stale closure that references hooks (`useRef`) or local variables (`tickerRef`) from a previous module version. The error surfaces once, gets caught by `ErrorBoundary`, and disappears after the next reload. The error message itself is React telling us "this name is not defined in the current module scope", which is true _temporarily_ during HMR.
- **Why they were flagged as P0:** `pnpm ops:monitor` escalates any 3+ same-fingerprint as P0. Five near-identical events within 30 min tripped that threshold. The classification was correct by rule but the rule was overly aggressive for dev-only HMR noise.
- **Fix:**
  1. **ErrorBoundary hardening** (this session) — `apps/{merchant-dashboard,storefront,admin-dashboard}/src/.../ErrorBoundary.tsx` now adds:
     - `isPersistent` detection (same fingerprint ≥3 in 60s)
     - `componentFrame` from `info.componentStack` for better debugging
     - Persistent/transient user messaging in Arabic
     - "العودة للرئيسية" fallback link
  2. **Verification** — `pnpm typecheck` clean, ErrorBoundary code path covered by `tests/error-boundary-transient.test.ts` (new).
  3. **No production code change needed** — `Login.tsx` was never broken; the P0 flag was a false positive.
- **Prevention:**
  - Vite HMR transient errors will continue to fire during development. The new ErrorBoundary `isPersistent` flag distinguishes them from real production bugs.
  - For ops:monitor P0 classification, consider lowering the dev-env auto-escalation threshold OR adding a tag-based filter (`tags: ["hmr","dev-transient"]` is now reserved for future use).
  - Re-running `pnpm ops:monitor` on a clean dev session (no Vite HMR) should produce zero P0.
- **Regression Checklist Update:** See REGRESSION_CHECKLIST.md → Dynamic Error Capture → added "ErrorBoundary reports `isPersistent` and `componentFrame` for every caught error".
- **Status:** Resolved (2026-06-18) — dev-env noise properly classified; no production fix needed.

---

### ISSUE-0011: Missing `store_billing_settings` Row Causes 6 API-001 Fingerprints

- **ID:** ISSUE-0011
- **Date:** 2026-06-18
- **Severity:** Medium (dev data gap, not code bug)
- **Area:** Database / Seed / Wallet / Marketplace
- **Related Error Codes:** API-001
- **Related Tasks:** TASK-0053 (recommend)
- **Symptoms:** `pnpm ops:errors` reported 6 repeated fingerprints (≥3 occurrences each, total ~209 events) for `Failed_query:_select_..._platform_fee_mode..._cod_fee_mode...` on:
  - `/marketplace/categories` (48 events)
  - `/merchant/1/categories` (39)
  - `/merchant/1/reports/low-stock` (33)
  - `/marketplace/products` (36 + 12)
  - `/merchant/1/wallet/summary` (41)
- **Expected:** Every store should have a `store_billing_settings` row (1:1) so `StoreBillingSettingsService.getPlatformFeePolicy()` and `getCodFeePolicy()` return values, not throw.
- **Actual:** `pnpm db:seed` (`packages/db/src/seed/index.ts`) creates `tenants`, `users`, `stores`, `products`, `categories`, etc. but **does NOT insert a `store_billing_settings` row** for the demo stores. The `getPlatformFeePolicy` helper returns the `DEFAULT_PLATFORM_FEE_POLICY` when no row exists — so checkout does not break — but `getRawSettings()` and certain code paths call `select *` on the table and fail if the row is absent.
- **Root Cause:** Seed drift — `store_billing_settings` (migration 0050) was added later than the seed script was last updated. The seed was never extended to backfill the new table.
- **Fix:** Created `scripts/seed-billing-guards.ts` (this session) — idempotent script that:
  1. Reads every `storeId` from `stores` table
  2. For each storeId, checks if a `store_billing_settings` row exists
  3. If missing, inserts a default row (`mode: 'percentage'`, `pct: 2`, `enabled: true`)
  4. Logs progress + final summary
  5. Wired into `pnpm db:seed` as a final step (idempotent)
- **Verification:**
  - `pnpm tsx scripts/seed-billing-guards.ts` (or auto via `pnpm db:seed`) — every store now has a row.
  - `tests/seed-billing-guards.test.ts` (new) — source-grep test that asserts:
    1. Script file exists
    2. Script uses `onConflictDoNothing()` for idempotency
    3. Script iterates all stores
    4. Seed script calls/imports the guards script
- **Prevention:**
  - Every new `store_*` table added by future migration MUST be backfilled by `seed-billing-guards.ts` (or a sibling guards script) or the seed script directly. Add this as a checklist item in `REGRESSION_CHECKLIST.md` → Database section.
  - Consider a `scripts/verify-seed-coverage.ts` that asserts every store has a row in every per-store table.
- **Regression Checklist Update:** Added "Every per-store table has a seed guards script" under Database.
- **Status:** Fixed (2026-06-18) — seed gap closed, 209 historical events archived.

---

### ISSUE-0009: Demo Support KB Table Missing After Migration Drift

- **ID:** ISSUE-0009
- **Date:** 2026-06-14
- **Severity:** Medium
- **Area:** Storefront support / Database / Demo operations
- **Related Error Codes:** API-001
- **Related Tasks:** TASK-0023
- **Symptoms:** `pnpm ops:monitor` repeatedly recommended RCA for `/s/demo-perfumes/support/kb` with fingerprint `API-001::unknown::/s/demo-perfumes/support/kb::Failed_query:_select_"id",_"store_id",_"title",_"slug",_"con`.
- **Expected:** Demo support KB route should return an empty published-articles payload when no articles exist.
- **Actual:** The API returned 500 because `knowledge_base_articles` was absent in the local database.
- **Root Cause:** Local migration state drift: the historical migration containing `knowledge_base_articles` was recorded as applied, but the table was missing.
- **Fix:** Added idempotent repair migration `0039_repair_support_kb_articles.sql`, ran `pnpm db:migrate`, verified the table and route, then archived stale support-error events.
- **Prevention:** For support/data features, verify critical tables exist after migration-state repair and rerun `pnpm ops:monitor` before closing.
- **Regression Checklist Update:** Demo/support monitoring checks should include `/s/demo-perfumes/support/kb` returning 200.
- **Status:** Fixed

---

### ISSUE-0006: Marketing Events Insert Failure

- **ID:** ISSUE-0006
- **Date:** 2026-06-13
- **Severity:** Medium
- **Area:** Storefront analytics / API / Data
- **Related Error Codes:** API-001
- **Related Tasks:** TASK-0018
- **Symptoms:** `pnpm ops:errors` reports repeated fingerprint `API-001::unknown::/s/haa-demo/events::Failed_query:_insert_into_"marketing_events"_...` 3 times.
- **Expected:** Storefront tracking events should be accepted or safely ignored without repeated API-001 failures.
- **Actual:** Local support error analysis shows repeated failed inserts into `marketing_events`.
- **Root Cause:** Unknown. Needs focused RCA; likely candidates are local migration drift, schema mismatch, or event payload mismatch.
- **Fix:** Pending.
- **Prevention:** Keep marketing event schema, migrations, seed/test DB, and tracker payloads aligned.
- **Regression Checklist Update:** Pending after fix.
- **Status:** Open

---

### ISSUE-0004: Local Dev Port Map Drift

- **ID:** ISSUE-0004
- **Date:** 2026-06-13
- **Severity:** High
- **Area:** Local runtime / Monitoring
- **Related Error Codes:** DASH-001, SYS-003
- **Related Tasks:** TASK-0016
- **Symptoms:** Browser reports `ERR_CONNECTION_REFUSED` for localhost when dev servers are stopped. Monitoring/synthetic checks can also report misleading storefront/dashboard availability because their port map did not match Vite configs.
- **Expected:** API runs on `3000`, merchant dashboard on `5173`, storefront on `5174`, and admin dashboard on `5175`. Health and synthetic scripts must check those exact services on those exact ports.
- **Actual:** Vite could choose another port if the preferred port was occupied, and monitoring scripts checked storefront on `5173` and merchant dashboard on `5174`.
- **Root Cause:** Port ownership was not enforced with `strictPort`, and monitoring scripts had stale/reversed hardcoded URLs.
- **Fix:** Added `strictPort: true` to all dashboard/storefront Vite configs and corrected `monitor-health.mjs` plus `synthetic-checks.mjs` to use the canonical local port map.
- **Prevention:** Any future local app port change must update `.env`, the app Vite config, `monitor-health.mjs`, `synthetic-checks.mjs`, and `CURRENT_STATE.md` together.
- **Regression Checklist Update:** Added local port governance checks.
- **Status:** Fixed

---

### ISSUE-0007: Support Ticket Token Was Exposed in Newly-Created URLs

- **ID:** ISSUE-0007
- **Date:** 2026-06-13
- **Severity:** Medium
- **Area:** Storefront / Support / Security
- **Related Error Codes:** None
- **Related Tasks:** TASK-0018, SEC-006
- **Symptoms:** Customer support ticket links included `?accessToken=...`, exposing the ticket access secret to browser history, referrers, and logs.
- **Expected:** Ticket access token should be transmitted in an HTTP header (`X-Support-Access-Token` or `Authorization: Bearer`) and should not be embedded in newly-generated URLs.
- **Actual:** Storefront created ticket URLs with `accessToken` in the query string and the API only read ticket tokens from query/body.
- **Root Cause:** Original support flow optimized for shareable direct links and did not treat the ticket access token as a secret transport value.
- **Fix:** Storefront now stores the token locally/prints it as an access code, creates clean ticket URLs, and sends the token via `X-Support-Access-Token`. API endpoints accept header or bearer token, with temporary legacy query/body compatibility for old links.
- **Prevention:** Regression test blocks creating new `?accessToken=` ticket links and verifies header-based API client usage.
- **Regression Checklist Update:** Security Baseline includes "Support ticket auth uses header, not query param."
- **Status:** Fixed

### ISSUE-0006: Marketplace Migration State Drift and After-Sales Scope Conflict

- **ID:** ISSUE-0006
- **Date:** 2026-06-13
- **Severity:** High
- **Area:** Database / Marketplace / Operations
- **Related Error Codes:** None
- **Related Tasks:** TASK-0018
- **Symptoms:** Drizzle migration journal did not match the SQL migration files present in the repo, and marketplace after-sales artifacts existed despite the product boundary that merchants own procedures after checkout.
- **Expected:** `pnpm db:migrate` should run cleanly from project state, marketplace migrations should include only product opt-in/governance/order attribution, and no marketplace after-sales table should be part of the platform marketplace scope.
- **Actual:** Migration metadata lagged behind actual migration files, and after-sales schema/migration artifacts conflicted with the final marketplace responsibility model.
- **Root Cause:** Several feature passes added or adjusted migrations without reconciling Drizzle journal metadata and without removing earlier after-sales prototype files after the product decision changed.
- **Fix:** Rebuilt the Drizzle journal to match actual retained SQL files, synchronized local Drizzle migration records, confirmed `pnpm db:migrate` succeeds, and removed marketplace after-sales schema/migration artifacts.
- **Prevention:** Run `pnpm db:migrate` as part of marketplace/data work verification and reject marketplace-owned shipping/returns/dispute tables unless a new decision is documented.
- **Regression Checklist Update:** Added database and marketplace checks for Drizzle migration success and no marketplace after-sales table.
- **Status:** Fixed

### ISSUE-0008: Historical Marketing Events Insert Fingerprint After Migration Drift

- **ID:** ISSUE-0008
- **Date:** 2026-06-13
- **Severity:** Medium
- **Area:** Marketing / Database / Monitoring
- **Related Error Codes:** API-001
- **Related Tasks:** TASK-0019
- **Symptoms:** `pnpm ops:errors` reported a repeated fingerprint for `/s/haa-demo/events` inserting into `marketing_events`.
- **Expected:** Marketing event ingestion should find the `marketing_events` table and not generate repeated API-001 fingerprints.
- **Actual:** Active support-error events showed 13 repeated insert failures for `marketing_events`, and direct DB inspection showed the marketing tables were absent.
- **Root Cause:** The local Drizzle migration state was out of sync: the old migration that should have created marketing tables was recorded as applied while the actual tables were missing.
- **Fix:** Added idempotent repair migration `0037_repair_marketing_tables.sql`, verified `pnpm db:migrate`, confirmed `marketing_events`, `marketing_sessions`, and `product_performance_daily` exist, and verified `/s/haa-demo/events` returns `201`.
- **Prevention:** Run `pnpm db:migrate` after adding marketing/data migrations and keep migration journal entries aligned with retained SQL files.
- **Regression Checklist Update:** Database section now requires `pnpm db:migrate` and journal/file alignment checks.
- **Status:** Fixed — historical events archived under `storage/archive/`

---

## Issue Template

- **ID:** ISSUE-XXXX
- **Date:**
- **Severity:** Critical / High / Medium / Low
- **Area:**
- **Related Error Codes:**
- **Related Tasks:**
- **Symptoms:**
- **Expected:**
- **Actual:**
- **Root Cause:**
- **Fix:**
- **Prevention:**
- **Regression Checklist Update:**
- **Status:** Open / Fixed / Won't Fix / Duplicate

---

## Open Issues

_(No issues recorded yet)_

## Fixed Issues

### ISSUE-0005: LiveRadar JSX Structure Broke Merchant Dashboard Typecheck

- **ID:** ISSUE-0005
- **Date:** 2026-06-13
- **Severity:** Medium
- **Area:** Merchant Dashboard / Live Radar
- **Related Error Codes:** None
- **Related Tasks:** TASK-0015
- **Symptoms:** `pnpm typecheck` and ESLint failed on `apps/merchant-dashboard/src/pages/LiveRadar.tsx` with parser errors around the end of the component.
- **Expected:** LiveRadar compiles cleanly and does not block full monorepo verification.
- **Actual:** `HistoryCard` was missing its closing function brace, a redundant JSX fragment was left open, and Select setters were passed directly to string-valued handlers.
- **Root Cause:** Incremental JSX edits left mismatched component structure and narrow union state setters incompatible with the generic Select callback signature.
- **Fix:** Closed `HistoryCard`, removed the redundant fragment, balanced the root JSX container, imported Select components, and wrapped Select handlers with explicit union casts.
- **Prevention:** Run targeted typecheck/ESLint immediately after adding nested helper components or Select controls.
- **Regression Checklist Update:** Covered by marketplace verification gates and full typecheck/ESLint.
- **Status:** Fixed

### ISSUE-0004: Marketing Types Self-Import Broke Shared Package Exports

- **ID:** ISSUE-0004
- **Date:** 2026-06-13
- **Severity:** Medium
- **Area:** Shared types / Marketing
- **Related Error Codes:** None
- **Related Tasks:** TASK-0015
- **Symptoms:** Full monorepo typecheck failed in `packages/shared/src/types/marketing.ts` with missing exports and circular definitions.
- **Expected:** Marketing analytics/live-radar types are concrete exports from shared.
- **Actual:** The file imported `LiveOverview`, `LivePages`, and related types from itself via `./marketing.js`, creating a broken self-import and leaving required exports unresolved.
- **Root Cause:** A generated/merged type file attempted to re-import its own exports instead of defining them locally.
- **Fix:** Replaced the self-import with concrete exported constants and type/interface definitions for marketing events, sessions, performance metrics, live radar, geo, funnel, alerts, and heartbeat payloads. Aligned `MARKETING_EVENT_TYPES` with the tested taxonomy (`view_product`, `search`, campaign/share events, cancellation/refund events).
- **Prevention:** Shared type files must not import from their own compiled module path; add explicit exported definitions or import from a different source module.
- **Regression Checklist Update:** Covered by full shared package typecheck and monorepo typecheck.
- **Status:** Fixed

### ISSUE-0003: Storefront Theme Hydration Flicker (Flash of Wrong Theme)

- **ID:** ISSUE-0003
- **Date:** 2026-06-13
- **Severity:** High
- **Area:** Storefront / Theme loading
- **Related Error Codes:** THEME-003
- **Related Tasks:** TASK-0008
- **Symptoms:** Opening a storefront shows base-elegant theme (or previous theme) for one frame, then switches to the correct theme (e.g., luxury-showcase). Visual flash on every navigation.
- **Expected:** Storefront shows only the correct theme or a neutral skeleton while loading. Never shows a different theme momentarily.
- **Actual:** `Layout.tsx` rendered themed content (Header/Footer/Outlet) immediately with `resolveStorefrontThemeKey(null)` → `'base-elegant'` before the async `useThemeConfig(slug)` resolved. After 1 frame, the real theme arrived, causing a swap → flash.
- **Root Cause:** `Layout.tsx` called `resolveStorefrontThemeKey(null)` on first render (before API response), which returned `DEFAULT_STOREFRONT_THEME_KEY = 'base-elegant'`. Themed components rendered with the wrong key for one frame, then re-rendered with the correct key when `useThemeConfig` resolved.
- **Fix:**
  1. Added `useEffect` + state guard in `Layout.tsx`: do not render themed content until `themeConfig` is non-null
  2. While loading, render a neutral `ThemeLoadingSkeleton` that uses only Tailwind built-in colors (`bg-gray-100`, `bg-gray-200`) — zero theme CSS variables
  3. Added 8-second fallback timeout: if theme fails to load, render with default fallback (`resolveStorefrontThemeKey(null)`)
  4. CSS vars are applied synchronously via `loadTheme()` → `applyStoreTheme()` before `setConfig()`, so by the time React re-renders, the correct colors are already in the DOM
- **Prevention:**
  - Storefront must NEVER render themed components before `themeConfig` is resolved
  - `resolveStorefrontThemeKey(null)` is only safe for fallback after failure, not for initial render
  - Any new page component added to storefront must be rendered inside `<Outlet />` (already inside Layout guard) or have its own loading guard
- **Regression Checklist Update:**
  - Added "No themed content rendered before themeConfig resolves"
  - Added "Skeleton uses only neutral Tailwind colors (no theme CSS vars)"
  - Added "Fallback timeout exists for theme loading failure"
- **Status:** Fixed

### ISSUE-0001: Storefront Theme Leakage via @haa/theme-system Main Entry

- **ID:** ISSUE-0001
- **Date:** 2026-06-13
- **Severity:** High
- **Area:** Theme isolation / Package boundaries
- **Related Error Codes:** THEME-001, THEME-002
- **Related Tasks:** TASK-0007
- **Symptoms:** Merchant-dashboard imported from `@haa/theme-system` which bundles DOM-manipulation functions (`applyTheme`, `applyStoreTheme`, `clearTheme`, `loadTheme`) and analytics script injection (GTM, GA, Facebook Pixel). Any code path could accidentally call these and leak storefront theme CSS variables to the global scope.
- **Expected:** Merchant-dashboard should only import server-safe functions (registry reads, validation, config resolution) without bundling DOM code.
- **Actual:** Imports from `@haa/theme-system` (main entry) resolved to `src/index.ts` which exports all DOM functions.
- **Root Cause:** `@haa/theme-system` package has a `/server` subpath export for server-safe functions, but:
  1. The server export pointed to `dist/` (built output) instead of `src/` — no build existed, so TypeScript resolved to the `.d.ts` but failed on runtime
  2. `validateThemeConfig` was missing from server exports
  3. Merchant-dashboard was importing from the main entry instead of the server subpath
- **Fix:**
  1. Added `validateThemeConfig` and `ValidationResult` to `@haa/theme-system/src/server.ts`
  2. Fixed `@haa/theme-system/package.json` server export to point to `src/server.ts`
  3. Changed `ThemeStore.tsx` and `ThemeEditor.tsx` imports from `@haa/theme-system` to `@haa/theme-system/server`

### ISSUE-0002: Luxury-Showcase Theme Injects Global !important Body Style

- **ID:** ISSUE-0002
- **Date:** 2026-06-13
- **Severity:** Medium
- **Area:** Storefront theme / CSS scoping
- **Related Error Codes:** THEME-002
- **Related Tasks:** TASK-0007
- **Symptoms:** `luxury-showcase/Header.tsx` injected `<style>{'body, html { background-color: #faf8f6 !important; }'}</style>` which bypasses `#storefront-scope` and applies globally. If this theme is loaded in the same browser session, it could affect other pages.
- **Expected:** Theme styles should be scoped to `#storefront-scope`. No `!important` on global selectors.
- **Actual:** Hardcoded `!important` style on `body, html` with hex color, not CSS variable.
- **Root Cause:** Developer convenience — the background color was set directly on body to prevent white flash, without considering scoping.
- **Fix:** Removed the `<style>` block entirely. Background color is already inherited from `#storefront-scope` which has `background-color: var(--surface-1)` set via CSS variables from the theme config.
- **Prevention:** Storefront theme components must never use `body, html, :root, *` selectors with `!important`. Use `#storefront-scope` or `data-storefront-theme` attribute for scoping.
- **Regression Checklist Update:** Added "No global !important body/html styles in any storefront theme component"
- **Status:** Fixed

## Prevention Notes

- When fixing an issue, always identify root cause before implementing fix
- Update REGRESSION_CHECKLIST.md if the issue can regress
- If the issue reveals a process gap, update the relevant docs/ops/ file
- Search `storage/support-error-events.ndjson` by fingerprint to find all occurrences of the same issue
- Use the correlationId in the event to find linked frontend ↔ backend errors
- For P0 issues, create an incident in INCIDENTS.md referencing the eventId
