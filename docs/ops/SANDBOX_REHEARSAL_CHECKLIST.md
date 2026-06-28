# Sandbox Rehearsal Checklist

> Created: 2026-06-28
> Scope: local/mock and staging/sandbox rehearsal planning for payments and
> shipping.
> This file does not authorize deployment, production migration, live payment
> calls, live shipping calls, secret printing, DNS changes, or production
> actions.

---

## Executive Verdict

| Track                     | Status      | Meaning                                                                                                                                            |
| ------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local mock rehearsal      | GO          | Safe to run with fake payments and manual/haa_mock shipping only.                                                                                  |
| Staging sandbox rehearsal | CONDITIONAL | Allowed only after owner confirms sandbox credentials are stored through the approved secret path and staging services are intentionally targeted. |
| Live beta                 | NO-GO       | VAT/ZATCA, DPO, PCI/ASV, pen-test, DR/restore, live credentials, DNS/secrets, and beta merchants remain open.                                      |
| Production launch         | NO-GO       | Requires every live-beta gate plus burn-in evidence and explicit owner approval.                                                                   |

## Current Baseline Evidence

TASK-0090 ran the focused local mock rehearsal test command on 2026-06-28:

```text
Test Files 10 passed (10)
Tests 151 passed (151)
```

This confirms the documented fake payment and mock shipping test surface is
locally healthy. It does not replace a later browser/local-app smoke, and it
does not authorize staging sandbox, live beta, or production.

TASK-0091 ran the local app smoke path on 2026-06-28:

- `pnpm preflight` passed.
- `pnpm ops:monitor` passed 25/25 health checks and all local synthetic checks.
- Browser-like local HTTP checks returned 200 for storefront home,
  `/s/haa-demo`, cart, checkout, merchant login, and admin.
- Sanitized local API checks returned admin login 200, merchant owner login
  200, provider-status 200, shipment provider-status 200, and cart create 201.
- `pnpm test:smoke` passed 29/29.
- `pnpm smoke` is blocked until local DB migration `0077_order_preparation_status.sql`
  is applied with owner approval; no `db:migrate` was run during TASK-0091.

## Environment Safety Gate

| Field                   | Value                                                                    |
| ----------------------- | ------------------------------------------------------------------------ |
| Primary target now      | local                                                                    |
| Optional later target   | staging on approved server `72.61.108.208`                               |
| Production target       | not authorized                                                           |
| Forbidden server        | `187.124.41.239`                                                         |
| Forbidden provider mode | live payment or live shipping                                            |
| Secrets policy          | never paste, print, screenshot, or store secret values in docs/chat/logs |
| Migration policy        | no `db:migrate` for this checklist                                       |

Allowed now:

- Read and update non-secret documentation.
- Run local tests that use fake/mock providers.
- Run local app smoke only against local services when intentionally started.
- Plan staging sandbox steps without executing deploys or changing remote env.

Still forbidden without a new explicit owner approval:

- Production deploy or production action.
- Staging or production `db:migrate`.
- SSH to staging/production.
- Live payment-provider calls.
- Live shipping-provider calls.
- Printing `.env` values or provider keys.
- DNS, firewall, Nginx, Caddy, or server changes.

## Sources

- `docs/ops/LAUNCH_READINESS_GATE.md`
- `docs/agent-os/PRODUCTION_LAUNCH_GATES.md`
- `docs/ops/PRODUCTION_READINESS_CHECKLIST.md`
- `docs/ops/GEIDEA_PAYMENT_READINESS.md`
- `docs/ops/SHIPPING_AGGREGATOR_READINESS.md`
- `docs/agent-os/PAYMENT_TEST_ENVIRONMENT.md`
- `docs/system-map/SYSTEM_MAP.md`
- `packages/shipping-core/src/readiness.ts`
- `tests/payment-test-environment.test.ts`
- `tests/shipping-readiness.test.ts`

## Acceptance Criteria

1. Given the repo is in the canonical path, when the local mock rehearsal
   commands are run, then fake payment scenarios and mock shipping readiness
   pass without live provider calls.
2. Given owner-provided sandbox credentials are stored through an approved
   secret path, when a staging sandbox rehearsal is scheduled, then the runbook
   verifies only sandbox mode and records redacted evidence.
3. Given any prerequisite is missing or any command would touch live providers,
   production, secrets, or migrations, when the rehearsal reaches that step,
   then the correct result is NO-GO and the step is not executed.

## Phase 0: Start Gate

Run these before any rehearsal execution:

```bash
pwd
git status --short --branch
pnpm preflight
pnpm check:skills
```

Pass criteria:

- `pwd` is `/Users/thwany/Desktop/haa-stores-core`.
- Worktree differences are understood and scoped.
- `pnpm preflight` exits 0.
- `pnpm check:skills` exits 0.
- No active incident blocks launch-readiness work.

Stop if:

- The command target is not local or an explicitly approved staging sandbox.
- A step requires live provider credentials.
- A step requires reading or printing `.env` values.
- A step requires `db:migrate`, deploy, SSH, DNS, or server mutation.

## Phase 1: Local Payment Mock Rehearsal

Use `FakePaymentProvider` only. The scenario catalogue is
`docs/agent-os/PAYMENT_TEST_ENVIRONMENT.md`.

### 1.1 Command evidence

```bash
pnpm vitest run \
  tests/payment-test-environment.test.ts \
  tests/phase2-payments.test.ts \
  tests/geidea-readiness.test.ts \
  tests/payment-settings.test.ts \
  tests/provider-status-regression.test.ts
```

Expected result:

- All selected tests pass.
- No test calls live provider hosts.
- No real merchant credentials are required.

### 1.2 Required fake payment scenarios

| Scenario                                          | Required outcome                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| `fake_card_success`                               | Payment can reach paid state through fake provider.                     |
| `fake_card_failed` / `fake_card_declined`         | Decline path stays failed and does not create paid side effects.        |
| `fake_card_cancelled`                             | Customer-abandoned flow stays failed/cancelled.                         |
| `fake_card_expired`                               | Expired intent is rejected safely.                                      |
| `bank_transfer`                                   | Async pending flow stays pending until a provider event resolves it.    |
| `cash_on_delivery`                                | COD stays pending and follows COD-specific fulfillment rules.           |
| `fake_3ds_challenge`                              | Local 3DS simulation redirects and resolves without live calls.         |
| duplicate webhook                                 | Second webhook is deduplicated and does not double-post wallet entries. |
| invalid signature                                 | Webhook is rejected before order mutation.                              |
| callback-before-webhook / webhook-before-callback | Both orderings converge through idempotent state transitions.           |

### 1.3 Payment NO-GO triggers

- Any live provider host is required.
- Any command needs `GEIDEA_*` values printed to the terminal.
- `PAYMENT_MODE=live` is requested.
- Refunds are advertised as live-ready before Geidea confirms real refund
  endpoint access and a separate implementation task lands.

## Phase 2: Local Shipping Mock Rehearsal

Use `manual` or `haa_mock` only for local rehearsal. OTO sandbox is a later
conditional staging track.

### 2.1 Command evidence

```bash
pnpm vitest run \
  tests/shipping-readiness.test.ts \
  tests/oto-provider-regression.test.ts \
  tests/shipping-w5-failure-scenarios.test.ts \
  tests/route-migration-17-shipments.test.ts \
  tests/haa-1004-shipping-guards.test.ts
```

Expected result:

- Manual and `haa_mock` providers report `mock_ready`.
- Providers without credentials report `not_configured`.
- OTO with sandbox credentials can be represented as `sandbox_configured`.
- A sandbox verification flag can mark OTO as `sandbox_verified`.
- Provider failures are visible as `provider_error`.

### 2.2 Required shipping scenarios

| Scenario                           | Required outcome                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| manual provider                    | Safe fallback is available without external API calls.                        |
| `haa_mock` provider                | Mock rates/labels/tracking are available for rehearsal.                       |
| OTO no credentials                 | Status remains `not_configured`.                                              |
| OTO sandbox credentials            | Status becomes `sandbox_configured`; round trip still pending.                |
| OTO sandbox verified flag          | Status becomes `sandbox_verified` only after explicit evidence.               |
| provider timeout/error             | Status becomes `provider_error`; checkout must not silently drop order state. |
| invalid shipping webhook signature | Webhook is rejected before mutation.                                          |
| duplicate shipping webhook         | Duplicate event is ignored safely.                                            |
| unpaid shipment guard              | Non-COD unpaid orders cannot be shipped.                                      |

### 2.3 Shipping NO-GO triggers

- `SHIPPING_MODE=live` is requested.
- A live OTO key or live carrier token is required.
- A test needs to create a real shipment or label.
- A step requires printing `OTO_*`, `ARAMEX_*`, or `SMSA_*` values.

## Phase 3: Staging Sandbox Preconditions

Do not execute staging sandbox steps until every item below is true.

| Item                                   | Status now  | Required proof                                                                                        |
| -------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| Owner approval for staging sandbox run | Open        | Written approval naming staging sandbox, not production.                                              |
| Geidea sandbox credentials             | Open        | Owner confirms keys are stored in approved staging secret path; values are not printed.               |
| OTO sandbox credentials                | Open        | Owner confirms `OTO_SANDBOX_API_KEY` is stored in approved staging secret path; value is not printed. |
| Callback/return URLs                   | Open        | Owner/provider portal confirmation; record URLs only, never credentials.                              |
| Staging services                       | Conditional | Intentionally started and identified as staging, not production.                                      |
| Test data                              | Open        | Fake merchant/store/customer data only; no real customer PII.                                         |
| Monitoring window                      | Open        | `pnpm ops:monitor` plan and evidence capture owner-approved for the run.                              |

## Phase 4: Staging Sandbox Rehearsal Plan

This section is a plan, not an authorization to deploy or mutate remote env.

When Phase 3 is green, run a new gated task with target:

```text
Environment: staging sandbox on 72.61.108.208
Approved by owner: required in latest message
Forbidden infra check: passed
Manual migration required: no
Action authorised: only if owner explicitly approves the staging sandbox run
```

### 4.1 Payment sandbox smoke

Record redacted evidence only:

- Provider mode shown as sandbox, not live.
- Geidea readiness endpoint/status shows configured without printing keys.
- Test checkout reaches provider sandbox redirect.
- Sandbox callback/webhook is received and signature verification passes.
- Order/payment status converges safely.
- Duplicate webhook replay does not duplicate wallet entries.
- Invalid signature attempt is rejected.

### 4.2 Shipping sandbox smoke

Record redacted evidence only:

- Shipping mode shown as sandbox, not live.
- OTO readiness shows `sandbox_configured`.
- Sandbox rates are returned for a fake address.
- Sandbox shipment/label/tracking flow is exercised only if OTO sandbox terms
  permit it and no live carrier call is made.
- Webhook signature and duplicate handling are verified.
- Evidence is recorded as `sandbox_verified` only after a complete sandbox
  round trip.

## Evidence Log Template

Use this table in a follow-up report or copy it into a task-specific evidence
file. Do not paste secrets.

| Time       | Track              | Environment     | Command/action                | Result | Evidence                          | Decision                        |
| ---------- | ------------------ | --------------- | ----------------------------- | ------ | --------------------------------- | ------------------------------- |
| 2026-06-28 | payment + shipping | local           | focused mock test command     | Pass   | 10 files / 151 tests passed       | GO for local mock test baseline |
| TBD        | payment            | staging sandbox | redacted Geidea sandbox smoke | TBD    | order/payment IDs only            | GO/NO-GO                        |
| TBD        | shipping           | staging sandbox | redacted OTO sandbox smoke    | TBD    | tracking IDs only if sandbox-safe | GO/NO-GO                        |

## Final GO / NO-GO Rules

Local mock rehearsal is GO only if:

- Phase 0 passes.
- Phase 1 payment tests pass.
- Phase 2 shipping tests pass.
- No live provider call, secret print, migration, deploy, or production action
  is needed.

Staging sandbox rehearsal is GO only if:

- A new Mandatory Skill Gate is published for staging sandbox.
- Owner approval is explicit and recent.
- Sandbox credentials are already stored through an approved secret path.
- The target is confirmed as staging on `72.61.108.208`.
- The run plan contains no production deploy, no production migration, no live
  payment/shipping, and no secret printing.

Live beta remains NO-GO until:

- G2 VAT/ZATCA is closed.
- G4 DPO is closed.
- G6 PCI/ASV, G7 pen-test, and G10 DR/restore are closed.
- Live provider credentials and owner approval are recorded.
- Production DNS/secrets/monitoring/backup gates are closed.
- The first beta merchant cohort is named and onboarded.

## Immediate Next Step

The local mock test baseline already passed during TASK-0090. The next safe
step is one of:

- Run a local app smoke with dev servers and fake/mock providers only.
- Or prepare a staging sandbox run after explicit owner approval and approved
  secret storage for Geidea/OTO sandbox credentials.

Before staging sandbox, the next owner input is:

- e-commerce license number/reference or approved proof note,
- DPO plan/contact owner,
- first 3 beta merchant candidates,
- whether to prepare a staging sandbox run with Geidea and OTO sandbox
  credentials stored through the approved path.
