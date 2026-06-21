# Quality Gates — Haa Stores Agent OS

> **Purpose:** the bar of "good enough to ship". Every gate below must be cleared or **explicitly waived in writing by the owner** for the task at hand.
> **Index:** companion to `DEFINITION_OF_DONE.md` (per-task type), `COMMAND_ROUTING_MATRIX.md` (which gates fire for which task), `RISK_AND_PERMISSION_POLICY.md` (what is forbidden).

---

## 1. Acceptance criteria

- Every non-trivial task has acceptance criteria written **before** implementation.
- Use `AGENTS.md §3` (Request Expansion Rule) for the format.
- If you cannot write 2–3 testable acceptance criteria, the brief is not yet a task — keep refining the brief.

---

## 2. Definition of Done

- See `DEFINITION_OF_DONE.md` for per-type DoD.
- A task is **not done** if any of: criteria unmet, verification not run, diff not reviewed, residual risk undocumented, handoff missing.

---

## 3. Verification before completion

Before writing the final report, run **all** of:

1. `git diff` review of every changed file (no surprise edits).
2. `git diff --check` (no whitespace errors).
3. Relevant test commands for the area (see `TEST_STRATEGY.md`).
4. For UI: load the affected page in a browser (RTL + mobile viewport). When Playwright is available, use the relevant journeys.
5. For backend: hit the route or call the service at least once when feasible.
6. For migrations: dry-run the SQL; check that it is reversible or documented as one-way.

Never claim "done" before running the diff review.

---

## 4. Evidence-led reporting

Every claim in the Final Report carries one of:

- a file path with a line range (`path/to/file.ts:42-60`),
- a command name + outcome (`pnpm test → 72/72 passed in 858ms`),
- a link to a PR / commit / log,
- or the explicit label `assumption` or `not checked`.

"Looks good" is not evidence.

---

## 5. Regression safety

- Touch the smallest surface that solves the problem.
- Run the tests for the **adjacent** areas, not just the changed file.
- For any change to: themes, brand tokens, dashboard auth, checkout, payments, shipping, auth/RBAC, tenant isolation — run a wider scope and document what was checked.
- If a previously passing test now fails: stop. Do not silently disable it.

---

## 6. Design / UX quality

- RTL is a primary requirement (`AGENTS.md §9.4`).
- Mobile readiness (viewports ~360–414px) is mandatory for storefront and dashboard.
- States required: empty, loading, error, success.
- Spacing/icons/cards follow `AGENTS.md §9.1–§9.3`.
- No new theme system (`OWNER_DECISIONS.md` DECISION-OS-003). Extend `@haa/storefront-themes`.

---

## 7. Security / privacy / compliance

- No secrets in repo, in logs, in tool output, or in chat. Use `--redact` for all scanner output.
- PII (email, phone, IBAN, addresses) is masked when written to audit/logs (see `packages/shared` `maskObject`).
- Destructive operations on user data require a second factor (see `ISSUE_REGISTER.md` ISSUE-0010).
- Tenant isolation: every DB query that touches tenant data must filter by `tenantId` / `storeId`. Run a focused audit when adding new routes.
- Compliance gates G1–G10 are owner-driven (`PROJECT_MEMORY.md §9`).
- For gitleaks: snapshot scan **must** be clean; historical git scan is a separate cleanup decision.

---

## 8. Documentation handoff

- Update `docs/ops/TASK_TRACKER.md`, `docs/ops/CURRENT_STATE.md`, and any of `docs/ops/{CHANGELOG_INTERNAL,REGRESSION_CHECKLIST,DECISIONS,ISSUE_KNOWLEDGE_BASE}.md` that apply (per `AGENTS.md §10`).
- Update `docs/agent-os/ACTIVE_WORK.md` at every session boundary.
- Use `TASK_HANDOFF_TEMPLATE.md` when another agent will continue.

---

## 9. Branch / PR hygiene

- One topic per branch. One topic per PR. One topic per commit when feasible.
- Branch naming: `chore/<slug>`, `fix/<slug>`, `feat/<slug>`, `docs/<slug>` aligned with `AGENTS.md §4`.
- Never mix security cleanup with feature work in the same branch (recent example: gitleaks cleanup stayed in `chore/gitleaks-cleanup-clean` and **did not** absorb the Agent OS work).
- A PR must reference: motivation, scope, out-of-scope, risks, test plan. Keep titles ≤ 70 chars.

---

## 10. Scope control

- Out-of-scope edits are rejected before commit.
- Discovered issues go to `ISSUE_REGISTER.md`, not into the current diff.
- Refactors must be opt-in by the brief, not "while I was there".

---

## 11. Context budget control

- Re-load only what the task needs.
- Prefer `grep` and targeted `Read` over scanning whole directories.
- Avoid running long commands whose output is not needed (fork the work or redirect to a file when appropriate).
- Use `Agent` (fork) for research detours so the main thread keeps focus.

---

## 12. Anti-runaway loop

- After 3 failed attempts on the same step, **stop**:
  1. Restate the goal and the latest failure.
  2. Switch to read-only diagnosis (`systematic-debugging` mindset).
  3. If still blocked, escalate to the owner with the smallest reproducible case.
- Do not retry the same command with the same inputs more than twice.

---

## 13. Environment safety

- Canonical repo only (`/Users/thwany/Desktop/haa-stores-core`) per `OWNER_DECISIONS.md` DECISION-OS-006.
- Do not run commands that mutate local DB, `node_modules`, or `dist/` without owner ack on this branch.
- Do not run `pnpm install` ad-hoc — `package.json` / lockfile changes are forbidden without explicit approval (`RISK_AND_PERMISSION_POLICY.md`).

---

## 14. Permission boundary

- See `RISK_AND_PERMISSION_POLICY.md` for the full list of actions requiring explicit owner approval.
- Hard "no" without explicit approval: commit, push, merge, deploy, history rewrite, dependency install, package.json/lockfile edits, secrets, CI workflow edits, file deletion, test removal.

---

## 15. Priority triage

- Issues are classified `P0 / P1 / P2 / P3 / OWNER_DECISION` (see `ISSUE_REGISTER.md`).
- `P0` = blocks launch or active work — stop other tasks until cleared.
- `P1` = must clear before the next major batch.
- `P2` = next sprint.
- `P3` = backlog.
- `OWNER_DECISION` = no engineering call; do not act.
- Disagreements about priority are escalated, not unilaterally adjusted.

---

## 16. Gate checklist (per task — copy and tick)

```
[ ] Acceptance criteria written
[ ] Memory and decisions consulted
[ ] Scope vs out-of-scope declared
[ ] Implementation reviewed via git diff
[ ] git diff --check clean
[ ] Tests for changed + adjacent areas run
[ ] Regression risk listed
[ ] Security/privacy reviewed
[ ] Docs / TASK_TRACKER / CURRENT_STATE updated
[ ] Handoff prepared (TASK_HANDOFF_TEMPLATE.md)
[ ] Final Report includes evidence, residual risks, suggested next step
```
