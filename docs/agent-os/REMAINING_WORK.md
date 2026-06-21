# Remaining Work — Post-QA Autopilot

> Updated after every wave. The autopilot writes this file before continuing.

---

## Last Completed

- **Task:** (Wave 0 about to commit)
- **Commit:** pending
- **Verification:** `pnpm preflight` pending
- **Notes:** Wave 0 = truth-sync only (docs).

## Done

- [ ] Wave 0 — Truth Sync (in progress)

## Remaining — Immediate

- [ ] Wave 1 — Theme single gateway
- [ ] Wave 2 — Brand `#5c9cd5`
- [ ] Wave 3 — Payment test environment
- [ ] Wave 4 — Geidea infrastructure
- [ ] Wave 5 — Shipping aggregator
- [ ] Wave 6 — Shipping rate cache
- [ ] Wave 7 — API / Caddy contract
- [ ] Wave 8 — Deploy / no auto-migrate
- [ ] Wave 9 — CI / security scan
- [ ] Wave 10 — `support-errors` 404
- [ ] Wave 11 — RBAC comments
- [ ] Wave 12 — Docker safety
- [ ] Wave 13 — Deletion policy
- [ ] Wave 14 — Outbound webhook hardening (tests/docs)
- [ ] Wave 15 — RBAC small guards
- [ ] Wave 16 — Wallet idempotency PLAN (no migration run)
- [ ] Wave 17 — Icon governance lock
- [ ] Wave 18 — RTL / a11y / brand guards
- [ ] Wave 19 — Marketplace / SFDA / affiliate tracking docs
- [ ] Wave 20 — Production readiness docs
- [ ] Wave 21 — Docs archive cleanup (mark stale)

## Remaining — P1

- [ ] F-QA-B-001 — admin tenant DELETE audit log + soft-delete (covered partly by Wave 13)
- [ ] F-QA-B-002 — 2FA on merchant data delete (covered by Wave 13)
- [ ] F-QA-B-003 / F-QA-E-002 — `/api/` Caddy mount (Wave 7)
- [ ] F-QA-C-001 — wallet DB idempotency (Wave 16 plan only; execution requires owner)
- [ ] F-QA-C-002 — Geidea refund implementation (Wave 4 disables capability for now)
- [ ] F-QA-D-001 / F-QA-E-003 — theme boundary reconciliation (Wave 1)
- [ ] F-QA-E-001 — dual deploy paths migration policy (Wave 8)

## Remaining — P2

- [ ] F-QA-B-004 — tenant status change audit log
- [ ] F-QA-B-005 — support-errors 404 (Wave 10)
- [ ] F-QA-C-003 — RBAC test comment fix (Wave 11)
- [ ] F-QA-C-004 — server-side shipping rate cache (Wave 6)
- [ ] F-QA-D-002 — tokens reconciliation (Wave 2)
- [ ] F-QA-D-003 — admin blue hardcode (Wave 2)
- [ ] F-QA-D-004 — lucide migration lock (Wave 17)
- [ ] F-QA-E-004 — security-scan Node 22 (Wave 9)
- [ ] F-QA-E-005 — security-scan on PR (Wave 9)
- [ ] F-QA-E-006 — Agent OS docs sync (Wave 0 + ongoing)

## Remaining — P3

- [ ] F-QA-B-NEXT — JWT iss/aud validation (Wave 15 logs only)
- [ ] F-QA-C-005 — docker default password (Wave 12)
- [ ] F-QA-D-005 — RTL mixed Tailwind (Wave 18 starts the guard; migration later)
- [ ] F-QA-D-006 — a11y test file (Wave 18)
- [ ] Root-level legacy reports (Wave 21 marks stale; full archive later)
- [ ] `docs/operations/` merge into `docs/ops/` (later)
- [ ] `docs/agent-os/PROVIDER_HANDOFF` historical phrasing (small follow-up)

## Blocked

- [ ] **Production server provisioning** — requires owner decision OD-NEEDED-002 (promote `72.61.108.208` vs provision separate)
- [ ] **Production secrets** — owner must generate + load per `docs/ops/PRODUCTION_READINESS_CHECKLIST §2`
- [ ] **GitHub `production` environment secrets** — owner sets in repo settings
- [ ] **Geidea live API wiring** — needs official endpoints/credentials/signature rules
- [ ] **Shipping aggregator selection** — owner picks provider + credentials
- [ ] **Wallet idempotency migration EXECUTION** — DECISION-OS-018 lets the migration land but execution needs explicit `pnpm db:migrate` approval
- [ ] **Marketplace refresh audit** — owner authorises (DECISION-OS-002)
- [ ] **Theme rationalization full pass** — owner ruling per package (DECISION-OS-003 + OS-009 are provisional)

## Owner Gates (G1–G10)

- [ ] G1 — Commercial Registration (CR)
- [ ] G2 — VAT / ZATCA registration
- [ ] G3 — E-commerce license
- [ ] G4 — DPO appointed
- [ ] G5 — Trademark
- [ ] G6 — PCI-DSS ASV scan (depends on G1)
- [ ] G7 — Pen-test
- [ ] G8 — KSA hosting decision (strategic, not strictly blocker)
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
- [ ] root-level legacy reports (DECISION-OS-001)
