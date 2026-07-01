# Admin Dashboard SaaS UX Audit — 2026-07-01

> Scope: full admin-dashboard UX audit with a controlled frontend fix batch.
> Draft PR: #351 — https://github.com/haaofficail/haa-stores-core/pull/351.
> This is local-only: no deploy, no migration, no production config, no
> secrets, and no live payment/shipping-provider calls.

## Executive Summary

The admin dashboard had enough functional pages, but several surfaces still
read as raw internal tables instead of a SaaS operations console. The highest
risk issue was decision safety: incomplete onboarding could surface as high
risk, payment settings could show an enabled toggle beside an unconfigured
provider, settlement readiness used internal terms, and empty states did not
explain what the absence of data means.

This batch implements a controlled P0/P1 frontend slice:

- Re-grouped sidebar IA into operational journeys.
- Turned the home page into a command-center surface.
- Split Merchant Verification risk from readiness/incomplete onboarding.
- Reworked Settlement Readiness into a decision dashboard.
- Split payment provider configured/enabled/mode/readiness states.
- Added shared smart empty states across decision-heavy admin pages.

## Page Audit Map

| Page             | Goal                          | Goal clear?       | Decision shown?                 | Next action?                            | Risk   | Decision                                        |
| ---------------- | ----------------------------- | ----------------- | ------------------------------- | --------------------------------------- | ------ | ----------------------------------------------- |
| الرئيسية         | Daily admin command center    | Partially         | Improved in this batch          | Improved                                | Medium | Keep adding live health aggregates later        |
| التجار           | Merchant account management   | Partial           | Dossier link exists             | Partial                                 | Medium | Keep table enrichment for next batch            |
| المتاجر          | Store management              | Partial           | Status visible only             | Improved empty state                    | Medium | Add publish/payment/shipping columns later      |
| رسوم المتاجر     | Platform/COD fee policy       | Good functionally | Partial                         | Partial                                 | High   | Add preview impact in next finance UX batch     |
| التحقق           | KYC review queue              | Partial           | Review actions exist            | Improved empty state                    | High   | Prefer Merchant Verification for decisions      |
| الحسابات البنكية | Bank review                   | Partial           | Review reason exists            | Improved                                | High   | Keep no-full-IBAN guard                         |
| جاهزية التسوية   | Settlement decision           | Weak before       | Improved                        | Improved                                | High   | Implemented decision table and blockers         |
| إعدادات الدفع    | Gateway configuration         | Mixed before      | Improved                        | Improved                                | High   | Implemented configured/enabled/readiness split  |
| صندوق التسويات   | Manual payout queue           | Partial           | Existing queue                  | Improved via batch empty-state patterns | High   | Needs deeper drawer/action polish later         |
| التقارير المالية | Settlement reporting          | Partial           | Rows only                       | Improved                                | High   | Keep CSV permission/audit guard                 |
| المدفوعات        | Payment list/export           | Partial           | Status only                     | Improved                                | High   | Added fake-provider warning and next actions    |
| سوق هاء          | Marketplace operations        | Partial           | Moderation exists               | Partial                                 | Medium | Drawer/action consistency later                 |
| التسويات         | Settlement batches            | Partial           | Rows only                       | Improved                                | High   | Added empty-state decision guidance             |
| أمان الحساب      | Admin account security        | Partial           | Migration-readiness copy exists | Partial                                 | High   | Disable unavailable setup states in later batch |
| المستخدمون       | Admin users                   | Weak              | Role/status only                | Improved empty state                    | High   | Add permissions/2FA/last login columns later    |
| سجل التدقيق      | Audit evidence                | Weak when empty   | Improved                        | Improved                                | High   | Empty state now warns about filters/API wiring  |
| Webhooks         | Provider event monitoring     | Good metrics      | Partial                         | Improved                                | Medium | Added health explanation for no-events state    |
| الباقات          | Plan management               | Partial           | Toggle exists                   | Partial                                 | Medium | Pricing/disable impact needs owner decision     |
| توثيق المتاجر    | Merchant verification station | Good direction    | Improved                        | Improved                                | High   | Fixed risk vocabulary and metrics               |
| صندوق الوارد     | Landing/contact inbox         | Partial           | Rows/messages                   | Partial                                 | Low    | Later copy/state polish                         |
| الإعدادات        | Platform settings             | Functional        | Partial                         | Partial                                 | Medium | Later split system/account/provider settings    |

## IA Changes

The sidebar now groups routes by admin journey:

- عام: الرئيسية.
- التجار والمتاجر: التجار، المتاجر، توثيق المتاجر، طلبات التحقق، الحسابات البنكية.
- الماليات: المدفوعات، جاهزية التسوية، صندوق التسويات، التسويات، التقارير المالية، رسوم المتاجر، إعدادات الدفع.
- السوق: سوق هاء.
- نظام: المستخدمون، أمان الحساب، سجل التدقيق، Webhooks، الباقات، صندوق الوارد، إعدادات المنصة.

No route was removed, no permission key was widened, and `/admin-users`
remains a redirect to `/users`.

## UX Issues Fixed

- `not_started` and `incomplete` onboarding no longer become `high` risk just
  because several readiness blockers exist.
- Merchant Verification labels now distinguish `غير جاهز`, `ناقص بيانات`, and
  `غير مصنفة` from actual high/blocked risk.
- Store Payment Settings prevents `enabled=true` from being sent for providers
  that are not configured or active.
- Settlement Readiness now tells the admin whether the store is ready for
  settlement, whether withdrawal is allowed, the blockers, owner, and next
  action.
- Empty states now explain meaning and next action on KYC, bank accounts,
  payments, finance reports, settlements, audit logs, webhooks, stores, and
  admin users.
- Dashboard now has daily priorities and health/launch-readiness caveats
  instead of only raw counts.

## Remaining UX Risks

- Merchants/stores tables still need richer operational columns: verification,
  bank, payout, risk, last activity, payment, shipping, product/order counts.
- Full details drawers are still not implemented for merchants, stores,
  payments, bank accounts, and settlements.
- Plan pricing and plan-disable behavior require an owner product decision.
- Account Security still needs deeper readiness-disabled UX when TOTP migration
  prerequisites are missing.
- Finance pages are safer after TASK-0140 and this batch, but deeper CSV,
  approval, and transfer UX should remain a separate finance batch.

## Verification Results

- `pnpm --filter @haa/admin-dashboard typecheck` — passed.
- `pnpm --filter @haa/admin-dashboard build` — passed.
- `pnpm vitest run tests/admin-dashboard-saas-ux.test.ts tests/admin-merchant-verification.test.ts tests/admin-store-payment-settings-contract.test.ts tests/admin-financial-actions-safety.test.ts` — passed 4 files / 33 tests.
- `pnpm vitest run tests/admin-brand-tokens.test.ts tests/typography.test.ts` — passed 2 files / 4 tests.
- `pnpm check:skills` — passed 43/43.
- `git diff --check` — clean.
- `CI=true pnpm preflight` — passed in the isolated worktree with root guard skipped; admin-dashboard typecheck was run separately.
- Browser verification on `localhost:5175` — passed for sidebar IA, dashboard command center, Merchant Verification vocabulary, Settlement Readiness decision columns, Store Payment Settings readiness after selecting a store, smart empty states, and mobile RTL without document/body horizontal overflow.
