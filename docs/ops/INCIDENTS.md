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

*(No active incidents)*

## Resolved Incidents

*(No resolved incidents)*

### INC-20260615-001: useRef is not defined (DashboardHome)

- **Date:** 2026-06-15 15:27 UTC
- **Severity:** P0
- **Status:** Investigating (pre-existing — predates Sprint 2/3 refactor)
- **Detected By:** `pnpm ops:monitor` automated fingerprinting
- **Impact:** DashboardHome.tsx render failure on first load
- **Affected Apps:** merchant-dashboard
- **Affected Stores:** n/a (universal)
- **Error Codes:** API-001 (generic JS)
- **Correlation IDs:** INC-evt-mqfd9m4s-g032v2
- **Root Cause:** Suspected — `useRef` missing from React import. Likely caused by lazy load race or build artifact drift.
- **Resolution:** Not yet deployed. Reference commit: predates 7fa372ed (Sprint 2 T2.1).
- **Prevention:** Add ESLint rule `no-undef` for `useRef`/`useState`/etc.; regression test for DashboardHome render.
- **Related Tasks:** TASK-0050 (recommended)
- **Verification:** TBD
- **Timeline:**
  - Detection: 2026-06-15T15:27:07.084Z
  - Investigation start: 2026-06-18 (this session)
  - Root cause identified: pending
  - Fix deployed: pending
  - Verified: pending

---

### INC-20260615-002: useRef is not defined (DashboardHome, second occurrence)

- **Date:** 2026-06-15 15:42 UTC (15 minutes after #001)
- **Severity:** P0
- **Status:** Investigating (likely duplicate of #001)
- **Detected By:** `pnpm ops:monitor`
- **Correlation IDs:** INC-evt-mqfdthtz-wlfop2
- **Related Tasks:** TASK-0050 (bundled with #001)

---

### INC-20260615-003: tickerRef is not defined (DashboardHome)

- **Date:** 2026-06-15 15:42 UTC
- **Severity:** P0
- **Status:** Investigating
- **Detected By:** `pnpm ops:monitor`
- **Impact:** DashboardHome ticker component failure
- **Correlation IDs:** INC-evt-mqfdtkph-2dl2qv
- **Likely Root Cause:** Variable reference error in ticker component
- **Related Tasks:** TASK-0050

---

### INC-20260615-004: Failed to fetch dynamically imported module: Login.tsx (occurrence 1)

- **Date:** 2026-06-15 15:53 UTC
- **Severity:** P0
- **Status:** Investigating
- **Detected By:** `pnpm ops:monitor`
- **Impact:** Login page fails to load on dev server (localhost:5173)
- **Affected Apps:** storefront
- **Correlation IDs:** INC-evt-mqfe7iqg-96a1hn
- **Likely Root Cause:** Vite dev server HMR mismatch; lazy import cache invalidation
- **Resolution:** Restart dev server. Long-term: add error boundary for lazy routes.
- **Related Tasks:** TASK-0050 (or new TASK-0051)

---

### INC-20260615-005: Failed to fetch dynamically imported module: Login.tsx (occurrence 2)

- **Date:** 2026-06-15 15:54 UTC (1 minute after #004)
- **Severity:** P0
- **Status:** Investigating (duplicate of #004)
- **Detected By:** `pnpm ops:monitor`
- **Correlation IDs:** INC-evt-mqfe8dev-gko4l5
- **Related Tasks:** TASK-0050

---

## API-001 Repeated Fingerprints (≥3 occurrences)

Six fingerprints recorded on 2026-06-15 with ≥3 occurrences each. These
indicate systemic query issues NOT caused by Sprint 2/3 refactor (verified
by 2595 tests passing and clean typecheck post-refactor).

| Fingerprint | Count | Suggested RCA |
|---|---|---|
| `API-001::unknown::/marketplace/categories::Failed_query:_select_"categories"."name",_"categories"."slug` | 48 | Open TASK-0052 |
| `API-001::unknown::/merchant/1/categories::Failed_query:_select_"id",_"store_id",_"parent_id",_"name",_` | 39 | Open TASK-0052 |
| `API-001::unknown::/merchant/1/reports/low-stock::Failed_query:_select_"id",_"store_id",_"name",_"slug",_"desc` | 33 | Open TASK-0052 |
| `API-001::unknown::/marketplace/products::Failed_query:_select_"products"."id",_"products"."store_id",:` | 36 | Open TASK-0052 |
| `API-001::unknown::/marketplace/products::Failed_query:_select_count(*)_from_"products"_inner_join_"st` | 12 | Open TASK-0052 |
| `API-001::unknown::/merchant/1/wallet/summary::Failed_query:_select_"id",_"store_id",_"platform_fee_mode",_` | 41 | Open TASK-0052 |

