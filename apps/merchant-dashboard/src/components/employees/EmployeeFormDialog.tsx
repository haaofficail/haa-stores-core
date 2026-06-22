import { useState, useEffect } from 'react';
import type { Permission } from '@haa/shared';
import { X, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';
import { PermissionCheckboxMatrix } from './PermissionCheckboxMatrix';
import { usePermissions } from '@/lib/permissions';
import { employeesApi } from '@/lib/api';

type EmployeeFormMode = 'create' | 'edit';

interface EmployeeFormData {
  id?: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  password?: string;
}

interface EmployeeFormDialogProps {
  mode: EmployeeFormMode;
  open: boolean;
  onClose: () => void;
  initialData?: EmployeeFormData;
  onSave?: (data: EmployeeFormData) => Promise<void>;
}

export function EmployeeFormDialog({
  mode,
  open,
  onClose,
  initialData,
  onSave,
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
      password: '',
    }
  );
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load permissions when editing
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setForm({
        name: initialData.name,
        email: initialData.email,
        role: initialData.role,
        permissions: initialData.permissions,
        isActive: initialData.isActive,
      });
      // Load member's specific permissions
      const storeId = Number(localStorage.getItem('active_store_id'));
      if (storeId) {
        setLoading(true);
        employeesApi.getMemberPermissions(storeId, initialData.id!)
          .then(data => {
            if (data.permissions) {
              setForm(f => ({
                ...f,
                permissions: data.permissions.map(p => p.permissionKey),
              }));
            }
          })
          .catch(() => {
            // Fallback to role-based permissions
          })
          .finally(() => setLoading(false));
      }
    } else if (mode === 'create') {
      setForm({
        name: '',
        email: '',
        role: 'viewer',
        permissions: [],
        isActive: true,
        password: '',
      });
      setConfirmPassword('');
    }
  }, [mode, initialData]);

  if (!open) return null;

  async function handleSave() {
    if (!onSave) return;
    if (mode === 'create') {
      if (!form.password || form.password.length < 6) {
        setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
      }
      if (form.password !== confirmPassword) {
        setError('كلمتا المرور غير متطابقتين');
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...form });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  }

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
          {/* Modal close — touch target ≥ 44x44 (WCAG 2.5.5). */}
          <button
            onClick={onClose}
            disabled={loading || saving}
            aria-label="إغلاق"
            className="h-11 w-11 inline-flex items-center justify-center hover:bg-neutral-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-400 disabled:opacity-40"
          >
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-primary-500 animate-spin" />
              <span className="ms-2 text-sm text-neutral-500">جاري تحميل الصلاحيات...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div className="text-xs text-red-700">{error}</div>
            </div>
          )}

          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium text-neutral-700">الاسم</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                placeholder="الاسم الكامل"
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
              />
            </div>
            </div>

            <input type="hidden" name="loading" value={loading.toString()} />

            {mode === 'create' && (
            <div className="flex gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password ?? ''}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm ps-9"
                    placeholder="6 أحرف على الأقل"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">تأكيد كلمة المرور</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="أعد كتابة كلمة المرور"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">الدور</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="owner">مالك</option>
              <option value="admin">مدير</option>
              <option value="manager">مشرف</option>
              <option value="products_manager">مدير منتجات</option>
              <option value="orders_manager">مدير طلبات</option>
              <option value="accountant">محاسب</option>
              <option value="support">دعم</option>
              <option value="viewer">مشاهد</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-neutral-300 text-primary-600"
            />
            <span className="text-sm text-neutral-700">الحساب نشط</span>
          </div>

          <div className="border-t border-neutral-200 pt-4">
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">الصلاحيات</h3>
            <PermissionCheckboxMatrix
              selectedPermissions={form.permissions as Permission[]}
              onChange={perms => setForm(f => ({ ...f, permissions: perms as string[] }))}
              readOnly={!canManagePerms}
              currentUserPermissions={userPerms as Permission[]}
              isOwner={isOwner}
            />
          </div>

          {mode === 'create' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-700">
                احفظ كلمة المرور المُدخلة وشاركها مع الموظف — لا يوجد بريد دعوة تلقائي.
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !onSave}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? 'جاري الحفظ...' : mode === 'create' ? 'إضافة الموظف' : 'حفظ التغييرات'}
          </button>
        </div>
      </div>
    </div>
  );
}
