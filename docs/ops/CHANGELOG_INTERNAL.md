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
