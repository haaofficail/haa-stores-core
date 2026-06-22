# Merchant Dashboard — Part 4 Audit: Storefront-Mgmt + Marketplace pages

> Read-only audit on branch `chore/merchant-dashboard-per-page-audit`
> (main HEAD `2ded302d`). Severity legend: **P0** = breaks, data risk, or
> guard violation · **P1** = visible UX/integration gap · **P2** = polish ·
> **info** = noted but acceptable.
>
> Scope: 9 pages — Policies, ThemeEditor (+ SectionEditors), ThemeStore,
> Marketplaces (+ Detail, Guide, Listings), SyncLogs.

---

## Theme-boundary verdict (DECISION-OS-009)

**Clean.** All theme imports in this scope use the allowed `/server`
sub-paths only:

- `apps/merchant-dashboard/src/pages/ThemeStore.tsx:6` — `@haa/theme-system/server` ✓
- `apps/merchant-dashboard/src/pages/ThemeEditor.tsx:5` — `@haa/theme-system/server` ✓
- `apps/merchant-dashboard/src/pages/ThemeEditor.tsx:25` — `@haa/storefront-themes/server` ✓

No direct imports of `@haa/theme-engine`, `@haa/theme-web`,
`@haa/storefront-themes` (bare), or `@haa/theme-system` (bare) anywhere
in this scope.

---

## Policies.tsx (502 lines)

| Axis | Severity | Finding | Evidence | Suggested fix |
| --- | --- | --- | --- | --- |
| Bugs | P1 | `openEdit` catches the API error but then sets the editor open with empty content — the user thinks the API succeeded but with no body | `Policies.tsx:78-90` | Show a non-toast inline error in the modal, or refuse to open if the GET fails |
| Loading | info | Skeleton + retry button for fetch-error are both present | `Policies.tsx:168-189` | — |
| Empty | P2 | "noContent" italic line is the only empty signal per card; no CTA inside the empty-state to add content beyond Edit | `Policies.tsx:235` | Add a primary "ابدأ بإنشاء السياسة" button when content is empty |
| Error | info | `fetchError` block + per-operation toast | `Policies.tsx:180-189`, `:128`, `:142` | — |
| RTL | info | All directional uses logical (`me-1`, `me-2`, `mt-`, etc.); no hardcoded `left`/`right` | grep clean | — |
| A11y | P1 | Modal has no `role="dialog"` or `aria-modal` / `aria-labelledby`. `closeEdit` is wired only to the Cancel button — no Escape key handler | `Policies.tsx:264-292` | Use the project's `Dialog` component (used elsewhere) or add aria attributes + escape handler |
| A11y | P1 | The `<textarea>` for policy content has no `id` matching its `<Label>` — screen reader cannot associate them | `Policies.tsx:273-279` | Add `id="policy-content"` and `htmlFor` on the Label |
| A11y | P2 | Generator modal close button is `<Button>` with `<X/>` icon but `aria-label` is missing | `Policies.tsx:299-301` | Add `aria-label="إغلاق"` |
| Brand | info | Per-type icon colors (primary/amber/green/red/purple) are semantic per policy type, not chrome — acceptable | `Policies.tsx:16-22` | — |
| Performance | P2 | `loadPolicies` re-fetches the whole list after every publish/unpublish/save; pagination not needed (5 policies max) but list refresh could be optimistic | `Policies.tsx:125-128` | Switch to optimistic local update + toast — saves a roundtrip |
| Integrations | P1 | The "generate policies" flow has zero retry on `policiesApi.generatePreview` failure; user must re-fill the entire 14-field form | `Policies.tsx:132-145` | Keep the form in state on error; show inline error above submit button |
| Integrations | P2 | `applyGenerated` passes `confirmation: true` from the client — a UI-only confirmation. Server-side this should still validate. Assumed OK if API double-checks. | `Policies.tsx:151-154` | Verify in `apps/api/src/routes/policies` that the server treats `confirmation` as advisory only |
| Missing | P1 | No preview of the *current* published policy before edit — merchant cannot see what customers see today | n/a | Add a "معاينة" tab/button that opens the storefront's public policy URL in a new tab |
| Missing | P2 | No "آخر تحديث" (last-updated) timestamp on each card | n/a | Show `policy.updatedAt` |

---

## ThemeEditor.tsx (1378 lines)

| Axis | Severity | Finding | Evidence | Suggested fix |
| --- | --- | --- | --- | --- |
| Bugs | P1 | 20 useState/useEffect/useCallback hooks in one file; the component is a state monolith that's a known re-render cliff. Save-to-history (`history.length - index` math at `:522`) is brittle if `history` mutates between push and rollback | `ThemeEditor.tsx` overall, `:522` | Extract `useThemeHistory()` and `useThemeConfig()` hooks; lock history mutation via reducer |
| Bugs | P2 | Catch on `settingsApi.get` swallows the slug-fetch error silently with a generic toast — user has no actionable signal | `:343` | Distinguish slug-missing from network-error; degrade the live preview gracefully |
| Loading | info | `loading` state + skeleton + toast for each of 4 parallel fetches (categories / products / theme / history) | `:286`, `:321-343` | — |
| Loading | P2 | The 4 fetches run in parallel without `Promise.all` orchestration → the page is "ready" before all 4 settle. UX races (preview rendering) are possible | `:321`, `:326`, `:331-338`, `:343` | Wrap in `Promise.all` and only `setLoading(false)` after all settle |
| Empty | P2 | No empty state when the merchant has no products + no categories: the editor still renders but Banner "linkType: product" dropdown is empty | `theme-editor/SectionEditors.tsx:74-75` | Show a hint above the dropdown when the source list is empty |
| Error | info | Error toasts on each API failure | various | — |
| Error | P1 | `validateThemeConfig` result is shown as a `.slice(0, 3).join('، ')` toast — for any config with >3 errors the user only sees the first 3 | `:443`, `:502` | Show full validation list in a dismissible inline panel, not a toast |
| RTL | info | Logical-direction CSS throughout; `me-`, `ms-`, `text-end` used | grep clean | — |
| RTL | P2 | The color-picker `<HexColorInput>` has `className="... text-end"` — but the hex value is LTR by definition. Acceptable but worth noting | `:195` | Force `dir="ltr"` on the input to avoid `#abc123` rendering visually mirrored in some browsers |
| A11y | P1 | Color-picker swatch button (`:158-162`) has `aria-label={label}` but no `aria-haspopup` or `aria-expanded` — the popover state is invisible to AT | `:158-162` | Add `aria-haspopup="dialog"` + `aria-expanded={open}` if the Popover exposes that |
| A11y | P2 | The 12 color-group rows in `getColorGroups` produce a grid of swatch `<button>`s with no group `<fieldset>` / `<legend>` — screen reader cannot announce "أزرق" group | search `:200`-onwards | Wrap each group's swatches in `<fieldset><legend>...</legend>` |
| Brand | info | The `getColorGroups` palette includes `#5c9cd5` (Haa brand) in the "أزرق" group — discoverable as a defaults option | `:36-37` | — |
| Performance | P0 | `ThemeEditor.tsx` is **1378 lines**, the largest page file. Initial bundle hit on first nav into `/theme`. Not lazy-routed below the route boundary | `App.tsx` (route loads via `<Lazy>`) + `ThemeEditor.tsx` size | Code-split the SectionEditors (already a separate file but still imported eagerly at `:24`) and the COLOR_GROUPS palette (~120 lines of static data) into a separate chunk |
| Performance | P1 | On every state change the entire editor re-renders. The `homepage.sections` array is reconstructed each `updateConfig` (`updateSection` returns a new array) — every section card re-renders unnecessarily | `theme-editor/SectionEditors.tsx:21-29` | Memoize each section card; key on `section.id`; consider `useReducer` for the config tree |
| Performance | P2 | `categoriesApi.list(storeId)` + `productsApi.list(storeId, {limit: 100})` fetched on every mount, never cached | `:321`, `:326` | Move behind react-query/SWR (already used elsewhere in the app?) or cache locally |
| Integrations | P1 | Banner image-upload flow has no client-side max-size check separate from `validateImageFile` (the latter validates content but not size hint to API). 5MB+ images can hit network before fail | `theme-editor/SectionEditors.tsx:46`, `:59` | Add explicit `file.size` guard before upload starts |
| Integrations | P1 | `updateTheme(storeId, config)` — no retry on transient 5xx; user must re-trigger save manually. For a 1378-line config payload this is fragile on flaky networks | `:456-462` | Add a 1× retry with backoff for 5xx; on persistent failure preserve `isDirty=true` |
| Missing | P1 | No "preview before save" — the editor previews live (good) but the merchant cannot compare against the currently-published config without exporting/importing JSON | `:491-508` | Add a "معاينة المنشور" toggle that re-renders with the saved config |
| Missing | P2 | "Discard changes" button missing when `isDirty=true` — merchant can save or close but not revert | `:606-635` | Add an Undo-all (rollback to last saved snapshot) button next to Save |

---

## theme-editor/SectionEditors.tsx (271 lines)

| Axis | Severity | Finding | Evidence | Suggested fix |
| --- | --- | --- | --- | --- |
| Bugs | P1 | `linkValue` input for `linkType: 'custom'` is a plain `<Input>` with no URL validation — accepts anything. The storefront will then try to `<a href={anything}>` it (potential XSS if storefront isn't escaping) | `SectionEditors.tsx:76` | Validate `https?://` on blur; show inline error |
| Bugs | P1 | `BrandsEditor` `linkUrl` field same issue | `:242` | Same fix |
| Bugs | P2 | `BannerEditor` "X" close button for the uploaded image uses `right-0.5` (physical) not `end-0.5` (logical) — flips wrong in LTR | `:40`, `:53` | Use `end-0.5` |
| Loading | info | Per-upload `Loader2` spinner + disabled state on the input while uploading | `:43-46`, `:56-59` | — |
| Empty | info | "إذا لم تختر منتجات، لن يظهر القسم اليدوي في المتجر" warning for the manual product-source state | `:127` | — |
| RTL | P2 | A few absolute-position uses `right-0.5` instead of `end-0.5` on the image-removal X buttons (Banner + ImageText + Brands) | `:40`, `:53`, `:207` (similar pattern) | Replace `right-0.5` → `end-0.5` for logical RTL |
| A11y | P1 | The image-upload `<label>` wraps a hidden `<input type="file">` but the visible label has no `htmlFor` / no associated `aria-describedby` for the size hint ("1920×600 بكسل") | `:37`, `:50` | Bind the size hint via `aria-describedby` and a `<span id>` |
| A11y | P2 | "X" image-removal buttons are `<button>` with text "X" only — should be `<button aria-label="حذف الصورة">` with the X as visual decoration | `:40`, `:53` | Add `aria-label`; replace text "X" with the `<X/>` lucide icon for parity |
| Brand | info | All chrome buttons use `bg-primary-500` / `border-primary-500` — clean | `:70`, `:104`, `:183` | — |
| Performance | P2 | The product picker (`:115-126`) is an unvirtualized `max-h-44 overflow-y-auto` list — fine for ~100 products (the limit), but unbounded for shops with thousands | `:115-126` | Note in code; add virtualization when limit raises |
| Integrations | info | `uploadFile` is shared via prop — no provider-specific logic here | n/a | — |
| Missing | P1 | No drag-and-drop image upload; only file-picker | n/a | Wire onDrop / onDragOver on the upload label |
| Missing | P2 | No "image alt text" field on Banner — accessibility gap for storefront customers | `:31-87` (BannerEditor settings) | Add `settings.altText` input |

---

## ThemeStore.tsx (157 lines)

| Axis | Severity | Finding | Evidence | Suggested fix |
| --- | --- | --- | --- | --- |
| Bugs | info | Active theme persisted via `themeKey || preset || 'minimal'` fallback chain | `:91` | — |
| Loading | info | Skeleton + 4-card grid | `:107-115` | — |
| Empty | P1 | If `STORE_THEMES` is empty (no manifests at all, e.g. theme-system regression), the page renders empty headers + nothing | `:118-155` | Render "لا توجد ثيمات متاحة" empty state when length === 0 |
| Error | P1 | `settingsApi.getTheme` catch is silently swallowed (`.catch(() => {})`) — if the GET fails, the user sees "minimal" as active even if it isn't | `:92` | Show a toast or inline error; keep `loading=true` and offer retry |
| RTL | info | `ms-2` / `me-1` / `end-2` used | clean | — |
| A11y | P1 | Theme card has no semantic role; clicking apply is keyboard-accessible (it's a `<Button>`), but the whole card has hover styles suggesting clickability without making the card itself activatable | `:22-33` | Either (a) make the card a `<button>`/`<a>` that delegates to `onApply`, or (b) remove the hover affordance from the card chrome |
| A11y | P2 | Active-theme `Sparkles` icon is "featured" indicator — no `aria-label` or `<span class="sr-only">مميز</span>` | `:41` | Add SR text |
| Brand | info | "نشط" badge uses `bg-primary-500` — chrome consistent | `:27-30` | — |
| Performance | info | `STORE_THEMES` computed at module scope; not recomputed per render | `:16-18` | — |
| Performance | P2 | Both featured and "all" grids render the same theme cards twice — `featured` is a subset, so the featured card is rendered once in featured + once in all | `:133-153` | Acceptable for ~10 themes; if catalogue grows, dedupe or replace "all" with "non-featured" |
| Integrations | P1 | `handleApply` POSTs `{ ...theme.defaultConfig, preset: theme.themeKey, themeKey: theme.themeKey }` — sending both `preset` and `themeKey` is intentional for legacy compat per comment in source, but no rollback if the update fails | `:96-104` | On error, revert `activeThemeId` to its previous value |
| Missing | P1 | No "preview before apply" — clicking "تطبيق" is destructive (writes to settings) with only a toast confirm | `:96-104` | Add a confirm dialog ("سيتم تغيير ثيم متجرك. متابعة؟") or a 30-second undo toast |
| Missing | P2 | No filter/search across themes (e.g. by tag, by free/paid, by status) | n/a | Add filter chips |

---

## Marketplaces.tsx (444 lines)

| Axis | Severity | Finding | Evidence | Suggested fix |
| --- | --- | --- | --- | --- |
| Bugs | P1 | `data?.providers?.reduce(... totalListings)` is computed unconditionally even when `data` is null — works because of optional chaining but is brittle if `providers` is sometimes a non-array | `Marketplaces.tsx:173` | Add explicit `Array.isArray` guard |
| Bugs | P2 | `formatRelativeTime` returns "الآن" for negative diffs (clock skew) but no upper-bound guard ("منذ 365 يوم" forever) | `:32-43` | Cap at "منذ X شهر" / "منذ X سنة" for >30/>365 days |
| Loading | info | Per-section skeletons + structured layout placeholder | `:146-167` | — |
| Empty | info | Strong empty state with CTA "ابدأ بربط أول سوق" | `:228-245` | — |
| Error | info | Fetch-error block with retry | `:133-144` | — |
| RTL | info | `ms-1`, `ms-1.5`, `me-auto`, `end-2` throughout — logical | clean | — |
| A11y | P1 | Inline disconnect confirmation (نعم/لا inline) has no live region announcement — screen reader users don't know the confirmation appeared | `:326-340` | Wrap the inline confirm in `<div role="alertdialog" aria-live="polite">` or use the Dialog component instead |
| A11y | P2 | Disconnect button has `<Unlink/>` icon only — no visible text, but `aria-label` is missing | `:336-339` | Add `aria-label={t('marketplaces.disconnect', 'قطع الاتصال')}` |
| Brand | info | All vendor gradients (Salla emerald, Zid blue, Noon yellow, Amazon orange) are vendor brands — allow-listed per the brand-fidelity guard | `:19-24` | — |
| Brand | info | "الأسواق المتصلة" KPI uses violet→purple gradient — chrome semantic differentiation for the connected-count KPI | `:178` | — |
| Performance | P2 | `data.syncLogs.slice(0, 6)` for the bottom feed — entire `syncLogs` is in memory; for active shops this could be hundreds | `:397` | Server-paginate the embedded syncLogs (separate endpoint) |
| Integrations | P0 | `handleSyncAll` shows a success toast with `${result.totalFailed} فشل` even when failures > 0 — a partial failure looks like success | `:101-105` | Branch on `result.totalFailed > 0`: show warning toast + offer "عرض السجل" link to `/channels/sync-logs?status=failed` |
| Integrations | P1 | `handleSync` (single provider) catches all errors with a generic "فشلت المزامنة" — no diagnostic for the merchant. Provider error codes (rate-limit, auth-expired, quota) are lost | `:122-131` | Inspect `ApiClientError.code` or `err.message` and route to provider-specific guidance |
| Integrations | P1 | No idempotency on `syncOrders` — double-clicking the Sync button (while `syncingProvider !== code`) could trigger two sequential syncs. Provider-side idempotency is provider-dependent | `:122-131` | Use an idempotency key (e.g. `${storeId}-${code}-${date}`) in the API call |
| Integrations | P2 | No retry on `marketplaceApi.hub` — single-shot fetch; transient network failures send merchant to error state immediately | `:89-92` | Add a 1× retry on network error before showing fetch-error |
| Missing | P1 | No webhook setup / reconnect flow surfaced — if an OAuth token expires (Salla/Zid), the merchant sees "متصل" until the next sync attempt fails | n/a | Show a "تجديد الاتصال" banner if `provider.tokenExpiresAt < now + 7d` |
| Missing | P2 | No bulk-import status (e.g. "جاري استيراد 1,247 منتج — ⏱ 12 دقيقة متبقية") for first-time large imports | n/a | Surface progress from `SyncProgress` for cold-start syncs too |

---

## MarketplaceDetail.tsx (337 lines)

| Axis | Severity | Finding | Evidence | Suggested fix |
| --- | --- | --- | --- | --- |
| Bugs | P0 | **Secret in clear text in the DOM**: when the user enters Noon `privateKey` or Amazon `clientSecret`, the textarea has `value={creds[field]}` — once entered, the secret is visible to anyone with a screen reader or DevTools. There is no "paste once, hide" or `type="password"` for these long secrets | `:170-173`, `:189-192` | (a) Mask after blur (replace with `••••`); (b) for very long keys, use a write-only state where the field is empty on re-mount and the merchant must re-enter to update |
| Bugs | P1 | `URLSearchParams` reads `?connected=true` / `?error=...` from `window.location.search` and shows a toast — but `window.history.replaceState` rewrites the URL synchronously. If the URL change fires twice (StrictMode), the toast fires twice | `:48-52` | Use a ref flag `hasShownToastRef.current` to gate one-shot |
| Bugs | P1 | `loadInfo` calls 3 endpoints in `Promise.all`, but only the first 2 are awaited (`.then`). The 2 nested `marketplaceApi.getInfo` / `listListings` calls fire after — they are not awaited and don't gate the spinner | `:54-70` | Include both in the Promise.all chain so `loading` reflects actual completeness |
| Loading | P2 | Loading state uses raw `animate-pulse` divs instead of the `<Skeleton>` component used elsewhere | `:126-131` | Replace with `<Skeleton>` for consistency |
| Empty | info | "لا توجد منتجات مسوقة بعد" + hint | `:299-304` | — |
| Error | P1 | `marketplaceApi.connect` catch falls back to generic toast; merchant has no path to view validation errors (e.g. "Invalid AWS access key") | `:81`, `:98` | Show `err.message` or `err.code` mapping inline above the form |
| RTL | info | Logical spacing throughout | clean | — |
| A11y | P1 | Tabs (`info` / `listings`) are `<button>` elements with no `role="tab"`, no `aria-selected`, no `tabIndex` management. AT users can't navigate the tab list | `:241-245` | Use the project's `Tabs` component (used in ThemeEditor) instead of raw buttons |
| A11y | P2 | OAuth-redirect message shows toast only — no inline "اتصلت بنجاح" persistent indicator | `:50` | Add a persistent green banner for 5s |
| Brand | info | Provider gradients allow-listed (Salla/Zid/Noon/Amazon vendor colors) | `:17-22` | — |
| Performance | P2 | Three calls (`list`, `getSales`, `getInfo`, `listListings`) per page load — 4× roundtrips when 1 aggregated endpoint would do | `:57-70` | If feasible, expose a `/marketplace/detail/:provider` aggregator endpoint |
| Integrations | P1 | No "test connection" button before saving credentials. Merchant enters AWS keys, clicks "Connect", the actual auth happens server-side; if it fails the merchant cycles between "enter keys" → "got error" → "enter keys" | `:90-100` | Add a `marketplaceApi.testCredentials(storeId, provider, creds)` round-trip before persisting |
| Integrations | P1 | After successful OAuth (`?connected=true`), the page does NOT re-fetch — only the toast fires. The merchant has to refresh manually to see the connected state | `:48-52` | After the toast, call `loadInfo()` |
| Missing | P1 | Listings have a delete button but no edit (price/quantity change must round-trip through Products page). Merchant cannot quickly fix a misposted SKU price | `:322-325` | Add an inline edit for `price` + `quantity` |
| Missing | P2 | No "last sync" timestamp on the detail header (it's on the cards in `/channels` list but not here) | `:135-152` | Add `آخر مزامنة: <relative>` next to the connected badge |

---

## MarketplaceGuide.tsx (160 lines)

| Axis | Severity | Finding | Evidence | Suggested fix |
| --- | --- | --- | --- | --- |
| Bugs | info | Static-only page; no data fetch | overall | — |
| Loading | info | No loading state needed | — | — |
| Empty | info | N/A | — | — |
| Error | info | No error path | — | — |
| RTL | info | `ms-1` / `me-1` used | clean | — |
| A11y | P1 | Platform-tabs are `<button>` elements without `role="tablist"` / `role="tab"` / `aria-selected`. The "selected" state is purely visual | `:79-95` | Use `Tabs` component or add ARIA attributes |
| A11y | P2 | The step list (`current.steps.map`) uses both a numbered circle AND a numbered badge — redundant for sighted users, and SR will say "1 1" | `:115-127` | Hide the second number from SR (`aria-hidden="true"` on the redundant badge) |
| Brand | info | Vendor-color tabs are allow-listed | `:11-49` | — |
| Performance | info | Static — no concerns | — | — |
| Integrations | P1 | "نظرة عامة" descriptions hard-coded inline in the component as Arabic strings (not in `t()`) — cannot be translated and cannot be updated by content team without a code change | `:138-143` | Move to `t()` keys (e.g. `marketplaceGuide.salla.overview`) |
| Missing | P1 | No deep-link to provider-specific documentation (Salla docs, Zid docs, Amazon SP-API docs) — merchant has to Google | n/a | Add an "وثائق المنصة" external link per provider |
| Missing | P2 | No troubleshooting section per provider (common errors: "token expired", "rate limited", "marketplace not found") | n/a | Add a "أخطاء شائعة" accordion per provider |

---

## MarketplaceListings.tsx (153 lines)

| Axis | Severity | Finding | Evidence | Suggested fix |
| --- | --- | --- | --- | --- |
| Bugs | P1 | `handleRemove` does optimistic removal but if the API fails it re-inserts at index 0 — order is lost (the deleted item may have been at index 47) | `MarketplaceListings.tsx:46-58` | Store the original index alongside the row, restore at that index on failure |
| Loading | P2 | Loading uses 3 `<div class="h-12 bg-neutral-100 rounded-xl">` instead of `<Skeleton>` | `:83-86` | Use `<Skeleton>` for consistency |
| Empty | info | Empty state with icon + message | `:87-91` | — |
| Error | P1 | Failed `loadListings` shows a toast but the table stays empty — the merchant cannot tell "no listings" from "load failed" | `:37`, `:87-91` | Track `fetchError` state and render a retry block when true |
| RTL | info | Logical spacing | clean | — |
| A11y | P1 | "ExternalLink" button is wrapped in an `<a>` AND has the Button inside with `aria-hidden="true" tabIndex={-1}` — the wrapping `<a>` has `aria-label` ✓, but the visual element is the button, not the anchor. This is correct but unusual; verify keyboard focus actually lands on the `<a>` | `:119-125` | Verify by keyboard-only navigation; otherwise simplify to a single `<a class="...">` |
| A11y | info | Delete button has `aria-label` + Loader2 swap during deletion | `:126-128` | — |
| Brand | info | Header gradient uses `primary-500 → primary-700` — chrome consistent | `:68` | — |
| Performance | P0 | The table is non-virtualized; large catalogues (1000+ marketplace listings) will hit DOM render limits — Table component renders all rows synchronously | `:104-133` | Virtualize via `@tanstack/react-virtual` or paginate server-side |
| Integrations | P1 | No filter UI (status, price range, last-synced date) — merchant must use browser Find | n/a | Add filter chips like SyncLogs has |
| Integrations | P2 | No bulk-select / bulk-delete | n/a | Add row checkboxes + bulk action bar |
| Missing | P1 | No "edit price" / "edit quantity" inline — only delete + external link. For a marketing channel this is the #1 missing action | n/a | Add inline edit on `price` + `quantity` cells |
| Missing | P2 | No way to re-publish a deleted listing without going through Products page | n/a | Add "إعادة نشر" action for inactive rows |

---

## SyncLogs.tsx (202 lines)

| Axis | Severity | Finding | Evidence | Suggested fix |
| --- | --- | --- | --- | --- |
| Bugs | info | Pagination correctly preserves `typeFilter`; `loadLogs(1)` resets to page 1 on filter change | `:49-61` | — |
| Loading | info | Skeleton list of 5 | `:113-115` | — |
| Empty | info | "لا توجد سجلات مزامنة" centered | `:116-118` | — |
| Error | P1 | `loadLogs` `.catch(() => toast.error('common.error'))` — same blind generic; merchant gets no signal of what went wrong | `:57` | Show inline error block with retry like Policies / Marketplaces do |
| RTL | info | Logical spacing | clean | — |
| A11y | P1 | The TYPE_FILTERS row of buttons has no `role="group"` or `aria-label` — screen readers don't announce "filter group" | `:94-107` | Wrap in `<div role="group" aria-label="فلتر بحسب النوع">` |
| A11y | P2 | Pagination "previous" / "next" buttons have no `aria-label` distinguishing them on small screens where text truncates | `:178-198` | Add `aria-label="الصفحة السابقة"` / `aria-label="الصفحة التالية"` |
| Brand | info | Provider gradients allow-listed | `:15-20` | — |
| Performance | info | Server-paginated (`limit: 20`) — good | `:52` | — |
| Integrations | P1 | No way to retry a single failed sync log from this page — merchant has to navigate to `/channels/:provider` and re-trigger the sync (without knowing which log failed) | `:120-170` | Add a "إعادة المحاولة" button on `log.status === 'failed'` rows |
| Integrations | P2 | The `formatDate` uses `toLocaleString('ar-SA')` which on some browsers omits the Gregorian year — Hijri calendar may be returned. For commerce ops you usually want Gregorian | `:22-30` | Pass `{ calendar: 'gregory' }` or use `Intl.DateTimeFormat('ar', ...)` explicitly |
| Missing | P1 | No date-range filter (e.g. "show me last 7 days") — only type filter | n/a | Add a date-range picker |
| Missing | P2 | No CSV export of sync logs for ops/finance | n/a | Add "تصدير CSV" button |

---

## Summary — top 5 findings (this scope)

1. **P0 — `MarketplaceDetail.tsx` exposes vendor API secrets in clear-text textareas** (`privateKey`, `clientSecret`, `awsSecretKey`) with `value={creds[field]}`. Any merchant device with DevTools open, an extension, or a screen-recording app captures these in plain text. Mask-on-blur or write-only entry is required.
2. **P0 — `Marketplaces.tsx` partial-failure toast hides errors**: `handleSyncAll` reports success even when `result.totalFailed > 0`. Merchants don't realize a sync left items un-imported.
3. **P0 — `MarketplaceListings.tsx` table is non-virtualized**: shops with thousands of listings will render-stall the dashboard tab. The table file already has no pagination either.
4. **P0 — `ThemeEditor.tsx` is a 1378-line monolith** that loads on every visit to `/theme`. Code-split or break apart; the bundle bloat hits every dashboard cold-start because it isn't tree-shakable past the route boundary.
5. **P1 cluster — every error toast in this scope is a generic "حدث خطأ"**: Policies / ThemeEditor / Marketplaces / Detail / Listings / SyncLogs all swallow `ApiClientError.code` and `.message`. Merchants get no actionable diagnostic. Centralize an error-mapping helper.

**Theme-boundary verdict: CLEAN.** All `@haa/theme-*` imports in this scope use the DECISION-OS-009 carve-out (`/server` sub-paths). No violation.

---

_Audit produced by parallel fork on `chore/merchant-dashboard-per-page-audit`. Read-only._
