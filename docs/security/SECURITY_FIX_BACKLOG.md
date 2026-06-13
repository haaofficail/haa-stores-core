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

### SEC-003: Add role-based route filtering in dashboard frontend

- **Area:** Dashboard / Frontend
- **Risk:** Any authenticated user can navigate to any dashboard page (API blocks, but UX is poor)
- **Recommended Fix:** Extend `AuthGuard` to accept `requiredPermissions` prop; add per-route permission checking in `App.tsx`
- **Acceptance Criteria:**
  - Routes with `requirePermission` show 403 or hide navigation for unauthorized roles
  - API remains the enforcement point — UI is informational only
- **Test Plan:** Authenticate as user without `orders:read` → orders page shows "no access" instead of data
- **Status:** Pending — RBAC Pass 2

### SEC-005: Add employee permission management UI

- **Area:** Dashboard / Frontend
- **Risk:** No way to manage employee permissions
- **Recommended Fix:** Create employee management page with role assignment
- **Acceptance Criteria:**
  - Merchant can invite employee with role selection
  - Employee permissions are derived from role
  - UI shows only actions the employee can perform
- **Test Plan:** Assign `viewer` role → employee sees read-only UI
- **Status:** Pending — RBAC Pass 2

---

## P2 — Medium

### SEC-006: Move support ticket accessToken to header

- **Area:** API / Storefront
- **Risk:** `accessToken` in URL query string can leak via logs, referrers, browser history
- **Recommended Fix:** Change support ticket auth to use `Authorization: Bearer <accessToken>` header instead of query param
- **Acceptance Criteria:**
  - Support ticket endpoints read token from header
  - Backwards compatible (accept both during migration)
- **Test Plan:** Send request with header → 200; send with query param → still works (transition period)
- **Status:** Pending

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
