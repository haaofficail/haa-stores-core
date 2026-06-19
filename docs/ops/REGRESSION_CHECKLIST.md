# Regression Checklist

> Use this checklist whenever making changes to prevent reintroducing past issues.
> Update this list when a new root cause is identified.

---

## General

- [ ] `pnpm preflight` passes
- [ ] `pnpm typecheck` passes
- [ ] Relevant tests pass (or reason documented)
- [ ] `git diff` reviewed — no unrelated changes
- [ ] No files outside scope were modified
- [ ] docs/ops/ files updated if needed

## CI / Docker

- [ ] CI Test job provisions PostgreSQL before DB-backed tests
- [ ] CI Test job runs migrations and seeds before `pnpm test`
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
- [ ] No random colors — tokens used
- [ ] No layout overflow or scroll issues
- [ ] Touch targets ≥ 44px on mobile

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
- [ ] Branch/location scope respected
- [ ] No cross-store data leakage
- [ ] Audit logged where relevant
- [ ] Permission catalog (PERMISSION_CATALOG) contains all role permissions (no catalog drift)
- [ ] ROLE_PERMISSIONS map covers all 8 roles (owner, admin, manager, products_manager, orders_manager, accountant, support, viewer)
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
- [ ] High-risk permissions marked with warning
- [ ] Last owner protected — actions disabled
- [ ] Save button enabled and wired to API via onSave callback
- [ ] Custom permissions warning banner displayed
- [ ] Employee management tests (tests/employee-management.test.ts) pass
- [ ] API contract doc exists at docs/security/EMPLOYEE_MANAGEMENT_API_CONTRACT.md
- [ ] API boundary tests (tests/employee-management-api.test.ts) pass
- [ ] UI wire tests (tests/employee-ui-api-wire.test.ts) pass
- [ ] API endpoints: GET list, POST invite, PATCH update, DELETE remove, PATCH permissions (501)
- [ ] API enforces employee:\* permissions on all endpoints
- [ ] API safety rules: last owner, self-downgrade, duplicate email, invalid role, self-delete
- [ ] API custom permissions returns 501 NOT_IMPLEMENTED
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
- [ ] 501 permission attempt logs employee_permission_update_unsupported
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
- [ ] Checkout safe path works
- [ ] Shipping label flow unaffected
- [ ] Webhooks considered (if relevant)

## API

- [ ] Input validation works
- [ ] Authentication enforced
- [ ] Error handling is safe (no stack traces in responses)
- [ ] No sensitive data leaked in responses
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
- [ ] `pnpm ops:errors:simulate` generates a valid test event
- [ ] Stack traces are only included in development mode
- [ ] `error-handler.ts` writes to support-error-log on API errors
- [ ] correlationId links frontend and backend error events
- [ ] Error codes map to entries in ERROR_CATALOG.md
- [ ] New error codes added to ERROR_CODE_TAXONOMY.md

## Security Baseline

- [ ] `requireStoreAccess()` is applied on all merchant routes that use `:storeId`
- [ ] `requirePermission()` uses correct permission string (not `read` for write operations)
- [ ] Customer mutations have audit logging (create, update, delete)
- [ ] AuthGuard in dashboard checks user exists (basic auth)
- [ ] API enforcement exists independently of UI hiding
- [ ] Support ticket auth uses header, not query param
- [ ] Storefront does not create support ticket links containing `?accessToken=`
- [ ] Temporary legacy support-ticket query token compatibility is not used by new UI links
- [ ] Error capture sanitization covers all sensitive field patterns
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
