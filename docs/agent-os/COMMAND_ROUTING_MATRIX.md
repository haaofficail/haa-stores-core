# Command Routing Matrix — Haa Stores Agent OS

> **Purpose:** map a user command type to its task classification, risk level, required/optional gates, research need, verification depth, and handoff requirement.
> **How to read:** find the row that matches the user's command. The columns tell you what to enforce. Use `QUALITY_GATES.md` for the gate definitions and `RISK_AND_PERMISSION_POLICY.md` for the risk vocabulary.
> **Companion documents:** `OPERATING_MANUAL.md`, `DEFINITION_OF_DONE.md`, `TEST_STRATEGY.md`.

---

## Columns

- **User command type** — common shape of the user's request.
- **Task classification** — pick from `AGENTS.md §4`.
- **Risk level** — `low / medium / high / launch-critical` (per `RISK_AND_PERMISSION_POLICY.md`).
- **Required gates** — must fire; cannot be waived without owner approval.
- **Optional gates** — fire when the task touches the relevant surface.
- **Web research required?** — yes / no / when-new-external.
- **Verification level** — `local-only / unit / integration / e2e / release`.
- **Handoff requirement** — none / `ACTIVE_WORK.md` update / full `TASK_HANDOFF_TEMPLATE.md`.

---

## Matrix

| User command type                                                   | Task classification          | Risk            | Required gates                                                                                                                                                                                      | Optional gates                                                         | Web research?                     | Verification                            | Handoff                                   |
| ------------------------------------------------------------------- | ---------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------- | --------------------------------------- | ----------------------------------------- |
| **Simple text edit** (typo, copy, microcopy)                        | Documentation / UX-UI polish | low             | scope-control · DoD-universal · verification-before-completion                                                                                                                                      | RTL-check (if UI string)                                               | no                                | local-only                              | `ACTIVE_WORK.md` line update              |
| **Bug fix** (clear repro, scoped diff)                              | Bug fix                      | medium          | acceptance-criteria · evidence-led-reporting · verification-before-completion · regression-safety · branch-PR-hygiene                                                                               | security/privacy (if sensitive surface)                                | no (unless framework quirk)       | unit + adjacent                         | `ACTIVE_WORK.md` update                   |
| **UX/design improvement** (visual, layout, RTL, mobile)             | UX-UI polish                 | medium          | design/UX-quality · RTL · mobile readiness · DoD-UI · regression-safety                                                                                                                             | accessibility audit                                                    | no, unless adopting a new pattern | unit + manual viewport check            | `ACTIVE_WORK.md` update                   |
| **Build a feature** (multi-component)                               | Feature                      | high            | acceptance-criteria · per-layer DoD · regression-safety · tenant-isolation · RBAC · docs handoff · branch-PR-hygiene                                                                                | web research if external integration                                   | yes-when-new-external             | e2e                                     | full `TASK_HANDOFF_TEMPLATE.md`           |
| **Cleanup / refactor** (non-functional change)                      | Refactor                     | medium          | scope-control · `CLEANUP_ARCHIVE_POLICY.md` verb declared · regression-safety · branch-PR-hygiene                                                                                                   | wider test suite if cross-cutting                                      | no                                | unit + typecheck across packages        | `ACTIVE_WORK.md` update                   |
| **CI failure** (build/test red)                                     | Support-Ops / Testing        | high            | systematic-debugging · root-cause (not symptom) · evidence-led-reporting                                                                                                                            | environment-safety if local repro needed                               | no, unless action quirk           | `pnpm ci:local` then targeted suite     | full handoff if not resolved in session   |
| **DB / migration** (schema change)                                  | Data-DB                      | high            | DoD-DB · fresh-DB replay · snapshot-chain integrity · regression-safety · docs (manual apply note per memory `staging-deploy-no-auto-migrate`)                                                      | RBAC if new tables                                                     | no                                | unit + migration replay                 | full handoff (migrations are coordinated) |
| **Security issue** (real-secret leak, RBAC gap, IDOR, tenant break) | Security / Incident Response | launch-critical | stop-other-work · evidence-led-reporting · DoD-security · `security-debt-gate` (Batch C) · no `--no-verify`, no `nosemgrep`, no `.gitleaksignore`                                                   | rotate at provider, owner notify                                       | yes-when-new-CVE-or-config        | targeted + e2e for the affected surface | full handoff                              |
| **Payment integration** (provider, refunds, fees)                   | Integration / Security       | launch-critical | DoD-backend · DoD-security · provider sandbox first · idempotency tests                                                                                                                             | live-key handling (owner-only)                                         | yes-when-new-provider             | integration + e2e                       | full handoff                              |
| **Shipping integration** (carrier, rates, COD)                      | Integration                  | high            | DoD-backend · rate-calculation tests · race-guard for parallel rate calls                                                                                                                           | provider sandbox                                                       | yes-when-new-provider             | integration                             | full handoff                              |
| **Domain / DNS / Nginx / VPS**                                      | Architecture / Support-Ops   | launch-critical | read `docs/ops/HAA_STORES_HOSTINGER_TARGET.md` + `.haa/hostinger-target.json` (per `CLAUDE.md`) · approved server only (`72.61.108.208`) · forbidden infra check · owner approval before any change | DNS provider not in Hostinger MCP → blocked per `PROJECT_MEMORY.md §3` | yes-when-new                      | release                                 | full handoff                              |
| **Theme work**                                                      | Theme Work                   | medium          | DECISION-OS-003 (no parallel system; target `@haa/storefront-themes`) · DoD-UI · regression on storefront + dashboard isolation                                                                     | visual regression                                                      | no                                | unit + manual visual                    | `ACTIVE_WORK.md` update                   |
| **Affiliate / referral work**                                       | Feature                      | high            | confirm OD-NEEDED-004 first (no code today) · DoD-feature · tenant-isolation · idempotency · audit-log entries on state transitions                                                                 | DECISION-OS-005 (affiliate skill is forward-looking, not current)      | no                                | integration                             | full handoff                              |
| **Release readiness check**                                         | Release / Audit              | launch-critical | `pnpm preflight` · `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm test:e2e` · `pnpm smoke` · `gitleaks dir` snapshot · migrations risk · owner gate G1–G10 status                             | semgrep if/when configured (ISSUE-0015)                                | no                                | release                                 | full handoff with GO/NO-GO                |
| **Task interruption / switching**                                   | Support-Ops                  | medium          | pause cleanly via `TASK_HANDOFF_TEMPLATE.md` · `ACTIVE_WORK.md` update · do not commit "to save state"                                                                                              | none                                                                   | no                                | n/a                                     | full handoff                              |

---

## Gate vocabulary (short index)

- `acceptance-criteria` — written before implementation (`AGENTS.md §3`).
- `scope-control` — out-of-scope discoveries → `ISSUE_REGISTER.md`, not the current diff.
- `verification-before-completion` — `git diff` review + adjacent tests before "done".
- `evidence-led-reporting` — every claim cites file:line / command / link.
- `regression-safety` — wider tests for sensitive surfaces; no silent test disabling.
- `branch-PR-hygiene` — one topic per branch/PR/commit.
- `tenant-isolation` — every tenant-scoped query filters by `tenantId` / `storeId`.
- `RBAC` — every endpoint binds the correct permission; boundary test exists.
- `DoD-*` — see `DEFINITION_OF_DONE.md` for the specific bar.
- `security-debt-gate` — gitleaks classification + handling (skill in Batch C).
- `release-gate` — pre-push/merge/deploy aggregate gate (skill in Batch C).

---

## Default if your task is not listed

Treat it as a **Feature** at **medium-high risk** until proven otherwise:

- Acceptance criteria written.
- Per-layer DoD applied.
- Regression-safety + branch-PR-hygiene enforced.
- Verification at integration level.
- `ACTIVE_WORK.md` updated; full handoff if not finished in session.

Then add the row to this matrix in the next docs truth-sync pass.
