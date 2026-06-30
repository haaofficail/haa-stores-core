# Merchant Dashboard Sidebar Audit - 2026-06-30

## Scope

- **Surface:** `apps/merchant-dashboard`
- **Primary navigation source:** `apps/merchant-dashboard/src/components/layout/Sidebar.tsx`
- **Route source:** `apps/merchant-dashboard/src/App.tsx`
- **Audit type:** frontend/design, product-quality, RTL merchant dashboard review
- **Safety boundary:** no production action, no `db:migrate`, no secrets, no live payment-provider calls, no live shipping-provider calls.

## External Benchmark

- Shopify App Design Guidelines: merchant apps should be predictable, easy to use, adaptive/mobile-first, accessible, and consistent with the host admin experience.
- Shopify navigation guidance: IA must help merchants move task-to-task, use the fewest meaningful categories, keep nav items short/scannable, provide back/breadcrumb affordances, and keep page actions predictable.
- W3C WCAG 2.2: keyboard focus must be visible and targets must meet at least the 24x24 CSS pixel minimum or have sufficient spacing.
- Stripe reporting docs: high-trust finance/reporting surfaces should provide prebuilt reports, exportable operational data, and clear business analysis paths.

References:

- https://shopify.dev/docs/apps/design
- https://shopify.dev/docs/apps/design/navigation
- https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- https://docs.stripe.com/stripe-reports

## Current Coverage Snapshot

- Sidebar has 9 groups and 40 visible route entries, permission-filtered through `usePermissions()`.
- Canonical merchant routes are namespaced under `/catalog`, `/sales`, `/marketing`, and `/finance`.
- Backward-compatible redirects still exist for old top-level routes in `App.tsx`; product code should use canonical routes directly.
- Local health before edits: `pnpm preflight` passed; `pnpm ops:monitor` passed with only expected local-server warnings.
- Local verification after the first slice: merchant dashboard typecheck passed, merchant dashboard production build passed, `pnpm preflight` passed, `pnpm check:skills` passed 43/43, and `git diff --check` was clean.

## Sidebar Section Matrix

| Sidebar section | Completed now                                                                                                                                                                                                                                | Missing or quality gaps                                                                                                                                                                                                                                  | Priority |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| الرئيسية        | Dashboard and getting-started exist behind `dashboard:view`; dashboard uses live cards and smart alerts.                                                                                                                                     | Getting-started is still closer to a static checklist than a fully data-driven onboarding cockpit. Account/security readiness should feed into onboarding completion.                                                                                    | P2       |
| الكتالوج        | Products, categories, brands, and tags are discoverable. Product table has real CRUD, filters, bulk actions, and state handling.                                                                                                             | Some destructive product/variant actions still use native browser confirm flows, which are weaker for RTL/accessibility and premium feel.                                                                                                                | P1       |
| البيع           | Orders, customers, abandoned carts, shipping, and sales channels are present. Customer segments route exists. This slice added a visible Customer Segments card in Sales Hub and removed old `/channels` navigations from channel workflows. | Order detail still contains notification actions that are disabled or "coming soon"; shipping still has native confirm/prompt paths; customer segments are discoverable from the hub but not a sidebar item.                                             | P1       |
| التسويق         | Promotions, coupons, loyalty, WhatsApp, and marketing actions exist. Marketing actions are reachable from Marketing Hub.                                                                                                                     | WhatsApp local pairing explicitly depends on a server-side stub until the real runtime lands; SMS notifications are honest "coming soon" but still unavailable. Loyalty/WhatsApp need stronger empty/success paths for a merchant-grade launch.          | P1       |
| المالية         | Finance hub, wallet, settlements, subscriptions, compliance, invoices, and plan-change confirmation exist.                                                                                                                                   | Export/report depth is basic compared with Stripe-grade reporting. Settlement route is hub/wallet discoverable but not a direct sidebar item. Finance pages need reconciliation-grade filters, scheduled exports, and clearer payout/dispute drilldowns. | P1       |
| التحليلات       | Reports, growth, live radar, exports, and imports exist with live API paths in the main analytics pages.                                                                                                                                     | Imports is paste-CSV based, not a full file upload/mapping/validation/history flow. Exports are one-click CSV cards without scoped filters, saved reports, scheduled exports, or history.                                                                | P1       |
| الدعم           | Support page includes KB search, ticket creation, ticket stats, attachments, empty states, and ticket detail route.                                                                                                                          | `/support/kb` redirects to support; KB management and article lifecycle are not a first-class merchant/admin workflow. Modal implementation is custom and should be audited for focus trapping consistency.                                              | P2       |
| الإعدادات       | Account, store settings, employees, policies, notification inbox/preferences, AI assistant, theme editor/store, and audit logs are discoverable. Employee permissions work is present.                                                       | Account page is intentionally read-only for password, 2FA, and session management. This is the largest merchant-trust gap in settings. Employees still use native confirm for delete.                                                                    | P1       |
| المطوّرون       | API keys and migration hub exist. API keys have scoped creation, revoke dialog, usage logs, plaintext key save confirmation, and auto-clear.                                                                                                 | Migration is mostly template-download plus redirect to imports; it is not yet a guided migration wizard with upload, mapping, validation, progress, retry, and rollback history.                                                                         | P1       |

## Findings

### P1 - Merchant Trust / Launch Quality

1. **Account security is incomplete.** `Account.tsx` is read-only and shows "coming soon" behavior for password and 2FA actions. A premium merchant dashboard needs self-serve password change, 2FA setup, active session management, and recovery paths.
2. **Notification actions are not fully real.** Order detail gift/pickup notification actions are disabled or placeholder-backed. WhatsApp and SMS also have runtime/provider gaps.
3. **Import/export workflows are too thin for a global merchant admin.** Paste-CSV import and one-click exports are useful MVP coverage, but not enough for high-volume merchants.
4. **Native browser dialogs remain in critical flows.** Product archive, employee delete, shipment cancel/return, variant disable, onboarding skip, and some order/settings flows should move to accessible in-app dialogs.
5. **Finance/reporting needs stronger operational trust.** Exports, reconciliation, payout history, and settlement drilldowns exist but need Stripe-grade filtering, saved report/history, and audit-friendly data views.

### P2 - Discoverability / Consistency

1. Hidden canonical routes such as customer segments, settlements, and marketing actions should be intentionally classified as either sidebar entries or hub-only secondary routes.
2. Hub pages should consistently show partial-failure states when one API call degrades.
3. Theme Store should gain empty-state/fallback copy if the theme registry is empty or preview assets fail.
4. Support KB should be a first-class lifecycle if merchant self-service content is part of the product promise.

## Slice Implemented In This Pass

- Added a Sales Hub card linking directly to `/sales/customers/segments`.
- Updated sales-channel flows to use canonical `/sales/channels...` routes instead of old `/channels...` paths:
  - `Marketplaces.tsx`
  - `MarketplaceDetail.tsx`
  - `MarketplaceGuide.tsx`
  - `MarketplaceListings.tsx`
  - `MarketplaceGuideModal.tsx`
  - `SyncLogs.tsx`
  - `dashboard/hooks/smart-alerts/marketing-rules.ts`
- Updated a notifications comment to reference the canonical `/sales/channels` location.

## Recommended Execution Order

1. **Navigation/action trust slice:** finish native-confirm replacement for merchant critical flows and decide which hidden routes belong in sidebar vs hubs.
2. **Account security slice:** implement password change, 2FA setup, session list/revoke, and focused auth tests.
3. **Notifications runtime slice:** replace order notification placeholders with a real dispatch path or remove disabled actions until the backend is ready.
4. **Import/export premium slice:** file upload, CSV mapping, preview validation, import history, export filters, and scheduled/saved report hooks.
5. **Finance/reporting slice:** reconcile payouts/settlements/exports with audit-grade filters and downloadable evidence.
6. **Visual/accessibility QA:** run browser checks for desktop/mobile RTL, keyboard focus, target sizing, empty/error/loading states, and screenshot review.

## Current Verdict

The merchant dashboard is functional and materially broad, but not yet "global premium" across every workflow. The biggest remaining gaps are not route coverage; they are trust-critical actions, security self-service, real notification/provider completion, and import/export depth.
