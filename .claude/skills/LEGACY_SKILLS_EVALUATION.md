# Legacy Skills Evaluation — Batch C + Batch C.1

> **Generated:** 2026-06-21 during Batch C; **updated 2026-06-21 in Batch C.1** with the filesystem-action column after explicit owner authorisation to disarm DISCARD skills.
> **Governance:** [`docs/agent-os/OWNER_DECISIONS.md`](../../docs/agent-os/OWNER_DECISIONS.md) DECISION-OS-005 (review authority granted to Batch C); Batch C.1 owner brief authorised in-place deletion within `.claude/skills/` for entries with verdict DISCARD.
> **Scope:** the 5 `SKILL.md` files that existed under `.claude/skills/` from a prior session.
> **Note:** this file is `extra intentional` — it is not one of the 28 required skills; it records the per-file verdict so future agents do not re-evaluate from scratch.

---

## Verdict table

| Legacy skill                   | Decision    | Reason                                                                                                                                                                                                                                                                                             | Useful content mapped to                                                                                                                                                                                                     | Final filesystem action                                                                                                                                                     |
| ------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `affiliate-engine`             | **DISCARD** | Affiliate / referral is **not implemented** in code (zero grep hits across `apps/*/src` and `packages/*/src`). `PROJECT_MEMORY.md §11` OD-NEEDED-004 leaves the build/defer/drop decision to the owner. Skill is forward-looking spec, not a tactical orchestration skill. Out of the 28 required. | Concept "no parallel system, do not implement on speculation" is covered by `build-on-existing-system-gate`. The affiliate domain itself is tracked in `ISSUE_REGISTER.md` ISSUE-0011 and `PROJECT_MEMORY.md` OD-NEEDED-004. | **Removed from active skills because decision is DISCARD.** (Directory `.claude/skills/affiliate-engine/` deleted in Batch C.1; was untracked, so no Git history affected.) |
| `playwright-critical-journeys` | **DISCARD** | Playwright is an execution tactic, not an orchestration skill. Out of the 28 required.                                                                                                                                                                                                             | Concept of browser-level critical journeys is covered by `test-strategy-gate §2.2` and `regression-safety-gate`. When the owner approves a Playwright tactic skill, it can be added in a later batch.                        | **Removed from active skills because decision is DISCARD.** (Directory `.claude/skills/playwright-critical-journeys/` deleted in Batch C.1; was untracked.)                 |
| `release-gate`                 | **DISCARD** | Name overlaps a generic concept already covered by the union of `verification-before-completion` + `priority-triage-gate` + `documentation-handoff-gate` + `regression-safety-gate`. Out of the 28 required as a standalone skill.                                                                 | Pre-push/merge/deploy aggregate check is split across the four skills above. `TEST_STRATEGY.md §2.16` lists the commands.                                                                                                    | **Removed from active skills because decision is DISCARD.** (Directory `.claude/skills/release-gate/` deleted in Batch C.1; was untracked.)                                 |
| `security-debt-gate`           | **DISCARD** | Out of the 28 required. Gitleaks handling and the `--no-verify` / `.gitleaksignore` prohibition already live in `agent-permission-boundary` and `cleanup-and-archive-policy`.                                                                                                                      | Behaviour covered by `agent-permission-boundary §1 #11, #16` + `cleanup-and-archive-policy` + `priority-triage-gate` (P0 for real-secret findings).                                                                          | **Removed from active skills because decision is DISCARD.** (Directory `.claude/skills/security-debt-gate/` deleted in Batch C.1; was untracked.)                           |
| `semgrep-triage`               | **DISCARD** | Out of the 28 required. The repo has **no semgrep config** (`ISSUE_REGISTER.md` ISSUE-0015). A skill that assumes a tool that does not exist is misleading.                                                                                                                                        | When the owner rules on OD-NEEDED-005 (introduce `.semgrep/` + CI step, or remove the skill permanently), this concept can be revisited.                                                                                     | **Removed from active skills because decision is DISCARD.** (Directory `.claude/skills/semgrep-triage/` deleted in Batch C.1; was untracked.)                               |

---

## Operational consequences

- All 5 legacy directories were **deleted in place** in Batch C.1 because they were untracked, scoped strictly to `.claude/skills/`, and carried a verdict of DISCARD with explicit Batch C.1 owner authorisation.
- No Git history was affected (the entries had never been committed).
- No file outside `.claude/skills/` was touched.
- This evaluation file is retained as the durable record so that any future agent reading `.claude/skills/` will know what was here and why it is gone.
- If the owner later changes any verdict (e.g. wishes to introduce a fresh `playwright-critical-journeys` skill), it can be added as a new skill in a later batch — this file should then be updated with a `SUPERSEDED on <date> by …` note for the affected row.

---

## Cross-references

- `OWNER_DECISIONS.md` DECISION-OS-005 — the binding ruling that authorised this evaluation.
- `ISSUE_REGISTER.md` ISSUE-0014 — the open row that pointed at this evaluation.
- `ISSUE_REGISTER.md` ISSUE-0011 — affiliate not implemented (drives the affiliate-engine verdict).
- `ISSUE_REGISTER.md` ISSUE-0015 — semgrep config absent (drives the semgrep-triage verdict).
