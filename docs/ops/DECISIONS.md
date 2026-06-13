# Decision Records

> Architectural, process, and product decisions are recorded here with context and consequences.

---

## DECISION-0001: Short requests must be expanded before execution

- **Date:** 2026-06-13
- **Status:** Accepted
- **Decision:** Any abbreviated user request (e.g., "fix footer", "store not working", "make it professional") must NOT be executed directly. It must first be converted to a structured professional brief using the Interpreted Task template defined in AGENTS.md.
- **Context:** Previous development suffered from inconsistent quality, scope creep, undocumented assumptions, and untested changes due to executing short commands without analysis.
- **Options Considered:**
  1. Execute directly and fix iteratively (rejected — causes regressions and waste)
  2. Require full product spec for every change (rejected — too heavy for simple tasks)
  3. Structured expansion with scope, risks, and acceptance criteria (selected)
- **Reason:** Prevents random development, ensures shared understanding, and enforces quality before execution.
- **Consequences:**
  - Positive: Clear scope, fewer regressions, documented decisions
  - Negative: Slight overhead for very simple tasks (acceptable trade-off)
- **Related Tasks:** TASK-0001
- **Related Risks:** R-0002

---

## DECISION-0002: Development Operating System as foundational layer

- **Date:** 2026-06-13
- **Status:** Accepted
- **Decision:** Before any feature work, bug fix, or refactor, the project must have a formal Development Operating System consisting of AGENTS.md constitution and docs/ops/ methodology files.
- **Context:** Multiple sessions showed inconsistent behavior, path confusion, lack of documentation, and no quality enforcement.
- **Options Considered:**
  1. Start fixing bugs immediately (rejected — same problems would repeat)
  2. Build ops system first (selected)
- **Reason:** Without process discipline, every session starts from zero and quality is unpredictable.
- **Consequences:**
  - Positive: All future work follows a defined, auditable process
  - Negative: Short-term delay on feature work
- **Related Tasks:** TASK-0001

---

## DECISION-0003: No git repository — mitigation via docs/ops

- **Date:** 2026-06-13
- **Status:** Accepted
- **Decision:** Although the project lacks a git repository, the docs/ops/ files serve as the source of truth for project state, task tracking, and decisions until git is initialized.
- **Context:** `git status` returns "not a git repository". No version control exists.
- **Options Considered:**
  1. Initialize git immediately (recommended but requires user action)
  2. Proceed with docs-only tracking (selected — enables work to continue)
- **Reason:** Version control initialization requires user confirmation. The ops system provides interim tracking.
- **Consequences:**
  - Positive: Work can proceed with documented state
  - Negative: No branching, no diff history, no rollback
- **Related Tasks:** TASK-0001
- **Related Risks:** R-0001
