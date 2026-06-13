import { useState } from 'react';
import { PERMISSION_CATALOG } from '@haa/shared';
import { PermissionGate } from '@/lib/permissions';
import { EmployeeFormDialog } from '@/components/employees/EmployeeFormDialog';
import {
  Plus, Pencil, UserX, Shield, ShieldAlert, Info, Clock,
} from 'lucide-react';

interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  permissionsCount: number;
}

const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 1,
    name: 'أحمد محمد',
    email: 'ahmed@example.com',
    role: 'owner',
    isActive: true,
    lastLoginAt: '2026-06-13T08:30:00Z',
    permissionsCount: 84,
  },
  {
    id: 2,
    name: 'سارة علي',
    email: 'sara@example.com',
    role: 'admin',
    isActive: true,
    lastLoginAt: '2026-06-12T14:20:00Z',
    permissionsCount: 65,
  },
  {
    id: 3,
    name: 'خالد عمر',
    email: 'khalid@example.com',
    role: 'manager',
    isActive: true,
    lastLoginAt: '2026-06-11T10:15:00Z',
    permissionsCount: 32,
  },
  {
    id: 4,
    name: 'نورة عبدالله',
    email: 'noura@example.com',
    role: 'viewer',
    isActive: false,
    lastLoginAt: null,
    permissionsCount: 8,
  },
];

const roleLabels: Record<string, string> = {
  owner: 'مالك',
  admin: 'مدير',
  manager: 'مشرف',
  products_manager: 'مدير منتجات',
  orders_manager: 'مدير طلبات',
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
            <div className="text-[10px] text-neutral-400">صلاحية</div>
          </div>
        );
      })}
    </div>
  );
}

export default function EmployeesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');

  function formatDate(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function openCreate() {
    setDialogMode('create');
    setDialogOpen(true);
  }

  function openEdit() {
    setDialogMode('edit');
    setDialogOpen(true);
  }

  const ownerCount = MOCK_EMPLOYEES.filter(e => e.role === 'owner').length;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">الموظفين</h1>
          <p className="text-sm text-neutral-500 mt-1">إدارة موظفي المتجر والصلاحيات</p>
        </div>
        <PermissionGate permission="employees:invite">
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
          >
            <Plus className="h-4 w-4" />
            إضافة موظف
          </button>
        </PermissionGate>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
        <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-700">
          هذه الواجهة للعرض التجريبي. قائمة الموظفين معبئة ببيانات نموذجية.
          ربط الـ API الفعلي مطلوب لتشغيل الإجراءات كاملة.
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">الاسم</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">البريد</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">الدور</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">الحالة</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">آخر نشاط</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">الصلاحيات</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_EMPLOYEES.map((emp) => (
                <tr key={emp.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {emp.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-neutral-800">{emp.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{emp.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
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
                  <td className="px-4 py-3 text-xs text-neutral-500">{emp.permissionsCount} صلاحية</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {emp.role === 'owner' && ownerCount <= 1 ? (
                        <span className="text-[10px] text-amber-500 flex items-center gap-1" title="لا يمكن تعديل أو حذف آخر مالك">
                          <ShieldAlert className="h-3 w-3" />
                          آخر مالك
                        </span>
                      ) : (
                        <>
                          <PermissionGate permission="employees:update">
                            <button
                              onClick={openEdit}
                              className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-500 hover:text-neutral-700"
                              title="تعديل"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </PermissionGate>
                          <PermissionGate permission="employees:delete">
                            <button
                              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-neutral-500 hover:text-red-600"
                              title="حذف"
                            >
                              <UserX className="h-4 w-4" />
                            </button>
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

      <PermissionGate permission="employees:manage_permissions">
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <h3 className="text-sm font-semibold text-neutral-700 mb-3">معاينة مصفوفة الصلاحيات</h3>
          <p className="text-xs text-neutral-500 mb-4">
            هذه معاينة لمصفوفة الصلاحيات المبنية على {PERMISSION_CATALOG.length} صلاحية في الكتالوج.
            التعديلات هنا لا تُحفظ حاليًا.
          </p>
          <PermissionsPreview />
        </div>
      </PermissionGate>

      <EmployeeFormDialog
        mode={dialogMode}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
