# Merchant Dashboard — Per-Page Audit · Part 1: Auth + Onboarding

> Scope: 4 pages on `chore/merchant-dashboard-per-page-audit` @ `2ded302d`.
> Read-only audit. No src files were modified. Findings cite `file:line`.
> Allow-list (vendor logos / semantic palettes) honored per
> `tests/merchant-dashboard-brand-fidelity.test.ts`.

Severity legend:
- **P0** — blocks usage or leaks security/financial state. Fix this week.
- **P1** — silently wrong, broken flow, or expensive perf path. Schedule.
- **P2** — polish, edge case, drift from system rules. Bundle into theme work.
- **info** — observation; no action needed unless a related change lands.

---

## `Login.tsx`

| Axis | Sev | Finding | Evidence | Suggested fix |
| --- | --- | --- | --- | --- |
| Bugs | P2 | `if (user) return null;` runs after `useEffect` queues the navigate — first render with a logged-in user paints empty (no loading state). | `Login.tsx:58-64` | Show a skeleton or splash for the one frame, or render `Navigate` directly when user is present. |
| Bugs | P1 | Default error branch surfaces `err.message` (raw server string) to the user via toast — leaks backend wording / PII risk. | `Login.tsx:94` | Replace with a generic `t('common.error')`; log raw err to console for ops. |
| Loading/empty/error | P2 | No countdown / disabled retry UI for `RATE_LIMITED`; only toast. After many failed attempts user keeps clicking. | `Login.tsx:82` | Disable the submit button until a server-provided `Retry-After` window elapses. |
| RTL | info | All padding/positioning uses logical props (`start-*`, `end-*`, `ps-*`, `pe-*`). Email + password forced `dir="ltr"` correctly. | `Login.tsx:180,208,217,225` | None. |
| A11y | P2 | Submit button uses `focus:ring-*` (always-on for mouse). Convert to `focus-visible:` so the ring only appears on keyboard focus. | `Login.tsx:189,217,225,241,246-252` | s/`focus:ring`/`focus-visible:ring`/ across this file. |
| A11y | P2 | `hover:scale-[1.01] active:scale-[0.99]` on submit + signup CTAs not gated on `motion-reduce`. | `Login.tsx:249,261` | Wrap in `motion-safe:` or add a `motion-reduce:scale-100` override. |
| Brand fidelity | info | All gradients/scales use `primary-*`; aurora blobs deliberately mix `emerald-100/20` (very faint) — fine for a hero, not chrome creep. | `Login.tsx:107-114` | None. |
| Performance | P2 | 3 `blur-3xl` blobs render on every paint. `motion-reduce:hidden` covers reduced-motion users but a low-end Android still pays the cost. | `Login.tsx:111-113` | Add `lg:` gate (desktop-only) or use a cheap CSS gradient backdrop. |
| Integrations | info | API errors are mapped to 4 named codes (`RATE_LIMITED`, `INVALID_CREDENTIALS`, `NETWORK_ERROR`, `SERVER_ERROR`) — good. | `Login.tsx:80-95` | None. |
| Missing features | P1 | No 2FA / captcha / lockout UI. Tracked separately in `OPEN_PROBLEMS-005` ("2FA + self-serve password reset"). | repo-wide | Keep tracking under PROBLEM-005; do not bundle here. |
| Missing features | P2 | "تذكّر بريدي" stores plaintext email in `localStorage`. No way to clear besides unchecking — no explicit "forget device" affordance. | `Login.tsx:35-52,72-73` | Add a small "نسي هذا الجهاز" link if `localStorage` carries `haa-remember-email`. |

---

## `ForgotPassword.tsx`

| Axis | Sev | Finding | Evidence | Suggested fix |
| --- | --- | --- | --- | --- |
| Missing features | **P1** | Entire flow is a stub: opens a `mailto:` URL. No actual reset-token endpoint, no email verification step, no UI for the token entry. | `ForgotPassword.tsx:25-35` | Tracked in `OPEN_PROBLEMS-005`. Until then, surface SLA + ticket-id flow instead of `mailto`. |
| Bugs | P2 | `mailto:` is the only path; on devices without a configured mail client the link silently does nothing. No fallback. | `ForgotPassword.tsx:29-35` | Add a "نسخ البريد" button as a `<button>` next to the `mailto` link. |
| Bugs | info | Support email hardcoded `support@haastores.com`. Same address probably belongs in env. | `ForgotPassword.tsx:4` | Move to `import.meta.env.VITE_SUPPORT_EMAIL` with current value as fallback. |
| Loading/empty/error | info | No fetch — no states needed. | n/a | None. |
| RTL | info | Uses `gap-2`, no directional classes. The `ArrowLeft` icon is mirrored via `rotate-180` — intentional for "back". | `ForgotPassword.tsx:46` | None. |
| A11y | P2 | The submit-style `<a>` lacks a `focus-visible` ring (only `transition-all hover:`). Keyboard users see no focus indicator. | `ForgotPassword.tsx:29-35` | Add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2`. |
| A11y | info | `LifeBuoy` icon has `aria-hidden="true"` — good. | `ForgotPassword.tsx:21` | None. |
| Brand fidelity | info | Gradient uses `primary-400 → primary-600` — brand-aligned. | `ForgotPassword.tsx:20,31` | None. |
| Performance | info | Trivial render, no async work. | n/a | None. |
| Integrations | P2 | No analytics / no logging of "forgot password attempted" — ops blind to the volume justifying a real reset flow. | `ForgotPassword.tsx` | Fire a lightweight `/internal/audit-event` POST when the user clicks the mailto link. |

---

## `OnboardingWizard.tsx`

| Axis | Sev | Finding | Evidence | Suggested fix |
| --- | --- | --- | --- | --- |
| Bugs | **P1** | Serial `await productsApi.create(...)` inside a `for` loop on Step 1 → N round-trips, no transaction, no rollback. If item 5 of 10 fails, items 1–4 are live in DB while the wizard says "saving failed". | `OnboardingWizard.tsx:137-148` | Use `Promise.all` *and* add a server-side bulk-create endpoint; or wrap the loop in a backend transaction. |
| Bugs | P1 | `JSON.parse(result.text)` accepts AI output with no schema validation. A malformed array crashes the wizard silently (caught + toast, but user loses prompt context). | `OnboardingWizard.tsx:115-122` | Validate with Zod (existing pattern in `packages/shared`); show validation errors per-field. |
| Bugs | P2 | `selectedProducts` is a `Set<number>` keyed by **array index**. If the AI re-generates with a different order, the wrong rows get saved. | `OnboardingWizard.tsx:66,123,137` | Key by a deterministic hash of `p.name+p.price+p.stockQuantity` or assign a temp id when generated. |
| Bugs | P2 | `setStoreUrl` builds `${origin}/s/${s.slug}` without guarding `s.slug`. If slug is empty/undefined → `https://.../s/`, broken link. | `OnboardingWizard.tsx:84` | `s.slug ? ... : ''` (already guarded — but the conditional renders a clickable link to `${origin}/s/`). Confirm; tighten if needed. |
| Loading/empty/error | info | Skeleton on initial load. Each step has an idle / generating / generated state. Save catches errors → toast. | `OnboardingWizard.tsx:65,156-164,318-339` | None. |
| Loading/empty/error | P2 | No retry button after `settingsApi.get(storeId)` fails on first load. User has to refresh. | `OnboardingWizard.tsx:85-87` | Add an inline "إعادة المحاولة" button. |
| RTL | info | The step indicator uses an explicit `dir="rtl"` wrapper — already fixed in PR #67. | `OnboardingWizard.tsx:186` | None. |
| RTL | P2 | `ArrowLeft` icons used as both back-and-forward (`me-2` on submit means "next"; another `me-2` on back means "back"). Confusing semantics for screen-reader users. | `OnboardingWizard.tsx:289,403,514` | Use `ChevronLeft` / `ChevronRight` from lucide and let direction speak for itself. |
| A11y | P2 | The product list uses `<div onClick>` (no role, no keyboard handler). Cannot select with keyboard / Enter / Space. | `OnboardingWizard.tsx:362-391` | Switch to `<button>` or add `role="checkbox" aria-checked={...} tabIndex={0} onKeyDown` handling Space/Enter. |
| A11y | P2 | `h1` "title" lacks `tracking-tight`. Existing typography guard allow-lists `OnboardingWizard.tsx` for hero scale — informational only. | `OnboardingWizard.tsx:175` | Add `tracking-tight` if visual review confirms it doesn't clash with the wizard hero rhythm. |
| Brand fidelity | P2 | Default store color hardcoded `#5c9cd5` in TWO places (here + `Settings.tsx:95,107,975`). Single-source-of-truth violation; if the brand color ever changes, four sites need updating. | `OnboardingWizard.tsx:60,83` | Export a constant from `packages/tokens` or `@/lib/brand` and import. |
| Brand fidelity | P2 | "Completed" check uses `bg-green-50 text-green-700 border-green-200` — Tailwind defaults rather than the system semantic `success-*`. Same brand mixing risk as the dashboard PR fixed. | `OnboardingWizard.tsx:191-192,432-433,437,449-450,453-454` | Migrate to `success-50/600/200` (or whatever the system semantic tokens are named in `@haa/tokens`). |
| Brand fidelity | P2 | "Complete launch" CTA uses `bg-green-600 hover:bg-green-700` — same green issue plus inconsistent with primary-gradient CTAs elsewhere. | `OnboardingWizard.tsx:516` | Use the system success solid or primary gradient (decision the design council). |
| Performance | P2 | The card list re-renders every selection because `setSelectedProducts(new Set(prev))` allocates a fresh Set. Fine for <50 items; risky if the AI ever returns 100+. | `OnboardingWizard.tsx:365-369` | Memoize row components; or use `useReducer` with a stable identity per row. |
| Integrations | info | API paths via `settingsApi`, `onboardingApi`, `productsApi` — all live in `lib/api`, all use the Caddy-stripped `/s/:storeId/...` style. | `OnboardingWizard.tsx:4` | None. |
| Missing features | P2 | "Skip" on Step 0 doesn't persist `onboarding_done`. User keeps landing back on the wizard on next login. | `OnboardingWizard.tsx:267-281` | Set `localStorage.setItem('onboarding_done', 'true')` (or call the API equivalent) inside the confirm branch. |
| Missing features | P2 | Step 2 (Launch) lists Shipping / Payment / Domain as "setupLater" — these are dashed placeholders with NO link to the corresponding setup page. | `OnboardingWizard.tsx:469-509` | Each placeholder card should `navigate('/shipping')` / `/wallet` / `/settings` so the user can finish setup from the wizard. |

---

## `OnboardingSuccess.tsx`

| Axis | Sev | Finding | Evidence | Suggested fix |
| --- | --- | --- | --- | --- |
| Brand fidelity | **P1** | Confetti palette hardcodes `#6366f1` (indigo-500) and `#8b5cf6` (violet-500). Directly contradicts the brand-fidelity rule (`tests/merchant-dashboard-brand-fidelity.test.ts`). The file is NOT in the test ALLOW_LIST so the guard would currently miss this — the regex only matches Tailwind class names, not raw `#hex`. | `OnboardingSuccess.tsx:13` | Replace `#6366f1` and `#8b5cf6` with Haa primary shades (e.g. `#5c9cd5`, `#bed7ee`). Optional: tighten the guard to also flag hex indigo/violet. |
| Bugs | P2 | `mr-auto` on the row's trailing `ArrowLeft` is **physical**, not logical. Breaks in LTR locales (when added) and is visually misaligned in some viewport sizes. | `OnboardingSuccess.tsx:118` | `ms-auto`. |
| Bugs | P2 | Suggestions list has 3 items: Products → `/products`, "Theme" → `/settings`, Reports → `/reports`. The middle one is **mislabeled** — should be `/theme` or `/theme-store`, not the generic settings page. | `OnboardingSuccess.tsx:78-82` | Change `href: '/settings'` → `/theme` (matches the `Palette` icon). |
| Bugs | P2 | `settingsApi.get(storeId).then(...).catch(...)` — on failure user gets a toast and the page renders with `storeName=''` → "مرحباً بـ متجرك" placeholder. No retry. | `OnboardingSuccess.tsx:57-59` | Pass `storeName` via `navigate('/onboarding/success', { state: { storeName } })` from the wizard; this also avoids the duplicate fetch on a freshly-saved name. |
| Loading/empty/error | info | Skeleton during fetch. Toast on error. No empty state needed. | `OnboardingSuccess.tsx:66-76` | None. |
| RTL | P2 | (Same as bug above — `mr-auto` instead of `ms-auto`). | `OnboardingSuccess.tsx:118` | See above. |
| A11y | **P1** | Confetti: 60 animated divs with no `motion-reduce` opt-out. Triggers motion-sickness for vestibular-impaired users; WCAG 2.3.3. | `OnboardingSuccess.tsx:16-44` | Wrap `{showConfetti && <Confetti />}` in a `prefers-reduced-motion: no-preference` check (e.g. via a `useReducedMotion` hook) and skip entirely otherwise. |
| A11y | P2 | `text-neutral-400` for descriptive text on white bg gives ~3.3:1 contrast → fails WCAG AA for body text (4.5:1 required). | `OnboardingSuccess.tsx:96,114,118,176,215,253,309,314,321,324,388,442,459,477,491,505` | Use `text-neutral-500` or `text-neutral-600` for body copy; reserve `-400` for icons/decorative. |
| Brand fidelity | info | Outside the confetti, gradients and badges use `primary-*` / `green-100/600`. Same `green-*` vs `success-*` token mix flagged in OnboardingWizard. | `OnboardingSuccess.tsx:89-91,99-102` | Bundle into the same token migration. |
| Performance | info | Confetti unmounts after 5 s via `setTimeout` — cleanup correct via `clearTimeout`. 60 absolute divs is fine perf-wise. | `OnboardingSuccess.tsx:61-62` | None. |
| Integrations | info | One settings call. No POST. | `OnboardingSuccess.tsx:57` | None. |
| Missing features | P2 | "ابدأ التجربة" buttons (`/dashboard`, `/products`) — no analytics event for "wizard completed", so growth team can't measure activation funnel. | `OnboardingSuccess.tsx:126-131` | Fire an event (`window.dataLayer?.push?.(...)` or your analytics shim) on mount. |
| Missing features | P2 | Card button (`button` element) — no `aria-label`; relies on visible text. Acceptable but the icon `<ArrowLeft>` has `aria-hidden` implicit (not set) — flag for completeness. | `OnboardingSuccess.tsx:118` | `aria-hidden="true"` on the arrow. |

---

## Summary — top 5 to prioritize

1. **P1 brand drift in confetti** — `OnboardingSuccess.tsx:13` hardcodes `#6366f1`/`#8b5cf6`. Quick win, also tighten the brand-fidelity guard regex to catch raw hex indigo/violet so similar drift can't sneak back in.
2. **P1 wizard product save is serial + non-transactional** — `OnboardingWizard.tsx:137-148`. Promise.all + server-side bulk-create. Without this, an AI-suggested batch of 8 items hits the API 8× and partial-saves on failure.
3. **P1 reset-password flow is a `mailto:` stub** — `ForgotPassword.tsx`. Tracked in OPEN_PROBLEMS-005; surfaced here so it doesn't get forgotten in cosmetic PRs.
4. **P1 confetti has no `motion-reduce` opt-out** — `OnboardingSuccess.tsx:16-44`. WCAG 2.3.3 risk for vestibular users.
5. **P2 hardcoded `#5c9cd5` default in 4 sites** (OnboardingWizard + Settings.tsx × 3). Single-source-of-truth violation that will outlast any brand-color change.

Also noted but not bundled here: 2FA/captcha on Login (OPEN_PROBLEMS-005), `green-*` vs `success-*` token migration across the wizard, and the `tracking-tight` allow-list for OnboardingWizard's hero `h1`.
