# Skill Cards — Haa Stores

> Short reference cards for every Claude Code execution skill in
> `.claude/skills/`. Read this file before publishing the Mandatory Skill
> Gate (AGENTS.md §14.2). For the full skill definition open
> `.claude/skills/<slug>/SKILL.md`.
>
> Each card is ≤ 5 lines so you can scan-pick under context budget.

## Order

Skills are grouped by stage of work:

1. Triage & framing
2. Planning & scope
3. Quality & safety
4. Implementation
5. Verification
6. Reporting & handoff
7. Cross-agent / operational

---

## 1. Triage & framing

### `priority-triage-gate`

- **Purpose:** Pick what to work on, by P0/P1/P2 risk, before any code.
- **Use when:** Backlog is mixed; multiple PRs open; ambiguous starting point.
- **Avoid when:** A single, clearly-scoped task is already on your desk.
- **Required checks:** P-labelled list; owner-action separator written.
- **Completion evidence:** The picked task + the *not picked* ones, with reasons.

### `unfinished-work-inventory`

- **Purpose:** Surface partial/abandoned work before adding new work.
- **Use when:** Starting a session or after a long pause.
- **Avoid when:** Mid-task continuation with no inventory question.
- **Required checks:** Sweep PARTIAL/STALE/BLOCKED in trackers and TODOs.
- **Completion evidence:** Inventory list, with owner-gated vs engineering-actionable.

### `product-canonical-state`

- **Purpose:** Anchor work in the canonical product state (not assumptions).
- **Use when:** Conflicting claims about what's done or what's live.
- **Avoid when:** Localized refactor with no product-state question.
- **Required checks:** Read CURRENT_STATE, REMAINING_WORK, DECISIONS.
- **Completion evidence:** Cite which canonical doc lines justify the choice.

---

## 2. Planning & scope

### `acceptance-criteria-gate`

- **Purpose:** Write explicit A/C before any code.
- **Use when:** New feature, contract change, ambiguity.
- **Avoid when:** Pure typo or comment-only edit.
- **Required checks:** A/C list; trace each A/C to a check or test.
- **Completion evidence:** Each A/C ticked with a referenced check.

### `build-on-existing-system-gate`

- **Purpose:** Force reuse before reinvention.
- **Use when:** Building anything that smells parallel to existing code.
- **Avoid when:** Greenfield package or genuinely new domain.
- **Required checks:** Grep for prior art; cite reuse path or justify net-new.
- **Completion evidence:** Reuse line in PR body; no shadow rewrite.

### `single-source-of-truth-gate`

- **Purpose:** One definition wins per concept; no shadow copies.
- **Use when:** Touching tokens, schemas, validators, shared utilities.
- **Avoid when:** Single-file local helper.
- **Required checks:** Grep all consumers; remove or alias the duplicate.
- **Completion evidence:** Grep showing one definition wins.

### `safe-cleanup-planner`

- **Purpose:** Plan deletions/renames without breaking callers.
- **Use when:** Removing code, files, packages.
- **Avoid when:** Adding code without removing anything.
- **Required checks:** Caller search; staged removal plan; rollback escape.
- **Completion evidence:** Caller diff + no orphan refs.

### `best-practices-research-gate`

- **Purpose:** Cite a current best practice before adopting a pattern.
- **Use when:** Choosing a new library/API/pattern.
- **Avoid when:** Reusing an already-adopted pattern.
- **Required checks:** Cite docs/RFC/changelog; check version compatibility.
- **Completion evidence:** Link/quote in PR body.

---

## 3. Quality & safety

### `environment-safety-gate`

- **Purpose:** Never auto-migrate, never deploy, never print secrets.
- **Use when:** Touching `.env`, migrations, deploy, secrets, prod paths.
- **Avoid when:** Pure read or pure UI change.
- **Required checks:** No `db:migrate` step; no live provider call; no SSH/deploy.
- **Completion evidence:** Four safety confirmations in the final report.

### `regression-safety-gate`

- **Purpose:** Existing flows must still pass.
- **Use when:** Any shared, RBAC, payments, shipping, or test-guard change.
- **Avoid when:** New isolated file with no callers.
- **Required checks:** Run impacted vitest suite; cite test count green.
- **Completion evidence:** Test counts + grep showing impacted callers covered.

### `agent-permission-boundary`

- **Purpose:** Stay inside what this agent/role may touch.
- **Use when:** Spawning sub-agents, considering deploys, editing protected files.
- **Avoid when:** Pure local edit inside the agent's scope.
- **Required checks:** Compare action to forbidden-actions list (AGENTS.md §14.7).
- **Completion evidence:** "in scope" line in PR body + owner approval when needed.

### `implementation-quality-gate`

- **Purpose:** Force code-quality checks before commit.
- **Use when:** Any non-trivial service or shared-package change.
- **Avoid when:** Pure copy or token tweak.
- **Required checks:** Typecheck; lint; targeted vitest; no `any`/`@ts-ignore`.
- **Completion evidence:** Output of each command.

### `anti-runaway-loop`

- **Purpose:** Stop after ≥3 same-failure iterations and re-plan.
- **Use when:** Same error reappears across attempts.
- **Avoid when:** First attempt; new failure mode.
- **Required checks:** Re-read failing log; change strategy, not just inputs.
- **Completion evidence:** A line in the report describing the strategy change.

### `context-budget-guardian`

- **Purpose:** Manage context window; defer or fork when tight.
- **Use when:** Many parallel sub-tasks; long file scans; long histories.
- **Avoid when:** Single focused task with small surface.
- **Required checks:** Fork plan or summary-then-discard plan.
- **Completion evidence:** Branch/fork ids or summary docs created.

### `design-ux-excellence-gate`

- **Purpose:** UX/UI polish to product-grade quality (incl. RTL, a11y).
- **Use when:** Customer-facing UI; visual regressions.
- **Avoid when:** Backend-only or doc-only work.
- **Required checks:** RTL run; mobile viewport; keyboard path; tokens-only colors.
- **Completion evidence:** Screenshots + token diff.

### `premium-product-quality-council`

- **Purpose:** Multi-discipline review (design/eng/ops/sec) on big releases.
- **Use when:** Pre-launch; large refactor; brand-impacting change.
- **Avoid when:** Single-PR fix.
- **Required checks:** Each council seat answers explicitly.
- **Completion evidence:** Council notes in the PR body.

### `definition-of-done-gate`

- **Purpose:** Match the work to the canonical Definition of Done.
- **Use when:** Closing any task or release item.
- **Avoid when:** Mid-work iteration.
- **Required checks:** DoD checklist per task type filled.
- **Completion evidence:** Filled DoD checklist linked in the PR.

### `test-strategy-gate`

- **Purpose:** Pick the right test layer (unit / integration / e2e / smoke).
- **Use when:** Adding tests or rearranging existing suites.
- **Avoid when:** No test change.
- **Required checks:** Strategy line ("this lives at layer X because Y").
- **Completion evidence:** Test file + layer call-out in PR body.

### `cleanup-and-archive-policy`

- **Purpose:** Archive instead of deleting when uncertain.
- **Use when:** Removing docs or large code blocks.
- **Avoid when:** Single function with clear non-use.
- **Required checks:** Archive location + reverse-pointer.
- **Completion evidence:** Archive entry created.

### `legacy-and-drift-cleanup`

- **Purpose:** Remove drift while preserving the productive parts.
- **Use when:** Touching old code with unclear status.
- **Avoid when:** Net-new code.
- **Required checks:** Caller graph; tests behavior diff.
- **Completion evidence:** Drift removed + tests still green.

---

## 4. Implementation

### `branch-pr-hygiene-gate`

- **Purpose:** Branches, commits, and PRs follow repo norms.
- **Use when:** Any push or PR.
- **Avoid when:** Local-only experiment that won't be pushed.
- **Required checks:** Branch off latest main; one topic; no `--no-verify`.
- **Completion evidence:** PR title + linked CI green.

### `haa-command-orchestrator`

- **Purpose:** Pick the right shell/pnpm command for the task.
- **Use when:** Unsure which `pnpm <something>` to run.
- **Avoid when:** Command is obvious.
- **Required checks:** Read `pnpm <task>` script in package.json.
- **Completion evidence:** Cite the script name and its output.

### `task-pause-and-resume-protocol`

- **Purpose:** Pause cleanly so a future agent can resume.
- **Use when:** Mid-task interruption, context limit, ownership change.
- **Avoid when:** Task is hours from done.
- **Required checks:** State file written; open questions listed.
- **Completion evidence:** Pause file referenced from the PR or task tracker.

---

## 5. Verification

### `verification-before-completion`

- **Purpose:** Mandatory last gate before "done". The big one.
- **Use when:** Every "done" claim, no exceptions.
- **Avoid when:** N/A — always required.
- **Required checks:** `git diff` review; `git diff --check`; tests; `git status --short`.
- **Completion evidence:** Block with each command's exact output.

---

## 6. Reporting & handoff

### `evidence-led-reporting`

- **Purpose:** Reports cite real output, not summaries.
- **Use when:** Final report; PR body; status update.
- **Avoid when:** N/A — always required for any "done" claim.
- **Required checks:** Paste command output excerpt or grep result.
- **Completion evidence:** Quoted block tied to a command.

### `documentation-handoff-gate`

- **Purpose:** Update the docs the next agent reads.
- **Use when:** Behavior or process actually changed.
- **Avoid when:** Pure typo with no behavior change.
- **Required checks:** Update TASK_TRACKER, CURRENT_STATE, DECISIONS as relevant.
- **Completion evidence:** List of docs touched + one-line per doc.

### `cross-agent-continuity-protocol`

- **Purpose:** Hand off cleanly between agents/sessions.
- **Use when:** Spawning a sub-agent or ending a session mid-task.
- **Avoid when:** Single-session solo task with clear close.
- **Required checks:** Handoff bundle (branch, scope, blockers).
- **Completion evidence:** Bundle in AGENT_HANDOFF.md or PR body.

---

## 7. Cross-agent / operational

### `project-memory-sync`

- **Purpose:** Keep PROJECT_MEMORY.md in sync with the live state.
- **Use when:** Structural state changes (new package, removed feature).
- **Avoid when:** Routine code edit.
- **Required checks:** Diff PROJECT_MEMORY.md against the change.
- **Completion evidence:** Memory line added or updated.

---

## Quick-pick cheat sheet

| You're about to … | Start with … |
| --- | --- |
| Edit a UI component | `design-ux-excellence-gate` + `regression-safety-gate` |
| Touch an API route | `acceptance-criteria-gate` + `regression-safety-gate` |
| Add a migration file | `environment-safety-gate` + `regression-safety-gate` |
| Wire a payment provider | `acceptance-criteria-gate` + `environment-safety-gate` + `regression-safety-gate` |
| Change a workflow | `environment-safety-gate` + `branch-pr-hygiene-gate` |
| Update docs the next agent reads | `documentation-handoff-gate` + `single-source-of-truth-gate` |
| Pre-launch sweep | `definition-of-done-gate` + `premium-product-quality-council` |
| Add tests | `test-strategy-gate` + `regression-safety-gate` |
| Claim "done" on anything | `verification-before-completion` + `evidence-led-reporting` |
