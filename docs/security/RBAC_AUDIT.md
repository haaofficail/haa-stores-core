# RBAC Audit

> Role-Based Access Control assessment. Local-development scope.

---

## RBAC Pass 1 — Permission Infrastructure ✅

**Closed: 2026-06-13**

### What was completed

| Component | Status | Location |
|-----------|--------|----------|
| Permission catalog (`PERMISSION_CATALOG`) | ✅ | `packages/shared/src/permissions.ts` |
| Arabic labels & descriptions for all permissions | ✅ | `permissions.ts` |
| Risk levels (low/medium/high/critical) | ✅ | `permissions.ts` |
| `ROLE_PERMISSIONS` map (8 roles) | ✅ | `permissions.ts` → replaced old untyped version in `constants/index.ts` |
| `getPermissionsForRole()` helper | ✅ | `permissions.ts` |
| `Permission` type in `UserRole` type | ✅ | `types/orders.ts` — added `admin` role |
| Permissions in JWT payload | ✅ | `auth.ts` — `signToken()` includes `permissions` |
| Permissions in login response | ✅ | `auth.ts` — `POST /auth/login` returns permissions |
| Permissions in `/me` response | ✅ | `auth.ts` — `GET /auth/me` returns permissions |
| Permissions in register response | ✅ | `auth.ts` — `POST /auth/register` returns permissions |
| `requirePermission()` middleware | ✅ | `auth-core/src/middleware.ts` |
| Route protection via `requirePermission` | ✅ | Most route groups (see below) |
| Frontend `usePermissions()` hook | ✅ | `apps/merchant-dashboard/src/lib/permissions.tsx` |
| Frontend `PermissionGate` component | ✅ | `apps/merchant-dashboard/src/lib/permissions.tsx` |
| Frontend `User` type includes `permissions` | ✅ | `useAuth.tsx` + `api.ts` |
| Local boundary test | ✅ | `tests/rbac-permission-catalog.test.ts` (10 tests) |
| Customers permission string fix | ✅ | `customers:create` / `customers:update` (not `customers:read`) |
| Catalog drift fixed | ✅ | All ROLE_PERMISSIONS keys now in catalog; 4 dead naming variants removed |
| Viewer role restricted | ✅ | Removed `categories:manage`, `brands:manage`, `tags:manage` from viewer |
| Subscription routes protected | ✅ | Added `requirePermission('subscriptions:view'/'manage')` to all routes |
| Dashboard summary protected | ✅ | Added `requirePermission('dashboard:view')` |

### Catalog Stats

| Metric | Value |
|--------|-------|
| Total permissions in catalog | **~80** |
| Total roles | **8** (owner, admin, manager, products_manager, orders_manager, accountant, support, viewer) |
| Owner covers all | ✅ |
| Viewer restricted to read-only | ✅ |
| RBAC boundary tests | **41** (10 catalog + 6 dashboard guards + 25 employee management) |
| Total test suite | **1381 tests** across **70 test files** |

---

## RBAC Pass 2 — Dashboard Frontend Guards ✅

**Closed: 2026-06-13**

| Component | Status | Notes |
|-----------|--------|-------|
| Dashboard navigation filtering | ✅ | Sidebar filters items via `usePermissions().can()`; hides empty groups |
| Route-level permission guarding (frontend) | ✅ | `PermissionRoute` guard wraps all dashboard routes in `App.tsx` |
| Action button hiding | ✅ | `PermissionGate` wrappers on all CRUD buttons across 20+ pages |
| Employee management UI | ✅ | **Pass 3** — UI skeleton with list, form, permission matrix |
| Employee invite flow | ❌ | No invite system (requires API) |
| Role ↔ Permission DB schema | ❌ | Currently uses in-memory map only (requires DB migration) |
| Permission seed data | ❌ | No DB seeds for roles/permissions |
| Branch/location scope | ❌ | Not implemented |

## RBAC Pass 3 — Employee Management UI ✅

**Closed: 2026-06-13**

| Component | Status | Notes |
|-----------|--------|-------|
| Employees page | ✅ | `apps/merchant-dashboard/src/pages/Employees.tsx` |
| Employee list table | ✅ | Mock data with name, email, role, status, last login, permissions count |
| Add employee button | ✅ | Protected by `employees:invite` PermissionGate |
| Edit employee button | ✅ | Protected by `employees:update` PermissionGate |
| Delete employee button | ✅ | Protected by `employees:delete` PermissionGate |
| PermissionCheckboxMatrix | ✅ | Built from PERMISSION_CATALOG, grouped by category |
| Role presets | ✅ | Fills checkboxes from ROLE_PERMISSIONS |
| High-risk permission indicators | ✅ | Marks sensitive perms with warning badge |
| Last owner protection | ✅ | UI shows "آخر مالك" and disables actions on last owner |
| API contract doc | ✅ | `docs/security/EMPLOYEE_MANAGEMENT_API_CONTRACT.md` |
| Custom permissions warning | ✅ | Banner: custom perms not supported in DB |
| Save button disabled | ✅ | Disabled with "غير متاح" label — needs API |

---

## API Enforcement Status (RBAC Pass 1 complete)

| Route Area | requireAuth | requireStoreAccess | requirePermission | Notes |
|------------|-------------|--------------------|-------------------|-------|
| admin | ✅ | N/A | ✅ | Payout-specific permissions |
| dashboard | ✅ | ✅ | ✅ | `dashboard:view` added |
| settings | ✅ | ✅ | ✅ | `stores:read` / `settings:*` |
| products | ✅ | ✅ | ✅ | CRUD + images |
| categories | ✅ | ✅ | ✅ | `categories:manage` |
| brands | ✅ | ✅ | ✅ | `brands:manage` |
| tags | ✅ | ✅ | ✅ | `tags:manage` |
| customers | ✅ | ✅ | ✅ | `customers:read/create/update` |
| orders | ✅ | ✅ | ✅ | `orders:read/update_status/refund` |
| shipping | ✅ | ✅ | ✅ | `shipping:manage` |
| shipments | ✅ | ✅ | ✅ | `shipping:manage` (except `/provider-status` GET — benign) |
| wallet | ✅ | ✅ | ✅ | `wallet:read` + custom payout |
| coupons | ✅ | ✅ | ✅ | CRUD |
| promotions | ✅ | ✅ | ✅ | CRUD |
| policies | ✅ | ✅ | ✅ | `settings:read/update` |
| reports | ✅ | ✅ | ✅ | `reports:read` |
| support | ✅ | ✅ | ✅ | `support:read/create/update/delete` |
| compliance | ✅ | ✅ | ✅ | `compliance:read/write/submit/documents` |
| subscriptions | ✅ | ✅ | ✅ | **Fixed: added** `subscriptions:view/manage` |
| api-keys | ✅ | ✅ | ✅ | `settings:read/update` |
| notifications | ✅ | ✅ | ✅ | `settings:read/update` |
| uploads | ✅ | ✅ | ✅ | `settings:update` |
| audit | ✅ | ✅ | ✅ | `stores:read` |
| abandoned-carts | ✅ | ✅ | ✅ | `orders:read` |
| marketplaces | ✅ | ✅ | ✅ | Mixed `settings:*`, `products:*`, `orders:*`, `reports:*` |
| imports/exports | ✅ | ✅ | ✅ | `imports:create` / `exports:create` |

**Intentionally unprotected:** OAuth callbacks (3 routes in marketplaces), customer reply (support.ts), public webhooks, storefront, health, cart, checkout.

---

## Frontend Guards Status

| Component | Status | Details |
|-----------|--------|---------|
| `usePermissions()` | ✅ | Implemented in `permissions.tsx` |
| `PermissionGate` | ✅ | Implemented with single/any/all modes |
| `UnauthorizedState` | ✅ | New component for access-denied UX |
| `PermissionRoute` | ✅ | New route-level guard wrapper |
| Navigation filtering | ✅ | **RBAC Pass 2** — Sidebar filtered by permissions |
| Route-level guarding | ✅ | **RBAC Pass 2** — All routes wrapped with `GuardedRoute` |
| Action button hiding | ✅ | **RBAC Pass 2** — All CRUD buttons guarded across 20+ pages |

---

## Local Boundary Test

| File | Coverage | Status |
|------|----------|--------|
| `tests/rbac-permission-catalog.test.ts` | (1) Catalog field completeness, (2) no duplicates, (3) ROLE_PERMISSIONS ↔ Catalog match, (4) no role-internal duplicates, (5) `getPermissionsForRole` correctness, (6) unknown role handling, (7) owner covers all catalog, (8) viewer no high-risk perms, (9) category coverage, (10) riskLevel validity | ✅ 10/10 passing |
| `tests/dashboard-rbac-guards.test.ts` | (1) Sidebar has permission metadata on all items, (2) all sidebar perms in catalog, (3) GuardedRoute on protected routes, (4) all route perms in catalog, (5) PermissionRoute uses UnauthorizedState, (6) 15+ pages have PermissionGate import | ✅ 6/6 passing |
| `tests/employee-management.test.ts` | (1) Employees route & sidebar, (2) page uses PermissionGate, (3) employees:* perms used, (4) matrix imports catalog + roles, (5) no hardcoded perms outside catalog, (6) high-risk perms set, (7) role presets, (8-12) all employee perms in catalog, (13-15) owner/admin/viewer role mappings, (16) dialog uses matrix, (17) save disabled, (18-20) API contract doc | ✅ 25/25 passing |

---

## Branch/Location Scope Status

**Not implemented.** No branch or location concept in permission model. The `requireStoreAccess()` middleware checks store → tenant ownership only. Scoped for RBAC Pass 3+.

---

## Security Model

The RBAC design follows defense-in-depth:

1. **JWT is the authority** — `permissions` array is embedded at login/register via `getPermissionsForRole()`
2. **API is the gatekeeper** — `requirePermission()` middleware checks JWT permissions for every mutation
3. **Frontend is the UX layer** — `usePermissions()` and `PermissionGate` consume the same `permissions` array for UI hints
4. **Never trust the client** — No sensitive operation is guarded only on the frontend

---

## Required Tasks Before RBAC Pass 4

| Task | Description |
|------|-------------|
| TASK-RBAC-06 | Add permission-based route filtering in frontend ✅ (Pass 2) |
| TASK-RBAC-07 | Add UI action hiding based on permissions ✅ (Pass 2) |
| TASK-RBAC-03 | Create employee permission management page in dashboard ✅ (Pass 3 — UI skeleton) |
| TASK-RBAC-08 | Build employee management API endpoints — pending (API contract exists) |
