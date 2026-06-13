# Internal Changelog

> Human-readable log of structural, behavioral, or operational changes.
> This is NOT a replacement for git. It captures context that git cannot.

---

## 2026-06-13

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
- Added ops:* scripts to package.json

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
