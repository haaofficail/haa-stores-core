# Employee Management API Contract

> Contract for the Employee Management endpoints required to power the dashboard UI.
> **Status:** Implemented ✅ — RBAC Pass 4 complete. UI wired to API.

---

## Existing Data Model

| Table | Fields | Supports Employee Management? |
|-------|--------|------------------------------|
| `users` | id, name, email, passwordHash, phone, isActive, isAdmin, tokenVersion, lastLoginAt | Basic user data only |
| `tenant_users` | id, tenantId, userId, role | Links user to tenant with role — **no custom permissions field** |

**Current permission model:** Permissions are derived from `getPermissionsForRole(role)` at login/JWT creation time. Custom per-role permissions are NOT stored in the database.

---

## Required Endpoints

### GET /merchant/:storeId/employees

List all employees of a store/tenant.

- **Response:** `Employee[]` (id is tenant_users.id, userId is users.id)
- **Permission required:** `employees:view`
- **Implemented:** ✅
- **Fields returned:** `id`, `userId`, `name`, `email`, `role`, `isActive`, `lastLoginAt`, `createdAt`, `permissions` (derived from role)

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

### PATCH /merchant/:storeId/employees/:employeeId/permissions

Update employee custom permissions (future).

- **Body:** `{ permissions: string[] }`
- **Permission required:** `employees:manage_permissions`
- **Response:** 501 NOT_IMPLEMENTED
- **Implemented:** ✅ (returns 501)
- **Notes:** Custom permissions not supported — permissions are role-derived only.

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

| Rule | Endpoint | Check |
|------|----------|-------|
| Cannot delete last owner | DELETE employee | Count `tenant_users` with role=owner for this tenant; if ≤1, reject |
| Cannot downgrade self from owner | PATCH employee | If actor is owner editing own role, reject role change |
| Cannot grant permissions actor doesn't have | PATCH permissions | Compare requested perms with actor's perms; reject unowned ones (except owner) |
| Viewer cannot get write/manage perms | PATCH permissions | Reject any non-read permission for viewer role |
| `employees:manage_permissions` required to change perms | PATCH permissions | RequirePermission middleware |
| Owner role is owner-only | POST invite / PATCH role | Only owner can assign owner role |

---

## DB Schema Changes Required

To support custom permissions per employee:

```sql
ALTER TABLE tenant_users ADD COLUMN permissions jsonb DEFAULT NULL;
```

Then `getPermissionsForRole()` would merge role-derived permissions with custom overrides:

```
effective = rolePermissions + (storedCustomPermissions ∩ rolePermissions)
```

This requires changes in:
- `packages/shared/src/permissions.ts` — `getPermissionsForRole()` → `getEffectivePermissions()`
- `apps/api/src/routes/auth.ts` — permission resolution for JWT
- `packages/db/src/schema/tenant_users.ts` — add permissions column
- Migration script

---

## Frontend Readiness

| Feature | Status | Notes |
|---------|--------|-------|
| Employee list UI | ✅ Wired | Fetches from GET /merchant/:storeId/employees |
| Add employee dialog | ✅ Wired | Calls POST /merchant/:storeId/employees/invite |
| Edit employee dialog | ✅ Wired | Calls PATCH /merchant/:storeId/employees/:employeeId |
| Delete employee | ✅ Wired | Calls DELETE /merchant/:storeId/employees/:employeeId with confirm |
| PermissionCheckboxMatrix | ✅ Built | Reads from PERMISSION_CATALOG + ROLE_PERMISSIONS (read-only) |
| Role presets | ✅ Built | Fills checkboxes from ROLE_PERMISSIONS |
| Custom permissions warning | ✅ Shown | "التخصيص الفردي للصلاحيات غير مدعوم بعد" |
| Safety rules display | ✅ Built | Last-owner guard shown in UI |
| Action button guarding | ✅ Built | Uses PermissionGate with employees:* permissions |
| Loading state | ✅ Built | "جاري تحميل الموظفين..." while fetching |
| Empty state | ✅ Built | "لا يوجد موظفون بعد" when list is empty |
| Error state | ✅ Built | Error message on API failure with retry |

---

## Implementation Status

| Step | Status |
|------|--------|
| 1. GET /merchant/:storeId/employees | ✅ Done |
| 2. POST /merchant/:storeId/employees/invite | ✅ Done |
| 3. PATCH /merchant/:storeId/employees/:employeeId | ✅ Done |
| 4. DELETE /merchant/:storeId/employees/:employeeId | ✅ Done |
| 5. PATCH /merchant/:storeId/employees/:employeeId/permissions | ✅ 501 Done |
| 6. Wire UI to API | ✅ Done |
| 7. Safety rule enforcement | ✅ Done |
| 8. DB migration for custom permissions | ❌ Future |
| 9. Real email invite flow | ❌ Future |
| 10. Employee audit logs | ❌ Future |
