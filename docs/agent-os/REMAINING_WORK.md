# Remaining Work — Post-QA Autopilot

> Updated after each wave during the autopilot.
> This is the **final** snapshot at the end of the safe autopilot run.

---

## Last Completed

- **Task:** Tenant status change audit log (F-QA-B-004).
- **Last commit:** `81806140 feat(audit): write audit log on tenant status change (#54)`.
- **Verification:** `pnpm vitest run tests/tenant-status-audit.test.ts` — 6/6 pass.
- **Notes:** Sixteen engineering follow-ups (PRs #39 → #54) have landed on `main` since the post-QA autopilot closed. The remaining items are now exclusively owner-gated, credential-gated, deploy-gated, or migration-gated.

## Done in this autopilot run (chronological)

- [x] **Wave 0** — Truth Sync (docs/agent-os + docs/ops). Commit `8d5c961a`.
- [x] **Wave 1** — Theme single gateway. Commit `2db0bf34`.
- [x] **Wave 2** — Brand `#5c9cd5` (tokens annotation + guard). Commit `4c31d8dd`.
- [x] **Wave 3** — Payment test environment (FakePaymentProvider scenarios + catalogue + tests). Commit `1ca984a3`.
- [x] **Wave 4** — Geidea infrastructure readiness (capability lock + docs + tests). Commit `d67a7593`.
- [x] **Wave 7** — API/Caddy contract (3 mounts dropped /api prefix + test). Commit `8da94360`.
- [x] **Wave 8** — Deploy no-auto-migrate (deploy-bundle.sh gated + test). Commit `b3c736aa`.
- [x] **Wave 9** — CI security-scan Node 22 + PR trigger. Commit `1a5ad9df`.
- [x] **Wave 10** — support-errors 404 in production + test. Commit `12c06b2e`.
- [x] **Wave 11** — RBAC coverage comments corrected. Commit `51347a46`.
- [x] **Wave 12** — Docker fallback password annotated. Commit `01f5f31a`.
- [x] **Wave 13** — Deletion policy disabled (tenant DELETE + merchant DELETE /account) + test. Commit `35c37668`.
- [x] **Wave 16** — Wallet idempotency PLAN docs (no migration generated). Commit `150be029`.
- [x] **Wave 17** — Lucide migration progress lock test. Commit `595489df`.
- [x] **Wave 18** — RTL + a11y guards. Commit `40b7b6c7`.
- [x] **Waves 5, 6, 14, 15, 19, 20, 21** — tracker-only (this file + tracker close-out commit).

## Remaining — Immediate

_(none — autopilot has executed every safe wave in scope)_

## Engineering follow-ups landed post-autopilot (PRs #39 → #54)

All items below are **shipped on `main`** unless explicitly noted otherwise. They closed the gaps that the post-QA autopilot deferred for review.

- [x] **Wave 5 / F-QA-C-005** — Shipping aggregator readiness states (`getShippingReadinessStates()` 7-state model). **PR #40.**
- [x] **F-QA-C-004 / Wave 6** — Shipping rate cache + single-flight debounce. **PR #40.**
- [x] **F-QA-C-004 (wiring + diagnostics)** — `POST /:slug/checkout/shipping-rates` wrapped in `getDefaultShippingRateCache().getOrLoad(...)`; hit/miss/coalesced/error counters; `GET /shipping/rate-cache/stats`. **PR #51.**
- [x] **Wave 14** — Outbound webhook hardening test coverage (6 invariants). **PR #41.**
- [x] **Wave 15** — RBAC chain-ordering guard (`requireStoreAccess` precedes `requirePermission`). **PR #41.**
- [x] **F-QA-B-NEXT (JWT iss/aud, lenient rollout)** — `signToken` embeds iss + aud; `verifyToken` accepts legacy tokens; `verifyTokenStrict` for future flip. **PR #48.**
- [x] **F-QA-B-NEXT (failed `requireStoreAccess` rate-limit)** — BOLA layer 2: in-memory bucket per `(userId, tenantId, ip)` over a rolling window; 429 + `Retry-After` after budget exhausted. **PR #49.**
- [x] **F-QA-B-NEXT (webhook dedup metrics)** — per-process counters (`total`/`duplicates`/`fresh`/`errors`) + per-provider buckets + `GET /admin/webhooks/dedup-stats`. **PR #52.**
- [x] **F-QA-B-NEXT (HTTP Idempotency-Key middleware)** — IETF draft subset; applied to `POST /stores/:storeId/orders/:orderId/refund`; `GET /admin/idempotency-key/stats` diagnostics; `Idempotency-Replay` response header. **PR #53.**
- [x] **F-QA-B-004** — Tenant status change audit log; 404 on missing tenant; no-op short-circuit; `AuditAction` union + Arabic label added. **PR #54.**
- [x] **F-QA-D-003** — Admin `blue-500/600` → `primary-*` tokens (62 occurrences). **PR #46.**
- [x] **F-QA-D-004** (partial) — Lucide migrations: 12 then 15 patterns. **PRs #43 + #44.**
- [x] **F-QA-D-005** — RTL Tailwind logical codemod (298 replacements); landing-page SAR icon + scroll-bar logical-properties polish. **PRs #47 + #50.**
- [~] **F-QA-C-001** — Wallet DB idempotency migration FILE (`packages/db/src/migrations/0073_wallet_idempotency.sql`). **PR #42.** Migration EXECUTION still owner-gated.

## Remaining — P1

- [ ] F-QA-B-001 — admin tenant DELETE soft-delete + audit log + re-auth (when the feature is re-enabled past beta). Currently locked by DECISION-OS-014 (Wave 13).
- [ ] F-QA-B-002 — 2FA on merchant `DELETE /account` (when re-enabled past beta). Currently locked.
- [~] F-QA-C-001 — Wallet idempotency migration EXECUTION still owner-gated (`pnpm db:migrate` against staging/production). File + tests already in `main` via PR #42.
- [ ] F-QA-C-002 — Geidea live refund implementation. Capability flags disabled in Wave 4; re-enable when implementation lands. **Blocked on Geidea credentials.**
- [ ] F-QA-E-007 — Production readiness promotion checklist against the official server `72.61.108.208` + production secrets (owner). No server-vs-server decision — server locked by DECISION-OS-007.

## Remaining — P2

- [ ] F-QA-D-002 — `@haa/tokens` palette full 50–950 alignment to `#5c9cd5` (Wave 2 annotated; full regenerate still pending).
- [ ] F-QA-D-004 (continued) — Lucide migration drive-down beyond PRs #43/#44 (ceiling test in place; remaining files in `themes/luxury-showcase/*`).
- [ ] Shipping diagnostics UI tile in admin/merchant dashboards consuming `/shipping/rate-cache/stats` + `/admin/webhooks/dedup-stats` + `/admin/idempotency-key/stats`.

## Remaining — P3

- [ ] F-QA-B-005 — already done in Wave 10 (parked as tracker-only).
- [ ] F-QA-D-006 — extra a11y test files (RTL + a11y + brand guards added in Waves 2 + 18; more granular tests optional).
- [ ] Wave 21 — Archive cleanup of 11 root-level legacy reports — dedicated `docs/archive-cleanup` PR per DECISION-OS-001.
- [ ] `docs/operations/` merge into `docs/ops/` (ISSUE-0005).
- [ ] `docs/agent-os/PROVIDER_HANDOFF.md` historical phrasing post-Batch-C.
- [ ] **PR #45 decision/update** — was opened during the post-autopilot drive but not merged; owner ruling required (keep / rebase / close).

## Blocked (owner / credentials / deploy)

- [ ] **Wallet idempotency migration EXECUTION** — owner approval to run `pnpm db:generate` + `pnpm db:migrate` per `WALLET_IDEMPOTENCY_PLAN.md`. File + ledger code + tests already on `main`.
- [ ] **Cloudflare DNS configuration** — owner to set up zone + records per DECISION-OS-008.
- [ ] **Production secrets** — owner to generate + load per `docs/ops/PRODUCTION_READINESS_CHECKLIST §2` (JWT_SECRET, ADMIN_JWT_SECRET, ENCRYPTION_KEY, DATABASE_URL, REDIS_URL, etc).
- [ ] **GitHub `production` environment secrets** — owner to set in repo settings.
- [ ] **Geidea live API wiring** — needs official endpoints/credentials/signature rules.
- [ ] **Shipping aggregator live selection** — owner picks provider + credentials.
- [ ] **Production readiness promotion** — execute checklist in `docs/ops/PRODUCTION_READINESS_CHECKLIST.md` §1.5–1.7 against `72.61.108.208`.
- [ ] **Deploy approval** — every staging/production deploy run requires owner GO; no auto-deploy.
- [ ] **G1–G10 owner gates** — independent owner track (`docs/ops/OWNER_ACTION_G*.md`).
- [ ] **Docs archive cleanup** — dedicated PR per DECISION-OS-001 (see Remaining — P3).

## Owner Gates (G1–G10) — unchanged

- [ ] G1 — Commercial Registration (CR)
- [ ] G2 — VAT / ZATCA registration
- [ ] G3 — E-commerce license
- [ ] G4 — DPO appointed
- [ ] G5 — Trademark
- [ ] G6 — PCI-DSS ASV scan (depends on G1)
- [ ] G7 — Pen-test
- [ ] G8 — KSA hosting decision
- [ ] G9 — Tabby DPA (depends on G1)
- [ ] G10 — DR plan + tabletop

## Do Not Touch Without Approval

- [ ] live payments (any provider)
- [ ] live shipping (any provider)
- [ ] production deploy
- [ ] `db:migrate` against any database
- [ ] secrets / `.env*` / `.hostinger-mcp.env`
- [ ] server `187.124.41.239` (forbidden for Haa Stores)
- [ ] DNS records on `haastores.com` (Cloudflare-managed per OS-008)
- [ ] `MASTER_PLAN_2026-06-18.md` (stale; DECISION-OS-004)
- [ ] root-level legacy reports (DECISION-OS-001 — cleanup is a dedicated PR)

## Future independent tasks (not autopilot scope)

- Marketplace refresh audit (DECISION-OS-002 + Wave 19 tracking).
- SFDA category enforcement before public marketplace go-live.
- Affiliate / referral Phase 2 (only after controlled beta + wallet idempotency).
- Theme rationalization full pass per package (DECISION-OS-003 / OS-009 are provisional).
- Multi-worktree support (DECISION-OS-006 — foundational, deferred).
- Semgrep config + CI step (Phase 2 per DECISION-OS-017).
