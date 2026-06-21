---
name: branch-pr-hygiene-gate
description: Use this skill when opening or pushing a branch/PR, or when a working tree starts to drift across two topics. Refuses bundled topics and enforces one-topic-per-branch.
disable-model-invocation: true
---

# Branch / PR Hygiene Gate

## Purpose

Keep changes reviewable and revertable. A PR that bundles two topics is hostile to reviewers and to history.

## Read First

- `docs/agent-os/RISK_AND_PERMISSION_POLICY.md` (push/merge/deploy approval rules).
- `docs/agent-os/OPERATING_MANUAL.md §2.7, §2.11` (one topic, scope discipline).
- `AGENTS.md §4` (work types — defines what counts as a topic).

## Rules

1. One topic per branch. One topic per PR. One topic per commit when feasible.
2. Branch naming: `chore/<slug>`, `fix/<slug>`, `feat/<slug>`, `docs/<slug>`, `security/<slug>`, `refactor/<slug>`.
3. Never bundle security cleanup with feature work (recent precedent: gitleaks cleanup kept to its own branch).
4. PR title ≤ 70 chars; body has: motivation, scope, out-of-scope, risks, test plan.
5. Refuse to stage a file that is not part of the declared scope. Discoveries go to `ISSUE_REGISTER.md`.
6. Do not push to `main` — push to a topic branch and open a PR. (`main` push may trigger deploy — `RISK_AND_PERMISSION_POLICY.md §3`.)

## Steps

1. Confirm branch name matches the topic.
2. List staged files; verify each belongs to the topic.
3. If a non-topic edit slipped in, unstage it (`git restore --staged`) and either move it to a new branch or revert.
4. Write the PR body to the canonical shape.
5. Confirm owner approval for `git push` and `gh pr create`.
6. After PR is open, do not amend with unrelated changes — open a follow-up PR.

## Output

```
Topic: <one sentence>
Branch: <name>
Files in this PR: <list>
Out-of-scope edits detected: <none | listed (and removed)>
PR title: <≤ 70 chars>
PR body sections: motivation, scope, out-of-scope, risks, test plan
Push authorised by owner: <yes/no>
```
