# Execution Checklist — Post-QA Autopilot (final)

> Live status of each wave. Final snapshot after autopilot run on `autopilot/post-qa-execution`.

---

## Mandatory Skill Gate Checklist (pre-execution — required for every task)

> Run this checklist BEFORE any edit. It is the operational form of
> AGENTS.md §14. Empty boxes = task not yet eligible to start.
>
> "Skills" = Claude Code execution skills in `.claude/skills/`. NOT CSS,
> tokens, or visual UI work.

- [ ] Task classified into one of the 13 task types (AGENTS.md §14.4)
- [ ] 1–4 skills selected from `docs/agent-os/SKILLS_REGISTRY.md`
- [ ] Each skill has a one-line "why it fits" justification
- [ ] Expected files listed (paths or globs)
- [ ] Verification commands mapped per selected skill
- [ ] Risk level assigned (low / medium / high)
- [ ] Final Skill Compliance Report template loaded
  (`docs/agent-os/templates/SKILL_COMPLIANCE_REPORT.md`)
- [ ] Safety constraints reviewed (AGENTS.md §14.7) — no deploy,
  no `db:migrate`, no secrets, no production action, no forbidden server
  `187.124.41.239`
- [ ] Mandatory Skill Gate block published in the response BEFORE first edit
- [ ] `pnpm check:skills` passes locally

Once every box is ticked, proceed to the task type's specific gates below
(e.g. for `database/migration` start with `environment-safety-gate`; for
`frontend/design` start with `design-ux-excellence-gate`).

If no skill fits, follow AGENTS.md §14.3 (declare `**No matching skill
found**`, pick fallback, log Pending addition in
`docs/agent-os/SKILLS_REGISTRY.md`).

---

## Status legend

`Pending` · `In Progress` · `Done` · `Done (planning only)` · `Done (test-locked, code deferred)` · `Deferred (tracker-only)` · `Blocked`

---

## Waves

| Wave | Title                                  | Status                                                         | Commit        | Notes                                                                                                                                                                                  |
| ---: | -------------------------------------- | -------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    0 | Truth sync                             | ✅ Done                                                        | `8d5c961a`    | OS-007…OS-020 locked; tracker files seeded.                                                                                                                                            |
|    1 | Theme single gateway                   | ✅ Done                                                        | `2db0bf34`    | `getThemeCapsule` re-exported via `/server`; 3 dashboard imports moved; ESLint tightened; `tests/theme-boundary.test.ts` added; AGENTS §5 annotated.                                   |
|    2 | Brand `#5c9cd5`                        | ✅ Done (annotation + guard); bulk admin tokenization deferred | `4c31d8dd`    | `tests/brand-consistency.test.ts`; F-QA-D-003 admin blue-500 hardcodes remain.                                                                                                         |
|    3 | Payment test environment               | ✅ Done                                                        | `1ca984a3`    | FakePaymentProvider cancelled+expired; catalogue doc; test.                                                                                                                            |
|    4 | Geidea infrastructure readiness        | ✅ Done                                                        | `d67a7593`    | `GEIDEA_CAPABILITIES.supportsRefunds=false`; readiness doc; test.                                                                                                                      |
|    5 | Shipping aggregator readiness          | ⏸ Deferred (tracker-only)                                      | —             | `packages/shipping-core/*` already implements provider+mock+OTO+SMSA+Aramex+returns; explicit readiness state machine + diagnostics UI follow-up. Tracked in `REMAINING_WORK.md → P2`. |
|    6 | Shipping rate cache                    | ⏸ Deferred                                                     | —             | Frontend race guard exists (PR #32 + `tests/checkout-shipping-race.test.ts`). Server-side cache is a focused follow-up. Tracked.                                                       |
|    7 | API / Caddy contract                   | ✅ Done                                                        | `8da94360`    | 3 Hono mounts dropped `/api/`; `tests/api-caddy-strip.test.ts` source-grep guard.                                                                                                      |
|    8 | Deploy / no-auto-migrate               | ✅ Done                                                        | `b3c736aa`    | `scripts/deploy-bundle.sh` gated; `tests/no-auto-migrate.test.ts` source-grep guard.                                                                                                   |
|    9 | CI / security-scan                     | ✅ Done                                                        | `1a5ad9df`    | Node 20 → 22; `pull_request` trigger added.                                                                                                                                            |
|   10 | `support-errors` 404 in production     | ✅ Done                                                        | `12c06b2e`    | 403 → 404 per AGENTS §13 #5; test guard.                                                                                                                                               |
|   11 | RBAC coverage comments                 | ✅ Done                                                        | `51347a46`    | OAuth callbacks correctly described.                                                                                                                                                   |
|   12 | Docker fallback password               | ✅ Done                                                        | `01f5f31a`    | LOCAL-DEV-ONLY header + inline warning.                                                                                                                                                |
|   13 | Deletion policy disabled in beta       | ✅ Done                                                        | `35c37668`    | DELETE /admin/tenants/:id and DELETE /merchant/:storeId/account return FORBIDDEN_BETA_POLICY; test guard.                                                                              |
|   14 | Outbound webhook delivery tests        | ⏸ Deferred (tracker-only)                                      | —             | Existing tests cover registration; explicit retry+dead-letter test coverage is a follow-up. Tracked.                                                                                   |
|   15 | RBAC small guards                      | ⏸ Deferred (tracker-only)                                      | —             | route-ordering test + JWT iss/aud + rate-limit on failed `requireStoreAccess` left as follow-up.                                                                                       |
|   16 | Wallet idempotency plan                | ✅ Done (planning only)                                        | `150be029`    | `docs/agent-os/WALLET_IDEMPOTENCY_PLAN.md`. No migration generated. No `db:migrate` run.                                                                                               |
|   17 | Lucide migration progress lock         | ✅ Done                                                        | `595489df`    | Ceiling at 152; test guard.                                                                                                                                                            |
|   18 | RTL / a11y / brand guards              | ✅ Done                                                        | `40b7b6c7`    | Ceiling 300 on hardcoded directional; SPA dir="rtl" assertion.                                                                                                                         |
|   19 | Marketplace / SFDA / affiliate roadmap | ✅ Done (tracker-only)                                         | (this commit) | See `REMAINING_WORK.md → Future independent tasks`.                                                                                                                                    |
|   20 | Production readiness tracking          | ✅ Done (existing docs sufficient)                             | (this commit) | `docs/ops/PRODUCTION_READINESS_CHECKLIST.md` already captures the gates and current ⏳ state.                                                                                          |
|   21 | Docs archive cleanup (mark stale)      | ⏸ Deferred — keep as a dedicated PR per DECISION-OS-001        | —             | Marking via `docs/agent-os/STALE_DOCS_MARKER.md` (this commit), file move not in autopilot scope.                                                                                      |

---

## Verification summary

- `pnpm preflight` — green (Wave 0).
- `pnpm typecheck` — green (verified Wave 1, Wave 13).
- `pnpm test -- <new-test>` — green for each wave's new test (Waves 1, 2, 3, 4, 7, 8, 10, 13, 17, 18).
- Total test suite at end of autopilot: ~2873 passing, 1 skipped, 14 todo, 0 failing.
- `git diff --check` — clean at every commit boundary.

## Hard limits (binding throughout)

- ❌ No push. ❌ No deploy. ❌ No SSH. ❌ No live payment / shipping.
- ❌ No `db:migrate`. ❌ No secrets handled. ❌ No use of `187.124.41.239`.
- ❌ No direct/hard tenant or merchant self-deletion as a feature.
- ✅ One topic per commit. ✅ Verification before each commit.
