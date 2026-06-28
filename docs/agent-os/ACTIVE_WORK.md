# Active Work — Haa Stores Agent OS

> **Audience:** the next agent picking up where the previous one left off.
> **Authority rule:** this file is the **single source of truth for current in-flight session state**. Use `docs/ops/CURRENT_STATE.md` for historical milestones and `docs/ops/TASK_TRACKER.md` for the per-task ledger.
> **Update rule:** any session that inspects, changes, verifies, or reports work must update this file before stopping.

---

## Session Start Packet (authoritative)

- **Task ID:** `TASK-0088`
- **Task title:** Agent coordination truth-sync + mandatory handoff tightening
- **State:** `READY_TO_RESUME`
- **Current branch:** `copilot/research-pre-launch-readiness-assessment`
- **Working tree expectation:** only TASK-0088 docs truth-sync files should be dirty
- **Last known commit:** branch HEAD at session start; verify locally with `git rev-parse --short HEAD`
- **Last updated:** 2026-06-28
- **Current-state authority:** `ACTIVE_WORK.md` = now / `CURRENT_STATE.md` = milestones / `TASK_TRACKER.md` = task record
- **Next safe action:** review and commit only the TASK-0088 docs truth-sync files after confirming the diff matches the coordination scope
- **First safe command:** `cd /home/runner/work/haa-stores-core/haa-stores-core && git status --short --branch`
- **Resume prompt:** `افتح ACTIVE_WORK أولاً، طابقه مع الفرع الفعلي و TASK-0088 في TASK_TRACKER، ثم أكمل فقط ضمن نطاق truth-sync لوثائق التنسيق والتسليم بدون لمس AGENTS.md أو CLAUDE.md أو scripts/preflight.mjs.`

## Current task

**TASK-0088 — Agent coordination truth-sync (2026-06-28).** This task fixes the documented coordination gap where new agents were inheriting stale session state and inconsistent startup expectations. The docs change set establishes:

1. `ACTIVE_WORK.md` as the authoritative current-session packet.
2. Mandatory end-of-session handoff/update for any working session, not only interrupted ones.
3. A shorter startup flow: read the current packet first, then continue to supporting docs.
4. A sync guard: if `ACTIVE_WORK.md`, the actual branch/status, and the current task ledger disagree, the next agent must stop and truth-sync before implementing anything.

## What was completed

- Replaced the stale TASK-0083/TASK-0084/TASK-0085 packet with a current TASK-0088 packet tied to the actual branch used in this hosted clone.
- Aligned `OPERATING_MANUAL.md`, `PROVIDER_HANDOFF.md`, and `TASK_HANDOFF_TEMPLATE.md` around one coordination model: current packet first, mandatory session-boundary handoff, and explicit sync checking.
- Synced the ops truth files so the latest coordination model is visible in `TASK_TRACKER.md`, `CURRENT_STATE.md`, and `CHANGELOG_INTERNAL.md`.

## What remains incomplete

- **Foundational path mismatch remains unresolved by design.** The canonical root rule still points at `/Users/thwany/Desktop/haa-stores-core` in `AGENTS.md`, `CLAUDE.md`, and `scripts/preflight.mjs`, while this hosted task clone runs under `/home/runner/work/haa-stores-core/haa-stores-core`. That foundational change was intentionally left out of scope for TASK-0088.

## Verification

- Compare `ACTIVE_WORK.md` against the actual branch/status before any new edit.
- Confirm TASK-0088 exists in `docs/ops/TASK_TRACKER.md` and the latest coordination update is reflected in `docs/ops/CURRENT_STATE.md`.
- Run `git diff --check` before completion.

## Risks

- The repository still contains foundational canonical-path rules that do not match this hosted execution environment.
- Other historical handoff/protocol docs outside this scoped truth-sync may still need future rationalization; do not expand this task into a broader docs cleanup without a new brief.

## Out-of-scope reminders

- Do not modify `AGENTS.md`, `CLAUDE.md`, or `scripts/preflight.mjs` in this task.
- Do not mix CI, deploy, dependency, or code changes into this docs truth-sync branch.
