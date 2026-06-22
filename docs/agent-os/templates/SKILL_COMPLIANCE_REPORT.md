# Final Skill Compliance Report

> Copy this template to the PR body (or to a doc linked from the PR body)
> before claiming a task "done". Every section must be filled. Empty
> sections invalidate the report (AGENTS.md §14.6).
>
> "Skills" here = Claude Code execution skills (`.claude/skills/<slug>/`).
> NOT CSS classes, design tokens, or any visual UI change. A report that
> proves "skills applied" via CSS or asset-hash evidence is invalid.

---

## Task

- **Title:**
- **Task type:** <one of the 13 in AGENTS.md §14.4>
- **Risk level:** <low | medium | high>
- **Branch:**
- **PR:**

## Mandatory Skill Gate (recap)

- **Skills selected:**
  - `<skill-slug>` — <one-line why>
  - `<skill-slug>` — <one-line why>
  - `<skill-slug>` — <one-line why>
- **Why these skills:** <one paragraph — pasted from the original gate>
- **Files expected to change:** <pasted from original gate>
- **Verification planned:** <pasted from original gate>

If `**No matching skill found**` was declared at gate time, paste the
fallback explanation and the follow-up entry created under
`docs/agent-os/SKILLS_REGISTRY.md` → Pending additions.

## Execution Evidence

- **Files actually changed:** <`git diff --name-only origin/main..HEAD`>
- **Files added / removed:**
- **Key decisions taken during execution:**
  -
  -
- **Safety constraints respected (per AGENTS.md §14.7):**
  - [ ] No `db:migrate` execution
  - [ ] No production deploy
  - [ ] No SSH to production
  - [ ] No secrets printed or `.env` echoed
  - [ ] No live payment-provider calls
  - [ ] No live shipping-provider calls
  - [ ] No direct edit to `main` or force-push
  - [ ] No use of forbidden server `187.124.41.239`

## Verification

Paste real output (no summaries). The four mandatory commands at minimum:

- `git diff` review — <files reviewed: n / n>
- `git diff --check`:

  ```
  <paste output or "clean">
  ```

- Tests (per `docs/agent-os/TEST_STRATEGY.md`):

  ```
  <paste tail of test output: passed/failed counts and any failures>
  ```

- `git status --short`:

  ```
  <paste output>
  ```

Type-specific verification (only the ones relevant to the task):

- `pnpm typecheck`:

  ```
  <paste tail>
  ```

- `pnpm lint`:

  ```
  <paste tail>
  ```

- `pnpm check:skills`:

  ```
  <paste tail>
  ```

- Targeted vitest for the affected area:

  ```
  <command + tail>
  ```

- For UI: which pages were loaded in browser (desktop + mobile RTL)?
- For backend: which routes were hit locally?
- For DB schema: was fresh-DB replay run? (`pnpm db:reset && pnpm db:generate`)
- For CI: was `gh run watch` confirmed green?

## Deviations

- **Deviations from selected skills:** <list — or "none">
- **Reason:**
- **Follow-up (registry update, new skill, etc.):**

## Completion

- **Did the task follow the selected skills end-to-end?** yes / no
- **Is further owner approval required before merge/deploy?** yes / no
- **Owner approvals received (cite source):**
- **Safety confirmations (re-affirmed at done):**
  - [ ] No `db:migrate` was run during this task
  - [ ] No production action was performed
  - [ ] No secrets were printed
  - [ ] No live payment / shipping calls were made

## Next step

- <what the next agent / next session needs to do, or "task closed">

---

_Template version: 1 (2026-06-22) — keep in sync with AGENTS.md §14._
