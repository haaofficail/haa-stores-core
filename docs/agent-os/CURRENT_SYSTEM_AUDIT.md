# Current System Audit — Haa Stores

> **Audit type:** Read-only Phase 0 discovery for Agent OS bootstrap (Batch A).
> **Audit date:** 2026-06-21
> **Audited commit:** `c90761be` (local `main` HEAD after PR #36 merge).
> **Branch the audit was written from:** `chore/agent-os-skills-v2`.
> **Auditor:** Claude Code session, read-only methodology.
> **Out of scope (NOT executed):** `pnpm test`, `pnpm typecheck`, `pnpm preflight`, migration replay, runtime probing, browser/Playwright, semgrep/gitleaks runs.
> **Evidence policy:** every finding cites a file path, command output, or content excerpt. Unconfirmed items are marked `assumption` or `not checked`.

---

## 1. Executive Summary

Haa Stores Core is a mature multi-tenant Saudi e‑commerce monorepo (4 apps × 19 packages × ~204 test files × 65 ops docs). The code state is internally consistent for production-class engineering, but the **process surface is bloated and partially desynchronised**:

- **Bootstrap discipline is strong**: `AGENTS.md` (420 lines), `CLAUDE.md` (69 lines), `scripts/preflight.mjs` (root guard hardened to exact path), constitution-style decisions in `docs/ops/DECISIONS.md`, dedicated risk register, knowledge base, and 65 ops files.
- **Drift in the theming layer**: six theme-related packages (`theme-engine`, `theme-react`, `theme-system`, `theme-web`, `system-theme`, `storefront-themes`) coexist, with `@deprecated` migration pointers from `theme-system` → `storefront-themes` that are still unfinished.
- **Documentation truth has slipped in places**: duplicate marketplace audits with diverging verdicts, root‑level legacy reports outside `docs/`, master plan referencing a now-stale branch context, and stale "stub" comments in `wallet-posting-service.ts` that no longer match the implemented methods.
- **Owner/legal gates are wide open**: 10 owner-action items (G1‑G10) all open per `docs/ops/CURRENT_STATE.md`; they gate Phase 5/6 deployment.
- **No affiliate/referral implementation yet**: zero src references for `affiliate|referral`; the `.claude/skills/affiliate-engine/SKILL.md` from a prior session is forward-looking spec, not current state.
- **Worktree hygiene is poor**: 14 active worktrees + 5 prunable agent worktrees still mounted under `.claude/worktrees/` and `.worktrees/`.

This audit produces only two files (this one + `ISSUE_REGISTER.md`). No fixes are applied. The system is **ready for Agent OS docs** but should not skip a curation pass on the legacy reports before generating skills.

---

## 2. Repository State

| Field                        | Value                                                                                              | Evidence                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------- |
| Working directory            | `/Users/thwany/Desktop/haa-stores-core`                                                            | `pwd`                           |
| Current branch               | `chore/agent-os-skills-v2` (created from local `main`)                                             | `git branch --show-current`     |
| Local main HEAD              | `c90761be chore(security): clean current gitleaks snapshot findings (#36)`                         | `git log --oneline -1 main`     |
| Untracked                    | `.claude/skills/` (5 SKILL.md from a prior session — **not touched**)                              | `git status --short`            |
| `pnpm preflight` root guard  | Hardcoded `EXPECTED_ROOT = '/Users/thwany/Desktop/haa-stores-core'`, `process.exit(1)` if mismatch | `scripts/preflight.mjs:5,36-41` |
| Husky hooks                  | `pre-commit`, `commit-msg` present                                                                 | `ls .husky/`                    |
| `lint-staged` config         | `lint-staged.config.js` at root                                                                    | —                               |
| `.haa-project-root` sentinel | present                                                                                            | `ls .haa-project-root`          |

### Pending / merged external PRs (locally verifiable only)

- **PR #36** (gitleaks snapshot cleanup): **merged into local `main`** as `c90761be` — verified by commit subject and history.
- **PR #34** (design system alignment): merged earlier — `db9d67e6` in local main.
- **PR #33** (CI lint warnings): merged — `7afdc733`.
- **PR #31** (QA marketplace gate): merged — `784886db`.
- **PR #30** (deploy production-grade): merged — `ee02e385`.
- **PR #32 (shipping-rates race guard) and PR #35 (world-class polish):** referenced in user briefing as merged on remote; **not verified locally** — local `main` does not contain those commits; would require `git fetch` (not executed in this audit).

---

## 3. Project Structure Summary

### apps/ (4)

- `apps/admin-dashboard` — platform admin UI
- `apps/api` — Hono backend
- `apps/merchant-dashboard` — merchant SPA
- `apps/storefront` — public customer SPA

### packages/ (19) — evidence: `ls packages/`

`auth-core`, `commerce-core`, `db`, `integration-core`, `loyalty-core`, `marketplace-core`, `notification-core`, `payment-providers`, `shared`, `shipping-core`, `storefront-themes`, `system-theme`, `theme-engine`, `theme-react`, `theme-system`, `theme-web`, `tokens`, `ui`, `wallet-core`, `zatca-core`.

> **6 theme-related packages** is the most prominent structural signal. See `Section 6` and ISSUE‑0002.

### docs/ (135 .md files total)

- 14 at repo root (top-level mix of audits, reports, handbooks)
- `docs/ops/` (65 files — by far the densest)
- `docs/system-map/` (2)
- `docs/security/` (6)
- `docs/superpowers/specs/` (9, all dated 2026-06-18)
- `docs/support/` (4)
- `docs/operations/` (2) ← **distinct from `docs/ops/`**
- `docs/cr/` (5), `docs/orders/` (1), `docs/products/` (1), `docs/quality/` (1)

### scripts/ (~35)

ops, db, deploy, env, monitoring, qa-capture, preflight, simulate, etc.

### .github/workflows/ (3)

`ci.yml` (362 lines), `deploy.yml` (551 lines), `security-scan.yml` (218 lines).

### .claude/ (workspace agent metadata)

- `settings.local.json`, `launch.json`
- `.claude/worktrees/` — **5 prunable agent worktrees** (4 listed `prunable` in `git worktree list`)
- `.claude/skills/` (untracked from a prior session, **not touched** in this audit)

### Root config files

`package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.base.json`, `tsconfig.json`, `eslint.config.mjs`, `lint-staged.config.js`, `vitest.config.ts`, `vitest.smoke.config.ts`, `playwright.config.ts`, `ecosystem.config.cjs`, `docker-compose.yml`, `.gitleaks.toml`.

---

## 4. Documentation Truth Status

| Class                                        |    Count | Truth status                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------- | -------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reflects current code                        | majority | OK                                                                                                                                                                                                                                                                                                                                              |
| Stale/branch-context drift                   |       1+ | `docs/ops/MASTER_PLAN_2026-06-18.md` opens with «Branch context: `feature/phase-9-cod-fee-policy` (210 commits ahead of `main`)» — that branch is no longer the active context after PR #34/#35/#36.                                                                                                                                            |
| Duplicate with diverging verdicts            |   1 pair | `MARKETPLACE_AUDIT_REPORT.md` (root, 663 lines) vs `docs/ops/PUBLIC_MARKETPLACE_AUDIT.md` (650 lines) — same date 2026-06-17, same auditor role, **different verdicts** (30% vs 38% readiness). See ISSUE‑0003.                                                                                                                                 |
| Misfiled at root (should live under `docs/`) |       ≥6 | `HAA_STORES_FULL_SYSTEM_AUDIT_2026-06-18.md`, `MARKETPLACE_AUDIT_REPORT.md`, `PHASE3-REPORT.md`, `PHASE4-REPORT.md`, `PHASE5-REPORT.md`, `PHASE6-REPORT.md`, `DEPLOYMENT_READINESS_PLAN.md`, `DEPLOYMENT.md`, `DESIGN-HANDBOOK.md`, `RELEASE-READINESS.md`, `VISUAL-QA-CHECKLIST.md` — all sit alongside `README.md` instead of inside `docs/`. |
| Two top-level dirs with overlapping purpose  |   1 pair | `docs/ops/` (65 files) AND `docs/operations/` (2 files: `incident-prevention-register.md`, `reliability-baseline.md`). Unclear which is canonical.                                                                                                                                                                                              |
| Time-bound specs that may be historical      |        9 | `docs/superpowers/specs/2026-06-18-*.md` — sprint scopes and design plans dated 2026-06-18; relevance after merges of PR #34/#35 unclear.                                                                                                                                                                                                       |
| `CURRENT_STATE.md` chronology                |    mixed | First bullet is `2026-06-20`, next is `2026-06-18`, "Last Updated" lines accumulate rather than being replaced — readable as a log but easy to misread the truly-current state.                                                                                                                                                                 |

---

## 5. Feature Completeness Overview (signals only — NOT runtime-verified)

| Area                      | Signal                                                                                                                                                                             | Source                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Auth / RBAC               | Present, with Quality Pass 5 RBAC marked DONE                                                                                                                                      | `CURRENT_STATE.md`        |
| Products                  | CRUD routes present (`apps/api/src/routes/`)                                                                                                                                       | inferred                  |
| Orders / Checkout         | State machine + cart logic in `packages/commerce-core`                                                                                                                             | inferred                  |
| Payments                  | `packages/payment-providers/`, includes `FakePaymentProvider` (`src/fake.ts:1`) for dev/test/stub; live providers per `docs/ops/GEIDEA_PAYMENT_READINESS.md`, `TABBY_DATA_FLOW.md` | files exist               |
| Shipping                  | `packages/shipping-core/` present, `docs/ops/SHIPPING_AGGREGATOR_READINESS.md` exists                                                                                              | files exist               |
| Wallet ledger             | `packages/wallet-core/`, `packages/commerce-core/src/wallet-posting-service.ts` (458 lines)                                                                                        | files exist               |
| ZATCA e-invoicing         | `packages/zatca-core/`, plan in `docs/ZATCA_ROADMAP.md`                                                                                                                            | files exist               |
| Marketplace (public)      | `apps/api/src/routes/haa-marketplace.ts` (line 620 has demo-mode branch)                                                                                                           | code                      |
| **Affiliate / referral**  | **NOT IMPLEMENTED** — 0 grep matches for `(affiliate\|referral)` in `apps/*/src` and `packages/*/src`                                                                              | `grep -r ... 2>/dev/null` |
| Themes                    | 6 packages; see Section 6                                                                                                                                                          | structure                 |
| Compliance gates (G1‑G10) | All 10 owner-action items **0/10 closed**                                                                                                                                          | `CURRENT_STATE.md`        |

### Forward-looking spec without code

- `.claude/skills/affiliate-engine/SKILL.md` describes a platform + merchant affiliate system. The spec exists; **no source code** implements it. Treat the skill file as design intent, not documentation of current behaviour.

---

## 6. Architecture Drift Findings

### 6.1 Theme package proliferation

- 6 packages, all under `@haa/*`: `@haa/theme-engine`, `@haa/theme-react`, `@haa/theme-system`, `@haa/theme-web`, `@haa/system-theme`, `@haa/storefront-themes`.
- `packages/theme-system/src/index.ts:17` literally declares `* @deprecated Use @haa/storefront-themes instead.`
- `packages/theme-system/src/isolation.ts` carries 4 `@deprecated` exports (`clearStoreTheme`, `setVar`, `applyStoreTheme` etc) signalling an incomplete migration.
- `packages/system-theme/` and `packages/storefront-themes/` are distinct but share semantic surface area; canonical for new code is **unclear without owner statement**.

### 6.2 Stale stub comment in `wallet-posting-service.ts`

- Line 206: `// Stub methods for Phase 4-9 of the audit. The full implementations land in Session #2 (TASK-0034). For Session #1 we declare the surface…`
- But the file (458 lines) actually implements 8 `post*` methods: `postSale`, `postCodFee`, `postRefund`, `postPlatformFee`, `postPayoutDebit`, `postPayoutReversal`, `postGatewayFee` (and `hasRecentPayoutRequest`).
- The comment misleads any reader into thinking the file is partial.

### 6.3 docs/ops vs docs/operations

- Two sibling directories under `docs/` with overlapping purpose. `docs/ops/` is the established canonical (65 files, referenced from `AGENTS.md`); `docs/operations/` (2 files) appears to be a stray. Needs deprecation or merge.

### 6.4 Multiple worktrees

- `git worktree list` shows 22 entries including:
  - 14 active `quality-pass-5-exec-route-*` worktrees (sibling directories)
  - 5 `.claude/worktrees/agent-*` (4 marked `prunable`)
  - 1 `.worktrees/wt-a4450264` (prunable)
  - 1 `../haa-stores-agent-os` (parked from a prior Agent OS attempt)
  - 1 `/private/tmp/wc-polish` (design polish)
- Worktree churn fragments mental model and complicates `git status` interpretation.

---

## 7. UX/Design Findings (signals only)

- **RTL utilities present** — `lint-staged.config.js` referenced; `AGENTS.md §9.4` mandates `margin-inline`, `padding-inline`, no hardcoded left/right.
- **Spacing tokens defined in `AGENTS.md §9.1`** (`--space-*` 0…16); compliance not tape-measured in this audit.
- **Lucide icons restricted by ESLint** — 7 source files carry `eslint-disable-next-line @typescript-eslint/no-restricted-imports -- TODO: P1-#5 migration; lucide icons as plain JSX`. Migration is in-progress.
- **Storefront pages with disabled rule:** `Nav.tsx`, `Auth.tsx`, `Cart.tsx`, `Checkout.tsx`, `ProductDetail.tsx`, plus 2 themes (`base-elegant/ProductPage.tsx`, `luxury-showcase/components/LuxuryProductInfoPanel.tsx`).
- **Design system canonicity:** `DESIGN-HANDBOOK.md` lives at root (not under `docs/`); `docs/superpowers/specs/2026-06-18-haa-stores-branding-design.md` is the most recent design spec.

---

## 8. CI / Test Findings

| Item                                 | Value                                                                                                                                                                                             | Evidence                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Workflows                            | `ci.yml` (362), `deploy.yml` (551), `security-scan.yml` (218)                                                                                                                                     | `wc -l .github/workflows/*.yml`                                   |
| Test files                           | 204                                                                                                                                                                                               | `find . -name "*.test.ts" -not -path "*/node_modules/*"`          |
| Skipped/disabled tests (in `tests/`) | 0                                                                                                                                                                                                 | `grep -rnE "(it\.skip\|xit\(\|test\.skip)" tests`                 |
| `package.json` scripts               | 54                                                                                                                                                                                                | `node -e "Object.keys(require('./package.json').scripts).length"` |
| Migration files                      | 52+ in `packages/db/src/migrations/` (+2 manual)                                                                                                                                                  | `find packages/db -name "*.sql"`                                  |
| Migration meta                       | `packages/db/src/migrations/meta/` exists                                                                                                                                                         | —                                                                 |
| Recent CI pain                       | TASK-0054 (in progress) — PostgreSQL provisioning, fresh-DB migration cast, app build ordering, Husky in prod Docker. Acceptance criteria mostly met locally; GitHub runner verification pending. | `docs/ops/TASK_TRACKER.md` head                                   |

> CI itself was **not run** in this audit. Counts are static.

---

## 9. Security / Environment Findings

> No secret values were read or printed. Only file presence and key names from `.env.example`.

| Item                                                      | Value                                                                                                                                                                                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.env.example` at root                                    | exists, 25 keys                                                                                                                                                                                                                                  |
| `.env.example` in `deploy/staging/`, `deploy/production/` | exist                                                                                                                                                                                                                                            |
| `.gitleaks.toml`                                          | exists (37 lines) — repo has its own rules                                                                                                                                                                                                       |
| `semgrep` config                                          | **none found** (`find . -maxdepth 3 -name ".semgrep*" -o -name "semgrep.yml"` returns empty) — `.claude/skills/semgrep-triage/SKILL.md` from prior session references semgrep but no project config exists                                       |
| Husky hooks                                               | `pre-commit` runs lint-staged → ESLint `--max-warnings 0` (memory: `lint-commit-gotchas` — stricter than CI)                                                                                                                                     |
| CLAUDE.md infra rules                                     | Approved server `72.61.108.208` (staging / production-candidate); forbidden server `187.124.41.239` (Nasaq) plus forbidden domains, SSH keys, PM2 services, paths                                                                                |
| Production status                                         | `not_promoted_yet`                                                                                                                                                                                                                               |
| Demo mode in marketplace orders                           | `apps/api/src/routes/haa-marketplace.ts:620` — `// For demo-only orders: use mock mode` (gated by `hasDemoOrders && !hasRealOrders`); split appears intentional but warrants verification that demo path is not reachable in production tenancy. |

---

## 10. Top Risks

|   # | Risk                                                                                                                                                                                                                                                                                    | Impact                                                                | Likelihood                                  |
| --: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------- |
|   1 | Theme drift: 6 packages with deprecated cross-refs leave the "where do I add a new theme primitive" question unanswered for any new contributor or agent                                                                                                                                | Architecture decay, regressions in storefront theming, duplicate work | High                                        |
|   2 | Duplicate marketplace audits with diverging verdicts (30% vs 38% readiness) — owner/agent will trust whichever they read first                                                                                                                                                          | Wrong go/no-go decision for launch                                    | Medium-High                                 |
|   3 | 10/10 owner-action launch gates (G1‑G10) still open; technical work cannot ship without them                                                                                                                                                                                            | Launch blocked indefinitely                                           | High                                        |
|   4 | Master plan documents a stale branch context (`feature/phase-9-cod-fee-policy`, 210 ahead) post-merges                                                                                                                                                                                  | Agents/operators chase non-existent branch                            | Medium                                      |
|   5 | `wallet-posting-service.ts` "Stub methods" comment contradicts the actual implementation (8 methods present)                                                                                                                                                                            | Engineering trust in code comments erodes; misread as partial         | Low (now) / High (when next agent reads it) |
|   6 | `pnpm preflight` enforces exact path `/Users/thwany/Desktop/haa-stores-core` — blocks sibling worktrees including the intended Agent OS worktree                                                                                                                                        | Limits parallel/isolated agent work                                   | Medium                                      |
|   7 | Affiliate skill exists in `.claude/skills/` describing capabilities the codebase does not implement; risk of agents implementing on top of a spec assumed to be live                                                                                                                    | Wasted work, mismatched API surface                                   | Medium                                      |
|   8 | Worktree sprawl (14 quality-pass-5 worktrees + prunable agent worktrees + parked `../haa-stores-agent-os`) makes `git status`/`git branch` noisy and misleading                                                                                                                         | Operator confusion, accidental commits to wrong worktree              | Medium                                      |
|   9 | Local `main` 2 commits behind `origin/main` (per earlier fetch in worktree session) — fast-forward not yet applied locally; audit was taken against the **older** state                                                                                                                 | Audit is one or two commits behind reality                            | Low-Medium                                  |
|  10 | `.claude/skills/` from prior session (5 SKILL.md including `affiliate-engine`, `playwright-critical-journeys`, `release-gate`, `security-debt-gate`, `semgrep-triage`) is untracked and undecided — risk of accidental commit, divergence, or contradiction with future Agent OS skills | Two skill bodies in two locations                                     | Medium                                      |

---

## 11. Recommended Agent OS Priorities

In strict order for follow-up batches (not executed now):

1. **Curate the legacy reports at repo root** — decide KEEP / MOVE-TO-DOCS / ARCHIVE / DELETE for the 11 root-level non-`README` markdown files before generating skills that reference them. This is `cleanup-and-archive-policy` territory.
2. **Single source of truth for marketplace audit** — pick one of the two reports, archive the other with a redirect notice. Update `CURRENT_STATE.md` to point to the canonical one.
3. **Theme rationalization decision** — owner ruling on which of the 6 theme packages is canonical going forward; the `@deprecated` markers must converge on one answer. `docs/ops/THEME_RATIONALIZATION.md` exists — verify it reflects today's truth.
4. **Refresh `MASTER_PLAN_2026-06-18.md`** — branch context, percentages, open gates.
5. **Decide fate of `.claude/skills/` (untracked from prior session)** — adopt or discard before generating new skill bodies, to prevent duplication.
6. **Then** Batch B (Agent OS Docs Layer) and Batch C (28 Skills).

---

## 12. What Was NOT Checked

- `pnpm preflight`, `pnpm typecheck`, `pnpm test`, `pnpm lint` — not run in this audit (no runtime probing per constraint).
- Migration replay against a fresh PostgreSQL.
- Live API/DB behaviour, response shapes, RBAC enforcement at request level.
- Browser/Playwright user journeys.
- `gitleaks dir` / `gitleaks git` (not run).
- `semgrep` — no project config exists; nothing to triage.
- Strict-mode TypeScript coverage; per-package `tsconfig` deltas.
- Actual content of `.env`, `.env.staging`, `.env.production`, `.hostinger-mcp.env` — **deliberately not opened**.
- Production server (`72.61.108.208`) state — out of scope.
- The 14 `quality-pass-5-exec-route-*` worktrees were not opened; their content is unknown to this audit.
- `origin/main` advanced state (commits beyond local `c90761be`); a `git fetch` would refresh but was not run.
- File-level diff between root-level reports and their potential `docs/ops/` counterparts (only the marketplace pair was diffed).
- Per-route tenant-isolation coverage; per-route RBAC binding; per-route input validation.
- Storefront RTL / mobile visual regression.
- Bundle sizes, performance baselines.

---

## 13. Owner Decisions Applied (Batch A.1)

The five owner-decision items called out in §11 were ruled on 2026-06-21 and locked in [`OWNER_DECISIONS.md`](./OWNER_DECISIONS.md). Summary (binding on all agents):

|   # | Subject                       | Ruling                                                                                                                                                                                     | Decision                                |
| --: | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
|   1 | Root-level audits and reports | `ARCHIVE_CANDIDATE`, kept in place; cleanup deferred to a dedicated `docs/archive-cleanup`-style PR                                                                                        | [DECISION-OS-001](./OWNER_DECISIONS.md) |
|   2 | Marketplace audit truth       | Both reports `STALE` / `PARTIALLY_SUPERSEDED`; current truth derives from code + a new audit. Marketplace work is **out of Agent OS scope**                                                | [DECISION-OS-002](./OWNER_DECISIONS.md) |
|   3 | Theme canonical direction     | `@haa/storefront-themes` canonical (provisional); `@haa/theme-system` legacy/deprecated; **no parallel theme systems**, build on existing only                                             | [DECISION-OS-003](./OWNER_DECISIONS.md) |
|   4 | `MASTER_PLAN` authority       | Stale plan is **not** the source of current state; current state derives from `AGENTS.md` + this directory + `CURRENT_STATE.md` (post truth-sync) + Git/PR metadata. Plan refresh deferred | [DECISION-OS-004](./OWNER_DECISIONS.md) |
|   5 | Existing `.claude/skills/`    | Legacy local input, **not canonical**. Read-only until Batch C evaluation (KEEP/MERGE/REWRITE/DISCARD). Not added to Git in Batch A or B                                                   | [DECISION-OS-005](./OWNER_DECISIONS.md) |
|   6 | Worktree policy               | Canonical repo only (`/Users/thwany/Desktop/haa-stores-core`); sibling worktree `../haa-stores-agent-os` parked. **No preflight/AGENTS/CLAUDE edits to enable worktrees**                  | [DECISION-OS-006](./OWNER_DECISIONS.md) |

These rulings unblock Batch B (Agent OS docs layer). The corresponding rows in `ISSUE_REGISTER.md` have been updated to reflect the locked actions; rows that still require owner input are flagged `OWNER_DECISION_NEEDED` with a pointer.

---

## 14. Final Notes

- This audit changed **no files outside** `docs/agent-os/`.
- This audit added **no entries** to `.claude/skills/` (still untracked from a prior session, governed by DECISION-OS-005).
- The branch `chore/agent-os-skills-v2` carries the files emitted by Batch A and Batch A.1.
- Batch B may proceed; Batch C must wait for Batch B and must obey DECISION-OS-005 when evaluating existing `.claude/skills/`.
