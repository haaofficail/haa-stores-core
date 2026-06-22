# Merchant Dashboard — Per-Page Audit, Part 3 (Commerce)

> Branch: `chore/merchant-dashboard-per-page-audit` · Base: `main@2ded302d` · Read-only audit · 12 commerce-core pages.
>
> Severity: **P0** = data/money corruption or block; **P1** = wrong info shown / silent failure; **P2** = polish, perf, a11y; **info** = neutral note.
>
> Money risk applies to Wallet, Settlement*, Coupons, Promotions, Shipping.

---

## Cross-cutting finding (applies to every page in scope)

| Axis | Severity | Finding | Evidence | Suggested fix | Money risk |
|---|---|---|---|---|---|
| 7. Integrations / API | **P1** | **No `Idempotency-Key` header is sent on any merchant-dashboard mutation.** Search across `apps/merchant-dashboard/src/lib/api.ts` returns zero matches for `idempot` / `Idempotency-Key`. Every POST/PUT/PATCH (orders status change, payout request, coupon create, product create, shipping label create, bulk activate/deactivate, etc.) is vulnerable to double-submission on transient network failure → duplicate wallet payouts, duplicate orders, duplicate refunds. | `apps/merchant-dashboard/src/lib/api.ts:104-252` (POST/PUT/PATCH calls with no Idempotency-Key header). Server-side wallet-posting-service exists (`F-QA-C-001`) but client never sets the key. | Inject `Idempotency-Key: <uuid>` automatically in the `request()` helper for POST/PUT/PATCH; server already supports it for wallet entries per `WALLET_IDEMPOTENCY_PLAN.md`. | **high** (Wallet, Settlements) |
| 1. Bugs | **P2** | Heavy use of `any` for API responses across all 12 pages (`products: any[]`, `summary: any`, `e: any`, etc.). Types defined in `packages/shared` exist but are not threaded through to the client, so a server field rename (e.g., `merchantPayable` → `merchant_payable`) silently produces blank cells instead of a type error. | `Products.tsx:45`, `Wallet.tsx:83-84`, `Coupons.tsx:32`, `Promotions.tsx:34`, `Customers.tsx:18`, `Shipping.tsx:39`, etc. | Generate types from server Zod schemas (`packages/shared` already has them) and import per resource. | low |
| 4. A11y | info | All Edit / Trash buttons in tables have `h-11 w-11` (44×44 WCAG 2.5.5) — good. Pagination buttons consistent. Search icons use `<input type="text">` with `aria-label`. | Most pages, e.g. `Wallet.tsx:484`, `Customers.tsx:143-167`, `Coupons.tsx:260-265`. | None. |
| 5. Brand fidelity | info | All 12 chrome surfaces are on `primary-*` / semantic colors (`emerald`/`amber`/`rose`/`red`). No raw `indigo-*` / `violet-*` / `sky-*` creep in these 12 files. (Marketplace vendor logos in `Products.tsx:23-28` PROVIDERS list are vendor brand, not Haa chrome — out of allow-list scope.) | grep `(indigo|violet|sky)-\d+` over scope = 0 hits. | None. |

---

## Products.tsx (792 LOC)

| Axis | Severity | Finding | Evidence | Suggested fix | Money risk |
|---|---|---|---|---|---|
| 1. Bugs | **P1** | Bulk image upload after product create awaits each upload **serially** in a `for…of` loop. For a 20-image catalogue this is ~20× the latency of `Promise.all`. Also: if the user closes the dialog mid-upload, the in-flight uploads continue but the `clearQueuedImages()` revokes their object URLs (race). | `Products.tsx:271-282` (`for (const img of queuedImages) { ... await productsApi.uploadImage(...) }`) | Switch to `Promise.allSettled` with a concurrency cap; track in-flight per upload; gate the URL.revoke until `await` resolves. | none |
| 1. Bugs | **P1** | After `openEdit(created.id)` succeeds, the function `return`s but the parent flow's `setDialogOpen(false)` already fired one line above; if `openEdit` throws inside its try/catch the dialog stays open in edit mode without the user knowing the create succeeded. | `Products.tsx:297-301` | Either don't auto-reopen as edit (just close + reload list), or surface the openEdit failure as a non-blocking warning. | none |
| 1. Bugs | **P2** | `e.target.files` cleared after the for-loop, but if the user re-selects the same file the change handler won't refire (browsers dedupe). | `Products.tsx:424` already clears via `fileInputRef.current.value = ''` — good. | None. | none |
| 2. Loading/empty/error | info | Skeleton-loading + retry button + empty state all present for both table and grid views. Filters cleared by EmptyState's clear-action chain. | `Products.tsx:549-589`. | None. | none |
| 3. RTL | info | Search icon uses `style={{ insetInlineEnd }}` and `paddingInlineEnd` — RTL-safe. Bulk action chevrons use `ChevronLeft`/`ChevronRight` correctly. | `Products.tsx:471-472`, `Products.tsx:642,651`. | None. | none |
| 4. A11y | info | All 44×44 hit areas present. Filter selects have `placeholder`; pagination buttons have `aria-label`. | `Products.tsx:640,649`. | None. | none |
| 6. Performance | **P2** | Server-side pagination (`limit=20`) — good. But: `categories`, `brands`, `tags` all fetched in parallel on every page change in the same `loadProducts` callback (`Products.tsx:99-106`), not memoised by `storeId`. A store with 500 tags re-downloads them on every page click. | `Products.tsx:95-121`. | Split into separate `useEffect`s keyed on `[storeId]` only; products effect keys on the filter/page set. | none |
| 7. Integrations | **P1** | Publish-to-marketplace dialog (`Products.tsx:756-783`) iterates `selectedChannels` and calls `marketplaceApi.publishProduct` per channel in a serial `for` loop. If the merchant picks 4 marketplaces, the user waits ~4× the latency, and a failure halfway leaves the store in an inconsistent published state. | `Products.tsx:763-775`. | `Promise.allSettled`; aggregate per-channel results into the toast. | none |
| 8. Missing features | **P2** | No "duplicate product" action; no inline price edit; no per-row stock adjust; no bulk price-update. Owner mentioned "تطوير الإمكانيات" — these are concrete adds. | n/a (gap). | Roadmap. | none |

---

## Categories.tsx (385 LOC)

| Axis | Severity | Finding | Evidence | Suggested fix | Money risk |
|---|---|---|---|---|---|
| 1. Bugs | info | Standard CRUD + drag-reorder; reorder uses `PUT /merchant/:storeId/categories/reorder` (`api.ts:252`). No idempotency-key (see cross-cutting). | `api.ts:252`. | (See cross-cutting). | none |
| 6. Performance | **P2** | If categories exceed ~500 rows (rare but possible for marketplaces), the page renders all of them — no virtualization. | `Categories.tsx` (full-file render). | Defer until a real merchant reports lag; track in REMAINING_WORK. | none |

---

## Brands.tsx (307 LOC)

| Axis | Severity | Finding | Evidence | Suggested fix | Money risk |
|---|---|---|---|---|---|
| 1. Bugs | info | Same shape as Categories. No money. | n/a. | None. | none |
| 8. Missing | **P2** | No "merge brands" action (common ask when two SKUs use slightly different brand spelling). | n/a. | Roadmap. | none |

---

## Tags.tsx (267 LOC)

| Axis | Severity | Finding | Evidence | Suggested fix | Money risk |
|---|---|---|---|---|---|
| 1. Bugs | info | Same shape as Categories/Brands. | n/a. | None. | none |
| 8. Missing | **P2** | No analytics view ("which tags drive sales") — referenced in `GrowthInsights.tsx` (out of this part's scope). | n/a. | Roadmap. | none |

---

## Orders.tsx (1,298 LOC) + orders/orderHelpers.tsx (123 LOC)

| Axis | Severity | Finding | Evidence | Suggested fix | Money risk |
|---|---|---|---|---|---|
| 1. Bugs | **P0** | `changeStatus(orderId, status)` mutation has **no idempotency-key** and is called from a confirm dialog. A double-click during a slow API call posts two state transitions; if the backend doesn't deduplicate at the route layer (per `WALLET_IDEMPOTENCY_PLAN.md` only wallet posting is deduped), the order can transition `confirmed → processing → ready_to_ship` in one user click. Cascades into wallet entries. | `Orders.tsx:148-166`. | Idempotency-Key on the request + disable the action button until the toast lands (currently disabled only via `changingStatus`, which races on re-renders). | **medium** (wallet entry created on `delivered` transition) |
| 1. Bugs | **P1** | `useEffect([routeOrderId, storeId])` calls `openDetail(Number(routeOrderId))` but the lint-disable comment explicitly acknowledges `openDetail` is recreated each render — meaning if the URL changes back-and-forth quickly, the in-flight `Promise.all` writes back to a possibly-stale `detailOrder`. | `Orders.tsx:106-111`. | Wrap with AbortController; cancel previous in-flight on route change. | none |
| 2. Loading/empty/error | info | Skeleton + retry + reset-filters all present; pickup-locations fetched alongside order detail. | `Orders.tsx:130-145`. | None. | none |
| 5. Brand | info | Semantic palette in `orderHelpers.tsx:17-30` (`destructive`, `warning`, `success`, `default`, `secondary`) — matches `dashboard/constants.ts`. No raw color names. | `orderHelpers.tsx:17-30`. | None. | none |
| 6. Performance | **P2** | The 1,298-line component re-renders the entire orders table on every filter typeahead key (debounced 300ms — good). But `selectedOrders` (Set state) triggers full table re-render on every checkbox toggle. | `Orders.tsx:63`. | Move row to a memo'd component keyed by orderId. | none |
| 7. Integrations | **P1** | `changeStatus` toast says `t('orders.errorTransition', { status: ... })` — if backend returns a *valid* error (e.g., "cannot transition cancelled → shipped"), the merchant sees a generic "error transitioning to ..." message instead of the actual server reason (also: the catch handler does check `ApiClientError` and surfaces `err.message` — good). | `Orders.tsx:158-163`. | Cross-check that backend always returns ApiClientError-shaped responses. | low |
| 8. Missing | **P2** | No "print invoice" / "download invoice PDF" action visible in the listing — confirmed by the `Printer`/`FileText` icons being imported but not surfaced as top-level row actions in the truncated read. | `Orders.tsx:14` (imports), no usage in the action column (verified by grep). | Surface invoice export. Mentioned in REMAINING_WORK as a roadmap item already. | none |

---

## Customers.tsx (195 LOC)

| Axis | Severity | Finding | Evidence | Suggested fix | Money risk |
|---|---|---|---|---|---|
| 1. Bugs | **P1** | The customer phone is `dir="ltr"` but is wrapped in `<PermissionGate permission="customers:view_sensitive">`; **the cell is rendered for everyone, just with empty content when the permission is missing** — looks broken (empty cell) rather than informative ("hidden"). | `Customers.tsx:139`. | When missing the permission, render an explicit "•••" placeholder instead of `<PermissionGate>` returning null. | none |
| 1. Bugs | **P2** | `email` falls back to `'-'` but `name` does not — a customer with a blank name renders an empty cell. | `Customers.tsx:138-140`. | Add fallback to name too. | none |
| 2. Loading/empty/error | info | Search-no-results state ("لا توجد نتائج لـ '{search}'") with clear-search action — nicer than a single empty state. | `Customers.tsx:107-114`. | None. | none |
| 6. Performance | info | Server-paginated, `limit=20`. Good. | `Customers.tsx:29,35`. | None. | none |
| 8. Missing | **P1** | No "view customer detail" action — `Edit` exists, but there's no read-only customer profile (orders by customer, LTV, last seen). Storefront's `LiveRadar` shows visitors but here merchants can't drill in from a name. | n/a (gap). | Add `<Link to={\`/customers/${c.id}\`}>` to a detail page. | low (LTV is finance-adjacent) |

---

## Coupons.tsx (375 LOC)

| Axis | Severity | Finding | Evidence | Suggested fix | Money risk |
|---|---|---|---|---|---|
| 1. Bugs | **P1** | `validate()` allows `Number(form.value) < 0` to fail — but `0` itself passes for a `fixed` coupon, which creates a meaningless coupon. Also: `maxDiscountAmount` is not validated against `value` for percentage type (a 100% coupon with `maxDiscountAmount=5 SAR` silently undercharges). | `Coupons.tsx:97-104,116-117`. | Add `> 0` minimum on value; cross-validate maxDiscount when type=percentage. | **medium** (free coupons) |
| 1. Bugs | **P1** | `startsAt`/`expiresAt` are accepted in `datetime-local` format (no timezone). Server stores in UTC; merchant in Riyadh enters "2026-06-22 23:00" → server sees "2026-06-22 23:00 UTC" = "2026-06-23 02:00 KSA" → coupon active 3h earlier than intended. | `Coupons.tsx:89-90,338,342`. | Convert to ISO with explicit `+03:00` offset before sending. | **medium** (premature discount) |
| 1. Bugs | **P2** | `code` is uppercased on input (`Coupons.tsx:288`) — good — but no validation against spaces or RTL marks. | `Coupons.tsx:288`. | Regex `^[A-Z0-9_-]+$`. | none |
| 5. Brand | info | `typeColors` map uses `'success' | 'warning' | 'secondary'` semantic Badge variants. No raw colors. | `Coupons.tsx:18-22`. | None. | none |
| 7. Integrations | **P1** | `couponsApi.create` not idempotent — see cross-cutting. Double-create gives same code → server probably rejects, but inconsistent UX. | `api.ts` (assumed). | Idempotency-Key. | low |

---

## Promotions.tsx (376 LOC)

| Axis | Severity | Finding | Evidence | Suggested fix | Money risk |
|---|---|---|---|---|---|
| 1. Bugs | **P1** | Same `datetime-local` timezone bug as Coupons — `startsAt` / `endsAt` sent without `+03:00`. | `Promotions.tsx:91-92,341,346`. | (See Coupons fix). | **medium** |
| 1. Bugs | **P1** | Validate doesn't check `startsAt < endsAt`. A merchant can create a promotion with end before start; the row renders "expired" badge regardless of `isActive`. | `Promotions.tsx:98-106,222`. | Add ordering check. | low |
| 1. Bugs | **P2** | `appliesToId` for `category`/`product` uses `<Input type="number">` — but a merchant won't know the numeric ID. | `Promotions.tsx:336-337`. | Replace with a `<Select>` populated from categories/products list. | none |
| 8. Missing | **P2** | `buy_x_get_y` is selectable as a type but there are no fields to enter X or Y. The form just sends `value` — server must reject or silently ignore. | `Promotions.tsx:302`. | Either remove from the dropdown until implemented, or add X/Y inputs gated on the type. | low |

---

## Shipping.tsx (780 LOC — 4 tabs: Methods, Zones, Rates, Shipments)

| Axis | Severity | Finding | Evidence | Suggested fix | Money risk |
|---|---|---|---|---|---|
| 1. Bugs | **P0** | **Rates tab — no edit/delete actions on existing rates.** A merchant who misconfigures a rate (e.g., `baseRate: 50` instead of `5`) cannot fix it from the UI; they'd have to delete the zone or method and recreate the chain. Customers see the wrong shipping cost at checkout meanwhile. | `Shipping.tsx:316-429` (RatesTab has Create button, table rows have no actions column). | Add Edit and Delete buttons per row + `shippingApi.rates.update` + `.delete` client methods. | **high** (customers overcharged for shipping) |
| 1. Bugs | **P1** | "Create Return" uses `window.prompt(t('shipping.returnReason'))` — a native browser prompt. Mobile Safari deprecates `window.prompt`; the reason text is also unsanitized and goes straight to the API. | `Shipping.tsx:508-509`. | Replace with a proper Dialog; sanitize / validate. | none |
| 1. Bugs | **P1** | `handleCancel` uses `window.confirm(t('shipping.cancelConfirm'))` — same browser-native dialog risk. | `Shipping.tsx:498`. | (Same fix.) | none |
| 1. Bugs | **P2** | `handleCreateLabel` shows generic "label created" toast but doesn't reveal *which* label or open it — merchant has to click "View label" separately. | `Shipping.tsx:487-495`. | After success, auto-open the label URL. | none |
| 2. Loading/empty/error | info | All 4 tabs have skeleton/error/empty states with retry. Status banner (`ShippingStatusSection`) shows mock/manual badges. | `Shipping.tsx:672-735`. | None. | none |
| 5. Brand | info | `shipmentStatusColors` uses Badge semantic variants. `bg-primary-50/50` info box on parent — primary chrome. | `Shipping.tsx:23-26,751`. | None. | none |
| 6. Performance | **P2** | The 4 tab components mount/unmount on tab switch — no data prefetch. Switching Methods → Rates re-fetches methods + zones. | `Shipping.tsx:316-334`. | Lift the shared lists to the parent and pass down. | none |
| 7. Integrations | **P1** | Idempotency missing on rate create, label create, cancel, return, tracking update — all mutating. Worst case: double label creation → double shipment fee. | `Shipping.tsx:472,489,499,512`. | (See cross-cutting.) | **medium** |
| 8. Missing | **P1** | No way to **bulk import zones** (CSV). Merchants in Saudi Arabia need to enter all 13 regions / 100+ cities — done one-by-one. | n/a (gap). | CSV upload for zone cities. | low |
| 8. Missing | **P2** | No "duplicate rate" action — merchants often copy a method's rates to a parallel zone. | n/a. | Roadmap. | none |

---

## Wallet.tsx (547 LOC)

| Axis | Severity | Finding | Evidence | Suggested fix | Money risk |
|---|---|---|---|---|---|
| 1. Bugs | **P0** | **The "you will receive" hero card displays `summary?.netBalance` with no client-side sanity check.** If the server returns a negative balance (e.g., overdrawn merchant), the page shows it in `text-primary-700` (positive brand color) instead of a warning state. | `Wallet.tsx:171-182,263`. | Apply the `(summary?.netBalance ?? 0) >= 0` check to the hero card the same way it's applied to the lower SummaryCard at line 263. | **high** (merchants misled about owed money) |
| 1. Bugs | **P1** | `formatCurrency` is called on `e.amount` (raw number from server) but the page never confirms `e.amount` is finite. A `NaN` from a malformed server response renders "NaN ر.س" in the table — visible nonsense. | `Wallet.tsx:470,76-78`. | Guard `Number.isFinite(n)` in `fmt()`. | medium |
| 1. Bugs | **P2** | `withdrawDisabled` warning is shown but no "Request Withdrawal" CTA is visible on this page — only via the Settlements link. A first-time merchant won't find it. | `Wallet.tsx:526-543`. | Link "Request Withdrawal" button into the warning panel pointing to `/wallet/settlements`. | none |
| 2. Loading/empty/error | info | Skeleton on summary; first-load detection via `useRef(isFirstLoad)`. Good pattern. | `Wallet.tsx:90,103-110`. | None. | none |
| 4. A11y | info | Pagination 44×44, search has aria-label, tooltips on disabled state. | `Wallet.tsx:484,504,508`. | None. | none |
| 5. Brand | info | All chrome `primary-*`. `typeColors`/`directionStyles` use `emerald`/`rose`/`amber`/`purple`/`cyan` semantically for entry-type tags — wider palette is allow-listed via `tests/merchant-dashboard-brand-fidelity.test.ts` (Wallet-adjacent semantic types). | `Wallet.tsx:22-55`. | None. | none |
| 6. Performance | info | Server-paginated 20/page. Table loader overlays during refetch. | `Wallet.tsx:429-433`. | None. | none |
| 7. Integrations | **P1** | `walletApi.entries` filter args (`type`, `direction`, `status`, `dateFrom`, `dateTo`, `search`) are all passed as plain query strings — no `Idempotency-Key` on entries fetch (it's read-only — OK), but the future `walletApi.requestPayout` (used in SettlementOverview) is a mutation **without** an Idempotency-Key. | `SettlementOverview.tsx:178-179` (`walletApi.requestPayout(storeId, amount)`). | Idempotency-Key on payout request — this is the canonical money-touching call. | **HIGH** |
| 8. Missing | **P1** | No CSV / Excel export of the entries table. The Exports page exists separately; from Wallet there's no quick "export the rows I'm looking at". | n/a (gap). | "Export filtered entries" button. | low |

---

## SettlementOverview.tsx (454 LOC)

| Axis | Severity | Finding | Evidence | Suggested fix | Money risk |
|---|---|---|---|---|---|
| 1. Bugs | **P0** | **Payout request has zero idempotency protection.** Double-click on the Confirm button posts two payout requests; only `requesting` state on a single render guards it. If the network round-trip exceeds the re-render cycle (very common on mobile), the same amount can be posted twice → duplicate payout requests → admin team has to manually reconcile. | `SettlementOverview.tsx:177-189,346`. | Idempotency-Key on the request + `disabled={requesting \|\| !requestAmount}` already exists but should also disable on click-then-wait via a ref. | **HIGH** (the most expensive money path on the page) |
| 1. Bugs | **P1** | Payout amount validation rejects `Number(requestAmount) > Number(availableBalance)` (`SettlementOverview.tsx:173-176`) — good — but **does not floor-round** to 2 decimal places. A user pasting `"100.999"` from a calculator submits 100.999 SAR; server probably rounds, creating a 0.001 SAR drift visible in the audit log. | `SettlementOverview.tsx:166-176`. | `Math.round(Number(requestAmount) * 100) / 100`. | low |
| 1. Bugs | **P1** | The amount input `<input type="number" step="0.01">` allows scientific notation (`1e10`) on some browsers; `Number("1e10")` is finite, so the validation `Number.isFinite(amount) && amount > 0` passes. | `SettlementOverview.tsx:331-336,169`. | Add `Number(requestAmount) > 1e7` as an upper bound; sanitize the input. | medium |
| 1. Bugs | **P2** | The success path `walletApi.payouts(storeId)` is awaited but `setPayouts(updated as ...)` runs without checking if the modal is still open or if `storeId` changed. | `SettlementOverview.tsx:180-182`. | AbortController. | none |
| 2. Loading/empty/error | info | 6 skeleton cards on loading. Error renders retry. Eligibility blockers listed as a bulleted reasons panel — clear UX. | `SettlementOverview.tsx:113-125,308-320`. | None. | none |
| 3. RTL | info | `<ArrowLeft>` icon used for "back" — but page is RTL so visually "back" goes ➝ the wrong way. ArrowRight would be more idiomatic in RTL. | `SettlementOverview.tsx:133,198`. | Use `ArrowRight` in RTL contexts. (Same issue in SettlementDetail.) | none |
| 5. Brand | info | All cards `bg-emerald-50/amber-50/red-50/neutral-100` semantic. No indigo creep. | `SettlementOverview.tsx:225-305`. | None. | none |
| 7. Integrations | **P1** | The payout modal is a **plain `<div className="fixed inset-0 ...">`** — not a `<Dialog>` from the UI library. Means no focus trap, no Escape-to-close, no aria-modal. | `SettlementOverview.tsx:322-352`. | Migrate to `<Dialog>` (already imported in other files). | none |
| 8. Missing | **P1** | No "cancel payout request" button on rows that are still in `requested` status — once posted the merchant has no UI recovery, must contact support. | `SettlementOverview.tsx:368-388` (table renders status badge only). | Add cancel action gated on `status === 'requested'`. | medium |

---

## SettlementDetail.tsx (331 LOC)

| Axis | Severity | Finding | Evidence | Suggested fix | Money risk |
|---|---|---|---|---|---|
| 1. Bugs | **P1** | **Header gross-amount fallback math is wrong.** When `detail.grossAmount` is null, the code falls back to `totalGateway + totalPlatform + (detail.merchantPayable ?? 0)` — but that equals (fees + net), NOT (orders total). The orders total = net + fees + shipping − discount + reserve. A null `grossAmount` therefore shows a number that omits shipping/discount/reserve. | `SettlementDetail.tsx:170` and the formula derivation in `transactions.reduce`. | Drop the fallback — show `—` if `grossAmount` is null, OR compute it as `transactions.reduce((s, tx) => s + (tx.amount ?? 0), 0)`. | **HIGH** (merchant sees a smaller gross than reality) |
| 1. Bugs | **P1** | `totalGateway`/`totalPlatform` sum `tx.gatewayFees`/`tx.platformFees` **even when** `detail.gatewayFees`/`detail.platformFees` are present and authoritative; then the summary cell prefers `detail.gatewayFees ?? totalGateway`. So the "Total Fees" cell (line 186) = totalGateway + totalPlatform from the per-row sum, while the summary cell uses `detail.gatewayFees ?? totalGateway`. **Two different totals can show on the same page** if backend rounding differs between batch and per-row aggregates. | `SettlementDetail.tsx:133-135,170-186`. | Use one source of truth: `detail.gatewayFees + detail.platformFees` when both present; row sum only as fallback. | **HIGH** (merchant sees inconsistent fees) |
| 1. Bugs | **P2** | Timeline only handles 3 statuses (`pending`, `processing`, `completed` in `STATUS_TIMELINE_INDEX`); `cancelled` falls through to "Cancelled" banner. But `processing` is the only mid-state — there's no representation for `transferPending`, `proofUploaded`, etc. listed in `TIMELINE_STEPS`. | `SettlementDetail.tsx:67-81`. | Either expand `STATUS_TIMELINE_INDEX` or remove the dead intermediate steps. | low |
| 2. Loading/empty/error | info | Skeleton + error states present; empty transactions shows "no transactions" row. | `SettlementDetail.tsx:101-129,272-277`. | None. | none |
| 5. Brand | info | Badge variants only; no raw colors. | `SettlementDetail.tsx:46-58`. | None. | none |
| 7. Integrations | info | Read-only page; no mutations. | n/a. | None. | none |
| 8. Missing | **P1** | No "download PDF" / "export to Excel" for the settlement — required for monthly accounting. The Exports page handles full-store exports, not a single settlement. | n/a (gap). | Per-settlement export endpoint. | low |

---

## Summary — top findings across this scope

Money-risk findings first (per directive):

1. **🔴 SettlementOverview.tsx — payout request without Idempotency-Key.** Double-click posts duplicate payouts; the most expensive money path on the page has no client-side dedup beyond a single render flag. `SettlementOverview.tsx:177-189`. → P0, **HIGH** money risk.
2. **🔴 Shipping.tsx — RatesTab has no edit/delete buttons on existing rates.** A misconfigured rate (`baseRate: 50` instead of `5`) cannot be fixed from the UI and overcharges every customer until the entire zone is rebuilt. `Shipping.tsx:316-429`. → P0, **HIGH** money risk.
3. **🔴 SettlementDetail.tsx — two different fee totals can render on the same page** (batch-level `detail.gatewayFees` vs per-row `transactions.reduce`) AND the gross-amount fallback formula is mathematically wrong. `SettlementDetail.tsx:133-135,170`. → P1, **HIGH** money risk.
4. **🔴 Wallet.tsx — "You will receive" hero card lacks the negative-balance guard.** A `< 0` net balance renders in the positive brand color, misleading the merchant about owed money. `Wallet.tsx:171-182`. → P0, **HIGH** money risk.
5. **🔴 Cross-cutting — zero `Idempotency-Key` headers across the entire merchant-dashboard API layer.** Wallet payouts, order status mutations, shipment label creation, coupon creation are all double-submission-vulnerable. `apps/merchant-dashboard/src/lib/api.ts:104-252`. → P1, **HIGH** money risk (touches Wallet + Shipping + Orders status transitions that cascade into wallet entries).

Non-money-risk top items:

- Orders.tsx `changeStatus` lacks idempotency + race protection — see #5 above.
- Coupons/Promotions `datetime-local` is stored as naive — Riyadh timezone drift on activation windows (P1).
- Customers.tsx hides sensitive phone via `<PermissionGate>` returning null instead of a placeholder — looks like a broken cell.
- Shipping.tsx uses `window.prompt`/`window.confirm` for return-reason and cancel — deprecated on mobile Safari.
- SettlementOverview.tsx payout modal is a plain `<div>`, not `<Dialog>` — no focus trap, no Esc-to-close.
