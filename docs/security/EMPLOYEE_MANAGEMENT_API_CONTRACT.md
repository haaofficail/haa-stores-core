# Employee Management API Contract

> Contract for the Employee Management endpoints required to power the dashboard UI.
> **Status:** Implemented ✅ — RBAC Pass 4 complete. UI wired to API.

---

## Existing Data Model

| Table                    | Fields                                                                             | Supports Employee Management?                           |
| ------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `users`                  | id, name, email, passwordHash, phone, isActive, isAdmin, tokenVersion, lastLoginAt | Basic user data only                                    |
| `tenant_users`           | id, tenantId, userId, role                                                         | Links user to tenant with role                          |
| `membership_permissions` | membershipId, permissionKey, scopeType, scopeId, createdByUserId                   | Store-scoped custom permissions per employee membership |

**Current permission model:** Permissions start from `getPermissionsForRole(role)`. Employee-specific custom permissions are stored through membership permission endpoints and scoped to the verified `:storeId`.

**Current merchant roles:** `owner`, `admin`, `manager`, `products_manager`, `orders_manager`, `warehouse_staff`, `accountant`, `support`, `viewer`.

---

## Required Endpoints

### GET /merchant/:storeId/employees

List all employees of a store/tenant.

- **Response:** `Employee[]` (id is tenant_users.id, userId is users.id)
- **Permission required:** `employees:view`
- **Implemented:** ✅
- **Fields returned:** `id`, `userId`, `name`, `email`, `role`, `isActive`, `lastLoginAt`, `createdAt`, `permissions`

### POST /merchant/:storeId/employees/invite

Invite a new employee (creates user + tenant_user).

- **Body:** `{ name, email, password, role }`
- **Permission required:** `employees:invite`
- **Response:** `Employee` (201)
- **Implemented:** ✅
- **Notes:** Accepts existing user (links to tenant) or creates new. Email invite not sent yet.
- **Errors:** 409 CONFLICT (duplicate), 403 FORBIDDEN (non-owner assigning owner)

### PATCH /merchant/:storeId/employees/:employeeId

Update employee role/status.

- **Body:** `{ role?, isActive? }`
- **Permission required:** `employees:update`
- **Response:** `Employee`
- **Implemented:** ✅
- **Notes:** Cannot change the last `owner`. Cannot downgrade self from `owner`.
- **Errors:** 404 NOT_FOUND, 403 FORBIDDEN (last owner, self-downgrade, rank limit)

### GET /merchant/:storeId/permissions/memberships/:membershipId/permissions

Read custom permissions for an employee membership.

- **Permission required:** `employees:update`
- **Response:** `{ membershipId, permissions }`
- **Implemented:** ✅
- **Notes:** Uses the URL `:storeId` after `requireStoreAccess()` verifies store membership, then verifies the target membership belongs to the same tenant/store context.

### PATCH /merchant/:storeId/permissions/memberships/:membershipId/permissions

Update employee custom permissions.

- **Body:** `{ permissions: Array<{ permissionKey, scopeType, scopeId? }> }`
- **Permission required:** `employees:manage_permissions`
- **Response:** `{ membershipId, permissions }`
- **Implemented:** ✅
- **Notes:** Accepts store-scoped permission assignments, validates keys against `PERMISSION_CATALOG`, rejects unsupported scopes, prevents self-permission changes, and protects owner memberships.

### DELETE /merchant/:storeId/employees/:employeeId

Remove employee from store (soft-delete).

- **Body:** none
- **Permission required:** `employees:delete`
- **Response:** `{ success: true }`
- **Implemented:** ✅
- **Notes:** Deletes tenant_user record, sets users.isActive = false.
  Cannot delete the last `owner`. Cannot delete self.
- **Errors:** 404 NOT_FOUND, 403 FORBIDDEN (last owner, self-delete)

---

## Safety Rules (API-Level Enforcement Required)

| Rule                                                    | Endpoint                 | Check                                                                          |
| ------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------ |
| Cannot delete last owner                                | DELETE employee          | Count `tenant_users` with role=owner for this tenant; if ≤1, reject            |
| Cannot downgrade self from owner                        | PATCH employee           | If actor is owner editing own role, reject role change                         |
| Cannot grant permissions actor doesn't have             | PATCH permissions        | Compare requested perms with actor's perms; reject unowned ones (except owner) |
| Viewer cannot get write/manage perms                    | PATCH permissions        | Reject any non-read permission for viewer role                                 |
| `employees:manage_permissions` required to change perms | PATCH permissions        | RequirePermission middleware                                                   |
| Owner role is owner-only                                | POST invite / PATCH role | Only owner can assign owner role                                               |

---

## Custom Permission Storage

Custom permissions are stored in `membership_permissions`; no new `tenant_users.permissions` JSON column is required for the current implementation.

The API contract is:

```
effective = role permissions at invite/update + optional membership permission overrides
```

The merchant dashboard writes custom permissions through:

- `GET /merchant/:storeId/permissions/memberships/:membershipId/permissions`
- `PATCH /merchant/:storeId/permissions/memberships/:membershipId/permissions`

---

## Frontend Readiness

| Feature                      | Status     | Notes                                                                                                         |
| ---------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| Employee list UI             | ✅ Wired   | Fetches from GET /merchant/:storeId/employees                                                                 |
| Add employee dialog          | ✅ Wired   | Calls POST /merchant/:storeId/employees/invite                                                                |
| Edit employee dialog         | ✅ Wired   | Calls PATCH /merchant/:storeId/employees/:employeeId                                                          |
| Delete employee              | ✅ Wired   | Calls DELETE /merchant/:storeId/employees/:employeeId with confirm                                            |
| PermissionCheckboxMatrix     | ✅ Built   | Reads from PERMISSION_CATALOG + ROLE_PERMISSIONS and saves via membership permissions API                     |
| Role presets                 | ✅ Built   | Fills checkboxes from ROLE_PERMISSIONS, including warehouse staff                                             |
| Warehouse staff role         | ✅ Built   | First-class `warehouse_staff` role for products read, order fulfillment/status, shipping, and storefront read |
| Custom permissions help copy | ✅ Updated | Explains that templates can be accepted as-is or customized                                                   |
| Safety rules display         | ✅ Built   | Last-owner guard shown in UI                                                                                  |
| Action button guarding       | ✅ Built   | Uses PermissionGate with employees:\* permissions                                                             |
| Loading state                | ✅ Built   | "جاري تحميل الموظفين..." while fetching                                                                       |
| Empty state                  | ✅ Built   | "لا يوجد موظفون بعد" when list is empty                                                                       |
| Error state                  | ✅ Built   | Error message on API failure with retry                                                                       |

---

## Implementation Status

| Step                                                                              | Status                                       |
| --------------------------------------------------------------------------------- | -------------------------------------------- |
| 1. GET /merchant/:storeId/employees                                               | ✅ Done                                      |
| 2. POST /merchant/:storeId/employees/invite                                       | ✅ Done                                      |
| 3. PATCH /merchant/:storeId/employees/:employeeId                                 | ✅ Done                                      |
| 4. DELETE /merchant/:storeId/employees/:employeeId                                | ✅ Done                                      |
| 5. GET/PATCH /merchant/:storeId/permissions/memberships/:membershipId/permissions | ✅ Done                                      |
| 6. Wire UI to API                                                                 | ✅ Done                                      |
| 7. Safety rule enforcement                                                        | ✅ Done                                      |
| 8. DB migration for custom permissions                                            | ✅ Already covered by membership_permissions |
| 9. Real email invite flow                                                         | ❌ Future                                    |
| 10. Employee audit logs                                                           | ✅ Done                                      |
| 11. Invite safety baseline (password handling, UI clarity)                        | ✅ Done                                      |
