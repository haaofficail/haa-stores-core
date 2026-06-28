<!--
Haa Stores — Pull Request Template

This template enforces the Mandatory Skill Gate (AGENTS.md §14). Do not
delete sections. Empty required sections invalidate the PR per §14.6.

"Skills" here means Claude Code execution skills (.claude/skills/<slug>/),
NOT CSS classes, design tokens, or visual UI changes.
-->

## Summary

<!-- 1–3 bullets describing what changed and why. -->

-
-

## Mandatory Skill Gate

- [ ] Task type classified (one of the 13 in AGENTS.md §14.4)
- [ ] All applicable skills selected before any edit (no numeric cap)
- [ ] Why these skills was stated up front
- [ ] Files expected to change were listed up front
- [ ] Verification commands were mapped to selected skills
- [ ] Final Skill Compliance Report is included or linked below

**Task type:** <!-- frontend/design | backend/api | database/migration | payments/wallet | shipping | security | ci/deploy | docs/truth-sync | launch-readiness | observability | performance | accessibility | testing/e2e -->

**Risk level:** <!-- low | medium | high -->

## Skills Selected

<!-- Select every applicable slug from .claude/skills/. No numeric cap. One line per skill explaining why it fits; do not add unrelated skills. -->

-
-
-

If no skill fit, write `**No matching skill found**` + fallback per
AGENTS.md §14.3, and link the Pending-additions entry created in
`docs/agent-os/SKILLS_REGISTRY.md`.

## Evidence

<!--
Real evidence that the selected skills were applied. Paste actual output,
not summaries. Acceptable evidence:

- Commands run + their output excerpts.
- grep results showing the invariant the skill enforces.
- Screenshot pairs (before/after) for UI work.
- Test counts (passed/failed) for the affected suite.

NOT acceptable as "skills applied" evidence:

- Asset-hash diffs.
- "It looks fine in the browser."
- Generic CI green badge alone.
-->

## Verification

<!-- Run these and paste real output. -->

- `git diff --check`:

  ```

  ```

- `pnpm typecheck`:

  ```

  ```

- `pnpm test` (or targeted vitest for the affected area):

  ```

  ```

- `pnpm lint`:

  ```

  ```

- `pnpm check:skills`:

  ```

  ```

- `git status --short`:

  ```

  ```

## Final Skill Compliance Report

<!--
Either inline the report (template at
docs/agent-os/templates/SKILL_COMPLIANCE_REPORT.md) or link to where it
lives. The four safety confirmations are non-negotiable.
-->

- Report location:

## Safety (AGENTS.md §14.7)

- [ ] No `db:migrate` execution
- [ ] No production deploy
- [ ] No SSH to production
- [ ] No secrets printed or `.env` echoed
- [ ] No live payment-provider calls
- [ ] No live shipping-provider calls
- [ ] No direct edit to `main` or force-push
- [ ] No use of forbidden server `187.124.41.239`

## Scope (out of scope for this PR)

<!--
What this PR explicitly does NOT do. Helps reviewers see scope creep
quickly.
-->

-

## Owner Approval Needed

- [ ] No — agent-actionable end-to-end
- [ ] Yes — explain what owner approval is required for:

## Test plan

<!-- Bulleted checklist of how a reviewer can verify this PR locally or on staging. -->

- [ ]
- [ ]
