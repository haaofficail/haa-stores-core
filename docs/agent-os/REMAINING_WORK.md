# Remaining Work — Post-QA Autopilot

> Updated after each wave during the autopilot.
> This is the **final** snapshot at the end of the safe autopilot run.

---

## Last Completed

- **Task:** Wave 18 — RTL/a11y guards + brand-consistency.
- **Last commit:** `40b7b6c7 test(quality): add RTL accessibility and brand guards`
- **Verification:** `pnpm test -- tests/rtl-accessibility-guards.test.ts` (1 file, all green).
- **Notes:** All in-scope safe waves executed; remaining items are tracker-only (no engineering scope cleared in autopilot) or owner/credential-gated.

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

## Remaining — P1

- [ ] F-QA-B-001 — admin tenant DELETE soft-delete + audit log + re-auth (when the feature is re-enabled past beta). Currently the endpoint is locked by DECISION-OS-014 (Wave 13).
- [ ] F-QA-B-002 — 2FA on merchant `DELETE /account` (when re-enabled past beta). Currently locked.
- [ ] F-QA-C-001 — Wallet DB idempotency migration EXECUTION (DECISION-OS-018). Plan is in `WALLET_IDEMPOTENCY_PLAN.md`; **migration not generated, not run**.
- [ ] F-QA-C-002 — Geidea live refund implementation. Capability flags disabled in Wave 4; re-enable when implementation lands.
- [ ] F-QA-E-007 — Production server provisioning + production secrets (owner).

## Remaining — P2

- [ ] F-QA-B-004 — Tenant status change audit log (covered by Wave 13 only for direct delete; status route still needs an audit log entry).
- [ ] F-QA-C-004 / Wave 6 (deferred) — Server-side shipping rate cache/debounce. Not implemented in this autopilot. Tracked here.
- [ ] F-QA-D-002 — `@haa/tokens` palette full alignment to `#5c9cd5` (Wave 2 annotated tokens but did not regenerate the 50–950 scale).
- [ ] F-QA-D-003 — Admin `blue-500/600` hardcodes (Wave 2 deferred bulk replacement; 5 admin pages with ~39 classes).
- [ ] F-QA-D-004 — Lucide migration progress (ceiling locked at 152 in Wave 17; need to drive down).
- [ ] Wave 5 (deferred) — Shipping aggregator readiness states + diagnostics — the abstractions exist (`packages/shipping-core/*` with 11 files including `provider.ts`, `factory.ts`, `mock.ts`, OTO, SMSA, Aramex, manual, returns). Adding explicit readiness state machine + diagnostics UI is a follow-up.
- [ ] Wave 14 (deferred) — Outbound webhook delivery/retry/dead-letter test coverage. The infrastructure exists in `apps/api/src/routes/outbound-webhooks.ts` + `OutboundWebhookService`; explicit retry/dead-letter test coverage is missing.
- [ ] Wave 15 (deferred) — RBAC small guards (route-ordering test, JWT iss/aud, rate-limit on failed store access).

## Remaining — P3

- [ ] F-QA-B-005 — already done in Wave 10.
- [ ] F-QA-D-005 — RTL Tailwind logical migration (ceiling locked in Wave 18 at 300).
- [ ] F-QA-D-006 — extra a11y test files (RTL + a11y + brand guards added in Waves 2 + 18).
- [ ] Wave 21 (deferred) — Archive cleanup of 11 root-level legacy reports (DECISION-OS-001 says cleanup in dedicated `docs/archive-cleanup` PR; this autopilot adds only tracker entries, does not move files).
- [ ] `docs/operations/` merge into `docs/ops/` (ISSUE-0005).
- [ ] `docs/agent-os/PROVIDER_HANDOFF.md` historical phrasing post-Batch-C.

## Blocked (owner / credentials / deploy)

- [ ] **Production server provisioning** — owner decision (promote `72.61.108.208` vs provision separate).
- [ ] **Production secrets** — owner to generate + load per `docs/ops/PRODUCTION_READINESS_CHECKLIST §2`.
- [ ] **GitHub `production` environment secrets** — owner to set in repo settings.
- [ ] **Geidea live API wiring** — needs official endpoints/credentials/signature rules.
- [ ] **Shipping aggregator live selection** — owner picks provider + credentials.
- [ ] **Wallet idempotency migration EXECUTION** — owner approval to run `pnpm db:generate` + `pnpm db:migrate` per `WALLET_IDEMPOTENCY_PLAN.md`.
- [ ] **Cloudflare DNS configuration** — owner to set up zone + records per OS-008.
- [ ] **G1–G10 owner gates** — independent owner track (`docs/ops/OWNER_ACTION_G*.md`).

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
