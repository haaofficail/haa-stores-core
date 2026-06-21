# Definition of Done — Haa Stores Agent OS

> **Purpose:** the exact bar each kind of task must clear before any agent says "done".
> **Hard rule:** "I made the change" is **not** "done". A task is done only when every bullet in its checklist is satisfied or explicitly waived by the owner.
> **Companion documents:** `QUALITY_GATES.md` (gates), `TEST_STRATEGY.md` (test commands), `RISK_AND_PERMISSION_POLICY.md` (what needs approval).

---

## Universal bar (applies to every task)

- [ ] Acceptance criteria written before implementation (`AGENTS.md §3`).
- [ ] Scope and out-of-scope declared in the brief.
- [ ] `git diff` reviewed line-by-line for every changed file.
- [ ] `git diff --check` clean.
- [ ] No secrets in repo, in diffs, in logs, in chat.
- [ ] Out-of-scope discoveries logged in `ISSUE_REGISTER.md`, not fixed inline.
- [ ] `ACTIVE_WORK.md` updated.
- [ ] Final Report includes: what changed, why, files, verification, residual risks, suggested next step (`AGENTS.md §8`).

If any universal bullet is unmet, **the task is incomplete**, regardless of type.

---

## UI

- [ ] Universal bar.
- [ ] `pnpm typecheck` passes for the touched package(s).
- [ ] `pnpm lint` passes with 0 warnings (pre-commit threshold).
- [ ] `pnpm test` passes for unit + component tests in the changed area.
- [ ] Visual check at desktop (≥ 1280px) and mobile (~390px) viewports.
- [ ] RTL verified (no hardcoded `left`/`right`; logical CSS only).
- [ ] All four UI states tested where relevant: empty, loading, error, success.
- [ ] Accessibility check: focus states, hit area ≥ 44px for interactive elements (`AGENTS.md §9.2`).
- [ ] No regression in adjacent screens.
- [ ] DECISION-OS-003 respected: no new theme system; build on `@haa/storefront-themes`.

---

## Backend (API route / service)

- [ ] Universal bar.
- [ ] `pnpm typecheck` + `pnpm lint` pass.
- [ ] `pnpm test` passes for the route/service + its callers.
- [ ] Tenant isolation: every DB query scoped by `tenantId` / `storeId`.
- [ ] RBAC: every endpoint has the appropriate `requirePermission` (or equivalent) and a boundary test.
- [ ] Input validation (zod from `@haa/shared`) at the edge.
- [ ] Error paths return a typed error code (`packages/shared/src/error-codes.ts`) and log a sanitised event.
- [ ] No PII or secrets in logs (`maskObject` applied where relevant).
- [ ] Hono routes registered **without** `/api` prefix (Caddy strips it — conversational memory).

---

## DB / migration

- [ ] Universal bar.
- [ ] Migration generated via `pnpm db:generate`; never hand-edited after generation.
- [ ] Fresh-DB replay green: `pnpm db:reset && pnpm db:migrate`.
- [ ] Drizzle snapshot chain unaffected (per `ISSUE_KNOWLEDGE_BASE.md` ISSUE-0012 precedent).
- [ ] Reversible, or explicitly documented as one-way with rationale.
- [ ] Apply order documented for staging (no auto-migrate per conversational memory).

---

## CI

- [ ] Universal bar.
- [ ] Owner approval recorded for any change to `.github/workflows/**`.
- [ ] `pnpm ci:local` reproduces the new sequence locally before push.
- [ ] No silent change to secrets or environment variables.
- [ ] Backwards-compatible with branch protection rules.

---

## Docs

- [ ] Universal bar.
- [ ] Cross-references current state: `OWNER_DECISIONS.md`, `PROJECT_MEMORY.md`, `CURRENT_SYSTEM_AUDIT.md`, `ISSUE_REGISTER.md`.
- [ ] No claim presented as fact without evidence (file:line or command output).
- [ ] No edits to `MASTER_PLAN_2026-06-18.md` (DECISION-OS-004) — refresh is its own task.
- [ ] No moves/deletes of root-level legacy reports (DECISION-OS-001).
- [ ] Updates to `docs/ops/TASK_TRACKER.md` and `docs/ops/CURRENT_STATE.md` per `AGENTS.md §10` when state changed.

---

## Feature (multi-component)

- [ ] Universal bar.
- [ ] Per-layer DoD (UI + Backend + DB as applicable, each bar above).
- [ ] End-to-end happy path verified locally (manual or `pnpm test:e2e`).
- [ ] At least one negative-path test (validation failure, permission denied, etc.).
- [ ] RBAC + tenant isolation verified for every new endpoint.
- [ ] Docs added/updated for the feature (where to find it, how it works, who can use it).
- [ ] Owner-decision items declared in `ACTIVE_WORK.md` if any remain.

---

## Cleanup

- [ ] Universal bar.
- [ ] Verb declared: `cleanup` / `archive` / `deprecate` / `delete` (`CLEANUP_ARCHIVE_POLICY.md`).
- [ ] Classification from `ISSUE_REGISTER.md` matches the verb.
- [ ] For `delete`: owner approval recorded, inbound references confirmed empty.
- [ ] For `archive`: target location agreed in advance; inbound links updated.
- [ ] For `deprecate`: `@deprecated` marker added with successor pointer; migration window declared.
- [ ] No mixed cleanup + feature work in one branch (`branch-pr-hygiene-gate`).

---

## Security

- [ ] Universal bar.
- [ ] Snapshot gitleaks scan clean (`gitleaks dir` on current tree).
- [ ] No new secret-shaped patterns added to tracked files.
- [ ] Sensitive routes have RBAC + tenant scope + audit log entry.
- [ ] Destructive operations on user data require a second factor (see `ISSUE_REGISTER.md` ISSUE-0010).
- [ ] No `.gitleaksignore` added; no `nosemgrep`; no `--no-verify`.
- [ ] If a real secret was exposed: incident logged, secret rotated at provider, owner notified.

---

## Release readiness

- [ ] Universal bar.
- [ ] `pnpm preflight` passes from canonical repo (DECISION-OS-006).
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, `pnpm smoke` all pass.
- [ ] `gitleaks dir` snapshot scan clean.
- [ ] Migrations risk reviewed (none / forward-compat / requires manual step).
- [ ] Owner-action gates (G1–G10) status known; any opened items reflected in the report.
- [ ] `release-gate` GO / NO-GO documented (skill in Batch C).

---

## Cross-agent handoff

- [ ] Universal bar.
- [ ] `TASK_HANDOFF_TEMPLATE.md` filled completely.
- [ ] `ACTIVE_WORK.md` reflects the handoff state (`READY_TO_RESUME` etc.).
- [ ] `Resume prompt for next agent` and `First safe command` are paste-ready.
- [ ] No tacit assumptions ("you know what I mean"); everything written.

---

## Forbidden "done" claims

A task is **NOT** done if any of the following is true:

1. `git diff` was not reviewed.
2. Verification appropriate to the task type was not run.
3. Residual risks exist and were not documented.
4. Tests were silently disabled or `--no-verify` was used.
5. Out-of-scope edits made it into the diff.
6. Handoff documents were not updated.
7. The Final Report has no evidence — only adjectives ("looks good", "should work").
