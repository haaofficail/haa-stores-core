# Active Work — Haa Stores Agent OS

> **Audience:** the next agent picking up where the previous one left off.
> **Update rule:** the current agent updates this file before pausing or finishing a session.

---

## Current task

**TASK-0085 — CI E2E local target defaults (2026-06-27) is locally complete.** PR #308 merged, and its Deploy run passed staging smoke 5/5. Its CI run was cancelled by the workflow concurrency rule after a newer `main` push. The newer `main` CI run failed only in E2E because Playwright still targeted shared staging while Deploy was updating staging. The fix keeps `.github/workflows/*` untouched and changes Playwright/test defaults so CI uses local dev servers.

**TASK-0084 — Gift-message sanitization + shipping guard verification (2026-06-27) is locally complete.** User asked to continue all remaining follow-ups. Gift messages now sanitize to plain text before cart/session/order storage and again at public cart/order DTO output boundaries. Existing shipment guards were re-verified with behavioral tests: unpaid non-COD and unconfirmed COD orders are blocked before shipment creation; packed paid/COD-pending orders remain valid.

TASK-0083 remains in the same local worktree: `CheckoutService.handleBNPLCallback` scopes the payment lookup by both `providerPaymentId` and `storeId` before provider confirmation or wallet/order side effects. Wallet idempotency and the direct `pending_payment -> shipped` claim were verified as already mitigated by current tests/code.

## Current branch

`codex/security-review-hardening` (created from local `main`; do not merge/deploy without explicit owner approval).

## Last known commit

`6f3f95c1e8dc53949cb9d20c7397b8d7a7df6bf6` — `chore(ops): ignore local workspace artifacts`.

## Branch state vs main

Working tree is dirty with TASK-0083/TASK-0084 scoped files plus unrelated pre-existing local edits. Expected task files now include `packages/commerce-core/src/checkout.ts`, `packages/commerce-core/src/cart.ts`, `packages/commerce-core/src/orders.ts`, `packages/commerce-core/src/gift-message-sanitizer.ts`, `packages/shared/src/gift-message.ts`, `packages/shared/src/index.ts`, `packages/shared/src/dto/storefront-dto.ts`, `tests/bnpl-callback-tenant-isolation.test.ts`, `tests/gift-message-sanitization.test.ts`, required ops docs, and monitoring log output from `pnpm ops:monitor`.

## Wave-by-wave outcomes

See `EXECUTION_CHECKLIST.md` for the table. Summary:

- 14 waves Done with code + tests + commits.
- 6 waves Deferred (tracker-only) with reasoning in `REMAINING_WORK.md`.
- 1 wave Done (planning only) — wallet idempotency.
- 1 wave Done (marker only) — stale docs.

## Verification

- TASK-0085 verification: `CI=true pnpm test:e2e` passed 4/4 against local servers after bootstrapping a disposable E2E database; the temporary database was dropped afterward. Supporting checks passed: `pnpm typecheck`, `pnpm lint` (0 errors, 514 existing warnings), `pnpm test`, `pnpm check:skills`, `git diff --check`, `pnpm preflight`, and final `pnpm ops:monitor`.
- `pnpm preflight`: green locally on 2026-06-27.
- `pnpm ops:monitor`: first run had no recommended tasks/incidents while API/storefront dev servers were not running; second run with API, storefront, and merchant dashboard running passed runtime and synthetic checks with no recommended tasks/incidents.
- `pnpm vitest run tests/gift-message-sanitization.test.ts tests/g10-storefront-dto-contract.test.ts`: 36/36 passing.
- `pnpm vitest run tests/haa-1004-shipping-guards.test.ts tests/haa-preparation-status.test.ts tests/route-migration-17-shipments.test.ts`: 74/74 passing.
- `pnpm vitest run tests/bnpl-callback-tenant-isolation.test.ts`: 2/2 passing.
- `pnpm vitest run tests/wallet-idempotency-spec.test.ts tests/w16-wallet-idempotency-plan.test.ts`: 12/12 passing.
- `pnpm vitest run tests/wallet-posting-wiring.test.ts tests/order-state-machine.test.ts tests/order-state-hardening.test.ts`: 98/98 passing.
- `pnpm vitest run tests/low-stock-email.test.ts`: 29/29 passing.
- `pnpm typecheck`: passing.
- `pnpm lint`: exit 0, 514 warnings, 0 errors. Warnings are existing `no-explicit-any` / restricted-import cleanup debt outside this scoped patch.
- `pnpm preflight`: passed after the patch.
- `pnpm check:skills`: 43/43 checks passing.
- `gitleaks git --staged --redact --no-banner`: no leaks found.
- `git diff --check`: clean.

## Untracked files

Expected new task files:

- `tests/bnpl-callback-tenant-isolation.test.ts`
- `packages/commerce-core/src/gift-message-sanitizer.ts`
- `packages/shared/src/gift-message.ts`
- `tests/gift-message-sanitization.test.ts`

Other untracked deep-review/report markdown files are present locally and were not edited as part of this task. Keep them out of any scoped TASK-0083 commit unless the owner explicitly asks to archive or publish them.

## Next safe action

Commit and push only the staged TASK-0083/TASK-0084 scope, then open a draft PR. Do not include unrelated dirty files in the task diff.

## Resume instructions

For any agent picking this up:

1. `cd /Users/thwany/Desktop/haa-stores-core` (canonical; DECISION-OS-006).
2. `git branch --show-current` → expect `codex/security-review-hardening` for this scoped publish flow.
3. `git status --short --branch` → distinguish TASK-0083 edits from unrelated local artifacts above.
4. Read `docs/agent-os/REMAINING_WORK.md` for owner-gated launch blockers.
5. Never deploy, SSH, touch secrets, call live providers, or run `db:migrate` without explicit owner approval.
