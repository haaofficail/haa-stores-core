# Regression Checklist

> Use this checklist whenever making changes to prevent reintroducing past issues.
> Update this list when a new root cause is identified.

---

## General

- [ ] `pnpm preflight` passes
- [ ] `pnpm typecheck` passes
- [ ] Relevant tests pass (or reason documented)
- [ ] Full local smoke that touches orders/tracking confirms local DB migrations are applied, especially `0077_order_preparation_status.sql`
- [ ] Smoke-test response-shape assertions match the current API contract before treating failures as product defects
- [ ] `git diff` reviewed — no unrelated changes
- [ ] No files outside scope were modified
- [ ] docs/ops/ files updated if needed
- [ ] Mixed-agent handoffs are staged narrowly; do not use broad `git add .` when financial/RBAC/frontend/docs/storage artifacts coexist

## CI / Docker

- [ ] CI Test job provisions PostgreSQL before DB-backed tests
- [ ] CI Test/E2E jobs run `pnpm db:bootstrap` and seeds on clean databases
- [ ] CI E2E Playwright defaults target local dev servers, not shared staging, unless explicit staging env vars are set
- [ ] GitHub Actions `run:` blocks pass `${{ inputs.* }}` through `env` variables instead of interpolating expressions directly into shell logic
- [ ] Secret-like workflow-dispatch inputs are not stored in job-level env; mask them by reading `GITHUB_EVENT_PATH` before later step env use, or generate new operational secrets inside the runner with a non-secret sentinel
- [ ] SSH/remote workflow payloads that may contain newlines or shell metacharacters are transferred via quoted/base64-safe values
- [ ] Staging ops workflows avoid `ssh-keyscan` probing fallback when known-host secrets are missing; use pre-baked known-host secrets or `StrictHostKeyChecking=accept-new` for first-connect fallback
- [ ] Sonar CPD excludes templated governance docs; Markdown compliance/runbook repetition should not fail code duplication gates
- [ ] Repeated admin-dashboard nav/list/loading/export UI patterns are extracted to shared helpers before relying on Sonar exclusions
- [ ] Bash hook scripts use `[[ ]]` conditionals instead of `[` where bash is available
- [ ] Numeric type-change migrations include an explicit PostgreSQL `USING` cast
- [ ] Workspace packages build before individual app builds
- [ ] Docker build stages compile workspace packages before apps
- [ ] Production-only installs do not invoke dev-only Husky hooks
- [ ] PR checks are green before merge to `main`

## Local Port Governance

- [ ] API health endpoint is checked on `http://localhost:3000/health`
- [ ] Merchant dashboard is checked on `http://localhost:5173`
- [ ] Storefront is checked on `http://localhost:5174`
- [ ] Admin dashboard reserves `http://localhost:5175`
- [ ] Vite apps use `strictPort: true` so port conflicts fail visibly
- [ ] `pnpm ops:monitor` passes after starting local dev servers

## UI / UX

- [ ] RTL layout correct
- [ ] Mobile layout correct (responsive breakpoints)
- [ ] Spacing consistent with design tokens
- [ ] Loading states present where needed
- [ ] Empty states present where needed
- [ ] Error states present where needed
- [ ] Failed checkout payment shows a persistent recovery surface with retry, change-payment, and support actions; it must not be toast-only
- [ ] Dangerous admin financial actions require an explicit confirmation modal before calling the API
- [ ] Admin bank-account verify/reject requires a review reason and the API validates that reason before changing status
- [ ] Admin tenant/store status changes require an explicit reason in UI and API validation; normal edit forms must not bypass the status reason gate
- [ ] Direct tenant/store deletion stays hidden from the admin UI during beta, and `DELETE /admin/tenants/:id` / `DELETE /admin/stores/:id` return `FORBIDDEN_BETA_POLICY` instead of hard-deleting rows
- [ ] Marketplace product rejection/suspension requires a moderation note in UI and API validation
- [ ] Admin Marketplace products and unified orders preserve server pagination metadata (`page`, `limit`, `total`, `totalPages`) through the API client and drive `TablePager` from server totals, not hardcoded 200-row slices or local row counts
- [ ] Admin sidebar hides server-gated pages when the admin JWT lacks the matching permission
- [ ] Direct navigation to server-gated admin pages shows `UnauthorizedState` instead of fetching and collapsing into an error/empty state
- [ ] Admin UI must not invent permission guards for routes whose API lacks explicit `requireAdminPermission`; add the API guard first or keep the UI route unguarded
- [ ] Admin operational routes must not remain `requireAdminAuth()`-only when they expose dashboard, payments, marketplace, audit, plans, upload, settings, users, billing, KYC, tenant, or store data/actions
- [ ] Admin route/sidebar permission keys must match server `requireAdminPermission(...)` keys
- [ ] Admin Webhooks/Idempotency operations stay wired end-to-end: `webhooks.read` route/sidebar guard, API-client helpers, stats cards, filters, table states, and `TablePager`
- [ ] Admin mutation buttons must reflect write/review/upload permissions before calling the API, not rely on a post-click 403
- [ ] Shared admin dialogs should use native dialog semantics without page-local noninteractive mouse listeners; source guards should not require explicit `role="dialog"` on `<dialog>`
- [ ] Platform-admin permission keys belong in `AdminPermission` / `ADMIN_PERMISSION_CATALOG`, not in the merchant employee `PERMISSION_CATALOG` unless intentionally shared
- [ ] Admin full-IBAN reveal routes use a dedicated `AdminPermission`, typed `AuditAction` values with Arabic labels, and audit only `ibanLast4` rather than the full IBAN
- [ ] Admin finance CSV export routes are API-guarded by `wallet.payout.export`; finance read-only pages must not generate official CSV locally from `wallet.payout.view_all` data
- [ ] Admin Store Billing Settings exposes platform fee and COD fee as separate policies; COD fields must flow through GET/PATCH, service audit old/new diff, admin API client, and UI before COD fee work is considered closed
- [ ] Admin Store Payment Settings save contract stays aligned: page sends canonical `enabled`/`status`/`supportedPaymentMethod`, API accepts `active`/`suspended`/`not_configured` plus service statuses `configured`/`invalid`, inserts default `supportedPaymentMethod: 'card'`, and saved-provider cache patching does not broad-refetch sibling unsaved rows or downgrade validated providers
- [ ] Merchant WhatsApp campaigns stay wired end-to-end: QR pairing remains intact, the page uses typed list/preview/create/send/delete helpers, actions are gated by `promotions:read/create/delete`, consent/opt-out copy is visible, send/delete routes return `data` envelopes, and scheduled campaign creation persists `status: 'scheduled'`
- [ ] Accountant settlement routes/pages are verified with the admin RBAC base (`UnauthorizedState`, `AdminPermissionRoute`, `hasAdminPermission`, permission reflection) before any financial PR is pushed
- [ ] Marketplace order tracking remains access-token-only; no public `phone` fallback, no `getOrderLegacy`, and no `?phone=` marketplace lookup URL
- [ ] Public marketplace seller APIs do not select or return store email/phone
- [ ] Public marketplace product/seller/stat/category queries apply the product-level prohibited-category guard, not only display/facet filters
- [ ] Merchant onboarding skip writes a resumable local draft, reopening `/onboarding` restores it, Getting Started links to resume, and completing onboarding clears the draft
- [ ] Merchant Products true empty catalog shows the first-product CTA, while filtered no-results does not show that CTA
- [ ] Merchant Employees missing `employees:view` shows `UnauthorizedState` and does not fetch employee data
- [ ] Merchant Employees last-owner guard explains that another owner must be assigned before edit/delete
- [ ] Storefront order tracking shows return/refund intake only for fulfilled buyer-visible orders and opens a support ticket without putting `accessToken` in the follow-up URL
- [ ] Storefront support exposes privacy data-export/deletion request actions that prefill structured support tickets and keep support `accessToken` out of follow-up URLs
- [ ] Storefront order confirmation missing-phone state shows a support/resend-help fallback and manual tracking uses `saveTrackPhone()` from `order-track-storage`
- [ ] Storefront coupon failures preserve server/API reasons and render as a persistent actionable `role="alert"` near the coupon field
- [ ] Storefront cart shipping estimate uses the existing shipping-rates endpoint, displays rates as estimates, and keeps final-price caveat visible
- [ ] Checkout stock depletion after cart entry returns typed `INSUFFICIENT_STOCK` 400 and shows return-to-cart recovery instead of a generic checkout/payment failure
- [ ] Merchant subscription plan-change confirmation shows current price, new price, price delta, proration estimate, effective timing, and period impact before API confirmation
- [ ] Storefront buyer phone fields in checkout/tracking/support flows declare tel semantics and LTR direction under RTL shells
- [ ] Fake 3DS challenge page shows a stable visible DEV/test badge and remains mounted only under `import.meta.env.DEV`
- [ ] Storefront buyer-facing raw controls expose accessible names and state semantics: carousel dots use `aria-current`, disclosure buttons use `aria-expanded`/`aria-controls`, product choices use `aria-pressed`, and spinner-only loading buttons keep an `aria-label`/`aria-busy`
- [ ] Merchant product-form media/options controls stay keyboard/screen-reader addressable: image upload is a named button, image/variant remove icon buttons have Arabic labels, and tag/category chips expose `aria-pressed`
- [ ] Merchant theme-editor controls expose Arabic accessible names and state semantics: preview device/zoom choices use `aria-pressed`, section disclosure controls use `aria-expanded`/`aria-controls`, row Enter/Space handling ignores nested buttons, image/brand remove actions are named, and link/source/category chips expose `aria-pressed`
- [ ] Non-financial admin dangerous-action dialogs use `AdminDialog` for dialog semantics: marketplace reject/suspend plus store/tenant status changes expose `role="dialog"`, `aria-modal`, title linkage, and description linkage
- [ ] Do not extend TASK-0122 into bank accounts, settlement/manual payout pages, accountant inbox/detail pages, admin-dashboard financial API-client actions, wallet-core, admin finance API routes, upload/PDF allowlist, or IBAN reveal while the financial Batch 4 stream is active
- [ ] When admin finance route logic moves into services, source-grep safety tests must read the service files for column-selection/audit guarantees while routes keep only auth/wiring responsibilities
- [ ] Product/media uploads stay image-only by default; PDF is allowed only through explicit financial-document upload paths that pass an opt-in option
- [ ] Admin Marketplace products pagination must preserve `/admin/marketplace/products` top-level `page`/`limit`/`total`/`totalPages` metadata in the API client and drive `TablePager` from server totals, not only local fetched rows
- [ ] Admin password reset must stay owned by `AdminAuthService`; do not import merchant `AuthFlowService` or `@haa/commerce-core` into admin auth routes
- [ ] Admin login/password reset must not use broad `users` selects that require unapplied TOTP columns; pre-migration staging must not lock out admins
- [ ] Admin TOTP secrets must be generated with `node:crypto`, verified with timing-safe comparison, and stored only in encrypted `admin_totp_*_encrypted` columns
- [ ] Merchant change-password keeps `tenantId`/`storeId` as JWT-derived server context for audit logs; `/auth/change-password` request schema must not accept tenant/store identifiers from the client.
- [ ] Sensitive admin mutations must keep `requireAdminTwoFactorIfEnabled()` after `requireAdminAuth()` and permission guards when the route mutates tenants, stores, KYC/bank accounts, payment settings, marketplace moderation, full IBAN reveal, payouts, billing, settings, upload, or plans
- [ ] New admin TOTP migrations must include matching Drizzle snapshots from `scripts/build-snapshots.cjs`; agents must not run `db:migrate`
- [ ] Every new migration journal entry must have a matching `packages/db/src/migrations/meta/<shortTag>_snapshot.json` generated by `scripts/build-snapshots.cjs`; do not apply migrations from agent tasks
- [ ] JSX ternary branches return one valid expression; comments inside branches are wrapped in a fragment or moved outside the ternary
- [ ] Source-grep UI tests assert shared `ErrorState` wiring when retry copy lives in the shared component
- [ ] Source-grep nav tests assert the current nav helper contract, not an obsolete object-literal shape
- [ ] Modal backdrops use native buttons or keyboard-accessible controls, not clickable plain `div` elements
- [ ] Sonar complexity refactors preserve runtime behavior with focused tests before changing source-grep contracts
- [ ] Wallet ledger complexity refactors preserve idempotency, balance-selection, and available/total balance semantics
- [ ] No random colors — tokens used
- [ ] No layout overflow or scroll issues
- [ ] Touch targets ≥ 44px on mobile
- [ ] Generated merchant policy drafts contain no CJK characters or unintended mixed-language fragments
- [ ] Saudi policy generator keeps privacy legal-basis/rights/retention clauses and delayed-delivery cancellation language covered by tests
- [ ] Print-window flows build DOM/textContent output instead of `document.write` HTML strings

## Theme

- [ ] Storefront theme works correctly
- [ ] Fallback theme works (if applicable)
- [ ] No CSS leakage to merchant-dashboard
- [ ] Merchant dashboard unaffected
- [ ] ProductDetail page works
- [ ] Home page works
- [ ] Header/Footer work correctly

## Permissions / RBAC

### Backend (Pass 1)

- [ ] API rejects unauthorized actions
- [ ] Public API-key routes under `/v1` declare scope authorization with `requireApiKeyScope(...)` middleware and do not reintroduce inline handler-body `meta.scopes.includes(...)` checks
- [ ] Branch/location scope respected
- [ ] No cross-store data leakage
- [ ] Audit logged where relevant
- [ ] Permission catalog (PERMISSION_CATALOG) contains all role permissions (no catalog drift)
- [ ] ROLE_PERMISSIONS map covers all 9 roles (owner, admin, manager, products_manager, orders_manager, warehouse_staff, accountant, support, viewer)
- [ ] Viewer role has no manage/create/update/delete permissions
- [ ] Customer create/update operations use correct write permissions (not read)
- [ ] Subscription routes protected by requirePermission()
- [ ] Dashboard summary routes protected by requirePermission()
- [ ] JWT contains permissions array; login/register/me return permissions
- [ ] Frontend PermissionGate component hides unauthorized actions
- [ ] Frontend usePermissions hook returns correct permissions for role
- [ ] getPermissionsForRole() helper returns expected permissions
- [ ] All 86 permission string literals in types/orders.ts are valid
- [ ] Arabic labels and risk levels present in PERMISSION_CATALOG
- [ ] Permission boundary tests (tests/rbac-permission-catalog.test.ts) pass

### Frontend Guards (Pass 2)

- [ ] Sidebar shows only nav items the user has permission for
- [ ] Sidebar groups with no visible items are hidden
- [ ] All dashboard routes wrapped with GuardedRoute / PermissionRoute
- [ ] Denied routes show UnauthorizedState instead of data
- [ ] All CRUD/action buttons guarded by PermissionGate across 20+ pages
- [ ] All sidebar & route permission strings exist in PERMISSION_CATALOG
- [ ] Dashboard RBAC boundary tests (tests/dashboard-rbac-guards.test.ts) pass

### Employee Management UI (Pass 3 + Pass 4)

- [ ] Employees page exists at /employees and guarded by employees:view
- [ ] Sidebar shows employees nav item in settings group
- [ ] Add button guarded by employees:invite
- [ ] Edit button guarded by employees:update
- [ ] Delete button guarded by employees:delete
- [ ] PermissionCheckboxMatrix built from PERMISSION_CATALOG (no hardcoded strings)
- [ ] Role presets fill checkboxes from ROLE_PERMISSIONS
- [ ] Warehouse staff role exists as `warehouse_staff` with fulfillment permissions only and no finance/settings/employee-management powers
- [ ] Employee role selector uses clear Arabic role labels and seeds permissions from the selected role
- [ ] High-risk permissions marked with warning
- [ ] Last owner protected — actions disabled
- [ ] Save button enabled and wired to API via onSave callback
- [ ] Custom permissions help copy matches current behavior
- [ ] Employee management tests (tests/employee-management.test.ts) pass
- [ ] API contract doc exists at docs/security/EMPLOYEE_MANAGEMENT_API_CONTRACT.md
- [ ] API boundary tests (tests/employee-management-api.test.ts) pass
- [ ] Merchant permission client endpoints include the mounted `/merchant/:storeId/permissions/...` prefix for catalog, presets, and membership permission reads/writes
- [ ] Permission membership route operations derive `storeId` from `c.req.param('storeId')` after `requireStoreAccess()`, not directly from `auth.activeStoreId`
- [ ] EmployeeFormDialog uses `useAuth().storeId` and does not read `Number(localStorage.getItem('active_store_id'))` directly
- [ ] Clearing all custom membership permissions sends an empty array to the permissions API instead of skipping the update
- [ ] Creating a new employee saves the selected custom permissions after invite when the actor has `employees:manage_permissions`
- [ ] Permission matrix copy matches current behavior: custom permissions save at store scope; branch/warehouse/channel scopes are not active for saving yet
- [ ] UI wire tests (tests/employee-ui-api-wire.test.ts) pass
- [ ] API endpoints: GET list, POST invite, PATCH update, DELETE remove, GET/PATCH membership permissions
- [ ] API enforces employee:\* permissions on all endpoints
- [ ] API safety rules: last owner, self-downgrade, duplicate email, invalid role, self-delete
- [ ] API custom permissions validates catalog keys and store-scoped membership permissions
- [ ] Admin API route permissions are typed through `AdminPermission` and covered by `tests/admin-api-rbac-alignment.test.ts`
- [ ] Employees page fetches from API (no mock data)
- [ ] Loading state shown while fetching
- [ ] Empty state shown when no employees
- [ ] Error state shown on API failure
- [ ] Create/invite wired to employeesApi.invite
- [ ] Update wired to employeesApi.update
- [ ] Delete wired to employeesApi.remove with confirm dialog
- [ ] Refetch after mutation
- [ ] All 1493 tests pass across 74 test files
- [ ] pnpm typecheck passes with no RBAC-related errors
- [ ] pnpm ops:monitor: all RBAC-related checks pass

### Employee Audit Logging (Pass 5)

- [ ] AuditLogService imported in employees.ts
- [ ] auditMeta() helper defined with actorUserId, tenantId, ipAddress, userAgent
- [ ] Invite success logs employee_invited with userId, name, email, role
- [ ] Duplicate invite rejected logs employee_duplicate_rejected
- [ ] Self-role-change blocked logs employee_self_restriction_blocked
- [ ] Self-delete blocked logs employee_self_restriction_blocked
- [ ] Last-owner delete blocked logs employee_last_owner_blocked
- [ ] Role change success logs employee_role_changed with oldValue/newValue
- [ ] Status toggle logs employee_status_changed or employee_removed
- [ ] Delete success logs employee_removed with oldValue
- [ ] Permission update success logs employee_permissions_updated with oldValue/newValue
- [ ] All audit calls include storeId: auth.activeStoreId
- [ ] All audit calls include entityType: 'employee'
- [ ] Invite create dialog shows clarity banner: "تم إنشاء الموظف محليًا. إرسال الدعوات البريدية غير مفعّل بعد."
- [ ] Password is not returned in API response
- [ ] Employee audit action labels exist in AUDIT_ACTION_LABELS
- [ ] Employee entity label exists in AUDIT_ENTITY_LABELS
- [ ] Audit boundary tests (tests/employee-management-api.test.ts) pass (40/40)
- [ ] No misleading "email sent" text in invite UI

## Orders / Payment / Shipping

- [ ] Order state transitions valid
- [ ] Payment methods unaffected
- [ ] BNPL callback payment lookup is scoped by both `providerPaymentId` and `storeId` before provider confirmation or wallet/order side effects
- [ ] Gift messages are plain-text sanitized before cart/session/order storage and again at public cart/order DTO output
- [ ] Shipment creation rejects unpaid non-COD orders, unconfirmed COD orders, unpacked orders, incomplete shipping addresses, and duplicate active shipments
- [ ] Checkout safe path works
- [ ] Checkout failed-payment path preserves the cart and offers retry/change-payment/support recovery
- [ ] `pnpm test:smoke` covers FakePaymentProvider success/failure/cancel/expiry/COD/bank-transfer/3DS scenarios, live payment blocking, and demo checkout fake-provider forcing
- [ ] `pnpm test:smoke` covers shipping live-mode blocking, manual/haa_mock `mock_ready` readiness, and provider-status route mounting
- [ ] Settlement payout approve, transfer-pending, transferred, and verify-transfer actions are never one-click API calls
- [ ] Bank account review writes the review reason into audit/notification context without exposing full IBAN
- [ ] Store status changes audit `statusReason` and invalidate store tenant cache after mutation
- [ ] Audit oldValue/newValue masking covers compound PII/secret keys such as customerEmail, customerPhone, accountNumber, cardNumber, nationalId, privateKeyPem, and authorizationHeader
- [ ] Audit masking keeps non-sensitive metadata useful and does not rely on UI-only masking
- [ ] Shipping label flow unaffected
- [ ] Webhooks considered (if relevant)

## API

- [ ] Input validation works
- [ ] Authentication enforced
- [ ] Error handling is safe (no stack traces in responses)
- [ ] No sensitive data leaked in responses
- [ ] `/health` includes dependency readiness for storage, payment, shipping, email, and observability
- [ ] `/health` reports missing key names only and never raw secret values, DSNs, API tokens, or provider credentials
- [ ] `/health` readiness checks do not call live payment or shipping providers
- [ ] Platform health tests (`tests/platform-health-readiness.test.ts`) pass after any health/env/provider readiness change
- [ ] API consumers (storefront, dashboard, admin) considered

## Database

- [ ] Migrations are reversible
- [ ] `pnpm db:migrate` succeeds without manual SQL patches
- [ ] Drizzle `_journal.json` entries match retained SQL migration files
- [ ] Marketing tables exist after migration: `marketing_events`, `marketing_sessions`, `product_performance_daily`
- [ ] No destructive changes without approval
- [ ] Seed data not polluted
- [ ] Rollback plan exists

## Haa Public Marketplace

- [ ] Marketplace theme files stay under `apps/storefront/src/pages/marketplace/theme/`
- [ ] Marketplace pages do not import merchant storefront theme runtime components such as `ThemedProductCard`
- [ ] `/marketplace` first viewport has marketing copy, search, cart, sellers, and tracking actions
- [ ] `/marketplace` lists only marketplace-enabled, approved, public products
- [ ] Marketplace filters include category/search/price/availability/sort
- [ ] Marketplace filters do NOT include city
- [ ] Seller city/location is informational only, not a marketplace filter
- [ ] Product cards link to seller pages and merchant store product pages where appropriate
- [ ] Product cards open `/marketplace/products/:storeSlug/:productSlug` for marketplace product detail
- [ ] Marketplace product detail keeps "عرض في متجر التاجر" as a secondary merchant-store action
- [ ] Marketplace product detail desktop layout keeps gallery left, details center, seller card right
- [ ] Marketplace product detail mobile layout has no horizontal overflow
- [ ] Marketplace product detail shows Tabby/Tamara BNPL under the price
- [ ] Marketplace product detail BNPL is persuasive and compact: shows "ادفع الآن فقط", per-payment amount, "بدون فوائد", and larger provider logos
- [ ] Marketplace product detail shows savings, old price, and large current price when discounted
- [ ] Marketplace product detail includes specifications, shipping/returns policies, and review summary sections
- [ ] Marketplace product detail policy/reviews sections do not use oversized nested cards or wasted vertical spacing
- [ ] Marketplace product detail gallery has arrows and image zoom
- [ ] Payment-logo rows keep Cash on Delivery as the final/leftmost RTL payment option after Tabby
- [ ] Demo support KB route `/s/demo-perfumes/support/kb` returns HTTP 200
- [ ] `/marketplace/sellers` lists participating sellers
- [ ] `/marketplace/sellers/:storeSlug` shows seller data and seller products
- [ ] Marketplace cart preserves store grouping for multi-seller checkout
- [ ] Marketplace checkout creates per-store suborders under one marketplace order number
- [ ] Marketplace checkout makes clear that suborders become normal merchant orders after checkout
- [ ] `/marketplace/orders` supports marketplace order number + phone inquiry
- [ ] Marketplace order tracking validates phone and shows suborders
- [ ] Marketplace order tracking routes post-order procedures to the merchant order page
- [ ] Marketplace UI does not imply Haa Stores owns shipping, fulfillment, returns, exchanges, or disputes
- [ ] Admin marketplace review actions cannot be replaced by UI-only enforcement
- [ ] Featured marketplace products respect review status and feature metadata
- [ ] Marketplace settlement/deep-report views show platform commission totals
- [ ] Marketplace settlement/deep-report views link execution to the existing manual settlements path
- [ ] Marketplace schema does not create marketplace-owned after-sales tables

## Dynamic Error Capture

- [ ] Error events written to `storage/support-error-events.ndjson`
- [ ] No secrets exposed in stored events (passwords, tokens, cards redacted)
- [ ] `ErrorBoundary` in dashboard catches and reports errors
- [ ] `ErrorBoundary` in storefront catches and reports errors
- [ ] `POST /internal/support-errors/report` works in development
- [ ] `POST /internal/support-errors/report` returns 404 in production
- [ ] `pnpm ops:errors` reads both monitoring-events and support-error-events
- [ ] `pnpm ops:errors` recommendations use only recent actionable events, not stale history or `status=pass` health checks
- [ ] `pnpm ops:errors` keeps repeated P3 support-error fingerprints actionable for RCA while ignoring passive P3 monitoring pass/warn events
- [ ] `pnpm ops:alerts` emits local alerts for active P0, repeated P1, and repeated fingerprints, dedupes by `dedupeKey`, and stays quiet when no alert criteria are met
- [ ] `pnpm ops:monitor` includes `pnpm ops:alerts` after error analysis
- [ ] `pnpm ops:monitor:report` imports the shared ops event classifier and bases health on the latest result per check target
- [ ] `pnpm ops:errors:simulate` generates a valid test event
- [ ] Stack traces are only included in development mode
- [ ] `error-handler.ts` writes to support-error-log on API errors
- [ ] correlationId links frontend and backend error events
- [ ] Error codes map to entries in ERROR_CATALOG.md
- [ ] New error codes added to ERROR_CODE_TAXONOMY.md

## Security Baseline

- [x] `pnpm audit` returns 0 vulnerabilities on every PR (vite pinned to >= 6.4.3; esbuild pinned to >= 0.25.0; uuid pinned to >= 11.1.1 via pnpm overrides)
- [x] `pnpm deps:audit` (prod-only) returns 0 vulnerabilities on every PR
- [x] Storefront pixel payloads are validated against `PIXEL_PROVIDER_SIGNATURES` (meta/fbq, tiktok/ttq, snapchat/snaptr, twitter/twq, ga4/gtag, gtm/dataLayer, pinterest/pintrk) before DOM injection in `usePixels.ts`
- [x] Storefront imports pixel validation from browser-safe `@haa/commerce-core/pixel-validation`, not the main `@haa/commerce-core` export
- [x] `<!-- HAA-PIXEL-PROVIDER: <name> -->` markers are present on every script block emitted by `PixelService.buildScripts`
- [x] Tampered or arbitrary `<script>` payloads are dropped silently with `console.warn` and never reach `innerHTML`
- [x] `window.__haaPixelsLoaded` records matched providers after a successful injection (observability for future CSP report-only collectors)
- [x] `tests/pixel-provider-allowlist.test.ts` and `pnpm --filter @haa/storefront build` are run on every change to `pixels.ts`, `pixel-validation.ts`, or `usePixels.ts`
- [x] AES-GCM credential helpers validate `PAYMENT_CREDENTIALS_ENCRYPTION_KEY` as exactly 64 hex chars, pin `authTagLength: 16`, and reject malformed IV/tag/ciphertext segments before decrypting
- [x] Merchant-dashboard print windows and any `document.write` HTML sinks escape user/customer text with HTML-context escaping, not CSV escaping

- [ ] `requireStoreAccess()` is applied on all merchant routes that use `:storeId`
- [ ] `requirePermission()` uses correct permission string (not `read` for write operations)
- [ ] Customer mutations have audit logging (create, update, delete)
- [ ] AuthGuard in dashboard checks user exists (basic auth)
- [ ] API enforcement exists independently of UI hiding
- [ ] Support ticket auth uses header, not query param
- [ ] Storefront does not create support ticket links containing `?accessToken=`
- [ ] Temporary legacy support-ticket query token compatibility is not used by new UI links
- [ ] Error capture sanitization covers all sensitive field patterns
- [ ] `maskObject()` keeps key-token masking coverage for PII/secrets after regex or complexity refactors
- [ ] Admin financial idempotency keys use Web Crypto (`randomUUID`/`getRandomValues`) and never fall back to `Math.random()`
- [ ] `.env` is gitignored
- [ ] Stack traces are stripped in production responses
- [ ] `POST /internal/support-errors/report` is 404 in production
- [ ] No secrets in NDJSON logs

## Theme Isolation

- [ ] Merchant-dashboard imports from `@haa/theme-system/server` only, never from `@haa/theme-system` or `@haa/storefront-themes` main entry
- [ ] Admin-dashboard imports from `@haa/theme-system/server` only, never from `@haa/theme-system` or `@haa/storefront-themes` main entry
- [ ] `@haa/storefront-themes/server` subpath is properly exported in `package.json`
- [ ] `@haa/storefront-themes/server` does NOT re-export any DOM-dangerous functions (`applyStoreTheme`, `clearStoreTheme`, `applyTheme`, `clearTheme`, `useThemeConfig`, `fetchThemeConfig`, `loadTheme`, `setThemeApiBase`)
- [ ] `@haa/theme-system/src/server.ts` has a CRITICAL comment block listing forbidden exports
- [ ] No global `!important` body/html styles in any storefront theme component
- [ ] No `#theme-scope` dead CSS in any file
- [ ] Storefront theme registry loads both base-elegant and luxury-showcase correctly
- [ ] CSS variables from storefront themes are scoped to `#storefront-scope` only
- [ ] `@haa/theme-react`'s `ThemeProvider` is used for light/dark mode only (design system, not storefront)
- [ ] `@haa/system-theme` CSS uses `--haa-*` namespaced variables
- [ ] No storefront-specific CSS files imported in dashboard apps
- [ ] Admin-dashboard does not import from storefront, storefront-themes, or theme-\* packages
- [ ] Fallback theme renders if theme key is unregistered
- [ ] No themed content rendered before themeConfig resolves (loading guard in Layout.tsx)
- [ ] Skeleton uses only neutral Tailwind colors (no theme CSS vars) during theme loading
- [ ] Fallback timeout exists for theme loading failure (8s default)
- [ ] Storefront navigation between stores shows skeleton (not previous theme) during load
- [ ] `pnpm preflight`, `pnpm typecheck`, `pnpm test` all pass after any theme change

## Previous Issue Checks

_(Add specific checks here as issues are resolved)_
