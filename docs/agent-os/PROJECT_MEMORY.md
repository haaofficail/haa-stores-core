# Project Memory — Haa Stores

> **Purpose:** the durable facts about Haa Stores that every agent should know without re-deriving from code.
> **Status policy:** every entry is either **confirmed** (file/line evidence cited) or moved to "Owner decisions needed".
> **No secrets in this file.**
> **Companion documents:** `OWNER_DECISIONS.md` (locked rulings), `CURRENT_SYSTEM_AUDIT.md` (evidence), `ISSUE_REGISTER.md` (open work).

---

## 1. Platform identity

| Item           | Value                                                                       | Evidence                                                                                  |
| -------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Product name   | Haa Stores / متاجر هاء                                                      | `AGENTS.md` line 3; `CLAUDE.md` line 3                                                    |
| Type           | Multi-tenant Saudi e-commerce SaaS platform                                 | `AGENTS.md §1` "This is a **multi-tenant SaaS e-commerce platform**, not a single store." |
| Language stack | TypeScript monorepo, pnpm workspaces                                        | `package.json`, `pnpm-workspace.yaml`                                                     |
| Layers         | 4 apps (admin-dashboard, api, merchant-dashboard, storefront) + 19 packages | `apps/`, `packages/`                                                                      |
| Primary locale | Arabic (RTL)                                                                | Storefront copy, `AGENTS.md §9.4`                                                         |
| Currency       | SAR (Saudi Riyal), supported via `SarIcon`                                  | `AGENTS.md §9.5`                                                                          |

---

## 2. Brand decisions

| Item                    | Value                                                                                                                                                                                                        | Evidence         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| Approved libraries      | SplideJS (carousels), Lucide (icons), Sonner (toasts), Tailwind, SarIcon                                                                                                                                     | `AGENTS.md §9.5` |
| Spacing scale           | `--space-0` … `--space-16` (token-only, no hardcoded px in components)                                                                                                                                       | `AGENTS.md §9.1` |
| Icon governance         | UI default 24px; metadata 16px; button 18–20px; feature 32px; empty 48–64px; hit area ≥ 44px; respect RTL                                                                                                    | `AGENTS.md §9.2` |
| Product cards           | Equal visual height in grids; flex-column; fixed image aspect ratio; title clamped to 2 lines; action area pinned to bottom                                                                                  | `AGENTS.md §9.3` |
| RTL rules               | Use logical CSS (`margin-inline`, `padding-inline`, `inset-inline`, `border-inline`, `text-align: start/end`); no hardcoded left/right                                                                       | `AGENTS.md §9.4` |
| Design system reference | `docs/superpowers/specs/2026-06-18-haa-stores-branding-design.md` (most recent spec) + `DESIGN-HANDBOOK.md` at root (root-level location is `ARCHIVE_CANDIDATE` per [DECISION-OS-001](./OWNER_DECISIONS.md)) | files present    |

---

## 3. Domain and email

| Item                                        | Value                             | Evidence                                                                                           |
| ------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------- |
| Production domain (haastores.com) registrar | **Unknown to project automation** | Recorded in conversational memory: zone is not in Hostinger MCP; owner has not designated provider |
| Operator email                              | `haa.officail@gmail.com`          | conversational memory                                                                              |

**Owner decisions needed:** the authoritative DNS provider for `haastores.com` is not declared in the project. Any DNS task is **blocked** until the owner names the provider.

---

## 4. Infrastructure decisions

| Item                           | Value                                                                                                                         | Evidence                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Approved server (Haa Stores)   | IP `72.61.108.208`, role `staging`, future `production_candidate`                                                             | `CLAUDE.md §"Approved Haa Stores server"`     |
| Production status              | `not_promoted_yet`                                                                                                            | `CLAUDE.md`                                   |
| Promotion rule                 | Promote only after readiness audit + explicit owner approval                                                                  | `CLAUDE.md §"Production promotion rule"`      |
| Forbidden server               | IP `187.124.41.239` (VPS `1496264`, hostname `srv1496264.hstgr.cloud`, owner Nasaq / Haa Soft) — **never use for Haa Stores** | `CLAUDE.md §"Forbidden server"`               |
| Forbidden domains              | `nasaqpro.tech`, `tarmizos.com`, `haasoft.com`                                                                                | `CLAUDE.md`                                   |
| Forbidden SSH key              | `nasaq_deploy`                                                                                                                | `CLAUDE.md`                                   |
| Forbidden project paths        | `/var/www/nasaq`, `/var/www/haasoft`, `/var/www/nasaqpro.tech`                                                                | `CLAUDE.md`                                   |
| Forbidden PM2 services         | `nasaq-api`, `nasaq-whatsapp-worker`, `nasaq-worker`                                                                          | `CLAUDE.md`                                   |
| Infrastructure source of truth | `docs/ops/HAA_STORES_HOSTINGER_TARGET.md` + `.haa/hostinger-target.json`                                                      | `CLAUDE.md §"Infrastructure source of truth"` |
| Worktree policy                | Only the canonical repo path is used; sibling worktrees parked                                                                | [DECISION-OS-006](./OWNER_DECISIONS.md)       |

**Owner decisions needed:** when to promote `72.61.108.208` to production (or to provision a separate production server).

---

## 5. Payment provider decisions

| Item                                 | Value                                                                                                                              | Evidence                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Provider packages                    | `packages/payment-providers/` exists; `FakePaymentProvider` available for dev/test/stub                                            | `packages/payment-providers/src/fake.ts` |
| Live integrations referenced in docs | Geidea (`docs/ops/GEIDEA_PAYMENT_READINESS.md`), Tabby (`docs/ops/TABBY_DATA_FLOW.md`), Tamara (mentioned in conversational scope) | files present                            |
| 3DS readiness                        | TASK-0035 marked done per `docs/ops/CURRENT_STATE.md` (engineering work complete; legal/business items separate)                   | `docs/ops/CURRENT_STATE.md` head         |
| ZATCA e-invoicing                    | `packages/zatca-core/` + `docs/ZATCA_ROADMAP.md` (TASK-0036 Planning)                                                              | files present                            |
| Live activation                      | Gated by owner-action item G9 (Tabby DPA) and broader G1–G10 launch gates, all currently **0/10 closed**                           | `docs/ops/CURRENT_STATE.md`              |

**Owner decisions needed:** providers' live keys, when to flip from `FakePaymentProvider` to live; final ZATCA architecture (per-merchant CSID, real-time vs batch).

---

## 6. Shipping provider decisions

| Item                   | Value                                                                                                                                                                                                                                     | Evidence                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Shipping core          | `packages/shipping-core/` present                                                                                                                                                                                                         | directory exists             |
| Aggregator readiness   | `docs/ops/SHIPPING_AGGREGATOR_READINESS.md`                                                                                                                                                                                               | file exists                  |
| Per-store custom rates | implementation lives in `packages/commerce-core/` and `apps/api/src/routes/`; PR #32 ("shipping-rates race guard + https-only redirect") is referenced in user briefing as merged on `origin/main` (not verified locally in audit window) | `CURRENT_SYSTEM_AUDIT.md §2` |

**Owner decisions needed:** the canonical shipping aggregator(s) for the launch market; whether COD remains the default per [DECISION ref needed]; manual settlement vs automated.

---

## 7. Theme system decisions

| Item                                                      | Value                                                                                          | Evidence                                |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------- |
| Canonical theme package (provisional)                     | `@haa/storefront-themes`                                                                       | [DECISION-OS-003](./OWNER_DECISIONS.md) |
| Legacy/deprecated                                         | `@haa/theme-system` — declares itself `@deprecated` in `packages/theme-system/src/index.ts:17` | code                                    |
| Coexisting packages (keep, do not remove in routine work) | `@haa/theme-engine`, `@haa/theme-react`, `@haa/theme-web`, `@haa/system-theme`                 | `ls packages/`                          |
| Rule                                                      | **No parallel theme system.** All new theme work builds on the existing system.                | DECISION-OS-003                         |
| Independent rationalization task                          | Future; reclassifies each of the 6 packages                                                    | DECISION-OS-003                         |

---

## 8. Storefront / dashboard decisions

| Item                              | Value                                                                                                                  | Evidence                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Strict layer separation           | `apps/admin-dashboard` ↮ `apps/storefront` ↮ `apps/merchant-dashboard`; theme packages not in dashboards               | `AGENTS.md §5, §6`             |
| Storefront themes per merchant    | Each merchant has theme state overrides; local DB may need `db:migrate` (per memory `storefront-per-merchant-theming`) | conversational memory          |
| Auth pages background             | Pure white, no tinting (per memory `auth-pages-pure-white`)                                                            | conversational memory          |
| Storefront → API path prefix      | API routes registered without `/api` prefix (Caddy strips it) — see memory `api-routes-no-api-prefix`                  | conversational memory          |
| Lucide icons restricted by ESLint | 7 storefront files carry `eslint-disable-next-line ... TODO: P1-#5 migration; lucide icons as plain JSX`               | `ISSUE_REGISTER.md` ISSUE-0009 |

---

## 9. Launch status

| Item                                                                                                                                            | Value                                                                                                                                   | Evidence                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Engineering quality passes                                                                                                                      | QP1–QP5 complete per `docs/ops/CURRENT_STATE.md`                                                                                        | file                                                        |
| Owner-action launch gates (G1 CR, G2 VAT, G3 license, G4 DPO, G5 trademark, G6 PCI ASV, G7 pen-test, G8 KSA hosting, G9 Tabby DPA, G10 DR plan) | **0/10 closed**                                                                                                                         | `docs/ops/CURRENT_STATE.md`; `ISSUE_REGISTER.md` ISSUE-0013 |
| Production                                                                                                                                      | `not_promoted_yet`                                                                                                                      | `CLAUDE.md`                                                 |
| Public marketplace audit verdict                                                                                                                | Two reports diverge (~30% vs ~38% readiness); both treated `STALE` / `PARTIALLY_SUPERSEDED` per [DECISION-OS-002](./OWNER_DECISIONS.md) | `ISSUE_REGISTER.md` ISSUE-0003                              |
| Affiliate / referral system                                                                                                                     | **Not implemented** (zero source matches for `affiliate\|referral` in `apps/*/src` or `packages/*/src`)                                 | `ISSUE_REGISTER.md` ISSUE-0011                              |

---

## 10. Forbidden assumptions

Do not assume any of the following without explicit evidence in this file or a fresh check:

1. That the affiliate/referral system exists — it does not. The skill description in `.claude/skills/affiliate-engine/SKILL.md` is forward-looking.
2. That a master plan dated 2026-06-18 represents current state — it references a stale branch context. See [DECISION-OS-004](./OWNER_DECISIONS.md).
3. That the marketplace audits at the root or in `docs/ops/` are authoritative — they are not. See [DECISION-OS-002](./OWNER_DECISIONS.md).
4. That `@haa/theme-system` is canonical — it is deprecated; `@haa/storefront-themes` is canonical (provisional). See [DECISION-OS-003](./OWNER_DECISIONS.md).
5. That `pnpm preflight` will pass from a sibling worktree — it will not. See [DECISION-OS-006](./OWNER_DECISIONS.md).
6. That `.claude/skills/` (untracked) is canonical — it is **not**. See [DECISION-OS-005](./OWNER_DECISIONS.md).
7. That the production server is provisioned — it is not (`not_promoted_yet`).
8. That `MARKETPLACE_AUDIT_REPORT.md` (root) and `docs/ops/PUBLIC_MARKETPLACE_AUDIT.md` are the same file — they differ (30% vs 38% verdicts).
9. That the 14 `quality-pass-5-exec-route-*` worktrees are merged — their state is not verified in the current audit.
10. That live payment provider keys are present in the repo — they are not (and would be a P0 security incident if they were).

---

## 11. Owner decisions needed (not yet locked)

This list is the canonical input to the next owner-decision session. Do **not** invent answers.

| ID            | Subject                                                                                      | Why owner-only                                                 |
| ------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| OD-NEEDED-001 | DNS provider for `haastores.com`                                                             | Project automation does not see it; provider unspecified       |
| OD-NEEDED-002 | When to promote `72.61.108.208` to production (or provision new)                             | Capacity, support tier, SLO not declared                       |
| OD-NEEDED-003 | Live payment provider activation (Geidea / Tabby / Tamara) and rollout order                 | Commercial agreements + DPA pending (G9 et al.)                |
| OD-NEEDED-004 | Affiliate / referral system: build / defer / drop spec                                       | No code, no priority signal in current state                   |
| OD-NEEDED-005 | Semgrep adoption (config + CI step or remove the skill)                                      | No `.semgrep/` present, but skill assumes it                   |
| OD-NEEDED-006 | New marketplace audit author/scope                                                           | Two prior audits stale; one fresh audit needed                 |
| OD-NEEDED-007 | Refresh policy for `docs/ops/MASTER_PLAN_2026-06-18.md`                                      | Currently stale; refresh deferred per DECISION-OS-004          |
| OD-NEEDED-008 | Fate of the 11 root-level legacy reports (per file: keep / archive / delete)                 | Cleanup deferred per DECISION-OS-001                           |
| OD-NEEDED-009 | Theme rationalization: per-package keep/deprecate/merge for the 6 theme packages             | Provisional ruling DECISION-OS-003 awaits full rationalization |
| OD-NEEDED-010 | Multi-worktree / multi-path support (changes to `preflight.mjs` + `AGENTS.md` + `CLAUDE.md`) | Foundational; deferred per DECISION-OS-006                     |
