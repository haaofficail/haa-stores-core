# Owner Decisions — Haa Stores Agent OS

> **Status:** Active and binding on all agents (Claude Code, MiniMax, future tools).
> **Date locked:** 2026-06-21
> **Scope:** Decisions applicable to Agent OS bootstrap (Batches A, B, C) and to any read/write performed by an agent until each decision is explicitly superseded.
> **How to supersede:** add a new dated entry below the original decision, mark the previous one `SUPERSEDED on <date> by <new entry>`. Do not delete prior decisions.
> **Companion documents:** `CURRENT_SYSTEM_AUDIT.md` (read-only context), `ISSUE_REGISTER.md` (rows reference these decisions).

---

## DECISION-OS-001 — Legacy root-level audits and reports

**Status:** Locked.

**Decision:** Every markdown report currently living at the repository root (outside `docs/`) is classified `ARCHIVE_CANDIDATE`. These files are **kept in place** for now.

**Affected files (as of audit commit `c90761be`):**

- `HAA_STORES_FULL_SYSTEM_AUDIT_2026-06-18.md`
- `MARKETPLACE_AUDIT_REPORT.md`
- `PHASE3-REPORT.md`, `PHASE4-REPORT.md`, `PHASE5-REPORT.md`, `PHASE6-REPORT.md`
- `DEPLOYMENT_READINESS_PLAN.md`, `DEPLOYMENT.md`
- `DESIGN-HANDBOOK.md`
- `RELEASE-READINESS.md`
- `VISUAL-QA-CHECKLIST.md`

**Constraints on agents:**

1. Do **not** delete any of these files.
2. Do **not** move any of these files within Batch A, Batch B, or any general-purpose task.
3. Any cleanup of these files must happen in a **dedicated PR** named `docs/archive-cleanup` (or similar isolated scope).
4. **Do not treat any of these reports as the current source of truth** unless they have been explicitly re-marked as current in a follow-up commit.
5. When citing them, prefix references with `(historical, ARCHIVE_CANDIDATE per DECISION-OS-001)`.

---

## DECISION-OS-002 — Marketplace audit truth

**Status:** Locked.

**Decision:** The two existing marketplace audits (`MARKETPLACE_AUDIT_REPORT.md` at the repo root and `docs/ops/PUBLIC_MARKETPLACE_AUDIT.md`) are **not authoritative**. Their verdicts diverge (~30% vs ~38% readiness) and they predate recent merges.

**Current truth for marketplace work derives from, in priority order:**

1. The current code under `apps/api/src/routes/haa-marketplace.ts`, `packages/marketplace-core/**`, and related schemas.
2. A **new** marketplace audit, opened as a separate task with its own deliverable.
3. `docs/ops/CURRENT_STATE.md` after the next docs truth-sync pass.

**Constraints on agents:**

1. Classify the two existing reports as `STALE` or `PARTIALLY_SUPERSEDED` when referenced.
2. **Do not fix marketplace issues inside Agent OS.** Marketplace work is out of Agent OS scope; if needed, it is a separate task with its own brief and PR.
3. **Do not delete** or rewrite the two existing reports — treat as historical evidence per DECISION-OS-001.

---

## DECISION-OS-003 — Theme package canonical direction

**Status:** Provisional (locked for current work; subject to a future independent theme rationalization pass).

**Decision:** The canonical direction for theme work is **`@haa/storefront-themes`**.

**Status of the existing theme packages:**

- `@haa/storefront-themes` — **canonical**.
- `@haa/theme-system` — **legacy/deprecated** or compatibility layer only (already self-declares `* @deprecated Use @haa/storefront-themes instead.` in `packages/theme-system/src/index.ts:17`).
- `@haa/theme-engine`, `@haa/theme-react`, `@haa/theme-web`, `@haa/system-theme` — keep as-is until the future theme rationalization pass classifies each one explicitly.

**Constraints on agents:**

1. **Do not create a new theme system or a parallel theme package.**
2. Any theme improvement, new theme, or token change must be built **on top of the existing system**, not as a side system.
3. **Do not remove** any of the 6 theme packages in routine work.
4. New consumer code (new pages, new components needing theming) should import from `@haa/storefront-themes` unless an existing file already binds to one of the others.
5. A future independent task (`theme rationalization`) may revisit each of the 6 packages and reclassify; until then, this decision is binding.

---

## DECISION-OS-004 — MASTER_PLAN authority

**Status:** Locked.

**Decision:** Any master plan document that still references a stale branch context (notably `docs/ops/MASTER_PLAN_2026-06-18.md` which references `feature/phase-9-cod-fee-policy`, 210 commits ahead of `main`) is **not the source of current state**.

**Current state derives from, in priority order:**

1. `AGENTS.md` (constitution).
2. `docs/agent-os/` (this directory — `CURRENT_SYSTEM_AUDIT.md`, `OWNER_DECISIONS.md`, `ISSUE_REGISTER.md`, and future Batch B/C outputs).
3. `docs/ops/CURRENT_STATE.md` **after** the next docs truth-sync pass (which is itself a future task).
4. Live Git branch and commit history.
5. PR metadata (`gh pr view`, GitHub UI) when available.

**Constraints on agents:**

1. **Do not edit `MASTER_PLAN_2026-06-18.md` now.**
2. **Do not cite it as the current plan.** When referenced, mark `(historical, branch context stale per DECISION-OS-004)`.
3. Refreshing `MASTER_PLAN` happens in a future docs truth-sync task, not now.

---

## DECISION-OS-005 — Existing `.claude/skills/` from prior session

**Status:** Locked (review window scheduled for Batch C).

**Decision:** The 5 `SKILL.md` files currently untracked under `.claude/skills/` (`affiliate-engine`, `playwright-critical-journeys`, `release-gate`, `security-debt-gate`, `semgrep-triage`) are classified as **legacy local input** from a prior session. They are **not canonical Agent OS skills**.

**Constraints on agents:**

1. **Do not add `.claude/skills/` to Git in Batch A or Batch B.**
2. **Do not open, modify, or delete those files** in Batch A or Batch B.
3. **Do not treat them as authoritative** during any task that does not explicitly evaluate them.
4. In **Batch C only**, an agent may open and evaluate each file with one of four verdicts:
   - `KEEP` — adopt as the canonical Agent OS skill for that name.
   - `MERGE` — reconcile content into a newly generated skill of the same or different name.
   - `REWRITE` — replace with a freshly generated skill.
   - `DISCARD` — do not adopt; remove from intended skill set (file remains untracked on disk; not committed).
5. Until Batch C executes the evaluation, treat the directory as **read-only and out of scope**.

---

## DECISION-OS-006 — Worktree policy

**Status:** Locked.

**Decision:** The sibling worktree `../haa-stores-agent-os` (currently parked on branch `chore/agent-os-skills`) is **not used** for executing Agent OS work.

**Reason (evidence-anchored):**

- `scripts/preflight.mjs:5` declares `EXPECTED_ROOT = '/Users/thwany/Desktop/haa-stores-core'` and `failHard(CWD === EXPECTED_ROOT, …)` at lines 36-41 — any other CWD exits with 1 outside CI.
- `AGENTS.md §2 #1` requires `pwd` to equal the canonical path.
- `CLAUDE.md` declares the canonical project path as `~/Desktop/haa-stores-core`.

**Canonical working location for Agent OS:**

```
/Users/thwany/Desktop/haa-stores-core
```

**Constraints on agents:**

1. **Do not execute Agent OS work inside `../haa-stores-agent-os` or any sibling worktree.**
2. **Do not delete the parked worktree** — it stays as-is until an explicit decision retires it.
3. **Do not modify `scripts/preflight.mjs`, `AGENTS.md`, or `CLAUDE.md` to enable worktree execution** unless an independent decision authorizes it — that change is foundational and must not be bundled with Agent OS work.
4. Multi-worktree support for Agent OS is **deferred** to a future independent decision.

---

## Index

| Decision        | Subject                              | Status                                                                   |
| --------------- | ------------------------------------ | ------------------------------------------------------------------------ |
| DECISION-OS-001 | Legacy root-level audits and reports | Locked — kept in place; cleanup deferred to a dedicated PR               |
| DECISION-OS-002 | Marketplace audit truth              | Locked — both reports STALE; marketplace work out of Agent OS scope      |
| DECISION-OS-003 | Theme package canonical direction    | Provisional — `@haa/storefront-themes` canonical; build on existing only |
| DECISION-OS-004 | MASTER_PLAN authority                | Locked — stale plan is not source of truth; refresh deferred             |
| DECISION-OS-005 | Existing `.claude/skills/`           | Locked — read-only until Batch C evaluation                              |
| DECISION-OS-006 | Worktree policy                      | Locked — canonical repo only; sibling worktree parked                    |
