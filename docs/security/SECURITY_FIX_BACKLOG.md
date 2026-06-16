# Security Fix Backlog

> Prioritized list of security findings from the local-security audit.
> No code changes in this audit — these tasks are for future implementation.

---

## P0 — Critical

*None found — no critical security issues in the current local-only scope.*

---

## P1 — High — Completed in RBAC Pass 1

### SEC-001: Fix customer route permission downgrade ✅

- **Status:** ✅ **Closed** — `POST` uses `customers:create`, `PATCH` uses `customers:update`
- **Verified in:** `apps/api/src/routes/customers.ts`

### SEC-004: Create permission definitions and RBAC data model ✅

- **Status:** ✅ **Closed** — Permission catalog exists at `packages/shared/src/permissions.ts` with:
  - Typed `Permission` union (86 literals in `types/orders.ts`)
  - Arabic-labeled `PERMISSION_CATALOG` with risk levels
  - `ROLE_PERMISSIONS` map (8 roles)
  - `getPermissionsForRole()` helper
  - Permissions emitted in JWT on login/register
- **Verified in:** Boundary test `tests/rbac-permission-catalog.test.ts` (10/10 passing)

## P1 — High — Completed in RBAC Pass 2

### SEC-003: Add role-based route filtering in dashboard frontend ✅

- **Status:** ✅ **Closed** — Implemented in RBAC Pass 2
- **Verified in:**
  - `PermissionRoute.tsx` — route-level guard component
  - `Sidebar.tsx` — permission-based navigation filtering
  - `App.tsx` — 30+ dashboard routes wrapped with `GuardedRoute permission=`
  - `UnauthorizedState.tsx` — access-denied UX component
  - Action button guarding via `PermissionGate` across 20+ page files
  - Boundary test: `tests/dashboard-rbac-guards.test.ts` (6/6 passing)

## P1 — High — Completed in RBAC Pass 3

### SEC-005: Add employee permission management UI ✅

- **Status:** ✅ **Closed** — UI skeleton implemented in RBAC Pass 3
- **Verified in:**
  - `apps/merchant-dashboard/src/pages/Employees.tsx` — employee list with mock data
  - `apps/merchant-dashboard/src/components/employees/PermissionCheckboxMatrix.tsx` — permission matrix built from PERMISSION_CATALOG + ROLE_PERMISSIONS
  - `apps/merchant-dashboard/src/components/employees/EmployeeFormDialog.tsx` — add/edit dialog (save disabled)
  - `apps/merchant-dashboard/src/App.tsx` — `/employees` route with `employees:view` guard
  - `apps/merchant-dashboard/src/components/layout/Sidebar.tsx` — employees nav item
  - `docs/security/EMPLOYEE_MANAGEMENT_API_CONTRACT.md` — API contract for future endpoints
  - Boundary test: `tests/employee-management.test.ts` (25/25 passing)
- **Remaining:** API endpoints not yet built (contract exists)

## P1 — High — Pending

### SEC-002: Add audit logging to customer mutations

- **Area:** API / Audit
- **Risk:** Customer create/update operations are not audit-logged
- **Recommended Fix:** Add `AuditLogService.log()` calls to POST and PATCH customer handlers (similar to products.ts pattern)
- **Acceptance Criteria:**
  - Customer create records audit event with actor, new value, timestamp
  - Customer update records audit event with actor, old value, new value, timestamp
  - Audit includes IP and user-agent
- **Test Plan:** Create/update customer → check `audit_logs` table for matching entry
- **Status:** Pending — deferred from Pass 1

### SEC-015: Build Employee Management API Endpoints ✅

- **Area:** API / Backend
- **Risk:** Employee management UI cannot save or load real data
- **Recommended Fix:** Implement endpoints per API contract at `docs/security/EMPLOYEE_MANAGEMENT_API_CONTRACT.md`
- **Acceptance Criteria:**
  - GET /merchant/:storeId/employees returns employee list ✅
  - POST /merchant/:storeId/employees/invite creates employee ✅
  - PATCH /merchant/:storeId/employees/:employeeId updates role/status ✅
  - DELETE /merchant/:storeId/employees/:employeeId removes employee ✅
  - All endpoints enforce employee:* permissions ✅
  - Safety rules (last owner, self-downgrade, permission grant limits) enforced ✅
  - Custom permissions returns 501 ✅
  - Wire UI to API (loading/error/empty states, save enabled) ✅
- **Test Plan:** 28 API boundary tests + 10 UI wire tests passing
- **Status:** ✅ **Closed** — RBAC Pass 4 completed

---

## P2 — Medium

### SEC-006: Move support ticket accessToken to header ✅

- **Area:** API / Storefront
- **Risk:** `accessToken` in URL query string can leak via logs, referrers, browser history
- **Recommended Fix:** Change support ticket auth to use `Authorization: Bearer <accessToken>` header instead of query param
- **Acceptance Criteria:**
  - Support ticket endpoints read token from header ✅
  - Backwards compatible (accept both during migration) ✅
- **Test Plan:** Header-based client regression plus temporary query compatibility check
- **Status:** ✅ **Closed** — new storefront links do not include `accessToken`; token is sent via `X-Support-Access-Token`, with temporary legacy query/body compatibility for old links

### SEC-007: Rate limit public order lookup by phone

- **Area:** API / Storefront
- **Risk:** Public order lookup endpoint (order number + phone) could be brute-forced
- **Recommended Fix:** Add rate limiting to `GET /:slug/order/:orderNumber` — per IP, per phone number
- **Acceptance Criteria:**
  - More than 3 failed attempts per phone per minute → 429
  - More than 10 attempts per IP per minute → 429
- **Test Plan:** Send rapid requests → rate limited after threshold
- **Status:** Pending

### SEC-008: Audit remaining route groups

- **Area:** All
- **Risk:** Webhooks, shipping, payment, wallet, and other routes were not inspected
- **Recommended Fix:** Extend this audit to cover all remaining route groups
- **Acceptance Criteria:**
  - All route groups documented with auth/permission status
  - Findings added to this backlog
- **Test Plan:** N/A — documentation task
- **Status:** Pending

### SEC-009: Add recursion in error sanitizer for arrays

- **Area:** Error Capture
- **Risk:** Sensitive data inside arrays may not be sanitized
- **Recommended Fix:** Extend `sanitizePayload()` to recurse into array elements
- **Acceptance Criteria:**
  - `[{ password: "secret" }]` → `[{ password: "[REDACTED]" }]`
- **Test Plan:** Submit payload with sensitive data in nested arrays → verify redacted
- **Status:** Pending

---

## P3 — Low

### SEC-010: Add refresh token mechanism

- **Area:** Auth / API
- **Risk:** Single JWT with 24h expiry — no way to refresh without re-login
- **Recommended Fix:** Add refresh token flow (refresh token in httpOnly cookie, short-lived access token)
- **Status:** Pending

### SEC-011: Move JWT from localStorage to httpOnly cookie

- **Area:** Auth / Frontend
- **Risk:** JWT in localStorage is accessible to any JS (XSS vulnerability)
- **Recommended Fix:** Store JWT in httpOnly cookie instead of localStorage
- **Status:** Pending

### SEC-012: Add session polling or idle timeout

- **Area:** Auth / Frontend
- **Risk:** No session timeout — token remains valid until expiry
- **Recommended Fix:** Add periodic token refresh check and idle timeout (30 min inactivity → logout)
- **Status:** Pending

### SEC-013: Replace .env.example dev secrets with placeholders

- **Area:** Configuration
- **Risk:** `.env.example` contains real-looking dev secrets that could be used by mistake
- **Recommended Fix:** Replace `haa_secret_2024`, `dev-jwt-secret-change-in-production` with `CHANGE_ME` placeholders
- **Status:** Pending

### SEC-014: Add NDJSON log rotation

- **Area:** Logging
- **Risk:** Log files grow unbounded
- **Recommended Fix:** Add log rotation (daily or 10MB limit) before production
- **Status:** Pending
