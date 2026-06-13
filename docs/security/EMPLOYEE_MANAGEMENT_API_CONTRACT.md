# Employee Management API Contract

> Contract for the Employee Management endpoints required to power the dashboard UI.
> **Status:** Draft — not implemented. UI skeleton exists using mock data.

---

## Existing Data Model

| Table | Fields | Supports Employee Management? |
|-------|--------|------------------------------|
| `users` | id, name, email, passwordHash, phone, isActive, isAdmin, tokenVersion, lastLoginAt | Basic user data only |
| `tenant_users` | id, tenantId, userId, role | Links user to tenant with role — **no custom permissions field** |

**Current permission model:** Permissions are derived from `getPermissionsForRole(role)` at login/JWT creation time. Custom per-role permissions are NOT stored in the database.

---

## Required Endpoints

### GET /stores/:storeId/employees

List all employees of a store/tenant.

- **Response:** `Employee[]`
- **Permission required:** `employees:view`
- **Fields needed per employee:**
  - `id` — user ID
  - `name` — user name
  - `email` — email address
  - `role` — UserRole string
  - `isActive` — boolean
  - `lastLoginAt` — ISO timestamp or null
  - `permissions` — string[] (derived from role)

### POST /stores/:storeId/employees/invite

Invite a new employee (creates user + tenant_user).

- **Body:** `{ name, email, role }`
- **Permission required:** `employees:invite`
- **Response:** `Employee` (the created user with tenant link)
- **Notes:** This is an invite flow — sends email with set-password link.

### PATCH /stores/:storeId/employees/:employeeId

Update employee role/status.

- **Body:** `{ role?, isActive? }`
- **Permission required:** `employees:update`
- **Response:** `Employee`
- **Notes:** Cannot change the last `owner`. Cannot downgrade self from `owner`.

### PATCH /stores/:storeId/employees/:employeeId/permissions

Update employee custom permissions (future).

- **Body:** `{ permissions: string[] }` — only if custom permissions are supported
- **Permission required:** `employees:manage_permissions`
- **Response:** `Employee`
- **Notes:** Currently NOT supported — permissions are role-derived only. This endpoint
  would require a `permissions` column on `tenant_users` and changes to the JWT/permission
  resolution logic.

### DELETE /stores/:storeId/employees/:employeeId

Remove employee from store (disable or hard-delete).

- **Body:** (optional) `{ hardDelete?: boolean }`
- **Permission required:** `employees:delete`
- **Response:** `{ success: true }`
- **Notes:** Cannot delete the last `owner`. Hard-delete removes tenant_user record.
  Soft-delete sets `users.isActive = false`.

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
| Employee list UI | ✅ Built | Uses mock data; needs GET endpoint |
| Add employee dialog | ✅ Built | Save disabled; needs POST endpoint |
| Edit employee dialog | ✅ Built | Save disabled; needs PATCH endpoint |
| PermissionCheckboxMatrix | ✅ Built | Reads from PERMISSION_CATALOG + ROLE_PERMISSIONS |
| Role presets | ✅ Built | Fills checkboxes from ROLE_PERMISSIONS |
| Safety rules display | ✅ Built | Last-owner guard shown in UI |
| Action button guarding | ✅ Built | Uses PermissionGate with employees:* permissions |

---

## Implementation Order

1. Add DB migration for custom permissions (if needed)
2. Create GET /stores/:storeId/employees endpoint
3. Create POST /stores/:storeId/employees/invite endpoint
4. Create PATCH /stores/:storeId/employees/:employeeId endpoint
5. Create PATCH /stores/:storeId/employees/:employeeId/permissions endpoint
6. Create DELETE /stores/:storeId/employees/:employeeId endpoint
7. Wire frontend to real endpoints
8. Add safety rule enforcement to all endpoints
