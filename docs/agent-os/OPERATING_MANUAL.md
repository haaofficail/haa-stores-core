# Operating Manual — Haa Stores Agent OS

> **Audience:** every agent (Claude Code, MiniMax, future tools) and every human operator.
> **Status:** active and binding.
> **Read with:** `AGENTS.md` (constitution), `OWNER_DECISIONS.md`, `PROJECT_MEMORY.md`, `RISK_AND_PERMISSION_POLICY.md`.

This manual describes **how to do work**, not what the work is. Pair it with `ACTIVE_WORK.md` for current session state.

---

## 1. The canonical sequence

Every task — large or small — follows this sequence. Do not skip steps; do not reorder.

```
Start
  → read ACTIVE_WORK session packet
  → verify official root
  → read AGENTS.md
  → read docs/agent-os/
  → classify task
  → check project memory
  → define acceptance criteria
  → choose execution path
  → research if required
  → inspect existing system
  → avoid duplicate systems
  → implement only within scope
  → verify
  → document handoff
```

Each step is a gate. If a gate cannot be cleared, **stop and report**.

---

## 2. Step-by-step

### 2.0 Read `ACTIVE_WORK.md` first

- Read the **Session Start Packet** at the top of `ACTIVE_WORK.md` before any state-changing action.
- Treat `ACTIVE_WORK.md` as the **single source of truth for in-flight session state**:
  - `ACTIVE_WORK.md` = what is happening now
  - `docs/ops/CURRENT_STATE.md` = historical milestones / current broad platform state
  - `docs/ops/TASK_TRACKER.md` = per-task record
- If `ACTIVE_WORK.md` disagrees with the actual branch, working tree, or current task ledger, **stop and truth-sync the docs first**. Do not "just continue and remember it manually".

### 2.1 Verify official root

- `pwd` must equal `/Users/thwany/Desktop/haa-stores-core` (per `AGENTS.md §2 #1`, `CLAUDE.md`, `scripts/preflight.mjs:5`).
- Sibling worktrees are **parked** per [`OWNER_DECISIONS.md`](./OWNER_DECISIONS.md) DECISION-OS-006.
- If `pwd` is wrong → stop, report, do not retry from a wrong directory.

### 2.2 Read `AGENTS.md`

- The constitution. Re-read at least the table of contents every session. Re-read §2 (Mandatory Start Rule), §5 (Product Boundaries), §7 (Non-Negotiable Rules) for any task that touches code.

### 2.3 Read `docs/agent-os/`

- `OWNER_DECISIONS.md` first (binding rulings).
- `ACTIVE_WORK.md` (authoritative current-session packet).
- `PROJECT_MEMORY.md` (identity, infra, providers).
- This manual.
- `RISK_AND_PERMISSION_POLICY.md`.
- `COMMAND_ROUTING_MATRIX.md` to pick gates for the task type.

### 2.4 Classify the task

Pick one or more of these classes (full taxonomy in `AGENTS.md §4` and `COMMAND_ROUTING_MATRIX.md`):

- audit / bug fix / feature / UX-UI polish / refactor / security / performance / architecture / documentation / testing / data-DB / integration / theme work / RBAC / product planning / support-ops / monitoring / incident response.

Classification drives which gates fire (see `COMMAND_ROUTING_MATRIX.md`).

### 2.5 Check project memory

- Has this been decided before? (`OWNER_DECISIONS.md`, `DECISIONS.md`, `docs/ops/DECISIONS.md`)
- Has it been audited? (`CURRENT_SYSTEM_AUDIT.md`, `ISSUE_REGISTER.md`)
- Are there relevant historical artefacts marked `ARCHIVE_CANDIDATE` or `STALE` per `CLEANUP_ARCHIVE_POLICY.md`?

### 2.6 Define acceptance criteria

- Write them down, even for small tasks. Use `AGENTS.md §3` (Request Expansion Rule) for non-trivial work.
- See `DEFINITION_OF_DONE.md` for the bar a task must clear before "done".

### 2.7 Choose execution path

- One commit per topic, one branch per topic, one PR per topic (`branch-pr-hygiene-gate`).
- Read `COMMAND_ROUTING_MATRIX.md` for required vs optional gates.

### 2.8 Research only when required

**Use web research when:**

- new external integration (payment, shipping, marketplace, identity provider),
- new framework or library decision,
- security/compliance question outside the constitution,
- UX pattern that does not yet exist in the codebase,
- CI/CD primitive change.

**Skip web research when:**

- the answer is in `AGENTS.md` / `docs/agent-os/` / `docs/ops/`,
- the answer is reachable by `grep`/`find` inside the repo,
- the change is a one-line typo, a copy edit, or a localized refactor of existing code.

### 2.9 Inspect existing system before writing new code

- `grep` for the same feature name first.
- Read the relevant package's `package.json`, `README.md`, and any `index.ts` exports.
- Cross-reference with `SYSTEM_MAP.md` and `OWNER_DECISIONS.md` DECISION-OS-003 (no parallel systems).

### 2.10 Avoid duplicate systems

- If the same capability already exists, **extend or fix it**. Do not create a sibling system.
- DECISION-OS-003 explicitly forbids new theme systems.
- See `single-source-of-truth-gate` mindset.

### 2.11 Implement only within scope

- Out-of-scope edits cause merge conflicts and review fatigue.
- If you discover an unrelated bug, **add it to `ISSUE_REGISTER.md`** instead of fixing it inline.

### 2.12 Verify

- `git diff` review of every changed file (`verification-before-completion`).
- Run the relevant test commands from `package.json` (see `TEST_STRATEGY.md`).
- `git diff --check` for whitespace.
- For UI: load the page in a browser when possible; `playwright-critical-journeys` if applicable.

### 2.13 Document and hand off

- Update `ACTIVE_WORK.md` (what was done, what remains).
- Update `docs/ops/TASK_TRACKER.md` and `docs/ops/CURRENT_STATE.md` per `AGENTS.md §10`.
- Add to `DECISIONS.md` if an architectural choice was made.
- Use `TASK_HANDOFF_TEMPLATE.md` if another agent will continue.
- Any session that did real work — investigation, edits, verification, or user-facing reporting of execution results — must leave an updated `ACTIVE_WORK.md` packet before stopping.

---

## 3. Smart Execution Brief — converting short commands

A short user command (e.g. "fix the footer", "make it professional") is **not** an executable instruction. Expand it before acting using this template (full version in `AGENTS.md §3`):

```
Interpreted Task
- Original user request:
- What I think the user wants:
- Task type:
- Assumptions:
- Scope:
- Out of scope:
- Affected areas:
- Files to inspect:
- Risks:
- Acceptance criteria:
- Test plan:
- Documentation updates needed:
```

If you cannot fill in `Acceptance criteria` and `Out of scope`, stop and ask.

---

## 4. When to stop and request an owner decision

Stop and ask the owner when:

- The task requires a foundational change (touching `AGENTS.md`, `CLAUDE.md`, `scripts/preflight.mjs`, CI workflows, `package.json`, lockfile, secrets).
- Two existing decisions conflict and no new decision resolves them.
- Cost/risk is `launch-critical` per `RISK_AND_PERMISSION_POLICY.md`.
- The acceptance criteria cannot be agreed without more information from the owner.
- The task implies removing or rewriting an `ARCHIVE_CANDIDATE` file (see `OWNER_DECISIONS.md` DECISION-OS-001).

Do not invent decisions; record the question in `ACTIVE_WORK.md → Next safe action` and stop.

---

## 5. Preventing side roads

A "side road" is any change that drifts beyond the agreed scope. Guard against them by:

- Re-reading the original Smart Execution Brief before each commit.
- Re-stating Out-of-scope in every report.
- Routing every discovered issue to `ISSUE_REGISTER.md`, not to the current diff.
- Using `branch-pr-hygiene-gate` to refuse mixed topics on one branch.

If a side road is needed, **open a new branch** and a new brief.

---

## 6. Handling unfinished work

- If you cannot finish a task in the current session, leave it in a **resumable** state. Use `task-pause-and-resume-protocol` (future skill in Batch C).
- Possible states: `PAUSED_CLEAN`, `PAUSED_DIRTY`, `BLOCKED`, `PARKED_PATCH`, `PARKED_BRANCH`, `READY_TO_RESUME`, `ABANDON_CANDIDATE`.
- Always update `ACTIVE_WORK.md` with the state and the **resume prompt** for the next agent.
- Even if the task is complete, update `ACTIVE_WORK.md` so the next agent starts from the latest known truth instead of stale session notes.

---

## 7. Ending a task

A task is **not done** until:

1. The work matches the acceptance criteria.
2. The relevant tests pass (or the failure is documented and accepted by the owner).
3. The handoff documents are updated.
4. The Final Report includes: what changed, why, files, verification, residual risks, suggested next step (per `AGENTS.md §8`).

If any of those four bullets is unmet, the task is **incomplete**.

---

## 8. Related documents

- `AGENTS.md` — constitution.
- `OWNER_DECISIONS.md` — locked owner rulings.
- `PROJECT_MEMORY.md` — identity and infra facts.
- `RISK_AND_PERMISSION_POLICY.md` — what is forbidden without approval.
- `COMMAND_ROUTING_MATRIX.md` — gates per task type.
- `DEFINITION_OF_DONE.md` — the bar for "done".
- `QUALITY_GATES.md` — all gates in one place.
- `TASK_HANDOFF_TEMPLATE.md` — handoff format.
- `ACTIVE_WORK.md` — what is in flight now.
