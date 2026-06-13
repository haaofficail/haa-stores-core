# RBAC Audit

> Role-Based Access Control assessment. Local-development scope.
> Audit only — no implementation changes.

---

## Current RBAC Status

**State: PARTIAL** — The API has a permission-checking system (`requirePermission` in `auth-core`), but there is NO role/permission definition system, NO role assignment UI, and NO employee permission management in the merchant dashboard.

---

## Existing Permission Model

### What exists

| Component | Status | Details |
|-----------|--------|---------|
| `requirePermission()` middleware | ✅ | Checks permissions array from JWT payload |
| Permission strings in routes | ✅ | e.g., `orders:read`, `products:create`, `settings:update` |
| Custom CSS sanitization | ✅ | settings/theme endpoint blocks XSS in CSS |

### What does NOT exist

| Component | Status | Details |
|-----------|--------|---------|
| Permission definitions | ❌ | No single source of truth for all permission strings |
| Role definitions | ❌ | No roles defined (e.g., "admin", "manager", "viewer") |
| Role ↔ Permission mapping | ❌ | No mapping table or configuration |
| Employee permission UI | ❌ | No dashboard page for managing employee permissions |
| Default permissions on registration | ❌ | New users have no permissions defined in registration flow |
| Permission seeds | ❌ | No seed data for roles/permissions |
| Branch/location scope | ❌ | No branch or location concept for data scoping |

---

## Page Permissions Status

| Dashboard Page | Existing Permission | Notes |
|----------------|-------------------|-------|
| Dashboard Home | None | Protected by AuthGuard only |
| Products | `products:read` | API enforced |
| Orders | `orders:read` | API enforced |
| Customers | `customers:read` | API enforced (⚠️ write uses same permission) |
| Settings | `stores:read` | API enforced |
| Shipping | Not inspected | — |
| Wallet | Not inspected | — |
| Coupons | Not inspected | — |
| Reports | Not inspected | — |
| Theme | `stores:read` | API enforced |
| Compliance | Not inspected | — |
| Notifications | Not inspected | — |
| API Keys | Not inspected | — |
| Audit Logs | Not inspected | — |

**Frontend gap:** The dashboard has NO route-level permission checking. Any authenticated user can navigate to any page. The API blocks unauthorized operations, but the user can still see the page and its navigation.

---

## Action Permissions Status

| Action | Permission | API Enforced | UI Gated |
|--------|-----------|-------------|----------|
| Create product | `products:create` | ✅ | ❌ |
| Update product | `products:update` | ✅ | ❌ |
| Delete product | `products:delete` | ✅ | ❌ |
| Update order status | `orders:update_status` | ✅ | ❌ |
| Refund order | `orders:refund` | ✅ | ❌ |
| Update settings | `settings:update` | ✅ | ❌ |
| Create customer | `customers:read` (WRONG) | ⚠️ | ❌ |
| Update customer | `customers:read` (WRONG) | ⚠️ | ❌ |

---

## Branch/Location Scope Status

**Not implemented.** There is no concept of branches or locations in the current permission model. The `requireStoreAccess()` middleware checks store → tenant ownership, but does not filter by branch/location within a store.

---

## API Enforcement Status

| Route Group | requireAuth | requireStoreAccess | requirePermission |
|-------------|-------------|--------------------|--------------------|
| admin        | ✅ | N/A | ✅ (payouts only) |
| dashboard    | ✅ | ✅ | ❌ |
| settings     | ✅ | ✅ | ✅ |
| products     | ✅ | ✅ | ✅ |
| customers    | ✅ | ✅ | ⚠️ |
| orders       | ✅ | ✅ | ✅ |
| storefront   | ❌ (public) | N/A | N/A |

---

## UI-Only Risks

| Risk | Current State | Impact |
|------|--------------|--------|
| Employee sees all menu items | No UI filtering by role | Confusion, not security (API blocks) |
| Employee can navigate to any page URL | Any authenticated user can | Low — API rejects unauthorized actions |
| Employee sees "Create" button for restricted actions | UI does not hide buttons based on permissions | Low — API blocks |

**Note:** The project constitution (AGENTS.md) already forbids "Adding permissions in UI only without API enforcement." This is respected — API enforcement exists. The gap is in the opposite direction: API has permissions, UI ignores them.

---

## Missing Pieces Summary

| Piece | Priority | Required Before Production |
|-------|----------|---------------------------|
| Permission definitions catalog | P1 | Yes |
| Role definitions (admin, manager, viewer, custom) | P1 | Yes |
| Employee permission management UI | P1 | Yes |
| Role ↔ Permission mapping in DB schema | P1 | Yes |
| Default role on user registration | P1 | Yes |
| Branch/location scope | P2 | Yes (if multi-branch feature exists) |
| UI route filtering by permissions | P1 | Yes |
| UI action button hiding by permissions | P1 | Yes |
| Seed data for roles/permissions | P1 | Yes |
| Permission documentation in SYSTEM_MAP | P2 | Nice to have |

---

## Recommended RBAC Design Direction

1. **Define a flat permission catalog** — all `resource:action` strings in a single file (e.g., `packages/shared/src/permissions.ts`)
2. **Define built-in roles** — `owner` (full access), `admin` (manage + settings), `manager` (products + orders), `viewer` (read only)
3. **Create `permissions` DB table** — `(id, role, permission, store_id, branch_id?)`
4. **Include permissions in JWT** — middleware reads from DB on auth, encodes into token
5. **Frontend `usePermissions()` hook** — checks `user.permissions` and hides UI elements
6. **Route-level guard** — `PermissionGuard` component wraps routes with required permission

---

## Required Tasks Before Implementation

| Task | Description |
|------|-------------|
| TASK-RBAC-01 | Create permission definitions in shared package |
| TASK-RBAC-02 | Add roles and permissions DB schema + migration |
| TASK-RBAC-03 | Create employee permission management page in dashboard |
| TASK-RBAC-04 | Fix customers.ts permission strings |
| TASK-RBAC-05 | Add audit logging to customer mutations |
| TASK-RBAC-06 | Add permission-based route filtering in frontend |
| TASK-RBAC-07 | Add UI action hiding based on permissions |
| TASK-RBAC-08 | Seed default roles and permissions |
| TASK-RBAC-09 | Update AGENTS.md with RBAC design decisions |
