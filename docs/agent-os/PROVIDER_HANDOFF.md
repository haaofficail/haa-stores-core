# Provider Handoff — Haa Stores Agent OS

> **Purpose:** allow any AI provider (Claude Code, MiniMax, others) to enter and exit a session **without losing context, decisions, or work in progress**.
> **Companion documents:** `ACTIVE_WORK.md` (current state), `TASK_HANDOFF_TEMPLATE.md` (per-task handoff), `OWNER_DECISIONS.md` (binding rulings).

---

## 1. Why `docs/agent-os/` is the neutral source of truth

- **Provider-independent.** `docs/agent-os/` is plain markdown in the repo. Every AI provider can read it; no provider-specific config is required.
- **Versioned.** Git tracks it; decisions and state are reviewable diffs, not chat history.
- **Auditable.** Every claim cites evidence; every owner ruling is dated and locked.
- **Layered.**
  - `AGENTS.md` — constitution.
  - `docs/agent-os/` — operating system for agents.
  - `.claude/skills/` — Claude-specific tactical skills (not portable verbatim to other providers, but reflectable into MiniMax/other prompts).

Within that docs layer, the current-state split is:

- `ACTIVE_WORK.md` — **authoritative current-session packet**
- `docs/ops/CURRENT_STATE.md` — broad platform state / milestone history
- `docs/ops/TASK_TRACKER.md` — per-task ledger and acceptance evidence

`.claude/skills/` alone is **not** sufficient — it is provider-specific, optional, and (per `OWNER_DECISIONS.md` DECISION-OS-005) the current contents are legacy local input pending evaluation in Batch C.

---

## 2. Why `.claude/skills/` is not enough alone

- Other providers do not load `.claude/skills/` automatically.
- The current 5 untracked skills are pre-existing, not canonical, and out of scope until Batch C.
- Skills express tactics; **docs express identity, decisions, and state** — both layers are needed.
- An owner reading only `.claude/skills/` cannot see the project's binding rulings or current branch state.

---

## 3. Claude → MiniMax (or any other provider) — exit checklist

The Claude session must, before ending any working session:

1. **Pause cleanly.** Choose a `Parking method` from `TASK_HANDOFF_TEMPLATE.md` (`PAUSED_CLEAN`, `READY_TO_RESUME`, etc.).
2. **Update `ACTIVE_WORK.md`** with: current task, branch, last commit, changed files, untracked files, completed/incomplete, residual risks, next safe action.
3. **Write the handoff message** using `TASK_HANDOFF_TEMPLATE.md` (verbatim user brief, decisions made, commands run, tests run, failures).
4. **Do not commit** ad-hoc just to "save state" — uncommitted changes are recorded in `ACTIVE_WORK.md` instead, and Git tracks the working tree.
5. **Do not push.** Push requires explicit owner approval.
6. **Verify** `git status --short` reflects the recorded state.
7. **Confirm** `OWNER_DECISIONS.md` rulings are still respected by the work-in-progress.

---

## 4. MiniMax (or any other provider) — entry checklist

A new agent starting work must, before any edit:

1. Read the **Session Start Packet** in `ACTIVE_WORK.md` first.
2. `pwd` → must equal `/Users/thwany/Desktop/haa-stores-core` (DECISION-OS-006).
3. `git branch --show-current` → confirm with owner if unexpected.
4. `git status --short` → expect what `ACTIVE_WORK.md` says; investigate any diff.
5. Run the sync guard before implementation:
   - `ACTIVE_WORK.md` names the same branch.
   - `ACTIVE_WORK.md` describes the same dirty/clean expectation.
   - The latest relevant task in `docs/ops/TASK_TRACKER.md` matches the current scope.
   - If any check fails, stop and truth-sync before editing.
6. Read the following, in order:
   1. `AGENTS.md`
   2. `CLAUDE.md`
   3. `docs/agent-os/OWNER_DECISIONS.md`
   4. `docs/agent-os/OPERATING_MANUAL.md`
   5. `docs/agent-os/PROJECT_MEMORY.md`
   6. `docs/agent-os/ACTIVE_WORK.md` (full file after the packet)
   7. `docs/agent-os/RISK_AND_PERMISSION_POLICY.md`
   8. `docs/agent-os/COMMAND_ROUTING_MATRIX.md`
   9. Task-relevant section of `docs/agent-os/TEST_STRATEGY.md` and `DEFINITION_OF_DONE.md`.
7. Run the **First safe command** from the previous handoff.
8. State the Smart Execution Brief (per `OPERATING_MANUAL.md §3`) before any tool call that mutates the repo.

---

## 5. Canonical paths and resources

- **Working directory (only allowed):** `/Users/thwany/Desktop/haa-stores-core`.
- **Parked worktree (do not use):** `../haa-stores-agent-os` (DECISION-OS-006).
- **Untracked legacy `.claude/skills/` (do not open until Batch C):** see DECISION-OS-005.
- **Infrastructure source of truth:** `docs/ops/HAA_STORES_HOSTINGER_TARGET.md` + `.haa/hostinger-target.json` (per `CLAUDE.md`).
- **Constitution:** `AGENTS.md`.
- **Project memory file (long-term, this repo):** `docs/agent-os/PROJECT_MEMORY.md`.
- **System map:** `docs/system-map/SYSTEM_MAP.md`.

---

## 6. Startup prompt — paste-ready for any new agent

```
You are now working on Haa Stores (متاجر هاء), a multi-tenant Saudi e-commerce SaaS monorepo.

Strict bootstrap:
1) Open docs/agent-os/ACTIVE_WORK.md and read the Session Start Packet first.
2) cd /Users/thwany/Desktop/haa-stores-core   (the only allowed working directory)
3) Read in this order:
   - AGENTS.md
   - CLAUDE.md
   - docs/agent-os/OWNER_DECISIONS.md
   - docs/agent-os/OPERATING_MANUAL.md
   - docs/agent-os/PROJECT_MEMORY.md
   - docs/agent-os/ACTIVE_WORK.md (full file)
   - docs/agent-os/RISK_AND_PERMISSION_POLICY.md

Rules until told otherwise:
- Do not commit, push, merge, deploy, install dependencies, edit package.json or lockfile, or change CI workflows.
- Do not modify scripts/preflight.mjs, AGENTS.md, or CLAUDE.md.
- Do not open or modify .claude/skills/ (legacy local input, DECISION-OS-005).
- Do not treat MASTER_PLAN_2026-06-18.md or the existing marketplace audits as current truth.
- Do not create a new theme system; build on @haa/storefront-themes.

Before editing, verify:
  - branch/status match ACTIVE_WORK.md
  - current task scope matches TASK_TRACKER
  - if not, stop and truth-sync first

After reading, restate in one paragraph:
  (a) what you understand to be in progress (from ACTIVE_WORK.md),
  (b) what the next safe action is,
  (c) any unanswered question before you proceed.

Wait for the owner's confirmation before any edit.
```

---

## 7. Pause prompt — paste-ready for the outgoing Claude session

```
Pause this session cleanly:
1) Update docs/agent-os/ACTIVE_WORK.md with: current task, branch, last commit, changed files, untracked files, completed work, incomplete work, residual risks, next safe action.
2) Produce a handoff using docs/agent-os/TASK_HANDOFF_TEMPLATE.md (verbatim user brief, parking method, resume prompt, first safe command).
3) Do not commit or push.
4) Run:
   - pwd
   - git branch --show-current
   - git status --short
   and confirm the output matches what you recorded in ACTIVE_WORK.md.
5) Reply with: the handoff message + the three commands' outputs. Then stop.
```

---

## 8. Reading order at session start (recap)

| Order | File                                                                      | Why                                                                           |
| ----: | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
|     0 | `ACTIVE_WORK.md` (Session Start Packet)                                   | Immediate current-session truth before any assumption.                        |
|     1 | `AGENTS.md`                                                               | Constitution; mandatory start rule.                                           |
|     2 | `CLAUDE.md`                                                               | Infrastructure rules, canonical path, forbidden servers/domains.              |
|     3 | `OWNER_DECISIONS.md`                                                      | Binding rulings (theme, worktree, marketplace, skills, master plan, archive). |
|     4 | `OPERATING_MANUAL.md`                                                     | How to do work.                                                               |
|     5 | `PROJECT_MEMORY.md`                                                       | Identity, providers, infra, launch status.                                    |
|     6 | `ACTIVE_WORK.md` (full file)                                              | Current task packet + what remains.                                           |
|     7 | `RISK_AND_PERMISSION_POLICY.md`                                           | What is forbidden.                                                            |
|     8 | `COMMAND_ROUTING_MATRIX.md`                                               | Which gates fire for this task type.                                          |
|     9 | `TEST_STRATEGY.md` + `DEFINITION_OF_DONE.md` (task-relevant section only) | The bar to clear.                                                             |
