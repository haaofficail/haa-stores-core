import { useMemo } from 'react';
import { usePermissions } from '@/lib/permissions';
import { PERMISSION_CATALOG, ROLE_PERMISSIONS } from '@haa/shared';
import type { PermissionInfo, UserRole, Permission } from '@haa/shared';
import { ShieldAlert, Info } from 'lucide-react';

const HIGH_RISK_PERMS = new Set([
  'employees:manage_permissions',
  'api_keys:create',
  'api_keys:revoke',
  'settings:update',
  'subscriptions:manage',
  'wallet:withdraw',
]);

interface PermissionCheckboxMatrixProps {
  selectedPermissions: Permission[];
  onChange: (permissions: Permission[]) => void;
  readOnly?: boolean;
  currentUserPermissions?: Permission[];
  isOwner?: boolean;
}

function groupByCategory(catalog: typeof PERMISSION_CATALOG): Map<string, typeof PERMISSION_CATALOG> {
  const map = new Map<string, typeof PERMISSION_CATALOG>();
  for (const perm of catalog) {
    const existing = map.get(perm.category) ?? [];
    existing.push(perm);
    map.set(perm.category, existing);
  }
  return map;
}

const categoryLabels: Record<string, string> = {
  dashboard: 'لوحة التحكم',
  store: 'المتجر',
  products: 'المنتجات',
  categories: 'التصنيفات',
  brands: 'الماركات',
  tags: 'التاجات',
  orders: 'الطلبات',
  customers: 'العملاء',
  shipping: 'الشحن',
  wallet: 'المحفظة',
  wallet_payout: 'صرف المحفظة',
  coupons: 'الكوبونات',
  promotions: 'العروض',
  policies: 'السياسات',
  abandoned_carts: 'السلات المتروكة',
  reports: 'التقارير',
  theme: 'الثيم',
  settings: 'الإعدادات',
  employees: 'الموظفين',
  api_keys: 'مفاتيح API',
  compliance: 'الامتثال',
  subscriptions: 'الباقات',
  notifications: 'الإشعارات',
  export_import: 'التصدير والاستيراد',
  storefront: 'المتجر العام',
  support: 'الدعم',
};

export function PermissionCheckboxMatrix({
  selectedPermissions,
  onChange,
  readOnly = false,
  currentUserPermissions,
  isOwner = false,
}: PermissionCheckboxMatrixProps) {
  const { can } = usePermissions();
  const canManage = can('employees:manage_permissions');

  const grouped = useMemo(() => groupByCategory(PERMISSION_CATALOG), []);

  function togglePermission(key: Permission) {
    if (readOnly || !canManage) return;
    const next = selectedPermissions.includes(key)
      ? selectedPermissions.filter(p => p !== key)
      : [...selectedPermissions, key];
    onChange(next);
  }

  function toggleCategory(_category: string, perms: PermissionInfo[]) {
    if (readOnly || !canManage) return;
    const allSelected = perms.every((p: PermissionInfo) => selectedPermissions.includes(p.key));
    const categoryKeys: Permission[] = perms.map((p: PermissionInfo) => p.key);
    if (allSelected) {
      onChange(selectedPermissions.filter((p: Permission) => !categoryKeys.includes(p)));
    } else {
      const existing = selectedPermissions.filter((p: Permission) => !categoryKeys.includes(p));
      onChange([...existing, ...categoryKeys]);
    }
  }

  function applyRolePreset(role: UserRole) {
    if (readOnly || !canManage) return;
    const perms: Permission[] = ROLE_PERMISSIONS[role] ?? [];
    onChange([...perms]);
  }

  const roles = Object.keys(ROLE_PERMISSIONS) as UserRole[];

  const userCanGrant = (perm: Permission): boolean => {
    if (isOwner) return true;
    if (!currentUserPermissions) return true;
    return currentUserPermissions.includes(perm);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-neutral-700">الدور الأساسي</label>
        <select
          className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          disabled={readOnly || !canManage}
          onChange={(e) => {
            if (e.target.value) applyRolePreset(e.target.value as UserRole);
            e.target.value = '';
          }}
          value=""
        >
          <option value="">-- اختر دوراً لملء الصلاحيات --</option>
          {roles.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        {!canManage && (
          <span className="text-xs text-amber-600 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            ليس لديك صلاحية إدارة الصلاحيات
          </span>
        )}
      </div>

      <div className="text-xs text-neutral-500 bg-neutral-50 rounded-lg p-3">
        <Info className="h-3.5 w-3.5 inline ml-1" />
        ملاحظة: الصلاحيات المخصصة (تعديل الصلاحيات بشكل فردي) غير مدعومة حاليًا في النظام.
        يتم تحديد الصلاحيات بناءً على الدور فقط. التعديلات أدناه هي معاينة فقط ولا يتم حفظها حاليًا.
      </div>

      {Array.from(grouped.entries()).map(([category, perms]: [string, PermissionInfo[]]) => {
        const allSelected = perms.every((p: PermissionInfo) => selectedPermissions.includes(p.key));
        const someSelected = perms.some((p: PermissionInfo) => selectedPermissions.includes(p.key));

        return (
          <div key={category} className="border border-neutral-200 rounded-lg overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-2.5 bg-neutral-50 hover:bg-neutral-100 transition-colors"
              onClick={() => toggleCategory(category, perms)}
              disabled={readOnly || !canManage}
            >
              <span className="font-semibold text-sm text-neutral-700">
                {categoryLabels[category] || category}
              </span>
              <span className="text-xs text-neutral-400">
                {allSelected ? '✓ الكل' : someSelected ? 'جزئي' : 'اختيار الكل'}
              </span>
            </button>
            <div className="px-4 py-2 space-y-1">
              {perms.map((perm: PermissionInfo) => {
                const checked = selectedPermissions.includes(perm.key);
                const isHighRisk = HIGH_RISK_PERMS.has(perm.key);
                const canGrant = userCanGrant(perm.key);

                return (
                  <label
                    key={perm.key}
                    className={`flex items-center gap-3 py-1.5 rounded cursor-pointer ${
                      readOnly || !canManage ? 'opacity-70' : 'hover:bg-neutral-50'
                    } ${!canGrant && !isOwner ? 'opacity-40' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={readOnly || !canManage || (!canGrant && !isOwner)}
                      onChange={() => togglePermission(perm.key)}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-700">
                          {perm.labelAr}
                        </span>
                        {isHighRisk && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 border border-red-200">
                            <ShieldAlert className="h-3 w-3" />
                            حساسة
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-neutral-400 block truncate">
                        {perm.descriptionAr}
                      </span>
                    </div>
                    <span className="text-xs uppercase text-neutral-300 font-mono shrink-0">
                      {perm.key}
                    </span>
                    {(!canGrant && !isOwner) && (
                      <span className="text-xs text-amber-500 shrink-0">لا يمكنك منحها</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
