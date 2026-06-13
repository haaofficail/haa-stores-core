import { useState } from 'react';
import type { Permission } from '@haa/shared';
import { X, AlertTriangle } from 'lucide-react';
import { PermissionCheckboxMatrix } from './PermissionCheckboxMatrix';
import { usePermissions } from '@/lib/permissions';

type EmployeeFormMode = 'create' | 'edit';

interface EmployeeFormData {
  name: string;
  email: string;
  role: string;
  permissions: Permission[];
  isActive: boolean;
}

interface EmployeeFormDialogProps {
  mode: EmployeeFormMode;
  open: boolean;
  onClose: () => void;
  initialData?: EmployeeFormData;
  onSave?: (data: EmployeeFormData) => void;
}

export function EmployeeFormDialog({
  mode,
  open,
  onClose,
  initialData,
}: EmployeeFormDialogProps) {
  const { can, permissions: userPerms } = usePermissions();
  const isOwner = can('employees:delete') && can('employees:manage_permissions');
  const canManagePerms = can('employees:manage_permissions');

  const [form, setForm] = useState<EmployeeFormData>(
    initialData ?? {
      name: '',
      email: '',
      role: 'viewer',
      permissions: [],
      isActive: true,
    }
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">
            {mode === 'create' ? 'إضافة موظف' : 'تعديل بيانات الموظف'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium text-neutral-700">الاسم</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                placeholder="الاسم الكامل"
                disabled
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium text-neutral-700">البريد الإلكتروني</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                placeholder="email@example.com"
                disabled
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">الدور</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
              disabled
            >
              <option value="owner">owner</option>
              <option value="admin">admin</option>
              <option value="manager">manager</option>
              <option value="products_manager">products_manager</option>
              <option value="orders_manager">orders_manager</option>
              <option value="accountant">accountant</option>
              <option value="support">support</option>
              <option value="viewer">viewer</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-neutral-300 text-blue-600"
              disabled
            />
            <span className="text-sm text-neutral-700">الحساب نشط</span>
          </div>

          <div className="border-t border-neutral-200 pt-4">
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">الصلاحيات</h3>
            <PermissionCheckboxMatrix
              selectedPermissions={form.permissions}
              onChange={perms => setForm(f => ({ ...f, permissions: perms }))}
              readOnly={!canManagePerms}
              currentUserPermissions={userPerms as Permission[]}
              isOwner={isOwner}
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-700">
              هذه الواجهة للعرض فقط.
              {mode === 'create' ? ' إضافة الموظفين' : ' تعديل بيانات الموظفين'}
              {' '}يتطلب واجهة برمجية (API) في الخلفية. سيتم تفعيل الحفظ عند توفر الـ API.
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            disabled
            className="px-4 py-2 text-sm font-medium text-white bg-neutral-300 rounded-lg cursor-not-allowed"
          >
            {mode === 'create' ? 'إضافة الموظف (غير متاح)' : 'حفظ التغييرات (غير متاح)'}
          </button>
        </div>
      </div>
    </div>
  );
}
