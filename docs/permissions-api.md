# Permissions API

## Overview

The Permissions API provides endpoints for managing employee permissions with granular control. This API is part of RBAC Pass 6 and implements the real permission management system replacing the previous 501 stub.

## Endpoints

### GET /merchant/:storeId/permissions

Returns permissions grouped by category with selection status for the given store.

**Request Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `storeId` (path parameter) - Store identifier

**Response Body (200 OK):**
```json
{
  "success": true,
  "data": {
    "permissions": [
      {
        "key": "employees:view",
        "labelAr": "عرض الموظفين",
        "descriptionAr": "عرض قائمة موظفي المتجر",
        "category": "employees",
        "riskLevel": "medium",
        "allowedScopes": ["store"],
        "selected": true
      },
      {
        "key": "employees:update",
        "labelAr": "تعديل الموظف",
        "descriptionAr": "تعديل بيانات وصلاحيات الموظف",
        "category": "employees",
        "riskLevel": "critical",
        "allowedScopes": ["store"],
        "selected": false
      }
    ],
    "grouped": {
      "employees": [
        {
          "key": "employees:view",
          "labelAr": "عرض الموظفين",
          "descriptionAr": "عرض قائمة موظفي المتجر",
          "category": "employees",
          "riskLevel": "medium",
          "allowedScopes": ["store"]
        },
        {
          "key": "employees:invite",
          "labelAr": "دعوة موظف",
          "descriptionAr": "إرسال دعوة لموظف جديد للانضمام للمتجر",
          "category": "employees",
          "riskLevel": "high",
          "allowedScopes": ["store"]
        }
      ]
    }
  }
}
```

**Response Codes:**
- **200** - Successfully returned permissions
- **401** - Unauthorized - Missing or invalid token
- **403** - Forbidden - User lacks required permissions

### GET /merchant/:storeId/permission-presets

Returns all permission presets (templates for UI checkbox filling).

**Request Headers:**
- `Authorization: Bearer <token>`

**Response Body (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "key": "owner",
      "labelAr": "مالك",
      "permissionKeys": ["employees:view", "employees:invite", ...]
    },
    {
      "key": "store_manager",
      "labelAr": "مدير متجر",
      "permissionKeys": ["employees:view", "products:read", ...]
    }
  ]
}
```

**Response Codes:**
- **200** - Successfully returned presets
- **401** - Unauthorized - Missing or invalid token
- **403** - Forbidden - User lacks required permissions

### PATCH /merchant/:storeId/memberships/:membershipId

Updates the permissions for a specific membership (employee). Replaces the entire permission set for that membership.

**Request Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "permissions": [
    {
      "permissionKey": "employees:view",
      "scopeType": "store",
      "scopeId": null
    },
    {
      "permissionKey": "employees:invite",
      "scopeType": "store",
      "scopeId": null
    }
  ]
}
```

**Response Body (200 OK):**
```json
{
  "success": true,
  "data": {
    "membershipId": 123,
    "permissions": [
      {
        "permissionKey": "employees:view",
        "scopeType": "store",
        "scopeId": null,
        "createdAt": "2026-06-13T10:30:00Z",
        "createdByUserId": 1
      },
      {
        "permissionKey": "employees:invite",
        "scopeType": "store",
        "scopeId": null,
        "createdAt": "2026-06-13T10:35:00Z",
        "createdByUserId": 2
      }
    ]
  }
}
```

**Response Codes:**
- **200** - Successfully updated permissions
- **401** - Unauthorized - Missing or invalid token
- **403** - Forbidden - User lacks required permissions or trying to modify owner
- **404** - Not Found - Membership not found in the store

## Validation

### Validation Rules

1. **Permission Key Validation**
   - Permission keys must exist in the permission registry (PERMISSION_CATALOG)
   - Example error response: `{"success":false,"error":{"code":"INVALID_PERMISSION","message":"مفتاح الصلاحية 'invalid_key' غير موجود"}}`

2. **Scope Validation**
   - Scope type must be one of: `store`, `branch`, `warehouse`, `channel`
   - For now, only `store` scope is allowed
   - Example error response: `{"success":false,"error":{"code":"INVALID_SCOPE","message":"النطاق 'branch' غير متاح حالياً"}}`

3. **Existence Validation**
   - Membership must exist and belong to the store
   - Example error response: `{"success":false,"error":{"code":"NOT_FOUND","message":"الموظف غير موجود في هذا المتجر"}}`

4. **Authorization Validation**
   - User must have `employees:manage_permissions` permission
   - Cannot modify own permissions
   - Cannot modify owner permissions when only one owner exists
   - Example error response: `{"success":false,"error":{"code":"FORBIDDEN","message":"لا يمكنك تغيير صلاحياتك"}}`

### Permission Scope Validation

```typescript
// These are the only allowed scope types for now
const ALLOWED_SCOPES: ScopeType[] = ['store', 'branch', 'warehouse', 'channel'];

// Scope validation rules
if (!ALLOWED_SCOPES.includes(p.scopeType)) {
  return c.json(
    { success: false, error: { code: 'INVALID_SCOPE', message: `النطاق '${p.scopeType}' غير متاح حالياً` } },
    400
  );
}

// Only store scope is allowed for now
if (p.scopeType !== 'store') {
  return c.json(
    { success: false, error: { code: 'SCOPE_NOT_AVAILABLE', message: `النطاق '${p.scopeType}' غير متاح حالياً. الصلاحيات تعمل على مستوى المتجر فقط.` } },
    400
  );
}
```

## Tenant Isolation

### Store Isolation

1. **Store Membership Verification**
   - All endpoints verify that the membership belongs to the authenticated user's store
   - Uses inner joins with `stores` table to enforce tenant isolation

2. **Store Permission Boundary**
   - Users cannot access or modify permissions for memberships in other stores
   - All queries include `WHERE stores.id = storeId`

### Example SQL Query for Isolation

```sql
SELECT mp.permission_key, mp.scope_type, mp.scope_id
FROM membership_permissions mp
JOIN tenant_users tu ON mp.membership_id = tu.id
JOIN stores ON tu.tenant_id = stores.tenant_id
WHERE stores.id = ?
  AND tu.role != 'owner' -- Example: restrict certain operations to non-owners
```

## Permission Validation Examples

### Valid Request

```json
{
  "permissions": [
    { "permissionKey": "employees:view", "scopeType": "store", "scopeId": null },
    { "permissionKey": "employees:update", "scopeType": "store", "scopeId": null }
  ]
}
```

### Invalid Request (Unknown Permission)

```json
{
  "permissions": [
    { "permissionKey": "invalid_permission_key", "scopeType": "store", "scopeId": null }
  ]
}
Response: {"success":false,"error":{"code":"INVALID_PERMISSION","message":"مفتاح الصلاحية 'invalid_permission_key' غير موجود"}}
```

### Invalid Request (Scope Not Available)

```json
{
  "permissions": [
    { "permissionKey": "employees:view", "scopeType": "branch", "scopeId": 5 }
  ]
}
Response: {"success":false,"error":{"code":"SCOPE_NOT_AVAILABLE","message":"النطاق 'branch' غير متاح حالياً. الصلاحيات تعمل على مستوى المتجر فقط."}}
```

## Security Considerations

### Permission Validation

- All permission keys are validated against the centralized PERMISSION_CATALOG
- Only permitted permission keys can be assigned

### Authorization Checks

1. **PermissionGate Middleware**
   - All routes protected by `requirePermission('employees:manage_permissions')`

2. **Store Isolation**
   - Users can only modify permissions for memberships in their own store
   - Database queries include storeId conditions

3. **Owner Protection**
   - Cannot modify owner permissions when only one owner exists
   - Cannot modify own permissions

### Rate Limiting and Security

- Routes protected by existing API middleware (rate limiting, auth, etc.)
- No exposure of sensitive permission metadata
- All responses sanitized (no password hashes, secrets, or tokens)

## Testing

The implementation includes comprehensive test coverage in `tests/employee-management-api.test.ts`:

1. **Route Structure Tests**
   - GET /permissions endpoint existence
   - GET /permission-presets endpoint existence
   - PATCH /memberships/:membershipId endpoint existence

2. **Permission Validation Tests**
   - Invalid permission key rejection
   - Scope validation
   - Authorization checks

3. **Store Isolation Tests**
   - Cross-store permission access attempts
   - Tenant boundary enforcement

4. **Business Logic Tests**
   - Owner protection
   - Store membership verification
   - Permission key validation

## Dependencies

- `@haa/shared` - Permission catalog and types
- `@haa/auth-core` - Authentication middleware
- `@haa/db` - Database client

## Future Enhancements

The API is designed to be extensible for future phases:

1. **Branch/Warehouse/Channel Scopes**
   - Allow `branch`, `warehouse`, and `channel` scopes once their respective entities are created
   - Update validation logic to support multi-scope permissions

2. **Scoped Permissions**
   - Implement fine-grained permissions with scope-based access
   - Support different permission sets for different scopes

3. **Permission Request/Response Enhancement**
   - Add more metadata to permission responses
   - Include user-friendly descriptions and risk indicators

4. **Advanced Authorization**
   - Implement more complex authorization rules
   - Add role-based permission inheritance

## Related Components

- **Frontend**: `EmployeeFormDialog`, `PermissionCheckboxMatrix` - UI components for permission management
- **Backend**: `hasPermission()` - Authorization service
- **Documentation**: `RBAC_AUDIT.md`, `EMPLOYEE_MANAGEMENT_API_CONTRACT.md` - Technical documentation