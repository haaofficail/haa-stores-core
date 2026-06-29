import { useState, useEffect, useCallback } from 'react';
import { PERMISSION_CATALOG, type Permission } from '@haa/shared';
import { PermissionGate, usePermissions } from '@/lib/permissions';
import { EmployeeFormDialog } from '@/components/employees/EmployeeFormDialog';
import {
  Plus, Pencil, UserX, Shield, ShieldAlert, Clock, Loader2, AlertTriangle, RefreshCw, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { employeesApi } from '@/lib/api';
import type { Employee } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { UnauthorizedState } from '@/components/ui/UnauthorizedState';

const roleLabels: Record<string, string> = {
  owner: 'مالك',
  admin: 'مدير',
  manager: 'مشرف',
  products_manager: 'مدير منتجات',
  orders_manager: 'مدير طلبات',
  warehouse_staff: 'موظف مستودع',
  accountant: 'محاسب',
  support: 'دعم',
  viewer: 'مشاهد',
};

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

function PermissionsPreview() {
  const categories = Array.from(new Set(PERMISSION_CATALOG.map(p => p.category)));

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {categories.map((cat: string) => {
        const count = PERMISSION_CATALOG.filter((p: typeof PERMISSION_CATALOG[number]) => p.category === cat).length;
        return (
          <div key={cat} className="bg-neutral-50 rounded-lg p-3 text-center border border-neutral-100">
            <div className="text-xs font-semibold text-neutral-600">{categoryLabels[cat as keyof typeof categoryLabels] || cat}</div>
            <div className="text-lg font-bold text-neutral-800 mt-1">{count}</div>
            <div className="text-xs text-neutral-400">صلاحية</div>
          </div>
        );
      })}
    </div>
  );
}

function toStorePermissionAssignments(permissionKeys: string[]) {
  return permissionKeys.map(key => ({
    permissionKey: key,
    scopeType: 'store' as const,
    scopeId: undefined,
  }));
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const { can } = usePermissions();
  const canViewEmployees = can('employees:view');
  const canManageEmployeePermissions = can('employees:manage_permissions');

  // Source-of-truth: useAuth().storeId is the canonical accessor.
  // Reading the localStorage key directly used `Number(...)` on a value
  // that may be `null`, which coerces to `0` — that then issued a
  // request to `/merchant/0/employees` → silent 404. The auth hook
  // already falls back to `user.activeStoreId` when localStorage is
  // empty and returns `null` (not zero) when neither is available.
  // See: audit PART_5 row 2 (P1, source-of-truth).
  const { storeId } = useAuth();

  const fetchEmployees = useCallback(async () => {
    if (!storeId || !canViewEmployees) return;
    setLoading(true);
    setError(null);
    try {
      const data = await employeesApi.list(storeId);
      setEmployees(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'فشل تحميل قائمة الموظفين'));
    } finally {
      setLoading(false);
    }
  }, [storeId, canViewEmployees]);

  useEffect(() => {
    if (storeId && canViewEmployees) fetchEmployees();
  }, [storeId, canViewEmployees, fetchEmployees]);

  function formatDate(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function openCreate() {
    setEditTarget(null);
    setDialogMode('create');
    setDialogOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditTarget(emp);
    setDialogMode('edit');
    setDialogOpen(true);
  }

  async function handleSave(data: { name: string; email: string; role: string; permissions: string[]; isActive: boolean; password?: string }) {
    if (!storeId) return;
    if (dialogMode === 'create') {
      const created = await employeesApi.invite(storeId, {
        name: data.name,
        email: data.email,
        password: data.password ?? '',
        role: data.role,
      });
      if (canManageEmployeePermissions) {
        await employeesApi.updateMemberPermissions(
          storeId,
          created.id,
          toStorePermissionAssignments(data.permissions),
        );
      }
    } else if (editTarget) {
      await employeesApi.update(storeId, editTarget.id, {
        role: data.role,
        isActive: data.isActive,
      });
      // Update permissions separately via permissions API. Empty arrays are
      // meaningful: they clear custom permissions for the membership.
      if (canManageEmployeePermissions) {
        await employeesApi.updateMemberPermissions(
          storeId,
          editTarget.id,
          toStorePermissionAssignments(data.permissions),
        );
      }
    }
  }

  async function handleDelete(emp: Employee) {
    if (!storeId) return;
    if (!window.confirm(`هل أنت متأكد من حذف ${emp.name}؟`)) return;
    setDeleting(emp.id);
    try {
      await employeesApi.remove(storeId, emp.id);
      await fetchEmployees();
      toast.success('تم حذف الموظف بنجاح');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'فشل حذف الموظف'));
    } finally {
      setDeleting(null);
    }
  }

  function handleDialogClose() {
    setDialogOpen(false);
    setEditTarget(null);
    fetchEmployees();
  }

  const ownerCount = employees.filter(e => e.role === 'owner').length;

  if (!canViewEmployees) {
    return (
      <div className="p-6" dir="rtl">
        <UnauthorizedState />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">الموظفين</h1>
          <p className="text-sm text-neutral-500 mt-1">إدارة موظفي المتجر والصلاحيات</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Touch target ≥ 44x44 (WCAG 2.5.5). */}
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={fetchEmployees} disabled={loading} title="تحديث" aria-label="تحديث قائمة الموظفين">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <PermissionGate permission="employees:invite">
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              إضافة موظف
            </Button>
          </PermissionGate>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <div className="text-xs text-red-700">{error}</div>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl border border-neutral-200 p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
          <p className="text-sm text-neutral-500">جاري تحميل الموظفين...</p>
        </div>
      )}

      {!loading && !error && employees.length === 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 p-12 flex flex-col items-center justify-center gap-3">
          <Users className="h-12 w-12 text-neutral-300" />
          <p className="text-sm font-medium text-neutral-600">لا يوجد موظفون بعد</p>
          <p className="text-xs text-neutral-400 text-center max-w-xs">لم تقم بإضافة أي موظف بعد. أضف أول موظف للبدء بإدارة الصلاحيات.</p>
          <PermissionGate permission="employees:invite">
            <Button className="mt-2" onClick={openCreate}>إضافة موظف</Button>
          </PermissionGate>
        </div>
      )}

      {!loading && !error && employees.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50">
                  <th className="text-start px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">الاسم</th>
                  <th className="text-start px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">البريد</th>
                  <th className="text-start px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">الدور</th>
                  <th className="text-start px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">الحالة</th>
                  <th className="text-start px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">آخر نشاط</th>
                  <th className="text-start px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">الصلاحيات</th>
                  <th className="text-end px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xs font-bold">
                          {emp.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-neutral-800">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{emp.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">
                        <Shield className="h-3 w-3" />
                        {roleLabels[emp.role] || emp.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {emp.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          نشط
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-500 border border-neutral-200">
                          غير نشط
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(emp.lastLoginAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">{emp.permissions.length} صلاحية</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {emp.role === 'owner' && ownerCount <= 1 ? (
                          <div
                            className="max-w-[190px] rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-start"
                            title="لا يمكن تعديل أو حذف آخر مالك. عيّن مالكًا آخر أولًا."
                          >
                            <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3" />
                              آخر مالك
                            </span>
                            <p className="mt-0.5 text-xs leading-4 text-amber-700">
                              عيّن مالكًا آخر قبل التعديل أو الحذف.
                            </p>
                          </div>
                        ) : (
                          <>
                            <PermissionGate permission="employees:update">
                              <Button variant="ghost" size="icon-sm" onClick={() => openEdit(emp)} title="تعديل">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </PermissionGate>
                            <PermissionGate permission="employees:delete">
                              <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(emp)}
                                disabled={deleting === emp.id} title="حذف"
                                className="text-neutral-500 hover:text-red-600 hover:bg-red-50">
                                {deleting === emp.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                              </Button>
                            </PermissionGate>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PermissionGate permission="employees:manage_permissions">
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <h3 className="text-sm font-semibold text-neutral-700 mb-3">معاينة مصفوفة الصلاحيات</h3>
          <p className="text-xs text-neutral-500 mb-4">
            هذه معاينة لمصفوفة الصلاحيات المبنية على {PERMISSION_CATALOG.length} صلاحية في الكتالوج.
            تبدأ الصلاحيات من دور الموظف ويمكن تخصيصها لمن يملك صلاحية إدارة الصلاحيات.
          </p>
          <PermissionsPreview />
        </div>
      </PermissionGate>

      <EmployeeFormDialog
        mode={dialogMode}
        open={dialogOpen}
        onClose={handleDialogClose}
        onSave={handleSave}
        initialData={editTarget ? {
          id: editTarget.id,
          name: editTarget.name,
          email: editTarget.email,
          role: editTarget.role,
          permissions: editTarget.permissions as Permission[],
          isActive: editTarget.isActive,
        } : undefined}
      />
    </div>
  );
}
