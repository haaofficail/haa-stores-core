# Remaining Work — Launch Readiness

> Updated after each engineering follow-up.
> The post-QA autopilot is fully closed. This is the **launch-readiness** tracker.

---

## Last Completed

- **Task:** Deep staging-login audit fixes (Caddy security headers + logo container + signup link + `/api/api/brand` double-prefix).
- **Last commit:** `5f598b5c fix(login): close 4 issues discovered in staging deep audit (#60)`.
- **Verification:** `pnpm vitest run tests/staging-login-deep-fixes.test.ts` — 19/19 pass; full guard suite 112/112 pass.
- **Notes:** All engineering items from the post-QA audit and the staging deep audit are shipped on `main`. The remaining backlog is exclusively owner-gated.

## Engineering follow-ups landed on `main` (PRs #39 → #60)

All shipped. Listed for the launch-readiness paper trail; can be deleted once the launch ships.

- [x] **PR #39** — SAFE FULL AUTOPILOT (14 waves + E2E fix).
- [x] **PR #40** — Shipping readiness 7-state model + rate cache + single-flight debounce.
- [x] **PR #41** — Outbound webhook hardening tests + RBAC chain-ordering guard.
- [x] **PR #42** — Wallet idempotency migration **FILE** (`0073_wallet_idempotency.sql`). Execution still owner-gated.
- [x] **PRs #43 + #44** — Lucide direct-import migrations (27 patterns).
- [x] **PR #46** — Admin `blue-*` → `primary-*` tokens (62 occurrences).
- [x] **PR #47** — RTL Tailwind directional → logical codemod (298 replacements).
- [x] **PR #48** — JWT iss/aud lenient rollout + `verifyTokenStrict` future-flip.
- [x] **PR #49** — Rate-limit failed `requireStoreAccess` (BOLA layer 2).
- [x] **PR #50** — Landing-page SAR icon position + RTL-aware scroll bar.
- [x] **PR #51** — `ShippingRateCache` wired into checkout route + `/shipping/rate-cache/stats`.
- [x] **PR #52** — Webhook dedup metrics + `/admin/webhooks/dedup-stats`.
- [x] **PR #53** — HTTP `Idempotency-Key` middleware + applied to refund + `/admin/idempotency-key/stats`.
- [x] **PR #54** — Tenant status change audit log (`AuditAction` union + Arabic label).
- [x] **PR #56** — `@haa/tokens` primary palette aligned to canonical `#5c9cd5` (50–950).
- [x] **PR #57** — Merchant login P0: form `method="post"` + nginx security headers.
- [x] **PR #58** — Merchant login P1: forgot-password page + remember-me + show-pw + favicon + manifest + Open Graph + Twitter Card.
- [x] **PR #59** — Merchant login P2: logo `srcset` 64/192/512 + decorative `alt` + `max-w-6xl` balance.
- [x] **PR #60** — Deep staging-login fixes: Caddy security headers (nginx inheritance bypass) + logo white-on-ring container + signup link runtime-derived origin + `usePlatformBrand` double-prefix fix.

## Remaining — Owner-gated only

These cannot be progressed by engineering code; they need owner action (legal, credentials, infrastructure approval).

### Compliance gates (G1–G10)

- [ ] **G1** — Commercial Registration (CR / سجل تجاري). Unblocks G6 + G9.
- [ ] **G2** — VAT / ZATCA registration.
- [ ] **G3** — E-commerce license.
- [ ] **G4** — DPO (Data Protection Officer) appointed.
- [ ] **G5** — Trademark / علامة تجارية registered.
- [ ] **G6** — PCI-DSS ASV scan (depends on G1).
- [ ] **G7** — Penetration testing engagement.
- [ ] **G8** — KSA hosting decision (current server `72.61.108.208` is outside KSA — DECISION-OS-007 locks the server; the residency decision is separate).
- [ ] **G9** — Tabby DPA signed (depends on G1).
- [ ] **G10** — Disaster Recovery plan + tabletop exercise.

### Infrastructure / credentials

- [ ] **Cloudflare DNS** for `haastores.com` per DECISION-OS-008. Zone not in the connected Hostinger MCP account (404). Without DNS, no production TLS, no production launch.
- [ ] **Production secrets** — `JWT_SECRET`, `ADMIN_JWT_SECRET`, `ENCRYPTION_KEY`, `DATABASE_URL`, `REDIS_URL` etc. per `docs/ops/PRODUCTION_READINESS_CHECKLIST.md §2`. Plus GitHub `production` environment secrets in repo settings.
- [ ] **Geidea live credentials** — endpoints, signature rules, API keys. Capability flags currently disabled (Wave 4).
- [ ] **Shipping live credentials** — owner picks provider (Aramex / OTO / SMSA / Saudi Post) and supplies credentials.
- [ ] **Wallet idempotency migration execution** — owner approval to run `pnpm db:migrate` against staging then production. The migration file + ledger code path + tests are already on `main` (PR #42).

### Operational hardening (engineering scaffolding exists; owner connects)

- [ ] **Redis / BullMQ queue** — `/api/health` currently reports `queue: degraded, mode=noop`. `QUEUE_REDIS_URL` is set but bullmq can't connect; jobs are not durable. Owner provisions a managed Redis (or fixes the existing one) and verifies the queue switches to the real backend.
- [ ] **Monitoring / Sentry** — observability shim is wired (`apps/api/src/services/observability.ts`); owner provides `SENTRY_DSN` for the staging + production environments and installs `@sentry/node` so the shim swaps from no-op to real.
- [ ] **Backups + restore drill** — automate DB backups (cron + retention policy), document a restore runbook, schedule the first restore drill. Required input for G10.
- [ ] **Transactional email** — pick provider (Postmark / SES / SendGrid), configure SPF / DKIM / DMARC for the sending domain, wire credentials.
- [ ] **2FA + self-serve password reset** — design + implement TOTP enrollment + verify on `/login` and on sensitive admin operations; add the actual reset-token flow behind the `/forgot-password` page (currently a mailto landing).
- [ ] **Deployment smoke + rollback** — add post-deploy smoke tests (curl `/api/health` + a fixed login flow) plus a one-command rollback script that re-deploys the previous image tag.

## Forbidden / Owner-only — unchanged

- [ ] live payments (any provider)
- [ ] live shipping (any provider)
- [ ] production deploy
- [ ] `pnpm db:migrate` against any database
- [ ] secrets / `.env*` / `.hostinger-mcp.env`
- [ ] server `187.124.41.239` (forbidden for Haa Stores)
- [ ] DNS records on `haastores.com` (Cloudflare-managed per DECISION-OS-008)
- [ ] root-level legacy reports (DECISION-OS-001 — cleanup is a dedicated PR)
