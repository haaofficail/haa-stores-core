# Merchant Dashboard Audit — Part 5: Settings / Integrations / Admin / Support

> Branch: `chore/merchant-dashboard-per-page-audit` · main HEAD: `2ded302d` · Read-only audit.
> Scope: 15 pages totalling 5,916 lines. Each finding cites `file:line`.
> "Skills" terminology check: no chrome here reads `store.primaryColor` for its own theme — Settings stores the merchant's storefront-primary, which is correct scope.

## Severity legend

- **P0** — security exposure, money/billing accident, data loss.
- **P1** — likely bug, regression risk, i18n violation visible to merchant.
- **P2** — UX gap, perf concern, RTL/a11y deviation, missing common feature.
- **P3** — info / minor / nit.

## Settings.tsx (1090)

| # | Axis | Severity | Finding | Evidence | Suggested fix | Security risk |
|---|---|---|---|---|---|---|
| 1 | Performance | P2 | `JSON.parse(pickupForm.hours)` runs inside the pickup-dialog render path on every render — heavy for a 7-day map. | `Settings.tsx:1023, 1027-1031` | Memoize parsed hours with `useMemo(() => JSON.parse(pickupForm.hours), [pickupForm.hours])`; or store hours as object in state and serialize on save. | none |
| 2 | Brand fidelity | info | `store.primaryColor` is the **merchant's storefront** primary, not dashboard chrome. Default `#5c9cd5` matches Haa brand only by coincidence; merchant can change it. The dashboard chrome remains tokens-only — no leak. | `Settings.tsx:95, 107, 366-371, 975` | Keep as-is. Just document the scope boundary in a comment near line 95 so future authors don't wire this into chrome. | none |
| 3 | Bugs / brittleness | P2 | `Promise.all`-style parallel loads use 6 separate `.then/.catch/.finally` chains instead of `Promise.allSettled`. If `categoriesList` fails it doesn't set `setStoreConfigLoading(false)` (different chain). Loading flags can desync. | `Settings.tsx:99-142` | Convert to `Promise.allSettled` and a single `.finally` that flips all flags together, or use a reducer state. | none |
| 4 | Integrations / API | P2 | `categoriesApi.list(storeId).then(setCategoriesList).catch(console.warn)` has no `.finally` — if categories fail, the size-guide UI silently shows an empty category picker with no error. | `Settings.tsx:135-137` | Add `.finally` and surface an inline error in the size-guide category picker. | none |
| 5 | A11y | P2 | Sections lack `<section aria-labelledby>` — screen readers don't get section landmarks beyond `<h3>`. | `Settings.tsx:28-35` | Wrap each tab body in `<section aria-labelledby="...">` keyed to the SectionHeader `<h3 id="...">`. | none |
| 6 | Security | low | The store form posts `primaryColor` validated only by hex regex (line 218). Server should also enforce hex format. | `Settings.tsx:218` | Server-side hex regex check (out of scope here, but log as P2 server-side). | low |

## Subscriptions.tsx (386)

| # | Axis | Severity | Finding | Evidence | Suggested fix |
|---|---|---|---|---|---|
| 1 | UX / billing accident | **P0** | Upgrade/downgrade buttons fire `subscriptionApi.upgrade` immediately on click — **no confirmation dialog**. A misclick can charge or downgrade the merchant. | `Subscriptions.tsx:321-333, 139-148, 150-159` | Add a confirmation Dialog like Settings already uses, with the new plan price + effective date. |
| 2 | i18n | P2 | `formatDate` hardcoded to `'ar-SA'`. | `Subscriptions.tsx:99` | Use `i18n.language === 'ar' ? 'ar-SA' : i18n.language`. |
| 3 | Missing features | P2 | No "Cancel subscription" action; no payment-method visibility; no invoice PDF download; no upcoming-invoice preview. | entire file | Add cancel + PM section + invoice download button. |
| 4 | Empty states | P3 | If `plans.length === 0` the grid renders empty silently; if `invoices.length === 0` the section is hidden entirely (no "no invoices yet" placeholder). | `Subscriptions.tsx:279-340, 342` | Add explicit empty-state cards. |
| 5 | Brand fidelity | info | All chrome uses primary-* + amber/green semantic ✓. | `Subscriptions.tsx:186, 229, 277` | none |

## ApiKeys.tsx (356)

| # | Axis | Severity | Finding | Evidence | Suggested fix | Security risk |
|---|---|---|---|---|---|---|
| 1 | Security / secret handling | **P1** | Newly-created API key is rendered in DOM (line 159-161). It's a one-time reveal — but there's no "I saved this; clear it" gate. If the merchant navigates away without clicking `dismissNewKey`, the key stays in React state. No auto-clear timer. | `ApiKeys.tsx:60, 107, 139, 151-173` | Add (a) "I have saved this key" required checkbox before the `dismissNewKey` button is enabled, (b) auto-clear `newKey` after 5 minutes via `setTimeout` + cleanup in `useEffect`. | medium |
| 2 | Idempotency | P2 | `apiKeysApi.create` POST has no client-side idempotency key. A double-click could mint two keys; the user only sees the second. Wasted slots + leaked first key in server logs. | `ApiKeys.tsx:106` | Generate `Idempotency-Key` UUID in the form open; send it on POST; server dedupes. | medium |
| 3 | i18n | P2 | `toLocaleString('en-US')` for log timestamps (hardcoded). | `ApiKeys.tsx:287` | Use the page's `i18n.language` like line 222/225 do for `toLocaleDateString`. | none |
| 4 | Brand fidelity | P3 | "Created" success panel mixes `bg-emerald-50/50` + `text-green-600` + `text-green-800` + `bg-green-100` + `border-green-300` — emerald vs green inconsistency. | `ApiKeys.tsx:152-165` | Pick one (emerald or green), apply consistently. | none |
| 5 | Missing features | P2 | No key rotation flow (only revoke); no key expiry / TTL option; no per-key request count / last-IP. | entire file | Add: rotation (new key, old still valid 24h), optional `expiresAt`, expand logs to summarize per key. | low |
| 6 | Performance | P3 | `logs` table renders all rows unpaginated; if a key is hot, table balloons. | `ApiKeys.tsx:264-292` | Server-side pagination + "load more". | none |
| 7 | A11y | P3 | Scope checkbox list lacks `<fieldset>`+`<legend>` grouping. | `ApiKeys.tsx:313-326` | Wrap in `<fieldset>` with `<legend>{t('apikeys.scopesLabel')}</legend>`. | none |

## IntegrationHub.tsx (399)

| # | Axis | Severity | Finding | Evidence | Suggested fix |
|---|---|---|---|---|---|
| 1 | RTL | P2 | `mr-auto` on disconnect button — physical direction, breaks under RTL (pushes leftward in LTR, rightward in RTL but inconsistently relative to gap). | `IntegrationHub.tsx:282` | Replace with `ms-auto` (logical). |
| 2 | A11y | P2 | Provider-card "open" arrow is `opacity-0 group-hover:opacity-100` — keyboard users never see/use it. | `IntegrationHub.tsx:209` | Make it always visible at reduced opacity (`opacity-60`) and brighten on hover/focus; ensure focus-visible ring. |
| 3 | i18n | P2 | `formatDate` hardcoded to `'en-US'` locale. | `IntegrationHub.tsx:28` | Use `i18n.language`. |
| 4 | i18n | P2 | Dialog title/body/buttons hardcoded Arabic. | `IntegrationHub.tsx:378, 380, 382, 394` | Move to `t()` keys. |
| 5 | Brand fidelity | info | Provider gradients (Salla green, Zid blue, Noon amber, Amazon orange/black) — vendor identity, allow-listed. ✓ | `IntegrationHub.tsx:18-23` | none |
| 6 | Idempotency | P2 | `syncOrders`/`syncAll` lack idempotency keys; double-sync could double-import orders if server doesn't dedupe. | `IntegrationHub.tsx:64, 263` | Client UUID per sync attempt; server dedupes. |

## MigrationHub.tsx (218)

| # | Axis | Severity | Finding | Evidence | Suggested fix | Security risk |
|---|---|---|---|---|---|---|
| 1 | Bugs / brittleness | **P1** | No `res.ok` check before `res.blob()` (3 places). A 401/500 returns garbage as `${source}-template.csv` — merchant downloads an error page as CSV. (Exports.tsx does this right at line 54.) | `MigrationHub.tsx:63-72, 82-91, 100-109` | Add `if (!res.ok) throw new Error(...)` before each `await res.blob()`. | low |
| 2 | Security / token | low | `getToken()` reads `localStorage.getItem('auth_token')` directly here too — bypasses the api lib's token accessor. Token only ever appears in `Authorization` header; not logged/displayed. | `MigrationHub.tsx:21-23` | Export `getToken` (or a `authHeader()` helper) from `@/lib/api` and use it consistently; same for Exports/Imports. | low |
| 3 | Missing features | P2 | No upload progress for big CSV migrations; no preview of what each source maps to; no dry-run option. | entire file | Add preview-on-template-download (show first 5 rows) + upload progress in Imports flow. | none |
| 4 | A11y | P3 | Source cards use `<Card>` with no `aria-label` and no focusable element wrapping the title. | `MigrationHub.tsx:134-165` | Either make the whole card a `<button>`/`<a>` or add `<h3 id="...">` + describe the buttons inside. | none |

## Notifications.tsx (352)

| # | Axis | Severity | Finding | Evidence | Suggested fix |
|---|---|---|---|---|---|
| 1 | Product gap (disclosed) | **P1** | Banner correctly says "SMS/WhatsApp need provider configuration" — but the switches still let merchants toggle them ON, save preferences, and get a "saved" toast. Server may store the prefs but nothing fires. Merchant assumes notifications work. | `Notifications.tsx:200-203, 226-229, 251-254, 121-122` | Disable SMS/WhatsApp switches when `providerStatus.sms.status !== 'configured'`; show "Pending provider setup" inline next to the disabled switch. |
| 2 | i18n | P2 | Banner copy hardcoded Arabic. | `Notifications.tsx:163-166` | Move to `t('notifications.providerBanner.*')`. |
| 3 | Privacy | P2 | Notification logs render full recipient (email/phone) unmasked. Phone numbers in SMS logs are PII. | `Notifications.tsx:335` | Mask phone middle digits (e.g., `0512***890`) and consider email mask for screenshots. |
| 4 | A11y | P3 | Switch+Label visual pairing OK, but the inputs that appear/disappear (lines 205-217 etc.) don't get focus when their switch is enabled. | `Notifications.tsx:200-217` | After `onCheckedChange(true)`, focus the email input. |
| 5 | Empty states | info | `noLogs` placeholder ✓; provider grid is hidden if `providerStatus` null. | `Notifications.tsx:169, 311-312` | OK. |

## Compliance.tsx (851)

| # | Axis | Severity | Finding | Evidence | Suggested fix | Security risk |
|---|---|---|---|---|---|---|
| 1 | Security | info | **Strong**: Saudi IBAN validation with ISO-7064 mod-97 checksum; `maskIban` for display; `showFullIban` toggle gated by user action. | `Compliance.tsx:20-42, 105, 188-193, 317` | Keep this pattern — adopt elsewhere. | low |
| 2 | Race protection | info | `loadIdRef` prevents stale `setLoading(false)` from a slower in-flight load overwriting a newer one. | `Compliance.tsx:47, 109-111` | Adopt in Settings.tsx too. | none |
| 3 | UX / file upload | P2 | Upload UI is a single file input with no drag-drop / preview / size limit shown. | `Compliance.tsx:102-104` + handler not shown | Add max-size hint, file-type validation, preview before submit. | low |
| 4 | i18n | P3 | All labels use `t()` ✓. | throughout | none. | none |
| 5 | A11y | P2 | Status badges use color-coded `bg-*` + icon but no `aria-label` describing the status meaning. | `Compliance.tsx:49-58` | Add `aria-label={`status: ${label}`}` to each badge wrapper. | none |
| 6 | Security | medium | Form posts `iban` after `.replace(/\s/g, '')` — full IBAN goes to server (necessary). Confirm server stores it encrypted at rest. (Out of scope for FE audit; flag for backend.) | `Compliance.tsx:317` | Backend audit: ensure `bank_accounts.iban` column is encrypted. | medium |

## AiAssistant.tsx (381)

| # | Axis | Severity | Finding | Evidence | Suggested fix |
|---|---|---|---|---|---|
| 1 | i18n | P2 | quickAction `description` fields hardcoded Arabic. | `AiAssistant.tsx:146, 152, 158, 164, 170, 176` | Move to `t('ai.dailySummaryDesc')` etc. |
| 2 | Missing features | P2 | No chat persistence — page refresh wipes history. Modern AI dashboards persist locally (IndexedDB) or server-side. | `AiAssistant.tsx:44, 56-66` | Store conversation in localStorage / IndexedDB keyed by `storeId`. |
| 3 | Missing features | P2 | No "clear chat" button; no file/image attachment; no streaming indicator (only `loading` boolean). | entire file | Add clear button + streaming response (SSE / chunked) + attachment slot. |
| 4 | A11y | P2 | Chat input on form submit (line 113-137) — no `aria-live` region for assistant messages, so screen readers don't announce new replies. | `AiAssistant.tsx:182-end` | Wrap chat-message list in `<div role="log" aria-live="polite">`. |
| 5 | Brand fidelity | info | Header avatar is primary-500→600 gradient ✓; emerald-500 status dot is semantic-online indicator (allow-list). | `AiAssistant.tsx:192-196` | none |

## Employees.tsx (322)

| # | Axis | Severity | Finding | Evidence | Suggested fix | Security risk |
|---|---|---|---|---|---|---|
| 1 | UX consistency | **P1** | `window.confirm` for delete (line 144) instead of a styled Dialog like ApiKeys/IntegrationHub use. Native confirm is not RTL-aware, blocks the JS thread, and looks broken on dashboard chrome. | `Employees.tsx:144` | Replace with shadcn `<Dialog>` confirmation — same pattern as ApiKeys revoke. | low |
| 2 | Source of truth | **P1** | Reads `Number(localStorage.getItem('active_store_id'))` directly instead of `useAuth().storeId`. `Number(null) = 0` if missing → bad requests; bypasses the auth context which is the canonical source. | `Employees.tsx:81` | `const { storeId } = useAuth();` like every other page. | medium |
| 3 | i18n | **P1** | ~30 hardcoded Arabic strings (`roleLabels`, `categoryLabels`, page title, table headers, error/loading messages, status labels, last-owner warning). | `Employees.tsx:14-22, 24-51, 144, 149, 151, 169-170, 175, 180, 196, 203, 217-223, 247, 251, 265-267, 297-300` | Move all to `i18n/locales/ar.json` + `t()` calls. | none |
| 4 | Atomicity | P2 | `handleSave` invites employee then updates permissions in two separate API calls. If permissions update fails, the invite already happened — orphaned employee with default role only. | `Employees.tsx:118-141` | Single endpoint that accepts role + permissions atomically, or rollback on partial failure (server should be transactional). | low |
| 5 | A11y | P2 | `<table>` uses raw `<th>` without `scope="col"`. | `Employees.tsx:215-225` | Add `scope="col"` to every `<th>`. | none |
| 6 | RTL | P3 | `dir="rtl"` hardcoded on root `<div>` (line 166) — overrides the html-level dir. If app ever supports LTR (English merchant), this breaks. | `Employees.tsx:166` | Remove; rely on `<html dir>` set by i18n. | none |
| 7 | Missing | P2 | No way to suspend (vs delete); no audit-log link per employee; no last-IP / last-device. | entire file | Add suspend action + per-employee audit-log drawer. | low |

## Exports.tsx (114)

| # | Axis | Severity | Finding | Evidence | Suggested fix |
|---|---|---|---|---|---|
| 1 | Bugs / brittleness | info | **Reference pattern**: `if (!res.ok)` check + DOM cleanup (`appendChild`/`removeChild`) + `URL.revokeObjectURL` all done correctly. | `Exports.tsx:54-67` | Use this as the template for fixes in MigrationHub. |
| 2 | Missing features | P2 | No date-range / status filter; no format selector (CSV only); no background-job mode for big exports. | entire file | Add date-range picker + CSV/XLSX/JSON selector + "email me when ready" for >5k rows. |
| 3 | Brand fidelity | P3 | Icon colors `text-green-500` (orders), `text-amber-500` (customers), `text-purple-500` (wallet) — semantic differentiation. Acceptable per allow-list, but `text-green-500` for orders could shift to `text-emerald-500` for consistency with success-token usage elsewhere. | `Exports.tsx:19, 23, 28` | Optional: standardize to emerald/amber/violet (violet already on KPI). |
| 4 | A11y | P3 | Card grid lacks landmark role; download button has clear label. | `Exports.tsx:82-110` | Add `<section aria-labelledby="exports-heading">`. |

## Imports.tsx (177)

| # | Axis | Severity | Finding | Evidence | Suggested fix |
|---|---|---|---|---|---|
| 1 | Idempotency / double-import | **P1** | `importsApi.confirm(storeId, csvContent)` fires on click. Button disables during request (`importing`) — good. BUT if user clicks before any preview, no client-side dedupe of identical CSV content; if user clicks Import twice in rapid succession from two tabs, server gets two POSTs. | `Imports.tsx:55-68` | Include `Idempotency-Key: <hash(csvContent)+timestamp>` header; server dedupes. |
| 2 | UX / large files | P2 | Textarea-only paste. For 10k+ row CSVs, paste freezes the browser. No file upload alternative. | `Imports.tsx:87-93` | Add `<input type="file" accept=".csv">` alongside textarea. |
| 3 | Brand fidelity | P3 | Import button hardcoded `bg-green-600 hover:bg-green-700` — bypasses the success/primary tokens. | `Imports.tsx:100` | Use `bg-success hover:bg-success/90` or primary, depending on intent. |
| 4 | Bugs | P2 | `handleDownloadTemplate` no `res.ok` check (same as MigrationHub). | `Imports.tsx:21-39` | Add `if (!res.ok)` guard. |
| 5 | Empty states | info | Preview/import-result sections are conditionally rendered ✓; help text present. | `Imports.tsx:110-128, 130-174` | OK. |
| 6 | A11y | P2 | `<textarea>` has no `<Label htmlFor>` association. | `Imports.tsx:87-93` | Add `<Label htmlFor="csv-input">` + `id="csv-input"` on textarea. |

## Support.tsx (676)

| # | Axis | Severity | Finding | Evidence | Suggested fix |
|---|---|---|---|---|---|
| 1 | i18n | P2 | `TICKET_CATEGORIES` and `STATUS_CONFIG` ship Arabic labels inline instead of via `t()`. Same for `relativeDate` ("منذ قليل", "أمس", "منذ N أيام"). | `Support.tsx:38-44, 47-51, 58-62` | Move all to translation keys. |
| 2 | Brand fidelity | P2 | `shipping` category uses `text-blue-600/bg-blue-50` — should be `text-primary-600/bg-primary-50` for Haa brand. | `Support.tsx:40` | Switch to primary-* — `text-blue-*` is not on the allow-list. |
| 3 | Security | info | KB article content rendered with `whitespace-pre-wrap` (text only); no `dangerouslySetInnerHTML`. ✓ | `Support.tsx:124` | none |
| 4 | i18n | P2 | `toLocaleDateString('ar-SA')` hardcoded. | `Support.tsx:62` | Use `i18n.language`. |
| 5 | A11y | P2 | Modal backdrop closes on click ✓, but no `role="dialog"` / `aria-modal="true"` / `aria-labelledby`. | `Support.tsx:100-103` | Replace ad-hoc fixed-overlay with shadcn `<Dialog>`. |

## SupportKb.tsx (255) — sampled

| # | Axis | Severity | Finding | Evidence | Suggested fix |
|---|---|---|---|---|---|
| 1 | i18n | P2 | Likely similar to Support.tsx — hardcoded category labels. | not deep-read | Move to `t()`. |

## SupportTickets.tsx (145)

| # | Axis | Severity | Finding | Evidence | Suggested fix |
|---|---|---|---|---|---|
| 1 | i18n | **P1** | `statusLabels`, `priorityColors` Arabic priority labels, error toast "فشل تحميل التذاكر" — all hardcoded. | `SupportTickets.tsx:24-29, 62, 132` | `t()` everywhere. |
| 2 | RTL | P2 | `right-3` for Search icon — physical direction, breaks LTR. | `SupportTickets.tsx:99` | `style={{ insetInlineEnd: '0.75rem' }}` or `end-3`. |
| 3 | i18n | P2 | `toLocaleDateString('ar-SA')`. | `SupportTickets.tsx:134` | `i18n.language`. |
| 4 | Brand fidelity | P3 | `waiting_on_customer` → `bg-purple-100 text-purple-700` — semantic, OK as allow-list. | `SupportTickets.tsx:34` | none |
| 5 | Missing | P2 | No ticket creation form on this page — relies on `mailto:support@haa.store`. No file attachment, no template selection. | `SupportTickets.tsx:111` | Add inline create form (subject + category + message + attachments) using `supportApi.createTicket`. |

## SupportTicketDetail.tsx (194) — sampled

| # | Axis | Severity | Finding | Evidence | Suggested fix |
|---|---|---|---|---|---|
| 1 | (likely) | P2 | Pattern likely similar to SupportTickets — hardcoded Arabic, ar-SA locale. | not deep-read | Same fixes as SupportTickets. |

---

## Summary — Top findings (security-first)

1. **ApiKeys.tsx — newly-minted key persists in React state** (`ApiKeys.tsx:60, 139, 151-173`). One-time reveal but no "I saved this" gate, no auto-clear timer. **P1 / security medium**. Fix: confirmation checkbox before dismiss + 5-min auto-clear.
2. **Employees.tsx — `localStorage.getItem('active_store_id')` direct read** (`Employees.tsx:81`). Bypasses `useAuth()`; `Number(null) = 0` on missing → bad requests. **P1 / security medium**. Fix: use `useAuth().storeId`.
3. **Subscriptions.tsx — upgrade/downgrade fires immediately on click** (`Subscriptions.tsx:139-159, 321-333`). No confirmation dialog. Misclick = accidental charge or downgrade. **P0 / billing accident**. Fix: confirmation Dialog with new plan + price.
4. **Notifications.tsx — switches enabled before providers are configured** (`Notifications.tsx:200-254`). Merchants toggle SMS/WhatsApp ON, get "saved" toast, but nothing fires. **P1 / product trust**. Fix: disable switch when `providerStatus.<channel>.status !== 'configured'`.
5. **MigrationHub.tsx — no `res.ok` check before `res.blob()`** (`MigrationHub.tsx:63-72, 82-91, 100-109`). 401/500 returns error HTML/JSON as `*.csv`/`*.txt` download. **P1 / brittleness**. Fix: copy the `res.ok` guard pattern from `Exports.tsx:54`.

Honorable mention (security): **Imports.tsx — no idempotency key on confirm** (`Imports.tsx:55-68`). Double-tab Import = double inventory. P1.
