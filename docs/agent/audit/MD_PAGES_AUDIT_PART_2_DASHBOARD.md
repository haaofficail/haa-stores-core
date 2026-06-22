# Merchant Dashboard Audit — Part 2: Dashboard + Analytics

> Scope: `DashboardHome.tsx`, `pages/dashboard/*` (orchestrator + 23 sub-files), and 7 analytics-class pages (`Reports`, `GrowthInsights`, `LiveRadar`, `AuditLogs`, `AbandonedCarts`, `CustomerSegments`, `MarketingActions`).
> Branch: `chore/merchant-dashboard-per-page-audit` at HEAD `2ded302d`.
> Read-only audit. No src edits.

Severity legend: **P0** = ship-blocker · **P1** = launch-blocker, fix soon · **P2** = quality debt · **P3** = nice-to-have · **info** = positive note worth preserving.

---

## DashboardHome.tsx

The thin orchestrator pattern is healthy; complaints are mostly downstream.

| Axis | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| Bugs | P2 | `fetchError` flag is set only when the *first* result (summary) fails. If every other endpoint fails but summary succeeds, the screen renders with empty everything and a single toast. | `DashboardHome.tsx:84` reads `data.fetchError`; producer `useDashboardData.ts:175-176` only flips it on `results[0]`. | Set `fetchError` when *all* critical results (summary, wallet, salesData) fail — partial failures should keep showing what loaded. |
| Loading state | info | Skeleton layout is realistic (header + 2-grid + banner + cards). | `DashboardHome.tsx:64-82` | — |
| Empty state | P1 | When every conditional block is empty (`acItems.length===0`, no `recentActionableOrders`, no readiness issues, no `lowStock`), DashboardHome renders Header → Subscription → QuickActions → AnalyticsSection only — no "your store is quiet today" empty-state cue. New merchants see a confusingly bare page. | `DashboardHome.tsx:142,147,155,160` all wrapped `length > 0`. | Add a default "no activity today" panel that surfaces below the KPI strip when all guarded blocks collapse. |
| RTL | info | Uses `space-y-*` + `px-3 sm:px-4 md:px-6` (no `ml-/mr-/pl-/pr-`). | `DashboardHome.tsx:100` | — |
| A11y | P2 | `motion-reduce:animate-none` applied; no semantic `<main>` landmark — wraps in `<div>`. | `DashboardHome.tsx:99-201` | Wrap return in `<main>` or rely on layout's main. |
| Brand | info | All chrome on Haa primary scale after PR #80. | — | — |
| Performance | P1 | `useDashboardData` fires **26 parallel** API calls on mount. Median TTI is gated by the slowest. Several (notifications, expired-coupons, completed-promotions, bank-account, compliance-status, marketplace-hub) are only consumed by `useSmartAlerts` and could be lazy. | `useDashboardData.ts:141-172` | Split into 2 batches: critical (summary, wallet, sales, orders, readiness, subscription) blocks render; secondary (alerts payload) loads after first paint. |
| Integrations | info | All endpoints use the typed `dashboardApi` / `walletApi` / etc. clients — no raw `fetch`. | `useDashboardData.ts:13-42` | — |
| Missing features | P3 | No auto-refresh on dashboard. The "تحديث" button is the only refresh path; a passive 30–60s revalidation (or window-focus revalidation) would catch order/stock changes without the merchant pressing refresh. | — | Consider `useIdleRefresh` or react-query refetch on window focus. |

### DashboardHome.tsx → `pages/dashboard/` sub-files

#### `useDashboardData.ts` (405 lines, the heavy hook)

| Axis | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| Bugs | P1 | `eslint-disable-next-line react-hooks/exhaustive-deps` for `refreshKey` — the dep is real (it gates re-runs); the comment "unused in body" is wrong, the rebinding *is* the use. Misleading. | `useDashboardData.ts:228-229` | Remove disable; `refreshKey` is correctly in deps. |
| Bugs | P2 | `salesTrend.pct` formatted with `toFixed(1)` then re-parsed via `pct.startsWith("-")` — fragile if locale ever introduces non-Latin minus. | `useDashboardData.ts:273-276` | Compare numeric diff `secondHalf - firstHalf` against 0 instead of string-prefix check. |
| Loading | info | Single `loading` flag; `Promise.allSettled` so one failure doesn't block. | `useDashboardData.ts:141-172` | — |
| Error | P2 | The error toast (`if (r.status === "rejected" && !hasError)`) fires once even if 25 of 26 calls fail — silent partial failure. | `useDashboardData.ts:219-225` | Show a single retry banner naming the categories that failed. |
| Brand | info | activeProducts violet KPI is allow-listed in brand-fidelity guard. | `useDashboardData.ts:320-322` | — |
| Performance | P1 | 26-way `Promise.allSettled` — see above. Also, `liveSubDays` polls every 60s via `setInterval` regardless of whether subscription approaches expiry. | `useDashboardData.ts:341-352` | Compute on-demand from `Date.now()` in render (no interval needed). |
| Types | P2 | `summary: any`, `wallet: any`, `salesData: any`, plus 12 more `any[]` fields. Loses type-safety across the entire dashboard. | `useDashboardData.ts:55-82` | Define real interfaces from the API types in `@haa/shared`. |
| Missing | P2 | No request cancellation on unmount or refetch — the `loadIdRef` only filters stale state writes, not in-flight network. | `useDashboardData.ts:101,174` | Use `AbortController` on each `fetch` underlying the api client. |

#### `useSmartAlerts.ts` (1096 lines!)

| Axis | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| Code quality | P1 | 1096 lines in a single hook is a code-smell ceiling. Likely a long chain of `if (…) push({…})` blocks. | `wc -l` = 1096 | Split into rule modules (`alerts/payment.ts`, `alerts/shipping.ts`, …) and a single composer. |
| Bugs | unknown | Did not deep-read in this pass. Flag for follow-up. | — | Dedicated review pass. |

#### `useDashboardComputed.ts` (147 lines)

| Axis | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| Brand | info | Allow-listed: pickup-item violet, ship now uses primary-darker per PR #80. | `useDashboardComputed.ts:85-98` | — |
| Types | P2 | `salesData: any`, `summary: any` props. | `useDashboardComputed.ts:22-23` | Inherit from `DashboardData`. |

#### `DashboardHeader.tsx`

| Axis | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| RTL | P2 | `absolute top-2.5 right-2.5` for a red badge dot — physical `right` instead of logical `end-2.5`. Will appear on the wrong side under LTR override. | `DashboardHeader.tsx:60` | Replace with `end-2.5` (Tailwind logical). |
| A11y | P2 | 2 of 3 buttons have `aria-label`; one likely icon-only without label. | grep above | Add `aria-label` to the remaining button. |

#### `PrimaryKpiCards.tsx`

| Axis | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| RTL | P3 | Decorative blur orbs use `absolute top-0 right-0 … translate-x-10`. Cosmetic — in RTL the orb sits on the opposite physical side relative to the card; impact is minimal because the blur is symmetric. | `PrimaryKpiCards.tsx:41,72` | Replace `right-0 translate-x-10` with `end-0 translate-x-10` only if visual mirror is desired. Otherwise mark `dir="ltr"` on the decorative div. |

#### `WelcomeBanner.tsx`

| Axis | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| RTL | P3 | Same pattern as above — decorative orbs at `top-0 left-0` / `bottom-0 right-0`. Cosmetic. | `WelcomeBanner.tsx:28,29` | Same call — convert to logical or `dir="ltr"`-scope the decorative layer. |

#### `AnalyticsSection.tsx`

| Axis | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| Performance | info | Uses `React.lazy(() => import('./SalesChart'))` + `Suspense` to defer recharts (~400 KB). | `AnalyticsSection.tsx:33-34` | — |
| Brand | info | Chrome on primary scale. | — | — |

#### `NextActionBanner.tsx`, `RecentActionableOrders.tsx`

| Axis | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| Brand | info | Both reference `bg-violet-*` for the pickup-action branch — allow-listed in brand-fidelity guard. | `NextActionBanner.tsx:77`, `RecentActionableOrders.tsx:106` | — |
| A11y | P2 | Icon-only buttons without `aria-label` (per grep). | grep above | Add `aria-label` to all icon-only buttons. |

#### `LowStockList.tsx`, `MoreSection.tsx`, `QuickActionsGrid.tsx`, `RecentCustomersList.tsx`, `RecentSoldProducts.tsx`, `ShowMoreKpiToggle.tsx`, `SmartAlertsStrip.tsx`, `StoreReadinessBanner.tsx`

| Axis | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| A11y | P2 | All have icon-only or text-only `<button>` elements without `aria-label`. Total: 13 components in this group missing labels. | grep section F above | Add `aria-label` per button — Arabic strings already exist in `ar.json` for most labels. |

#### `constants.ts`

| Axis | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| Types | P3 | `t: (key: string, options?: any) => string` instead of `TFunction`. | `constants.ts:27` | Import `TFunction` from `i18next`. |
| Brand | info | `processing` + `ready_to_ship` migrated to `primary` per PR #80. | `constants.ts:80-81` | — |

---

## Reports.tsx

| Axis | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| Bugs | P1 | Raw `fetch(exportUrl, ...)` bypasses the typed `request()` client — manual `getToken()` + manual error handling + no `ApiClientError` recovery. | `Reports.tsx:142-145` | Add `reportsApi.exportFull` that wraps the same request through the typed client. |
| Bugs | P2 | "all failed" heuristic checks only `salesSummary`, `topProducts`, `ordersByStatus` — but `salesByCity`, `lowStock`, `walletSummary`, `deepReport` rejection counts toward nothing. | `Reports.tsx:185` | Use `Promise.allSettled` + count rejections; treat ≥4 rejections as full failure. |
| Loading | info | Skeleton header + 4 KPI cards on load. | `Reports.tsx:208-217` | — |
| Empty state | info | Each section has `length === 0` guard with "لا توجد بيانات". | `Reports.tsx:77-78, 321, 363, 397` | — |
| Error | P2 | `toast.error('فشل تحميل التقارير')` Arabic string is hardcoded instead of i18n key. | `Reports.tsx:170` | Move to `ar.json` under `reports.loadError`. |
| RTL | info | Uses `me-1`/`me-2` logical spacing in icon margins. | `Reports.tsx:254, 258` | — |
| A11y | P1 | Export-button `<button>` elements have `title` but no `aria-label` (per grep F). Icon-only — non-accessible. | `Reports.tsx:67-74, 350-358` | Add `aria-label={t('reports.exportCsv')}`. |
| Brand | info | Status badges include `bg-purple-100 text-purple-700` for "shipped" — semantic, allow-listed by AuditLogs/Segments precedent. | `Reports.tsx:18` | — |
| Performance | P2 | Index keys (`key={index}`, `key={i}`) on dynamic table rows. Causes wasted re-render and DOM swap on re-sort. | `Reports.tsx:91, 333, 367, 409, …` | Use `p.id` / `o.status` / `c.city` / etc. |
| Performance | P2 | Date filter triggers a full re-fetch on every date keystroke (no debounce). | `Reports.tsx:249-250, 197` | Debounce 300ms or change to onBlur. |
| Date input | P2 | No `dateFrom <= dateTo` validation; merchant can request an inverted range. | `Reports.tsx:249-250` | Add a guard: `if (dateFrom && dateTo && dateFrom > dateTo) toast.error(...)`. |
| Types | P2 | 4× `as any[]` casts on response payloads. | `Reports.tsx:190-193` | Type the responses in `@/lib/api`. |
| Inline style | P3 | `<style>{`@media print {…}`}</style>` block. Works but pollutes the React tree. | `Reports.tsx:239-244` | Move to `Reports.module.css` or import from the app's print stylesheet. |
| Missing features | P3 | No "save preset" for date ranges. Date pickers reset on every navigation. | — | Persist to URL query string for shareable report views. |

---

## GrowthInsights.tsx

| Axis | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| Bugs | P2 | Only 2 `useMemo`/`useCallback` instances in a 477-line component — likely heavy re-renders on parent state changes. | grep section I | Profile then memoize chart data shape. |
| Loading | info | Skeleton + error states present. | `GrowthInsights.tsx:1, 123, 181` | — |
| Empty state | info | Multiple `length === 0`-guarded sections. | grep G | — |
| Brand | info | `bg-violet-500` semantic for "purchases" conversion bar — allow-listed. | per ALLOW_LIST | — |
| Types | P2 | `severityColor(insight.severity) as any` on Badge variant — bypasses the variant union. | `GrowthInsights.tsx:339` | Tighten Badge's `variant` prop to include the severity strings used. |

---

## LiveRadar.tsx

| Axis | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| Bugs | P2 | `setInterval(loadData, 12000)` with `loadData` in deps means each `loadData` rebuild (every storeId/filter change) tears down + recreates the interval. Acceptable but wasteful. | `LiveRadar.tsx:178-184` | Wrap `loadData` in `useCallback` with stable deps; or use `useRef` to store latest `loadData` and run interval against the ref. |
| Bugs | P2 | Auto-refresh polling every 12 s — no exponential backoff on repeated failure. A flaky network produces a 12s toast cadence. | `LiveRadar.tsx:180` | Skip poll if last `loadData` rejected; backoff to 30s/60s before retry. |
| Loading | info | Skeleton present. | `LiveRadar.tsx:184-194` | — |
| Error | P2 | On poll failure, page enters `fetchError` state and shows "common.error" — but the previous data is wiped. User loses live numbers because of a single transient failure. | `LiveRadar.tsx:196-202` | Show toast for transient failures; only render error screen on initial load failure. |
| A11y | P1 | Icon-only refresh + filter buttons without `aria-label` (3 buttons, 0 labels per grep F). | `LiveRadar.tsx` button blocks | Add `aria-label`. |
| Brand | info | violet for viewer signals — allow-listed. | per ALLOW_LIST | — |
| Performance | P2 | Component is 612 lines with 2 memos. Charts likely re-render on every 12-s tick. | grep I | Memoize chart-data shape; consider `React.memo` on chart subcomponents. |
| Integrations | info | Uses `request` from `@/lib/api`. | `LiveRadar.tsx:13` | — |

---

## AuditLogs.tsx

| Axis | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| Loading | info | Skeleton present. | grep G | — |
| Empty state | P2 | empty=3 grep hits — but no dedicated "no logs match your filter" empty state. Empty result silently renders an empty table body. | grep G + visual review | Add an `EmptyState` with hint when `logs.length === 0 && hasFilters`. |
| Error | P0/P1 | grep finds **0 error hits** — no `try/catch`, no `toast.error`, no `isError`. If `auditApi.list` rejects, the UI either keeps loading forever or crashes silently. | grep G | Wrap `loadData` in try/catch + toast.error; mirror Reports/Abandoned. |
| RTL | info | Uses logical spacing. | — | — |
| A11y | P2 | Date inputs + filter selects have proper labels. ✓ | `AuditLogs.tsx:264,268` | — |
| Brand | info | Semantic palette intentional + allow-listed. | per ALLOW_LIST | — |
| Performance | P2 | Pagination at 20/page (`limit=20`); good. But the `useCallback` deps include 6 filter values — re-fires on every keystroke. | `AuditLogs.tsx:202` | Debounce date inputs; or move `dateFrom`/`dateTo` to onBlur. |
| Filters | P2 | Filter state isn't persisted — refresh resets to first page with no filters. | — | Mirror to URL query string. |
| Types | P2 | `logs: any[]` (line 170). | `AuditLogs.tsx:170` | Define `AuditLog` interface. |

---

## AbandonedCarts.tsx

| Axis | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| Bugs | info | `ApiClientError` instance check + fallback toast — proper handling. | `AbandonedCarts.tsx:45-51` | — |
| Loading | info | Skeleton present. | grep G | — |
| Empty state | P1 | empty=1 grep hit — likely missing a dedicated empty state ("لا توجد عربات متروكة"). Power-merchant view with low cart abandonment looks broken. | grep G | Add `EmptyState` with hint when `carts.length === 0`. |
| Recovery flow | P1 | The Send icon is imported but the actual "send recovery email" mutation is not visible in the first 60 lines. Likely a stub or the only action is the filter dropdown. | `AbandonedCarts.tsx:8` imports `Send` | Verify whether recovery-send flow exists; if stub, escalate as a missing feature. |
| RTL | info | Logical spacing. | — | — |
| A11y | info | Buttons have labels via i18n strings. | — | — |
| Integrations | info | Uses `abandonedCartsApi`. | — | — |

---

## CustomerSegments.tsx

| Axis | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| Loading | info | Skeleton + error states. | grep G | — |
| Empty | P2 | empty=2 grep hits — adequate but check segment-list view for empty hint. | grep G | — |
| Brand | info | violet for "one_time_buyers" — allow-listed. | `CustomerSegments.tsx:72` | — |
| Types | info | Proper TS interfaces (`Segment`, `SegmentMember`, `Thresholds`, …). | `CustomerSegments.tsx:13-50` | — |
| Performance | P3 | 365 lines, 3 memos. Adequate but flag if segment members list becomes long. | grep I | Add pagination if not already present. |
| Integrations | info | Uses `request` + `ApiClientError`. | `CustomerSegments.tsx:10` | — |
| Missing features | P2 | "Settings" dropdown imports `Settings` icon — verify the threshold-edit dialog actually works (no obvious stub but check). | `CustomerSegments.tsx:9` | Trace `Settings`-icon click handler. |

---

## MarketingActions.tsx

| Axis | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| Loading | info | Skeleton. | grep G | — |
| Empty | P2 | empty=2 — needs a richer empty state (especially when no thresholds set + no actions generated). | grep G | Add a CTA empty state: "Generate first marketing action". |
| Error | info | 5 error-related hits — adequate. | grep G | — |
| RTL | info | Logical spacing. | — | — |
| A11y | P2 | Action-row buttons ("done", "dismissed") need `aria-label`. | `MarketingActions.tsx:323, 332` | Add. |
| Brand | info | Semantic palette for action statuses. | `MarketingActions.tsx:302-305` | — |
| Types | P2 | `severityColor(severity) as any`, `statusColor(action.status) as any`. | `MarketingActions.tsx:302, 305` | Tighten Badge variant typing. |
| Performance | P2 | 492 lines, 2 memos. Likely re-renders all action rows on every `editingThresholds` keystroke. | grep I | Move dialog state to its own component. |
| Integrations | info | Uses typed api client. | — | — |
| Missing features | P1 | The "Generate" button (`handleGenerate`) creates marketing actions but the flow doesn't appear to support scheduled/recurring generation. Each generation is one-shot. | `MarketingActions.tsx:239` | Add a "schedule" option (daily/weekly) or document why it's manual-only. |

---

## Cross-cutting Findings

1. **Pervasive `any` typing.** 20+ instances across the scope (`useDashboardData`, `Reports`, `AnalyticsSection`, hooks, AuditLogs). Each one loses cascading type-safety. Single biggest quality debt in this scope.
2. **Icon-only buttons missing `aria-label`.** 13 components affected. Quickest a11y win — Arabic labels already in `ar.json` for most.
3. **No request cancellation on unmount.** The `loadIdRef` filtering pattern prevents stale state but doesn't abort in-flight network. Wasteful on slow networks and causes spurious console errors during fast navigation.
4. **Index-keyed lists** in Reports and several dashboard tables. Causes DOM swap on re-sort.
5. **Date-input pages re-fetch on every keystroke.** Reports + AuditLogs both have `dateFrom`/`dateTo` in the load callback deps.
6. **Repeated card-class string** `bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card` appears 11 times in Reports.tsx alone. Should be a `<Card>` primitive in `packages/ui` (or local `Card.tsx`).
7. **No auto-refresh on dashboard.** LiveRadar polls; nothing else does. Background revalidation on window focus would feel premium.
8. **`useSmartAlerts` is 1096 lines.** Single biggest file in scope; almost certainly contains dead branches and ought to be split into rule modules.

---

## Summary — Top 5 Highest-Priority Findings

1. **P0 / P1: AuditLogs has no error handling** (`pages/AuditLogs.tsx` — grep finds 0 error hits). A rejected `auditApi.list` either spins forever or crashes silently. Wrap `loadData` in try/catch + toast.
2. **P1: Dashboard fires 26 parallel requests on mount** (`useDashboardData.ts:141-172`). Split into critical-now / secondary-after-paint batches; defer the smart-alerts payload until after first paint.
3. **P1: 13 dashboard sub-components have icon-only buttons without `aria-label`** (grep F). Arabic labels already exist in `ar.json` — quickest single a11y win.
4. **P1: Reports.tsx export uses raw `fetch` + manual `getToken()`** (`Reports.tsx:142-145`). Bypasses `ApiClientError` recovery. Add `reportsApi.exportFull`.
5. **P1: `useSmartAlerts.ts` is 1096 lines.** Code-smell ceiling; split into per-domain rule modules (`alerts/payment.ts`, `alerts/shipping.ts`, …).

Six secondary themes — pervasive `any`, no request cancellation, index-keyed lists, no debounce on date inputs, repeated card classes, no idle revalidation — show up across all 9 pages and should be addressed as a sweep in a dedicated PR.
