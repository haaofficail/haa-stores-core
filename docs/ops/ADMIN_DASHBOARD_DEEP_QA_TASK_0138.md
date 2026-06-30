# Admin Dashboard Deep QA — TASK-0138

Date: 2026-06-30
Branch: `codex/merchant-compliance-readiness-fix`
Scope: admin dashboard interaction audit with priority on Merchant Verification / `توثيق المتاجر`.

## Executive Summary

The admin dashboard is closer to an operational admin workflow after this pass, but it is not yet a launch-ready end-to-end operations console. This pass closed confirmed P1 blockers found while testing the admin journey:

- The sidebar no longer points to `/admin-users`, a path that can be blocked by browser/client filters before React loads. It now uses `/users`, with an app redirect kept for `/admin-users`.
- The Stores page create/edit action now matches the API contract: it collects `slug`, tenant selection, store email, and phone instead of sending an unsupported `domain` field and asking the admin to type a raw tenant id.
- Admin list/settings/user routes no longer broad-select migration-optional columns for `/admin/stores`, `/admin/tenants`, `/admin/settings`, and `/admin/users`.
- Merchant Verification browser checks still show no full IBAN, no PCI/Pentest/ASV/DR merchant requirements, no stale detail panel on no-result search, and disabled unsafe review actions for the incomplete local sample merchant.

No deploy, no `db:migrate`, no production action, no secrets, and no live payment/shipping/provider calls occurred.

## Interaction Inventory

| Element                                | Type                     | Location                                                     | Product Goal                                                 | Before                                                                                                                  | Fix / Decision                                                                                  | After                                                                                                                         | Severity       |
| -------------------------------------- | ------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `المستخدمون` sidebar link              | Link                     | Main admin sidebar                                           | Open platform-user list for admins with `users.read`         | Pointed to `/admin-users`; in browser this path was blocked with `ERR_BLOCKED_BY_CLIENT`                                | Changed nav to `/users`; kept `/admin-users` as React redirect only                             | `/users` opens `مستخدمو المنصة` with no visible error                                                                         | P1             |
| `/admin/users` API list                | API-backed page          | Users page                                                   | Show safe user list only                                     | Used broad `db.select()` from `users`, failed on unapplied optional columns and risked returning unneeded fields        | Added explicit `adminUserListSelect` without password/admin TOTP fields                         | `/users` opens locally; no password/TOTP field is selected                                                                    | P1             |
| `إضافة متجر`                           | Button/form              | Stores page                                                  | Create a store under a merchant with a valid storefront slug | Form sent `domain` while API required `slug`; no email field though API requires email; raw Tenant ID was admin-hostile | Form now collects `slug`, merchant select, email, phone; API accepts `domain` only as old alias | Modal shows `رابط المتجر`, `التاجر`, `بريد المتجر`, `جوال المتجر`; empty save shows validation                                | P1             |
| `تعديل المتجر`                         | Button/form              | Stores page                                                  | Edit canonical store profile fields safely                   | Could send `domain` instead of `slug`                                                                                   | Update payload uses `slug`, email, phone, tenantId                                              | Source tests and typecheck pass                                                                                               | P1             |
| Stores table search/sort               | Search/table controls    | Stores page                                                  | Search store by actionable identifiers                       | Search was based on `domain` / `tenantName` while API source is `slug`                                                  | Search fields now include `name`, `slug`, `tenantName`, `email`                                 | Browser table shows `رابط المتجر` and email column                                                                            | P2             |
| `/admin/stores` list                   | API-backed page          | Stores, payment settings, settlement readiness, verification | Provide migration-stable store list                          | Broad-selected every store column; local error logs showed `/admin/stores` failed query risk                            | Added explicit list select and tenant join for `tenantName`                                     | `/stores` and dependent pages open with no visible error                                                                      | P1             |
| `/admin/tenants` list                  | API-backed page          | Tenants and store form                                       | Provide merchant list without Platform Gate columns          | Broad-selected G1-G10 optional columns                                                                                  | Added explicit tenant select for list/create/update returning                                   | `/tenants` and store tenant select load locally                                                                               | P1             |
| `/admin/settings` get/update           | API-backed page          | Settings and shell branding                                  | Load platform settings without schema drift                  | Broad-selected tenant row including optional columns                                                                    | Added explicit settings select and returning shape                                              | `/settings` opens with no visible error                                                                                       | P1             |
| `/compliance` search                   | Search                   | Merchant Verification index                                  | Filter visible merchants and avoid stale decisions           | Prior task fixed stale detail risk; re-tested here                                                                      | No code change in this pass                                                                     | No-result search shows no stale merchant dossier and no full IBAN                                                             | P1 verified    |
| `/compliance/:recordId` review actions | Buttons                  | Merchant file                                                | Prevent wrong approval/request/reject decisions              | Needed browser proof after route/API edits                                                                              | No code change in this pass                                                                     | Local sample has disabled `اعتماد التوثيق` / `طلب تعديلات` / `رفض التوثيق` because it is not reviewable; blockers are visible | P0/P1 verified |
| Bank account summary                   | Data display/action area | Merchant file                                                | Review bank safely without exposing full IBAN                | Needed browser proof after route/API edits                                                                              | No code change in this pass                                                                     | Full IBAN pattern absent; page uses masked/last-four model                                                                    | P0 verified    |
| Platform Launch Gates terms            | Concept boundary         | Merchant Verification page                                   | Keep platform PCI/Pentest/ASV/DR out of merchant journey     | Needed browser proof after route/API edits                                                                              | No code change in this pass                                                                     | Browser check found no PCI/ASV/Pentest/DR terms on merchant file                                                              | P1 verified    |
| Admin route navigation set             | Links                    | Sidebar                                                      | Open every primary admin panel without dead/blocked links    | `/admin-users` was the confirmed broken one                                                                             | Changed to `/users` and re-smoked all primary routes                                            | 21 primary routes opened without visible error or full IBAN patterns                                                          | P1/P2          |

## Route Smoke Evidence

Browser-smoked local routes:

- `/` => `الرئيسية`
- `/tenants` => `التجار`
- `/stores` => `المتاجر`
- `/kyc` => `مراجعة التحقق`
- `/bank-accounts` => `الحسابات البنكية`
- `/settlement-readiness` => route opened without visible error
- `/store-payment-settings` => `بوابات الدفع`
- `/finance/settlement-inbox` => `صندوق التسويات`
- `/finance/reports` => `التقارير المالية`
- `/payments` => `المدفوعات`
- `/marketplace` => `إدارة سوق هاء`
- `/payments/settlements` => `دفعات التسوية`
- `/security` => `أمان الحساب`
- `/users` => `مستخدمو المنصة`
- `/audit` => `سجل التدقيق`
- `/operations/webhooks` => `عمليات Webhooks`
- `/plans` => `الباقات`
- `/compliance` => `توثيق المتاجر`
- `/compliance/store-1` => `متجر هاء التجريبي`
- `/landing-inbox` => `صندوق الوارد`
- `/settings` => `إعدادات المنصة`

All route checks reported no visible `Failed query`, no unexpected server-response message, and no full IBAN pattern. Console logs showed React Router future-flag warnings only, not app errors.

## Product Goal Verification

| Sensitive action     | Goal                                               | Result                                                                | Evidence                                                                                                               | Remaining risk                                                                                                          |
| -------------------- | -------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Approve verification | Approve only when readiness and review state allow | Partially verified in browser; source guards already exist            | Local store had approve disabled because it is not reviewable/incomplete; tests assert approval is blocked by blockers | Need seed/sample merchant with submitted fully ready KYC to browser-test successful approval without production data    |
| Reject verification  | Reject only with reason                            | Source verified; browser local sample disabled because not reviewable | API requires reason for non-approved KYC; tests pass                                                                   | Needs submitted/reviewable seed to browser-test modal submit path                                                       |
| Request changes      | Return merchant to editable correction state       | Source verified; browser local sample disabled because not reviewable | `needs_more_info` reason persistence is tested                                                                         | Needs submitted/reviewable seed to browser-test live action                                                             |
| Bank review          | Approve/reject bank without full IBAN              | Source and browser safety verified                                    | Bank route uses masked display; no full IBAN in browser; tests assert bank review wiring                               | Local sample lacks actionable bank account id, so live bank action stayed unavailable                                   |
| Allow publish        | Use publish-readiness blockers, not KYC only       | Source verified and browser blocker proof                             | Readiness checklist and disabled approval state visible                                                                | There is no separate publish-status mutation in this pass; future backend work may be needed for final publish decision |
| Prevent payout       | Bank/payout status must block unsafe payout        | Partially verified via readiness/payout display                       | Bank missing/rejected statuses feed readiness/payout models and tests                                                  | Full payout-block mutation remains wallet/settlement domain, outside this pass                                          |
| Export               | Avoid sensitive data leak                          | Not changed in this pass                                              | Finance exports are already API-guarded in prior tasks; no new export added to compliance                              | A future compliance export would need a dedicated masked DTO and permission                                             |

## Problems Closed

| Problem                                                       | Severity | Root Cause                                                               | Fix                                                          | Verification                                           |
| ------------------------------------------------------------- | -------- | ------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------ |
| Users page nav used `/admin-users`, blocked by client filters | P1       | UI path looked like an ad/admin filter pattern                           | Moved UI route to `/users`, kept redirect alias              | Browser route smoke; source tests                      |
| Store create/edit did not match API                           | P1       | Page used `domain` while route schema required `slug`; email was missing | Added slug/email/phone/tenant select and compatibility alias | Browser modal check; source tests; typecheck           |
| Admin users/stores/settings/tenants used broad selects        | P1       | Routes selected full schema rows including migration-optional fields     | Added explicit selects for list/settings/user routes         | Source tests; API/admin typecheck; browser route smoke |

## Deferred / Not Done

- No migration was added or run.
- No new permissions were added; existing permissions were used.
- No live approve/reject/request-change mutation was submitted from the browser because the local sample merchant is not in a submitted/reviewable state.
- No live bank approve/reject mutation was submitted because the local sample merchant lacks an actionable bank account id.
- A true "publish approval" mutation remains a product/backend decision if the platform wants publish state changes to happen separately from KYC approval.
- Full every-button destructive finance workflow testing is outside this focused Merchant Verification/admin-shell pass; finance routes were smoked for visibility and existing guarded behavior was not changed.

## Readiness Recommendation

Ready for commit only after final verification commands pass. Not ready for staging by itself until a human reviews the combined branch scope and decides whether the existing dirty branch should be split before PR.
