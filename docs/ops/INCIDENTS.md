# Incidents

> Records of P0 and significant P1 incidents.

---

## Template

```markdown
### INC-YYYYMMDD-NNN: Brief Title

- **Date:**
- **Severity:** P0 / P1
- **Status:** Open / Investigating / Resolved / Verified
- **Detected By:** Monitoring / Merchant Report / Developer
- **Impact:**
- **Affected Apps:**
- **Affected Stores:**
- **Error Codes:**
- **Correlation IDs:**
- **Root Cause:**
- **Resolution:**
- **Prevention:**
- **Related Tasks:**
- **Verification:**
- **Timeline:**
  - Detection:
  - Investigation start:
  - Root cause identified:
  - Fix deployed:
  - Verified:
```

---

## Active Incidents

_(No active incidents)_

## Resolved Incidents

### INC-20260619-006..008: Historical React Runtime P0 Events Re surfaced by Monitor

- **Date:** 2026-06-19
- **Severity:** P0 (historical captured severity)
- **Status:** Resolved / no current outage observed on 2026-06-20
- **Detected By:** `pnpm ops:monitor`
- **Impact:** No current service outage. API, storefront, and merchant dashboard all returned HTTP 200 during the 2026-06-20 health and synthetic checks.
- **Affected Apps:** merchant-dashboard / React runtime
- **Error Codes:** DASH-001
- **Correlation IDs:** `evt-mqkvcig7-n3lu8y`, `evt-mqkw79kh-e5y01y`, `evt-mqkykp9r-e2m4xm`
- **Root Cause:** Not established in TASK-0054; events predate the CI repair and were retained in the NDJSON history.
- **Resolution:** Recorded as required by the monitoring rule. No runtime code was changed because current health checks are green and the active user request is limited to GitHub Actions.
- **Prevention:** Treat historical P0 events separately from current health; investigate recurrence if a new event with either fingerprint is captured.
- **Related Tasks:** TASK-0054 (detection context only)
- **Verification:** `pnpm ops:health` 25/25; storefront, merchant dashboard, and API synthetic checks all HTTP 200.

### INC-20260615-001..005: Vite HMR Transient (cluster)

- **Date:** 2026-06-15 15:27–15:54 UTC
- **Severity:** ~~P0~~ (downgraded to dev-env cosmetic; see ISSUE-0010)
- **Status:** Resolved (2026-06-18)
- **Detected By:** `pnpm ops:monitor` automated fingerprinting
- **Impact:** None in production. Dev-only Vite Fast Refresh noise that briefly surfaced as caught `useRef is not defined` / `tickerRef is not defined` / `Failed to fetch dynamically imported module` errors.
- **Affected Apps:** merchant-dashboard (origin of error report), `/login` route
- **Error Codes:** DASH-001
- **Correlation IDs:** `INC-evt-mqfd9m4s-g032v2` (001), `INC-evt-mqfdthtz-wlfop2` (002), `INC-evt-mqfdtkph-2dl2qv` (003), `INC-evt-mqfe7iqg-96a1hn` (004), `INC-evt-mqfe8dev-gko4l5` (005)
- **Root Cause:** Vite Fast Refresh transient — when a module is hot-replaced, React's HMR runtime can briefly reference hooks/variables from a previous module version. Error caught by `ErrorBoundary`, then disappears on next reload. `Login.tsx` (149 LOC) was inspected and confirmed clean (no `useRef` or `tickerRef` anywhere in the file).
- **Resolution:** ErrorBoundary hardened in `apps/{merchant-dashboard,storefront,admin-dashboard}/src/.../ErrorBoundary.tsx` to:
  - Detect `isPersistent` (same fingerprint ≥3 in 60s) and show different message
  - Report `componentFrame` from `info.componentStack` for debugging
  - Show Arabic message + "العودة للرئيسية" fallback link
- **Verification:**
  - `pnpm typecheck` clean (all 22 packages)
  - ErrorBoundary transient detection covered by `tests/error-boundary-transient.test.ts`
  - No code change to `Login.tsx` was needed (the file was never broken)
- **Prevention:**
  - ErrorBoundary now distinguishes transient HMR noise from persistent bugs
  - Documented in ISSUE-0010 (ISSUE_KNOWLEDGE_BASE.md)
- **Related Tasks:** TASK-0053 (recommended for follow-up if HMR errors persist)
- **Timeline:**
  - Detection: 2026-06-15T15:27:07.084Z
  - Investigation start: 2026-06-18
  - Root cause identified: 2026-06-18 (Vite HMR transient)
  - Fix deployed: 2026-06-18 (ErrorBoundary hardening)
  - Verified: 2026-06-18

---

## API-001 Repeated Fingerprints (≥3 occurrences) — Resolved

Six fingerprints recorded on 2026-06-15 with ≥3 occurrences each. All
**resolved** by `scripts/seed-billing-guards.ts` (this session). See
ISSUE-0011 for full RCA.

| Fingerprint                                                                                    | Count | Resolution                                                |
| ---------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------- |
| `API-001::unknown::/marketplace/categories::Failed_query:_select_..._`                         | 48    | Seed guard now backfills `store_billing_settings`         |
| `API-001::unknown::/merchant/1/categories::Failed_query:_select_..._`                          | 39    | Same — store-scoped query needed `store_billing_settings` |
| `API-001::unknown::/merchant/1/reports/low-stock::Failed_query:_select_..._`                   | 33    | Same                                                      |
| `API-001::unknown::/marketplace/products::Failed_query:_select_..._`                           | 36    | Same                                                      |
| `API-001::unknown::/marketplace/products::Failed_query:_select_count(*)...`                    | 12    | Same                                                      |
| `API-001::unknown::/merchant/1/wallet/summary::Failed_query:_select_..._platform_fee_mode..._` | 41    | Same — direct `getRawSettings()` failure                  |

**Resolution date:** 2026-06-18
**Resolution:** Created `scripts/seed-billing-guards.ts` (idempotent) + wired into `pnpm db:seed` as a final step. All 209 historical events archived.
**Prevention:** Documented in ISSUE-0011; regression checklist updated.
