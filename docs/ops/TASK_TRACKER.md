# Task Tracker

> Every user request or development task must be logged here before execution.

---

## Status Values

| Status | Meaning |
|--------|---------|
| Requested | Task received from user |
| Expanded | Request converted to professional brief |
| Planned | Scope, plan, and acceptance criteria defined |
| In Progress | Implementation active |
| Implemented | Code changes complete |
| In Verification | Testing and review in progress |
| Done | Meets Definition of Done |
| Blocked | Waiting on decision, info, or environment |
| Reopened | Failed verification or problem returned |
| Cancelled | Cancelled with clear reason |

## Priority Values

| Priority | Meaning |
|----------|---------|
| P0 Critical | Blocks all work or represents production risk |
| P1 High | Important for current phase or blocking other tasks |
| P2 Medium | Standard task |
| P3 Low | Nice-to-have or debt |
| P4 Debt | Technical debt, cleanup |

---

## Ticket Template

### TASK-XXXX: Title

- **Type:**
- **Priority:**
- **Status:**
- **Created:**
- **Updated:**
- **Original Request:**
- **Expanded Requirement:**
- **Problem:**
- **Goal:**
- **Scope:**
- **Out of Scope:**
- **Affected Areas:**
- **Files to Inspect:**
- **Files Changed:**
- **Acceptance Criteria:**
- **Test Plan:**
- **Test Results:**
- **Risks:**
- **Related Issues:**
- **Related Decisions:**
- **Status History:**
  - Requested:
  - Expanded:
  - Planned:
  - In Progress:
  - Implemented:
  - In Verification:
  - Done:
- **Final Notes:**

---

## Active Tasks

### TASK-0008: Fix Storefront Theme Hydration Flicker

- **Type:** Fix
- **Priority:** P0 Critical
- **Status:** Done
- **Created:** 2026-06-13
- **Updated:** 2026-06-13
- **Original Request:** Fix flash of wrong theme (base-elegant → luxury-showcase) when opening storefront
- **Expanded Requirement:** Prevent any themed content from rendering before the correct themeKey is resolved. Show only neutral skeleton or correct theme.
- **Problem:** Flash of Wrong Theme (Theme hydration flicker) — base-elegant appears for 1 frame before the correct theme loads
- **Goal:** Zero flash — user sees either a neutral skeleton or the correct theme immediately
- **Scope:**
  - Add theme loading guard in Layout.tsx
  - Create neutral skeleton using only Tailwind built-in colors (no CSS vars)
  - Handle theme loading failure with fallback timeout
  - No changes to theme design, merchant dashboard, or CSS globals
- **Out of Scope:**
  - Theme design changes
  - Merchant dashboard
  - CSS globals
  - Theme system packages
- **Affected Areas:** apps/storefront/src/components/Layout.tsx
- **Files Changed:** `apps/storefront/src/components/Layout.tsx` (+70 lines)
- **Acceptance Criteria:**
  - عند فتح المتجر لا يظهر الثيم السابق لحظة
  - يظهر إما skeleton/loading محايد أو الثيم الصحيح مباشرة
  - luxury-showcase يظهر بدون flicker
  - base-elegant يظهر بدون flicker
  - fallback يظهر فقط عند فشل تحميل الثيم
  - pnpm preflight ينجح
  - pnpm typecheck ينجح
  - pnpm ops:monitor ينجح
  - لا يوجد تأثير على merchant-dashboard
- **Test Plan:** preflight, typecheck, ops:monitor, test
- **Test Results:**
  - ✅ pnpm preflight: PASSED
  - ✅ pnpm typecheck: 21/21 packages pass
  - ✅ pnpm ops:monitor: all checks pass
  - ✅ pnpm test: 67 files, 1340 tests passed
- **Risks:** None — single file change, no behavioral changes to themes
- **Related Issues:** ISSUE-0003
- **Related Decisions:** None
- **Status History:**
  - Requested: 2026-06-13
  - In Progress: 2026-06-13
  - Done: 2026-06-13
- **Final Notes:** Root cause was Layout rendering `resolveStorefrontThemeKey(null)` before theme API resolved. Fixed by guarding themed content until `useThemeConfig` returns non-null. CSS vars are applied synchronously before state update, so no frame gap.

---

### TASK-0009: Isolate Vitest Tests from Development Database

- **Type:** Fix
- **Priority:** P0 Critical
- **Status:** Done
- **Created:** 2026-06-13
- **Updated:** 2026-06-13
- **Original Request:** Prevent `compliance-regression-gate.test.ts` from resetting haa-demo publish_status to restricted
- **Expanded Requirement:** Isolate all vitest tests from the development database so that test side effects never modify haa-demo or any dev data
- **Problem:** `tests/compliance-regression-gate.test.ts` calls `PublishGateService.publish(1, 1, ...)` which runs compliance checks against the real haastores DB. The demo store lacks KYC, payment methods, returnWindowDays — so compliance fails and sets publish_status to `restricted`, breaking the storefront.
- **Goal:** Tests run against an isolated database; dev database never modified by tests
- **Scope:**
  - Create `tests/setup.ts` to override DATABASE_URL to `haastores_test`
  - Create `scripts/db-test-setup.sh` to create, migrate, and seed test DB
  - Update `vitest.config.ts` with setupFiles
  - Update `package.json` with db:test:setup script
  - Update `.env.example` with TEST_DATABASE_URL
  - Grant CREATEDB permission to haa Postgres user
  - Verify all 67 test files pass against test DB
- **Out of Scope:**
  - Changes to publish gate logic or seed data
  - Mocking database calls
  - Changes to merchant publish flow
- **Affected Areas:** tests/, scripts/, vitest.config.ts, package.json, .env.example
- **Files Changed:** `tests/setup.ts` (new), `scripts/db-test-setup.sh` (new), `vitest.config.ts` (added setupFiles), `package.json` (added db:test:setup script), `.env.example` (documented TEST_DATABASE_URL)
- **Acceptance Criteria:**
  - Tests run against haastores_test, not haastores
  - haa-demo publish_status remains `published` in dev DB after test run
  - All 1340 tests pass
  - pnpm typecheck passes
  - pnpm preflight passes
  - pnpm ops:monitor passes
- **Test Plan:** pnpm test, pnpm typecheck, pnpm preflight, pnpm ops:monitor, verify haa-demo published
- **Test Results:**
  - ✅ pnpm test: 67 files, 1340 tests passed
  - ✅ pnpm typecheck: 21/21 packages pass
  - ✅ pnpm preflight: PASSED
  - ✅ pnpm ops:monitor: all checks pass
  - ✅ haa-demo publish_status: `published`
- **Risks:** Schema drift between migrations and actual schema may require manual column additions to test DB; documented in db-test-setup.sh
- **Related Issues:** None
- **Status History:**
  - Requested: 2026-06-13
  - Implemented: 2026-06-13
  - Verified: 2026-06-13
  - Done: 2026-06-13
- **Final Notes:** CREATEDB permission required for haa Postgres user. Schema had drifted — migration did not include city/district/street/postalCode/latitude/longitude on stores table, requiring manual column creation in db-test-setup.sh.

---

## Active Tasks

### TASK-0004: Local Dynamic Error Capture

- **Type:** Monitoring, Ops, Documentation
- **Priority:** P1 High
- **Status:** In Progress
- **Created:** 2026-06-13
- **Updated:** 2026-06-13
- **Original Request:** Build Local Dynamic Error Capture — structured error events with errorCode + correlationId + eventId + fingerprint, NDJSON storage, analyzable via ops:errors
- **Expanded Requirement:** Capture all runtime errors (API, dashboard, storefront) as structured events written to local NDJSON, with sanitization, fingerprinting, correlation IDs, severity-based escalation, and integration with existing ErrorMonitor interface
- **Problem:** Errors were logged to console but not captured as structured, searchable, analyzable events; no dedup; no correlation between frontend and backend; no severity-based escalation from captured data
- **Goal:** Every runtime error produces a structured event with errorCode, correlationId, eventId, and fingerprint, written to NDJSON, analyzable via pnpm ops:errors
- **Scope:**
  - Create shared error codes module (14 codes, severity, source, origin enums)
  - Create support-error-log service (NDJSON append-writer, sanitizer, event builder, ErrorMonitor implementation)
  - Update error-handler middleware to wire local monitor
  - Create POST /internal/support-errors/report endpoint (local-only)
  - Update dashboard ErrorBoundary to report errors
  - Create storefront ErrorBoundary and wrap App.tsx
  - Create simulate-support-error.mjs
  - Support doc updates (ERROR_CATALOG, TAXONOMY, PLAYBOOK, ESCALATION)
  - Ops doc updates (TASK_TRACKER, CURRENT_STATE, CHANGELOG, REGRESSION_CHECKLIST)
  - AGENTS.md Section 13 (Dynamic Error Capture Rule)
  - package.json ops:errors:simulate script
- **Out of Scope:**
  - External monitoring services (Sentry, Datadog, etc.)
  - Production deployment config
  - Payment/shipping/order logic changes
  - Refactoring existing code
  - Security OS (RBAC audit, permission boundaries)
- **Affected Areas:** packages/shared, apps/api, apps/merchant-dashboard, apps/storefront, scripts/, storage/, docs/support, docs/ops, AGENTS.md, package.json
- **Files Changed:** All new files listed in scope; modified files: shared/src/index.ts, api/src/middleware/error-handler.ts, api/src/index.ts, dashboard/src/components/ErrorBoundary.tsx, storefront/src/App.tsx, storefront/src/components/ErrorBoundary.tsx, AGENTS.md, package.json, all support/ops docs
- **Acceptance Criteria:**
  - All 14 error codes defined in shared/error-codes.ts
  - Events written to storage/support-error-events.ndjson
  - Secrets sanitized before storage
  - ErrorBoundary errors POST to /internal/support-errors/report
  - API errors route through error-handler to NDJSON
  - pnpm ops:errors reads both event files
  - pnpm ops:errors:simulate generates test event
  - pnpm preflight passes
  - pnpm typecheck passes
- **Test Plan:** preflight, typecheck, simulate, errors, monitor
- **Test Results:** Pending
- **Risks:** None — local-only, no external services

---

### TASK-0005: Security Baseline & RBAC Audit

- **Type:** Security / RBAC / Audit
- **Priority:** P1 High
- **Status:** In Progress
- **Created:** 2026-06-13
- **Updated:** 2026-06-13
- **Original Request:** Security Baseline & RBAC Audit — inspect and document security posture without modifying application code or database
- **Expanded Requirement:** Audit API authorization, dashboard protection, storefront exposure, RBAC state, error capture security, logging privacy; create 5 security docs; update risk register and task tracker
- **Problem:** Security posture was undocumented; RBAC data model missing; permission consistency gaps known but untracked
- **Goal:** Documented security baseline with prioritized fix backlog for future implementation
- **Scope:**
  - Inspect API routes for auth/permission enforcement (auth, admin, dashboard, settings, products, customers, orders, storefront)
  - Inspect dashboard AuthGuard, useAuth hook, App.tsx route structure
  - Inspect auth-core middleware (requireAuth, requireStoreAccess, requirePermission)
  - Inspect error capture sanitization and endpoint guards
  - Inspect logging and privacy (structured-logger, NDJSON, .gitignore)
  - Create SECURITY_BASELINE.md, RBAC_AUDIT.md, DATA_ISOLATION_AUDIT.md, LOGGING_PRIVACY_AUDIT.md, SECURITY_FIX_BACKLOG.md
  - Update RISK_REGISTER, TASK_TRACKER, CURRENT_STATE, CHANGELOG_INTERNAL, REGRESSION_CHECKLIST
- **Out of Scope:**
  - Code changes (no fixes, no features, no refactoring)
  - Database changes
  - Payment/shipping/order logic
  - Theme changes
  - Production deployment or remote services
- **Affected Areas:** docs/security/ (5 new files), docs/ops/ (5 updated files)
- **Files Changed:** SECURITY_BASELINE.md, RBAC_AUDIT.md, DATA_ISOLATION_AUDIT.md, LOGGING_PRIVACY_AUDIT.md, SECURITY_FIX_BACKLOG.md, RISK_REGISTER.md, TASK_TRACKER.md, CURRENT_STATE.md, CHANGELOG_INTERNAL.md, REGRESSION_CHECKLIST.md
- **Acceptance Criteria:**
  - SECURITY_BASELINE.md created with findings summary, severity breakdown, immediate risks
  - RBAC_AUDIT.md created with current status, missing pieces, design direction
  - DATA_ISOLATION_AUDIT.md created with tenant/store/branch/customer/order isolation assessment
  - LOGGING_PRIVACY_AUDIT.md created with sanitization review, NDJSON risks, production requirements
  - SECURITY_FIX_BACKLOG.md created with P1-P3 prioritized tasks
  - RISK_REGISTER updated with 4 new risks (R-0011 to R-0014)
  - TASK_TRACKER updated with TASK-0005
  - CURRENT_STATE updated with new phase and security findings summary
  - CHANGELOG_INTERNAL updated with security audit entry
  - pnpm preflight passes, pnpm typecheck passes (no code changes)
- **Test Plan:** pnpm preflight, pnpm typecheck, pnpm ops:monitor, pnpm ops:errors
- **Test Results:** Pending
- **Risks:** None — audit only, no code changes

---

### TASK-0003: Harden System Health Root Guard and Health Endpoint

- **Type:** Ops, Security, Documentation
- **Priority:** P1 High
- **Status:** In Progress
- **Created:** 2026-06-13
- **Updated:** 2026-06-13
- **Original Request:** System Health Hardening Pass — fix Root Guard and health endpoint
- **Expanded Requirement:** `pnpm preflight` must fail from wrong directory; monitoring must not show Degraded due to incorrect endpoint check
- **Problem:**
  1. preflight was a shell script that printed a message but exited with code 0 from wrong directory
  2. Synthetic checks queried `/api/health` which returns 404, causing "Degraded" report
- **Goal:**
  1. preflight exits code 1 from wrong path; checks 7 required markers
  2. Monitoring only checks `/health` (correct endpoint)
- **Scope:**
  - Rewrite preflight as Node script with exit code 1 on failure
  - Create `.haa-project-root` marker
  - Fix health endpoint in monitor-health.mjs and synthetic-checks.mjs
  - Update HEALTH_CHECKS.md documentation
  - Update AGENTS.md, CURRENT_STATE.md, CHANGELOG_INTERNAL.md, RISK_REGISTER.md
- **Out of Scope:**
  - New features
  - Bug fixes
  - Security OS
  - CI/CD
- **Affected Areas:** package.json, scripts/preflight.mjs, scripts/monitor-health.mjs, scripts/synthetic-checks.mjs, docs/ops/HEALTH_CHECKS.md, docs/ops/CURRENT_STATE.md, docs/ops/CHANGELOG_INTERNAL.md, docs/ops/RISK_REGISTER.md, AGENTS.md, .haa-project-root
- **Files Changed:** 10 files
- **Acceptance Criteria:**
  - preflight fails with exit code 1 from wrong directory
  - preflight passes from correct directory
  - Monitoring does not show Degraded due to `/api/health`
  - pnpm typecheck passes
  - All ops commands run successfully
- **Test Plan:** pnpm preflight (correct + wrong path), pnpm typecheck, pnpm ops:monitor, pnpm ops:monitor:report
- **Test Results:** Pending
- **Risks:** None
- **Related Issues:** None
- **Related Decisions:** DECISION-0001 (request expansion), DECISION-0002 (Dev OS)

---

### TASK-0002: Build System Health Operating System

- **Type:** Ops, Monitoring, Documentation
- **Priority:** P1 High
- **Status:** Done
- **Created:** 2026-06-13
- **Updated:** 2026-06-13
- **Original Request:** Build System Health Operating System — monitoring, health checks, synthetic checks, error analysis, alert rules, incident workflow
- **Expanded Requirement:** Create a system that monitors project health, detects problems before merchants report them, and provides structured incident/task flow
- **Problem:** No proactive monitoring; waiting for merchants to report issues; no structured alert-to-incident flow
- **Goal:** Proactive health monitoring with clear severity levels, reporting, and escalation
- **Scope:**
  - scripts/monitor-health.mjs
  - scripts/synthetic-checks.mjs
  - scripts/analyze-support-errors.mjs
  - scripts/generate-monitoring-report.mjs
  - scripts/tail-monitoring-events.mjs
  - storage/monitoring-events.ndjson, support-error-events.ndjson
  - docs/ops/MONITORING_PLAYBOOK.md, HEALTH_CHECKS.md, SYNTHETIC_CHECKS.md, ALERT_RULES.md, INCIDENTS.md, LATEST_MONITORING_REPORT.md
  - docs/support/ERROR_CATALOG.md, SUPPORT_PLAYBOOK.md, ESCALATION_GUIDE.md, ERROR_CODE_TAXONOMY.md
  - package.json ops:* scripts
  - AGENTS.md section 11 (System Health)
- **Out of Scope:**
  - Bug fixes
  - Feature work
  - Theme changes
  - API changes
  - Database changes
  - Real payments/orders/shipping
  - Refactoring
- **Affected Areas:** scripts/, storage/, docs/ops/, docs/support/, AGENTS.md, package.json
- **Files to Inspect:** Current AGENTS.md, package.json
- **Files Changed:** 20+ files
- **Acceptance Criteria:**
  - All ops scripts created and functional
  - Health checks run and produce ndjson events
  - Synthetic checks run and produce ndjson events
  - Error analysis reads events and produces analysis
  - Monitoring report generates valid Markdown
  - Tail shows last N events
  - All Ops and Support docs created with correct content
  - AGENTS.md updated with System Health section
  - package.json has all ops:* scripts
  - pnpm preflight passes
  - pnpm typecheck passes
  - All ops commands run without throwing
- **Test Plan:** pnpm preflight, pnpm typecheck, pnpm ops:health, pnpm ops:synthetic, pnpm ops:errors, pnpm ops:monitor:report, pnpm ops:monitor:tail
- **Test Results:**
  - ✅ pnpm preflight: passed
  - ✅ pnpm typecheck: all packages pass
  - ✅ pnpm ops:health: 25/25 pass
  - ✅ pnpm ops:synthetic: all checks run
  - ✅ pnpm ops:errors: analysis completed
  - ✅ pnpm ops:monitor:report: generated
  - ✅ pnpm ops:monitor:tail: displayed
- **Risks:** Synthetic checks will warn if dev servers are not running (expected — not a failure)
- **Related Issues:** None
- **Related Decisions:** DECISION-0001, DECISION-0002
- **Status History:**
  - Requested: 2026-06-13
  - Expanded: 2026-06-13
  - Planned: 2026-06-13
  - In Progress: 2026-06-13
  - Implemented: 2026-06-13
  - In Verification: 2026-06-13
  - Done: 2026-06-13
- **Final Notes:** Hardening pass (TASK-0003) completed: Root Guard hardened, health endpoint fixed.

---

### TASK-0001: Build Development Operating System

- **Type:** Architecture, Documentation
- **Priority:** P1 High
- **Status:** Done
- **Created:** 2026-06-13
- **Updated:** 2026-06-13
- **Original Request:** Build a Development Operating System that forces disciplined professional workflow
- **Expanded Requirement:** Create comprehensive methodology, ops documentation, process enforcement, and quality gates for any agent or developer working on this project
- **Problem:** Development is inconsistent, path-confused, undocumented, untested, and session-isolated
- **Goal:** Establish a repeatable, trackable, testable, documented development process
- **Scope:** AGENTS.md rewrite, docs/ops/* creation, package.json preflight script
- **Out of Scope:** Any code change, bug fix, feature, theme, API, DB, UI work
- **Affected Areas:** AGENTS.md, docs/ops/*, package.json
- **Files to Inspect:** Current AGENTS.md, package.json, existing docs/
- **Files Changed:** AGENTS.md, package.json, docs/ops/* (18 files)
- **Acceptance Criteria:**
  - AGENTS.md contains full constitution with all required sections
  - All 15 docs/ops/ files created with correct content
  - package.json has preflight script
  - All files reference each other correctly
  - Files verified in correct project path (not spec folder)
  - Git initialized and committed
- **Test Plan:** pnpm preflight, pnpm typecheck, path verification, git init
- **Test Results:**
  - ✅ pnpm preflight: passed
  - ✅ pnpm typecheck: all packages pass
  - ✅ Path verification: All 16 files in /Users/thwany/Desktop/haa-stores-core only
  - ✅ Git init: completed (commit 076bc40)
- **Risks:** May conflict with existing AGENTS.md structure
- **Related Issues:** None
- **Related Decisions:** DECISION-0001, DECISION-0002, DECISION-0003
- **Status History:**
  - Requested: 2026-06-13
  - Expanded: 2026-06-13
  - Planned: 2026-06-13
  - In Progress: 2026-06-13
  - Implemented: 2026-06-13
  - In Verification: 2026-06-13
  - Done: 2026-06-13
- **Final Notes:** Root Guard hardening completed in TASK-0003. Dev OS fully operational.

---

### TASK-0006: Restore Local App Runtime

- **Type:** Fix
- **Priority:** P0 Critical
- **Status:** Done
- **Created:** 2026-06-13
- **Updated:** 2026-06-13
- **Original Request:** Diagnose and fix "Restore Local App Runtime" — ensure no white screens, no broken pages, no theme leakage
- **Expanded Requirement:** Verify all 3 apps (API, merchant-dashboard, storefront) serve correctly without runtime errors
- **Problem:** Storefront stores redirect to `/s/haa-demo` which did not exist; stores created by registration had `publishStatus='draft'` so storefront returned STORE_NOT_PUBLISHED
- **Goal:** All apps load correctly with published storefront
- **Scope:**
  - Diagnose all 3 dev servers
  - Fix store seed to set `publishStatus: 'published'`
  - Update existing DB store record
  - Run full test suite
- **Out of Scope:**
  - Registration publish flow (intentionally draft — merchant publishes from settings)
  - New test files or refactoring
  - DB schema changes
- **Affected Areas:** `packages/db/src/seed/index.ts`
- **Files Changed:** `packages/db/src/seed/index.ts` (added `publishStatus: 'published'` to haa-demo store creation)
- **Acceptance Criteria:**
  - API health returns 200
  - Dashboard serves HTML
  - Storefront serves HTML and renders published store
  - No white screens or broken pages
  - All tests pass
- **Test Plan:**
  - pnpm typecheck
  - pnpm preflight
  - pnpm test
  - curl health endpoints
  - curl storefront pages
- **Test Results:**
  - ✅ API health: `{"api":"ok","db":"connected"}`
  - ✅ Dashboard HTML: served at localhost:5173
  - ✅ Storefront HTML: served at localhost:5174
  - ✅ Store API: `publishStatus:"published"` at `/s/haa-demo`
  - ✅ Theme API: full config returned at `/s/haa-demo/theme`
  - ✅ pnpm typecheck: 21/21 packages pass
  - ✅ pnpm preflight: PASSED
  - ✅ pnpm test: 67 files, 1340 tests passed
- **Risks:** None
- **Status History:**
  - Requested: 2026-06-13
  - Diagnosed: 2026-06-13
  - Implemented: 2026-06-13
  - Verified: 2026-06-13
  - Done: 2026-06-13
- **Final Notes:** Store published via seed fix + SQL UPDATE. Registration remains draft by design (merchant publishes via settings). Merged to main at f2765c6.

---

### TASK-0007: Theme Isolation — Prevent Storefront Theme Leakage to Dashboards

- **Type:** Architecture / Isolation / Audit
- **Priority:** P0 Critical
- **Status:** Done
- **Created:** 2026-06-13
- **Updated:** 2026-06-13
- **Original Request:** P0 — Theme Isolation: منع تسريب ثيم المتجر العام إلى لوحة التاجر
- **Expanded Requirement:** Ensure storefront theme CSS, components, or runtime never affect merchant-dashboard or admin-dashboard
- **Problem:** Merchant-dashboard imported from `@haa/theme-system` (main entry) which bundles DOM-manipulation functions including `applyTheme()` (writes to `document.documentElement`), analytics script injection (GTM/GA/Facebook), and theme CSS variable mutation. Additionally, `luxury-showcase` theme had a hardcoded `!important` body style that bypassed scoping.
- **Goal:** Zero theme leakage between storefront and dashboards
- **Scope:**
  - Fix merchant-dashboard imports to use server-safe subpath
  - Fix package.json exports for server subpath
  - Fix luxury-showcase global body style
  - Remove dead #theme-scope CSS
  - Add validateThemeConfig to server exports
- **Out of Scope:**
  - No redesign
  - No new theme
  - No employee permissions
  - No payment/shipping/orders changes
  - No general refactor
- **Affected Areas:** packages/theme-system, apps/merchant-dashboard, apps/storefront
- **Files Changed:**
  - `packages/theme-system/src/server.ts` — added validateThemeConfig export
  - `packages/theme-system/package.json` — fixed server export to use source
  - `apps/merchant-dashboard/src/pages/ThemeStore.tsx` — changed to server import
  - `apps/merchant-dashboard/src/pages/ThemeEditor.tsx` — changed to server import
  - `apps/storefront/src/themes/luxury-showcase/Header.tsx` — removed !important body style
  - `apps/storefront/src/index.css` — removed dead #theme-scope block
- **Acceptance Criteria:**
  - Storefront works
  - Merchant-dashboard works
  - Admin-dashboard unaffected
  - No import from @haa/theme-system main entry in merchant-dashboard
  - No !important global styles in storefront theme
  - Dead CSS removed
  - pnpm preflight passes
  - pnpm typecheck passes
  - pnpm test passes
- **Test Plan:** preflight, typecheck, test, ops:monitor
- **Test Results:**
  - ✅ pnpm preflight: PASSED
  - ✅ pnpm typecheck: 21/21 packages pass
  - ✅ pnpm test: 67 files, 1340 tests passed
  - ✅ pnpm ops:monitor: all checks pass, no P0/P1 alerts
- **Risks:** None — minimal changes, no behavioral changes
- **Status History:**
  - Requested: 2026-06-13
  - Expanded: 2026-06-13
  - Planned: 2026-06-13
  - In Progress: 2026-06-13
  - Done: 2026-06-13
- **Final Notes:** All 3 apps verified serving correctly. Theme registry works (base-elegant + luxury-showcase). Fallback works. Branch: fix/theme-isolation


---

### TASK-0010: RBAC Pass 1 Implementation

- **Type:** Feature / Security
- **Priority:** P1 High
- **Status:** Done
- **Created:** 2026-06-13
- **Updated:** 2026-06-13
- **Original Request:** Implement RBAC Pass 1 — permission catalog, role-permission mapping, frontend guards, and backend enforcement
- **Expanded Requirement:** Create a complete RBAC system with typed permissions, 8 roles, permission checks in JWT/responses, frontend hooks and guards, and protected subscription/dashboard routes
- **Problem:** No RBAC data model or employee permissions existed (R-0012, R-0013); customer route used read permission for write operations (R-0011); no frontend role filtering
- **Goal:** Documented permission catalog, enforced role-based access across API and frontend, with 8 roles mapped to granular permissions
- **Scope:**
  - Permission catalog (PERMISSION_CATALOG) in packages/shared/src/permissions.ts with Arabic labels, risk levels
  - ROLE_PERMISSIONS map with 8 roles (owner, admin, manager, products_manager, orders_manager, accountant, support, viewer)
  - getPermissionsForRole() helper
  - Permission type in types/orders.ts (86 string literals)
  - Permissions in JWT, login, register, /me responses
  - Frontend usePermissions hook and PermissionGate component
  - Customer permission fix (create/update)
  - Catalog drift fixed (all ROLE_PERMISSIONS keys in catalog)
  - Viewer role restricted (no manage perms)
  - Subscription routes protected
  - Dashboard summary protected
  - Local boundary test (tests/rbac-permission-catalog.test.ts, 10 tests passing)
- **Out of Scope:**
  - Employee permission management UI
  - Role assignment UI
  - RBAC admin dashboard
  - Audit log UI
  - Production deployment config
- **Affected Areas:** packages/shared, packages/types, apps/api, apps/merchant-dashboard, apps/storefront, tests/
- **Files Changed:** packages/shared/src/permissions.ts, packages/types/src/orders.ts, apps/api/src/middleware/*, apps/api/src/routes/*, apps/merchant-dashboard/src/hooks/*, apps/merchant-dashboard/src/components/*, tests/rbac-permission-catalog.test.ts
- **Acceptance Criteria:**
  - PERMISSION_CATALOG defined with Arabic labels and risk levels
  - 8 roles mapped in ROLE_PERMISSIONS
  - getPermissionsForRole() returns correct permissions
  - Permission type with 86 string literals
  - JWT contains permissions; login/register/me return permissions
  - usePermissions hook and PermissionGate component work
  - Customer create/update use correct permission
  - No catalog drift -- all ROLE_PERMISSIONS keys exist in PERMISSION_CATALOG
  - Viewer role has no manage permissions
  - Subscription routes protected
  - Dashboard summary protected
  - 10 boundary tests pass
  - All 1350 tests pass (68 test files)
  - pnpm typecheck passes
  - pnpm ops:monitor passes
- **Test Plan:** pnpm test, pnpm typecheck, pnpm preflight, pnpm ops:monitor
- **Test Results:**
  - ✅ pnpm test: 68 files, 1350 tests passed
  - ✅ pnpm typecheck: all packages pass
  - ✅ pnpm preflight: PASSED
  - ✅ pnpm ops:monitor: all checks pass
  - ✅ Boundary tests (rbac-permission-catalog.test.ts): 10/10 pass
- **Risks:** None -- local-only RBAC, no production deployment
- **Related Issues:** R-0011, R-0012, R-0013 (from Security Baseline)
- **Related Decisions:** None
- **Status History:**
  - Requested: 2026-06-13
  - Done: 2026-06-13
- **Final Notes:** RBAC Pass 1 covers all core permission infrastructure (typed catalog, role-permission mapping, frontend guards, backend enforcement, boundary tests). Pass 2 (completed) added dashboard frontend guards (sidebar, routes, action buttons). Pass 3 (planned) will add employee permission management UI, role assignment, and RBAC admin dashboard.

---

### TASK-0011: RBAC Pass 2 — Dashboard Frontend Guards

- **Type:** Feature / Security
- **Priority:** P1 High
- **Status:** Done
- **Created:** 2026-06-13
- **Updated:** 2026-06-13
- **Original Request:** Implement RBAC Pass 2 — Dashboard Frontend Guards: sidebar filtering, route-level permission guarding, action button hiding
- **Expanded Requirement:** Apply permission-based guards to the merchant dashboard frontend so that unauthorized users never see navigation, routes, or buttons they cannot access
- **Problem:** All sidebar items, dashboard routes, and action buttons were visible to every authenticated user regardless of their role/permissions (SEC-003)
- **Goal:** Sidebar hides nav items the user lacks permission for; routes show UnauthorizedState instead of data; action buttons are hidden behind PermissionGate
- **Scope:**
  - Create `UnauthorizedState` component (access-denied placeholder)
  - Create `PermissionRoute` guard (route-level permission wrapper)
  - Update `Sidebar.tsx` with permission metadata and filtering logic
  - Add `GuardedRoute` wrapper with `permission` prop to every dashboard route in `App.tsx`
  - Add `PermissionGate` to action buttons across all page files (Products, Orders, Customers, Categories, Brands, Tags, Coupons, Promotions, Shipping, Settings, API Keys, Wallet, Compliance, Subscriptions, Notifications, Policies, Exports, Imports, ThemeEditor, ThemeStore)
- **Out of Scope:**
  - Employee management UI (Pass 3)
  - Employee invite flow (Pass 3)
  - Role ↔ Permission DB schema (Pass 3)
  - Permission seed data (Pass 3)
  - Branch/location scope (Pass 3+)
  - General refactoring
- **Affected Areas:** apps/merchant-dashboard/src/
- **Files Changed:**
  - `apps/merchant-dashboard/src/components/ui/UnauthorizedState.tsx` — new
  - `apps/merchant-dashboard/src/components/auth/PermissionRoute.tsx` — new
  - `apps/merchant-dashboard/src/components/layout/Sidebar.tsx` — updated with permission metadata + filtering
  - `apps/merchant-dashboard/src/App.tsx` — all routes wrapped with GuardedRoute + permission prop
  - 20+ page files — PermissionGate wrappers on CRUD/action buttons
  - `tests/dashboard-rbac-guards.test.ts` — new boundary test (6 tests)
- **Acceptance Criteria:**
  - Sidebar shows only nav items the user has permission for; empty groups hidden
  - 30+ dashboard routes wrapped with permission guard showing UnauthorizedState on denial
  - All CRUD/action buttons guarded in 20+ pages
  - All sidebar & route permission strings exist in PERMISSION_CATALOG
  - 6 boundary tests pass (dashboard-rbac-guards.test.ts)
  - All 1356 tests pass (69 test files)
  - pnpm typecheck passes
  - pnpm ops:monitor passes
- **Test Plan:** pnpm typecheck, pnpm test, pnpm preflight, pnpm ops:monitor
- **Test Results:**
  - ✅ pnpm typecheck: all packages pass
  - ✅ pnpm test: 69 files, 1356 tests passed
  - ✅ pnpm preflight: PASSED
  - ✅ pnpm ops:monitor: all checks pass
  - ✅ Boundary tests (dashboard-rbac-guards.test.ts): 6/6 pass
- **Risks:** None — frontend-only guards, API remains the enforcement point
- **Related Issues:** SEC-003
- **Related Decisions:** None
- **Status History:**
  - Requested: 2026-06-13
  - Done: 2026-06-13
- **Final Notes:** RBAC Pass 2 covers all frontend guard surfaces (sidebar, routes, action buttons) for the merchant dashboard. Pass 3 will add employee management UI, role assignment page, and DB-backed role-permission storage.
