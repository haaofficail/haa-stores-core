# Sprint 4+ — Discovery & Planning Notes

> **Status:** Planning only (no implementation in this doc)
> **Created:** 2026-06-18
> **Audience:** Future sprint planning session
> **Predecessor:** Sprint 1-3 complete (see MASTER_PLAN_2026-06-18.md)

## What Sprint 1-3 delivered

- Sprint 1: Color migration, design tokens, small-text ban
- Sprint 2: Page refactors (LandingPage −84%, ProductCard consolidated, DashboardHome −88%, Settings −27%, Orders −7%)
- Sprint 3: EmptyState library, error messages (Arabic), 71 motion-reduce annotations, governance docs (form/icon/loading standards)

## Candidate themes for Sprint 4+

The master design plan didn't pre-define Sprint 4 items. These are the
top 5 themes the next session should consider, with rough ROI:

### Theme A: Mobile responsive overhaul (HIGH ROI)

**Why now:** The storefront + dashboards were designed primarily for desktop. Mobile users get a degraded experience (cramped grids, hidden tabs, etc.). This is the #1 UX risk for a Saudi audience that's heavily mobile-first.

**Scope:**
- Audit all pages at 375px / 768px / 1024px breakpoints
- Add mobile-specific layouts for the top 10 most-touched pages
- Implement bottom-sheet pattern for filters/sort on mobile
- Standardize responsive typography (already partially done in Sprint 1)
- Add touch-friendly hit areas (already standardized at 44×44 via Sprint 3)

**Effort:** 1-2 weeks
**Owner:** engineering (design review with founder)
**Blocker:** None

### Theme B: Performance optimization (MEDIUM ROI)

**Why now:** Lighthouse scores have never been measured against the Sprint 2/3 codebase. Bundle size could be reduced by lazy-loading sections properly.

**Scope:**
- Lighthouse audit on storefront home + product detail + cart
- Bundle analyzer pass; identify biggest chunks
- Lazy-load below-the-fold sections (Hero already imports everything eagerly)
- Add resource hints (preconnect to image CDN, etc.)
- Image optimization audit (WebP/AVIF support)

**Effort:** 1 week
**Owner:** engineering
**Blocker:** None

### Theme C: Observability maturity (MEDIUM ROI after live)

**Why now:** The local observability shim is in place (TASK-0028). After live, replace with real Sentry/Datadog.

**Scope:**
- Sign up for Sentry (error tracking)
- Sign up for Datadog or alternative (APM)
- Wire DSNs via env vars (already structured for this)
- Set up alerts for the 5 P0 alerts from TASK-0050 + TASK-0052

**Effort:** 2-3 days (once accounts provisioned)
**Owner:** engineering + founder (account decisions)
**Blocker:** Owner account provisioning

### Theme D: WCAG 2.1 AA accessibility audit (HIGH ROI for compliance)

**Why now:** Deferred from RELEASE_1_REPORT.md. Saudi accessibility regulations may apply. Currently the app passes Lighthouse accessibility checks but hasn't been formally audited.

**Scope:**
- External accessibility audit by specialized firm
- Fix any findings (likely contrast, focus indicators, screen reader labels)
- Add `aria-live` regions for dynamic content (smart alerts, ticker)
- Verify keyboard navigation across all interactive components

**Effort:** 2-3 weeks (1 week audit + 1-2 weeks fixes)
**Owner:** external firm + engineering fixes
**Blocker:** Owner contract

### Theme E: Localization beyond Arabic (LOW ROI)

**Why now:** The codebase is fully Arabic with some English fallbacks. Saudi audience primarily Arabic — English is a "nice to have".

**Scope:**
- Audit which pages have full English translations
- Add missing keys to `apps/storefront/src/i18n/locales/en.json`
- Add language switcher to footer (currently Arabic-only)
- Add RTL/LTR bidirectional support

**Effort:** 1 week
**Owner:** engineering (translation work is mostly mechanical)
**Blocker:** None

## Recommended Sprint 4 scope

If I had to pick one theme: **Theme A (Mobile responsive)** — it's the
biggest UX risk for the actual Saudi user base. Theme B (Performance)
should run in parallel as a separate workstream.

Theme C (Observability) should wait for live launch + owner provisioning.
Theme D (WCAG) requires external firm + owner contract.
Theme E (English) is nice-to-have, defer.

## Decision matrix

| Theme | ROI | Effort | Blocker | Priority |
|---|---|---|---|---|
| A. Mobile responsive | HIGH | 1-2 weeks | None | 🟢 P1 |
| B. Performance | MEDIUM | 1 week | None | 🟡 P2 |
| C. Observability | MEDIUM | 2-3 days | Owner | 🟡 P2 |
| D. WCAG audit | HIGH | 2-3 weeks | Owner | 🟡 P2 |
| E. English | LOW | 1 week | None | ⚪ P3 |

## Open questions for next session

1. Does the founder want Sprint 4 to be **mobile + performance** (combined)?
2. Does the founder want to keep working locally or push for live deployment first?
3. Should we open the PR for Sprint 1-3 first (still local-only)?

These answers shape the next session's scope.
