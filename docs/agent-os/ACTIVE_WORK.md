# Active Work — Haa Stores Agent OS

> **Audience:** the next agent picking up where the previous one left off.
> **Update rule:** the current agent updates this file before pausing or
> finishing a session.

---

## Current task

**No active Codex-owned task after TASK-0095 closure (2026-06-28).**

TASK-0095 is complete locally and published as draft PR #324 on
`codex/merchant-employee-permissions-ux-audit`.
The merchant employee-permissions audit fixed the permissions API client mount
prefix, URL-store scoping in `apps/api/src/routes/permissions.ts`, stale
EmployeeFormDialog localStorage store lookup, empty permission-set saves,
create-time custom permission saves after invite, the missing warehouse staff
role, Arabic role labels, role-based permission seeding, and permission matrix
UX copy. Final verification is recorded in the TASK-0095 compliance report.

This does not authorize live beta, production launch, secret handling, live
provider calls, SSH, DNS changes, or migrations.

## Previous task

**TASK-0094 — GitHub integration closure (2026-06-28).**

PR #319 was closed as superseded, PR #322 merged the always-on `Required Merge
Gate`, branch protection now requires that gate with strict branch updates, and
post-merge `main` verification passed: Required Merge Gate, CI, Deploy, and
Deploy Watchdog are all green on merge commit
`49601bea70d88de618fe5359955d18a7146237b4`. Staging deploy and smoke passed;
production deploy was skipped.

## Previous admin task

**TASK-0093 — Admin settlement handoff integration and publish (2026-06-28).**

The owner asked to take over the other agent's admin-dashboard work, verify it
as an executive handoff, and publish it. The inherited staged blocker was an
invalid JSX comment inside the `SettlementBatches.tsx` ternary branch. That is fixed,
and the admin dashboard now passes typecheck, focused settlement tests, build,
skills enforcement, and full preflight. The first PR push also exposed immediate
SonarCloud blockers; TASK-0093 addressed them with SonarCloud/scanner CPD doc exclusions,
shallower store-payment settings normalization, safer bash hook conditionals,
DOM/textContent merchant print output, and native Plans modal backdrop controls.
The later GitHub Test failure was traced to stale source-grep contracts; those
tests now assert shared `ErrorState` retry wiring and DOM/textContent print
construction, and full `pnpm test` passes locally. A refreshed SonarCloud gate
then narrowed the remaining blocker to admin-dashboard code duplication, so
TASK-0093 extracted the repeated nav item shape, table loading skeleton, CSV
export helper, and store selector into shared admin helpers. Admin-dashboard
typecheck and focused admin wiring/source-grep tests pass after that refactor.

This does not authorize live beta, production launch, secret handling, live
provider calls, deploys, SSH, DNS changes, or migrations.

## Current branch

`codex/merchant-employee-permissions-ux-audit` contains TASK-0095 code, tests,
and documentation. Do not include unrelated local storefront, storage, or
screenshot artifacts in this branch.

## Current verdict

- **Readiness sprint:** GO.
- **Sandbox preparation:** GO.
- **Local mock test baseline:** GO; 10 files / 151 tests passed during TASK-0090.
- **Local app runtime:** GO; API/storefront/merchant/admin local HTTP checks passed.
- **Fake/mock provider status:** GO; provider-status and shipment provider-status returned 200 with live blocked/manual fallback indicators.
- **Pre-launch smoke:** GO; `pnpm test:smoke` passed 29/29.
- **Full local smoke:** BLOCKED; `pnpm smoke` failed because `tests/smoke.test.ts` has stale response-shape assumptions and the local DB is missing `orders.preparation_status` from migration `0077_order_preparation_status.sql`.
- **Admin settlement handoff:** GO; inherited `SettlementBatches.tsx` syntax blocker fixed and admin build/typecheck verified during TASK-0093.
- **SonarCloud follow-up:** CLOSED for PR #320/#322 project-owned gates; SonarCloud passed on the relevant closure PRs.
- **GitHub Test follow-up:** CLOSED for project-owned CI; `main` CI run `28329981652` passed after PR #322 merged.
- **GitHub integration closure:** DONE; PR #322 merged, branch protection requires `Required Merge Gate`, `main` CI/deploy/watchdog passed, staging smoke passed, production skipped.
- **Merchant/employee permissions audit:** DONE locally and published as draft PR #324; URL-store permission route scoping, mounted permission client paths, employee-dialog store source, empty permission clears, create-time custom permission saves, warehouse staff role, role-based permission seeding, and UX copy fixed in TASK-0095.
- **Skill Gate policy:** UPDATED; no 1-4 cap, use all applicable skills.
- **Staging sandbox rehearsal:** CONDITIONAL.
- **Staging rehearsal:** CONDITIONAL.
- **Closed live beta:** NO-GO.
- **Public launch:** NO-GO.

See `docs/ops/SANDBOX_REHEARSAL_CHECKLIST.md` for the sandbox baseline and
`docs/ops/ISSUE_KNOWLEDGE_BASE.md` ISSUE-0027 for the local smoke blocker.

## Working tree notes

Existing dirty files that are separate from TASK-0093 publication:

- `apps/storefront/src/components/platform/PlatformShell.tsx`
- `apps/storefront/src/landing/landing.css`
- `docs/ops/LATEST_MONITORING_REPORT.md`
- `storage/monitoring-events.ndjson`
- `storage/support-error-events.ndjson`
- local screenshot files in the repository root
- `admin-dashboard.png`
- `admin-login.png`
- `new-dashboard.png`
- `new-login.png`

The storefront files were present before TASK-0088/TASK-0089 and look like a
footer/legal-entity layout task. The admin-dashboard files/images were observed
during TASK-0090 final status and are unrelated to the sandbox checklist. Do
not revert or mix them into launch-gate work without an explicit owner
instruction.

Generated by required monitoring during TASK-0088:

- `storage/monitoring-events.ndjson`

Generated/updated by TASK-0091 local smoke and error analysis:

- `storage/monitoring-events.ndjson`
- `storage/support-error-events.ndjson`

Expected launch-readiness documentation files:

- `docs/ops/SANDBOX_REHEARSAL_CHECKLIST.md`
- `docs/ops/LAUNCH_READINESS_GATE.md`
- `docs/agent-os/PRODUCTION_LAUNCH_GATES.md`
- `docs/agent-os/REMAINING_WORK.md`
- `docs/HAA_TASK_LEDGER.md`
- `docs/ops/TASK_TRACKER.md`
- `docs/ops/CURRENT_STATE.md`
- `docs/ops/CHANGELOG_INTERNAL.md`
- `docs/agent-os/ACTIVE_WORK.md`
- `docs/ops/SKILL_COMPLIANCE_REPORT_TASK_0090.md`
- `docs/ops/SKILL_COMPLIANCE_REPORT_TASK_0091.md`
- `docs/ops/SKILL_COMPLIANCE_REPORT_TASK_0092.md`
- `docs/ops/SKILL_COMPLIANCE_REPORT_TASK_0093.md`
- `docs/ops/SKILL_COMPLIANCE_REPORT_TASK_0094.md`
- `docs/ops/SKILL_COMPLIANCE_REPORT_TASK_0095.md`
- `docs/ops/ISSUE_KNOWLEDGE_BASE.md`
- `docs/ops/REGRESSION_CHECKLIST.md`
- `AGENTS.md`
- `.github/pull_request_template.md`
- `docs/agent-os/EXECUTION_CHECKLIST.md`
- `docs/agent-os/SKILLS_REGISTRY.md`
- `docs/agent-os/SKILL_FILE_MAPPING.md`
- `docs/agent-os/AGENT_HANDOFF.md`
- `docs/ops/DECISIONS.md`

## Verification so far

- `pwd`: `/Users/thwany/Desktop/haa-stores-core`.
- `pnpm preflight`: passed during TASK-0093 after fixing the inherited admin-dashboard syntax error in `apps/admin-dashboard/src/pages/SettlementBatches.tsx`.
- `pnpm --filter @haa/admin-dashboard typecheck`: passed during TASK-0093.
- `pnpm --filter @haa/admin-dashboard build`: passed during TASK-0093.
- `pnpm vitest run tests/settlement-order-linking.test.ts tests/settlement-order-drilldown-ui.test.ts tests/geidea-settlement-reconciliation.test.ts`: 3 files / 24 tests passed during TASK-0093.
- `bash -n scripts/hooks/pre-edit-frontend.sh`: passed during TASK-0093 Sonar follow-up.
- `pnpm --filter @haa/merchant-dashboard typecheck`: passed during TASK-0093 Sonar follow-up.
- `pnpm vitest run tests/dashboard-print-html-escape.test.ts`: 1 file / 3 tests passed during TASK-0093 Sonar follow-up.
- `pnpm vitest run tests/pii-gating-orders-contract.test.ts tests/admin-landing-inbox.test.tsx tests/scheduled-settlement-admin-batches-ui.test.ts tests/dashboard-print-html-escape.test.ts`: 4 files / 46 tests passed / 1 skipped during TASK-0093 GitHub Test follow-up.
- `pnpm test`: 354 files / 4618 tests passed / 3 skipped / 14 todo during TASK-0093 GitHub Test follow-up.
- Focused local mock payment/shipping tests: 10 files / 151 tests passed.
- `pnpm ops:monitor`: passed during TASK-0091 with 25/25 health checks and local synthetic checks green.
- Browser-like local HTTP checks: storefront `/`, `/s/haa-demo`, cart, checkout, merchant login, and admin all returned 200.
- Sanitized API probes: admin login 200, merchant owner login 200, provider-status 200, shipment provider-status 200, cart create 201.
- `pnpm test:smoke`: 29/29 passed.
- `pnpm smoke`: 37/46 passed and 9 failed; full smoke blocked by stale test contract plus missing local DB column `orders.preparation_status`.
- `pnpm ops:errors`: 3 actionable P2 API-001 events after the failing smoke, no recommended tasks/incidents.
- `pnpm check:skills`: 43/43 passed after TASK-0093 handoff integration and GitHub Test follow-up.
- `git diff --check`: clean after TASK-0093 handoff integration and GitHub Test follow-up.

Final verification is recorded in
`docs/ops/SKILL_COMPLIANCE_REPORT_TASK_0093.md`.

## Next safe action

Pick one focused follow-up:

1. Owner approves local-only DB migration/rebuild, then rerun `pnpm smoke`.
2. Update `tests/smoke.test.ts` product response-shape expectations as a
   separate testing task after the DB blocker is cleared.
3. Review the TASK-0093 draft PR and keep unrelated storefront/screenshot/storage
   work out of the admin handoff unless explicitly approved.
4. Close or park the storefront footer/legal-entity work as a separate
   frontend/design task.
5. Ask the owner for the e-commerce license number/reference, DPO plan, and
   first 3 beta merchant candidates before moving toward live beta.

## Hard boundaries

- No production deploy.
- No `db:migrate`.
- No SSH to production.
- No secrets or `.env*` reads/prints.
- No live payment-provider calls.
- No live shipping-provider calls.
- Do not use server `187.124.41.239`.
