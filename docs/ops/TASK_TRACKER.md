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

## Completed Tasks

*(None yet)*
