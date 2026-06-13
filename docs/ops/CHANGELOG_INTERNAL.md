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
- Rewrote AGENTS.md as the project constitution with 10 mandatory sections
- Added `preflight` script to package.json

### Changed

- AGENTS.md: from design-system-focused skill guide to full project constitution

### Fixed

- Git repository initialized (commit `076bc40` — "chore: add development operating system")
- Path verification confirmed: all Dev OS files in correct project root only

### Notes

- This is the foundational commit of the Development Operating System
- All future work must follow the Mandatory Start Rule defined in AGENTS.md
- Remaining gap: `preflight` Root Guard does not fail when run from wrong directory; needs hardening
