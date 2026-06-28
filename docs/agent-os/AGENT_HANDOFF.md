# Agent Handoff Protocol — Haa Stores

> Every new agent that picks up work on this repo MUST complete the
> reading list, classify the task, publish a Skill Gate, and write a
> handoff bundle before mutating anything.
>
> This file lives in `docs/agent-os/` because it is part of the agent OS
> contract. The lighter, session-specific handoff notes live in
> `docs/agent/AGENT_HANDOFF.md` (which a session may also create).

## 1. Required reads (in this order)

Before any edit, read these files. Do not skim — scan for items relevant
to the task at hand:

1. `AGENTS.md` — repo constitution (especially §14 Mandatory Skill Gate).
2. `CLAUDE.md` — infrastructure rules + skill-terminology clarifier.
3. `docs/agent-os/SKILLS_REGISTRY.md` — task type → skills map.
4. `docs/agent-os/SKILL_CARDS.md` — short scan-friendly cards per skill.
5. `docs/agent-os/SKILL_FILE_MAPPING.md` — file-glob → required-skills map.
6. `docs/agent-os/EXECUTION_CHECKLIST.md` — the pre-execution gate checklist.
7. `docs/ops/CURRENT_STATE.md` — what's true about staging/prod right now.
8. `docs/agent-os/REMAINING_WORK.md` — backlog with P-labels.
9. `docs/agent-os/DECISIONS.md` — recent decisions that may bind your work.
10. `docs/ops/TASK_TRACKER.md` — active tasks and skills used per task.

Skim, not memorize. The point is to know what exists so you can return to
the right file later.

## 2. Publish a Handoff Bundle (before first edit)

Write the following block in your first user-visible message of the
session. Keep it in the PR body too:

```markdown
## Handoff Bundle

- **Agent / session id:**
- **Current branch:** <`git rev-parse --abbrev-ref HEAD`>
- **Base branch:** <usually `main`>
- **Task type:** <one of the 13 in AGENTS.md §14.4>
- **Task title:** <one sentence>
- **Skills selected (all applicable; no numeric cap):**
  - `<skill-slug>` — <why>
  - `<skill-slug>` — <why>
- **Open PRs relevant to this work:** <list of PR#s>
- **Files I expect to touch:**
- **Safety constraints respected:** no deploy · no db:migrate · no secrets · no production action
- **Owner approval state:** <granted | not-required | pending>
- **What I will NOT do in this task:**
```

This bundle is the entry-point for any later agent inheriting the work.

## 3. During work

- Keep the Skill Gate (AGENTS.md §14.2) up to date if scope changes — do
  not silently expand the gate after the fact.
- If you cross into a new task type mid-work, **stop** and publish a new
  gate (or split into a separate PR).
- If the same failure recurs three times, invoke `anti-runaway-loop`
  before the fourth attempt.

## 4. Before pausing or handing off mid-task

If you cannot finish in the current session:

1. Use `task-pause-and-resume-protocol`.
2. Write a `Pause Note` block to the PR body (or to a doc linked from
   it): branch, last commit, what's tested, what's broken, what to do
   next, and which skills the next agent should consider.
3. Mark the PR `Draft` if not already.

## 5. At "done"

1. Publish the Final Skill Compliance Report
   (`docs/agent-os/templates/SKILL_COMPLIANCE_REPORT.md`).
2. Link it from the PR body.
3. Tick the four safety checks (no deploy / no db:migrate / no secrets /
   no production action).
4. Mark the PR `Ready for review` and tag the owner — do not self-merge.

## 6. After merge (next agent / next session)

The next agent should:

1. Pull `main`.
2. Re-read this file (it may have changed in the merged PR).
3. Re-read `docs/agent-os/SKILLS_REGISTRY.md` (it may have grown).
4. Start their own Handoff Bundle.

## 7. Forbidden during handoff

- Don't carry over a Skill Gate from a different task — write a fresh
  one for your actual scope.
- Don't trust a stale "completed" claim — re-verify by running the
  relevant pnpm command.
- Don't change `main` directly — even if the previous agent looked like
  they did so.

## 8. References

- `AGENTS.md` §14 — the constitution clause this protocol enforces.
- `docs/agent-os/SKILLS_REGISTRY.md` — full skills catalogue.
- `docs/agent-os/SKILL_CARDS.md` — short cards.
- `docs/agent-os/SKILL_FILE_MAPPING.md` — file globs → required skills.
- `docs/agent-os/templates/SKILL_COMPLIANCE_REPORT.md` — final report template.
- `.github/pull_request_template.md` — PR body template that already wires this protocol into the PR.
