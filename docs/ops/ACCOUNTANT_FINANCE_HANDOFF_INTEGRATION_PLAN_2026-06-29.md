# Accountant Finance Handoff Integration Plan — 2026-06-29

## Purpose

This document captures the takeover state after the financial agent completed
the accountant-settlement stream and handed it back for integration. It exists
so the remaining work does not depend on chat memory.

## Current Evidence

- `pwd` was `/Users/thwany/Desktop/haa-stores-core`.
- `pnpm preflight` passed on 2026-06-29 with TypeScript green.
- Initial `git status --short --branch` on the handoff branch reported
  `codex/merchant-employee-permissions-ux-audit...origin/codex/merchant-employee-permissions-ux-audit [behind 8]`.
- After `git fetch origin`, PR #324 was confirmed merged and the worktree was
  moved to `codex/apple-grade-finance-integration` from current `origin/main`.
- Safety recovery points were created before the branch move:
  `/tmp/haa-apple-finance-integration-tracked-2026-06-29.patch`,
  `/tmp/haa-apple-finance-integration-untracked-2026-06-29.tgz`, and
  `stash@{0}` (`codex apple finance integration handoff 2026-06-29`).
- No files were staged during the takeover docs-sync step.
- The financial handoff states no commit, push, migrate, deploy, or staging
  validation was performed by the financial agent.

## Financial Handoff Summary

The financial agent reports that the accountant-settlement engineering is
complete locally and verified with:

- `pnpm typecheck` clean for wallet-core, shared, API, and admin-dashboard.
- `pnpm lint` clean on the financial-agent files.
- 484 green tests plus 1 todo across payout, wallet, settlement, accountant,
  permission, RBAC, IBAN reveal, and finance reports.

These claims are handoff claims until re-verified inside TASK-0123 integration.

## Clean Financial Files From Handoff

Backend services:

- `apps/api/src/services/accountant-inbox.ts`
- `apps/api/src/services/accountant-detail.ts`
- `apps/api/src/services/iban-reveal-policy.ts`
- `apps/api/src/services/settlement-reports.ts`

Backend admin routes:

- `apps/api/src/routes/admin/accountant-inbox.ts`
- `apps/api/src/routes/admin/accountant-detail.ts`
- `apps/api/src/routes/admin/iban-reveal.ts`
- `apps/api/src/routes/admin/finance-reports.ts`

Wallet core:

- `packages/wallet-core/src/receipt-validation.ts`
- `packages/wallet-core/src/settlement-config.ts`

Admin-dashboard pages:

- `apps/admin-dashboard/src/pages/AccountantInbox.tsx`
- `apps/admin-dashboard/src/pages/AccountantSettlementDetail.tsx`
- `apps/admin-dashboard/src/pages/FinanceReports.tsx`

Migrations:

- `packages/db/src/migrations/0088_users_admin_role.sql`
- `packages/db/src/migrations/0089_payout_receipt_sha256.sql`

Documentation:

- `docs/ops/RFC_ACCOUNTANT_SETTLEMENTS_ROLE.md`

## Clean Modified Financial Files From Handoff

- `packages/shared/src/permissions.ts`
- `packages/shared/src/types/orders.ts`
- `packages/auth-core/src/admin-auth-service.ts`
- `packages/db/src/schema/users.ts`
- `packages/db/src/schema/wallet.ts`
- `packages/wallet-core/src/ledger.ts`
- `packages/wallet-core/src/index.ts`
- `packages/shared/src/media.ts`
- `apps/api/src/routes/admin/marketplace.ts`
- `packages/db/src/migrations/meta/_journal.json`

## Entangled Files Requiring Review

These files contain financial-agent hunks plus other local changes and must not
be staged blindly:

- `apps/admin-dashboard/src/App.tsx`
- `apps/admin-dashboard/src/lib/api.ts`
- `apps/api/src/routes/admin/index.ts`
- `apps/api/src/routes/admin/tenants-stores.ts`
- `apps/admin-dashboard/src/pages/SettlementBatchDetail.tsx`

Use line-level review or `git add -p` after the integration decision is made.

## Critical Dependency

The accountant-settlement feature depends on admin RBAC structure that is not
safe to separate blindly:

- `apps/admin-dashboard/src/components/ui/UnauthorizedState.tsx`
- `AdminPermissionRoute`
- `hasAdminPermission`
- admin route/sidebar permission reflection

Therefore, a standalone financial PR may fail to compile without the admin RBAC
base. The recommended sequence is either:

1. RBAC/admin permission base PR first, then accountant-settlement PR, then
   TASK-0122 non-financial dialog PR; or
2. One deliberately scoped integration PR containing RBAC/admin base +
   accountant-settlement + TASK-0122, with unrelated artifacts excluded.

## Files To Exclude From Any Integration PR Unless Explicitly Needed

- Root screenshots such as `admin-dashboard.png`, `admin-login.png`,
  `admin-preflight.png`, `audit-login.png`, `final-dashboard.png`,
  `new-dashboard.png`, and `new-login.png`.
- `storage/monitoring-events.ndjson`
- `storage/support-error-events.ndjson`
- Unrelated storefront or merchant-dashboard remediation files not selected for
  the intended PR scope.
- Any temporary handoff patch such as
  `/tmp/haa-task-0122-full-before-finance-split.patch`.

## Owner-only Actions

Do not run these from an agent task without explicit owner approval:

- `db:migrate`
- production deploy
- SSH or DNS changes
- live payment-provider calls
- live shipping-provider calls
- staging secrets or production secrets

The financial migrations `0088` and `0089` are owner/staging-run items.

## Integration Verification Plan

Before any commit/push/PR:

1. Review the admin RBAC base and accountant feature together.
2. Stage only selected files; inspect `git diff --cached`.
3. Run targeted tests for:
   - admin permission reflection/RBAC
   - accountant inbox/detail pages and routes
   - IBAN reveal policy/route typing
   - payout receipt/second-approval/amount validation
   - settlement reports and finance reports contracts
   - TASK-0122 admin dangerous dialog accessibility
4. Run:
   - `pnpm --filter @haa/shared build`
   - `pnpm --filter @haa/api typecheck`
   - `pnpm --filter @haa/admin-dashboard typecheck`
   - `pnpm --filter @haa/admin-dashboard build`
   - `pnpm check:skills`
   - `git diff --check`
   - final `pnpm preflight`
5. Only then stage/commit/push/open PR.

## Final Local Verification

Completed on 2026-06-29 on `codex/apple-grade-finance-integration`:

- Targeted integration suite: 27 files / 214 tests passed.
- Focused full-test repairs: image/PDF allowlist, upload PDF opt-in, service-layer enforcement, source-grep route/service contracts, tenant status audit, typography, and Drizzle snapshot integrity all passed.
- Full test suite: `pnpm test` passed 400 files / 4940 tests, with 1 skipped file, 3 skipped tests, and 14 todo tests.
- Builds/typechecks: `@haa/shared` build, `@haa/wallet-core` typecheck, `@haa/api` typecheck, `@haa/admin-dashboard` typecheck, and `@haa/admin-dashboard` build passed.
- Repo gates: `pnpm preflight`, `pnpm lint` (0 errors / 431 existing warnings), `pnpm check:skills` 43/43, `git diff --check`, `git diff --cached --check`, and `pnpm ops:monitor` passed.
- Owner-only boundary preserved: no `db:migrate`, deploy, secrets, production action, SSH, live payment-provider call, or live shipping-provider call.

## Current Verdict

Local verification is green on a branch based on current `origin/main`. GitHub
readiness is now narrowed to intentional staging/commit/push/opening a draft PR;
local screenshots and storage event logs remain excluded, and migrations 0088
and 0089 remain owner-only to apply.
