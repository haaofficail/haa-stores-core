# Decisions — Haa Stores Agent OS

> **Scope:** decisions that emerge from Agent OS operation (cross-agent, process, scoping). Architectural product decisions live in `docs/ops/DECISIONS.md` and are referenced here when relevant.
> **Format:** every entry uses the block below. Do not delete old entries; supersede with a new dated entry and mark the prior one `SUPERSEDED by …`.
> **Locked rulings:** see [`OWNER_DECISIONS.md`](./OWNER_DECISIONS.md) — this file mirrors them as foundational entries so future decisions can `Supersedes:` them.

---

## Decision template

```
ID:          DECISION-OS-NNN
Date:
Status:      Locked / Provisional / Proposed / Superseded
Decision:
Supersedes:
Impact:
Evidence:
```

---

## Founding entries (mirrored from OWNER_DECISIONS.md)

### DECISION-OS-001 — Legacy root-level audits and reports

- **Date:** 2026-06-21
- **Status:** Locked
- **Decision:** Root-level markdown reports are `ARCHIVE_CANDIDATE`; kept in place; cleanup only via a dedicated `docs/archive-cleanup` PR; not authoritative as current state.
- **Supersedes:** —
- **Impact:** All agents must not move/delete these files in routine work; citations require the `(historical, ARCHIVE_CANDIDATE)` prefix.
- **Evidence:** `OWNER_DECISIONS.md` DECISION-OS-001; `CURRENT_SYSTEM_AUDIT.md §4`; `ISSUE_REGISTER.md` ISSUE-0004.

### DECISION-OS-002 — Marketplace audit truth

- **Date:** 2026-06-21
- **Status:** Locked
- **Decision:** Both existing marketplace audits (root + `docs/ops/PUBLIC_MARKETPLACE_AUDIT.md`) are `STALE` / `PARTIALLY_SUPERSEDED`. Truth derives from current code + a future independent audit. Marketplace fixes are **out of Agent OS scope**.
- **Supersedes:** —
- **Impact:** No marketplace remediation through Agent OS work; future audit opens as separate task.
- **Evidence:** `OWNER_DECISIONS.md` DECISION-OS-002; `ISSUE_REGISTER.md` ISSUE-0003.

### DECISION-OS-003 — Theme canonical direction

- **Date:** 2026-06-21
- **Status:** Provisional (binding until full theme rationalization)
- **Decision:** `@haa/storefront-themes` is canonical; `@haa/theme-system` is legacy/deprecated; no parallel theme systems; build on existing.
- **Supersedes:** —
- **Impact:** New theme consumer code targets `@haa/storefront-themes`; the other 5 theme packages remain in place.
- **Evidence:** `OWNER_DECISIONS.md` DECISION-OS-003; `packages/theme-system/src/index.ts:17`; `ISSUE_REGISTER.md` ISSUE-0002.

### DECISION-OS-004 — MASTER_PLAN authority

- **Date:** 2026-06-21
- **Status:** Locked
- **Decision:** `MASTER_PLAN_2026-06-18.md` is not the source of current state. Current state derives from `AGENTS.md` + `docs/agent-os/` + post-sync `docs/ops/CURRENT_STATE.md` + Git/PR metadata.
- **Supersedes:** —
- **Impact:** No agent cites the master plan as current; refresh deferred to a future docs truth-sync task.
- **Evidence:** `OWNER_DECISIONS.md` DECISION-OS-004; `docs/ops/MASTER_PLAN_2026-06-18.md` lines 1–8; `ISSUE_REGISTER.md` ISSUE-0006.

### DECISION-OS-005 — Existing `.claude/skills/`

- **Date:** 2026-06-21
- **Status:** Locked (review window in Batch C)
- **Decision:** Untracked `.claude/skills/` from prior session is legacy local input, not canonical. Read-only until Batch C evaluation (KEEP / MERGE / REWRITE / DISCARD).
- **Supersedes:** —
- **Impact:** Batches A and B must not open, modify, add to Git, or treat as authoritative.
- **Evidence:** `OWNER_DECISIONS.md` DECISION-OS-005; `ISSUE_REGISTER.md` ISSUE-0014.

### DECISION-OS-006 — Worktree policy

- **Date:** 2026-06-21
- **Status:** Locked
- **Decision:** Canonical repo path `/Users/thwany/Desktop/haa-stores-core` only. Sibling worktree `../haa-stores-agent-os` is parked. Foundational files (`scripts/preflight.mjs`, `AGENTS.md`, `CLAUDE.md`) must not be modified for worktree support unless a separate decision authorizes it.
- **Supersedes:** —
- **Impact:** All agent execution happens in the canonical repo until a future decision authorizes multi-worktree.
- **Evidence:** `OWNER_DECISIONS.md` DECISION-OS-006; `scripts/preflight.mjs:5,36-41`; `AGENTS.md §2 #1`; `CLAUDE.md` line 7; `ISSUE_REGISTER.md` ISSUE-0001, ISSUE-0019.

---

## Active entries

_(None yet. New Agent OS decisions are appended below.)_

---

## Index by status

| Status      | IDs                                    |
| ----------- | -------------------------------------- |
| Locked      | OS-001, OS-002, OS-004, OS-005, OS-006 |
| Provisional | OS-003                                 |
| Proposed    | —                                      |
| Superseded  | —                                      |
