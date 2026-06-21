---
name: regression-safety-gate
description: Use this skill when changing any sensitive surface — themes, brand tokens, dashboard, checkout, payments, shipping, auth, tenant isolation, CI. Refuses to ship without adjacent-surface verification.
disable-model-invocation: true
---

# Regression Safety Gate

## Purpose

A small change in a sensitive area can break things far away. This gate widens the test net for high-blast-radius surfaces.

## Read First

- `docs/agent-os/TEST_STRATEGY.md` (per-type strategy).
- `docs/agent-os/CURRENT_SYSTEM_AUDIT.md` (sensitive surfaces).
- `docs/ops/REGRESSION_CHECKLIST.md` (project regression list).
- `docs/agent-os/QUALITY_GATES.md §5` (regression safety rule).

## Rules

Sensitive surfaces (any change here triggers wider testing):

1. **Themes / brand tokens** — re-test storefront + dashboard isolation; visual check on a representative storefront page.
2. **Dashboard auth / RBAC** — boundary tests + at least one E2E login + role check.
3. **Checkout / cart** — full happy-path + at least one validation error.
4. **Payments** — `FakePaymentProvider` end-to-end + the affected provider's tests.
5. **Shipping** — rate calculation tests + race-guard tests (per PR #32 precedent — `apps/api/src/routes` checkout race).
6. **Auth core** — full `packages/auth-core` test run.
7. **Tenant isolation** — re-run every test that asserts cross-tenant access denial.
8. **CI workflows** — `pnpm ci:local` mirror locally before push.

Additional rules:

9. Never silently disable a now-failing test; either fix the cause or file `ISSUE_REGISTER.md` row + revert.
10. Document the regression scope checked in the Final Report.
11. If a regression was found and fixed: add a row to `docs/ops/REGRESSION_CHECKLIST.md`.

## Steps

1. Identify which sensitive surfaces are touched by the diff.
2. For each: run the wider test set per the rules above.
3. Capture results (commands + outcomes).
4. Verify no previously passing test now fails.
5. Report the regression scope explicitly.

## Output

```
Regression scope — <change>
Sensitive surfaces touched: <list>
Wider tests run:
- <command> → <result>
- ...
New failures: <none | list with classification>
Regression checklist updated: <yes/no — entry if yes>
```
