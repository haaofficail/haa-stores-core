# Execution Checklist — Post-QA Autopilot

> Generated 2026-06-22 by the SAFE FULL AUTOPILOT brief.
> Live status of each wave. Updated after every wave by the autopilot.

---

## Wave status legend

`Pending` · `In Progress` · `Done` · `Blocked` · `Partially Done` · `Deferred`

---

## Wave 0 — Truth Sync (docs)

- **Status:** In Progress
- **Branch:** `autopilot/post-qa-execution`
- **Scope:** create `EXECUTION_CHECKLIST.md`, `REMAINING_WORK.md`; refresh `OWNER_DECISIONS.md` with OS-007 … OS-020; refresh `ACTIVE_WORK.md`, `ISSUE_REGISTER.md`, `CURRENT_STATE.md`, `TASK_TRACKER.md`.
- **Verification:** `pnpm preflight`.
- **Remaining:** commit.
- **Blockers:** none.

## Wave 1 — Theme System Single Gateway

- **Status:** Pending
- **Scope:** establish `@haa/storefront-themes` as the public gateway; move/re-export `getThemeCapsule` to `/server`; fix merchant-dashboard imports; tighten ESLint; add `tests/theme-boundary.test.ts`.
- **Verification:** `pnpm preflight`, `pnpm typecheck`, `pnpm test -- tests/theme-boundary.test.ts`, `pnpm lint`.

## Wave 2 — Brand Tokens `#5c9cd5`

- **Status:** Pending
- **Scope:** consolidate `packages/tokens` on `#5c9cd5`; mark `#007aff` legacy; tokenize `blue-500/600` admin hardcodes; add `tests/brand-consistency.test.ts`.

## Wave 3 — Payment Test Environment

- **Status:** Pending
- **Scope:** mock provider + webhook/callback simulators; race scenarios; no live creds; tests.

## Wave 4 — Geidea Infrastructure Readiness

- **Status:** Pending
- **Scope:** provider contract + readiness states + encrypted slots + dashboard settings + admin diagnostics + webhook + signature + idempotency + mock + sandbox skeleton. Refund capability disabled until live.

## Wave 5 — Shipping Aggregator Readiness

- **Status:** Pending

## Wave 6 — Shipping Rate Cache / Debounce

- **Status:** Pending

## Wave 7 — API / Caddy Contract

- **Status:** Pending
- **Scope:** drop `/api/` from Hono mounts for `landing-ai-agent` + `v1`; add strip-simulation test.

## Wave 8 — Deploy / No Auto-Migrate

- **Status:** Pending

## Wave 9 — CI / Security Scan

- **Status:** Pending

## Wave 10 — `support-errors` Production Behavior

- **Status:** Pending

## Wave 11 — RBAC Comments Cleanup

- **Status:** Pending

## Wave 12 — Docker Local Safety

- **Status:** Pending

## Wave 13 — Deletion Policy Enforcement

- **Status:** Pending

## Wave 14 — Outbound Webhook Hardening (tests/docs)

- **Status:** Pending

## Wave 15 — RBAC Hardening (safe guards only)

- **Status:** Pending

## Wave 16 — Wallet Idempotency Plan (no migration run)

- **Status:** Pending

## Wave 17 — Icon Governance (lock progress)

- **Status:** Pending

## Wave 18 — RTL / A11y / Brand Guards (tests only)

- **Status:** Pending

## Wave 19 — Marketplace / SFDA / Affiliate tracking (docs)

- **Status:** Pending

## Wave 20 — Production Readiness Tracking (docs)

- **Status:** Pending

## Wave 21 — Docs Archive Cleanup (mark stale only)

- **Status:** Pending

---

## Hard limits (binding on every wave)

- No push. No deploy. No SSH. No live payment or shipping. No db:migrate. No secrets.
- No use of `187.124.41.239`.
- No direct/hard tenant or merchant self-deletion as a feature.
- No file-wide refactors outside wave scope.
- One topic per commit.
