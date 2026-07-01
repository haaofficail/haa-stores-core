/* eslint-disable @typescript-eslint/no-explicit-any -- admin pages carry legacy `any` typing on API responses; proper typing tracked separately (P2-030 follow-up). */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import { toast } from 'sonner';
import { AdminTableSkeleton } from '../components/ui/AdminTableSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { AdminEmptyState } from '../components/ui/AdminEmptyState';
import { SortableTh } from '../components/ui/SortableTh';
import { TablePager } from '../components/ui/TablePager';
import { useTableControls } from '../lib/useTableControls';

export default function AdminUsers() {
  const { data: users = [], isPending: loading, isError: error, refetch } = useQuery<any[]>({
    queryKey: queryKeys.adminUsers,
    queryFn: () => adminApi.getAdminUsers(),
  });

  useEffect(() => {
    if (error) toast.error('فشل تحميل المستخدمين');
  }, [error]);

  const adminCount = users.filter(u => u.isAdmin).length;

  const controls = useTableControls<any>({
    rows: users,
    searchFields: ['name', 'email'],
    initialSort: { key: 'name', dir: 'asc' },
    storageKey: 'adminUsers',
  });
  const { query, setQuery } = controls;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-title2 font-bold text-gray-900 tracking-tight">مستخدمو المنصة</h2>
          <p className="text-sm text-gray-500 mt-1">{users.length} مستخدم · {adminCount} أدمن</p>
        </div>
      </div>
      <div className="mb-4">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="بحث بالاسم أو البريد الإلكتروني..."
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <AdminTableSkeleton />
        ) : error ? (
          <ErrorState message="فشل تحميل المستخدمين" onRetry={() => refetch()} />
        ) : users.length === 0 ? (
          <AdminEmptyState
            icon="UserCog"
            title="لا يوجد مستخدمون إداريون"
            description="يجب أن تظهر أدوار المنصة وصلاحياتها و2FA وآخر دخول قبل اعتبار صفحة المستخدمين جاهزة للتشغيل المؤسسي."
            meaning="الإجراء التالي: راجع أمان الحساب والصلاحيات قبل إضافة مشغّلين جدد."
            actions={[{ label: 'فتح أمان الحساب', href: '/security' }]}
          />
        ) : controls.filteredCount === 0 ? (
          <AdminEmptyState
            icon="AlertCircle"
            title="لا توجد نتائج مطابقة"
            description="غيّر البحث قبل افتراض عدم وجود مستخدم أو دور معيّن."
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <SortableTh sortKey="name" label="الاسم" sort={controls.sort} onToggle={controls.toggleSort} />
                  <SortableTh sortKey="email" label="البريد الإلكتروني" sort={controls.sort} onToggle={controls.toggleSort} />
                  <th className="px-4 py-3 text-start font-medium text-gray-500">الدور</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-500">الحالة</th>
                  <SortableTh sortKey="createdAt" label="تاريخ الإنشاء" sort={controls.sort} onToggle={controls.toggleSort} />
                </tr>
              </thead>
              <tbody>
                {controls.rows.map((u: any) => (
                  <tr key={u.id} className="border-t hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email || '-'}</td>
                    <td className="px-4 py-3">
                      {u.isAdmin ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-primary-100 text-primary-700">أدمن</span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">مستخدم</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.isActive ? 'نشط' : 'موقوف'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-SA') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePager
              page={controls.page}
              totalPages={controls.totalPages}
              startIndex={controls.startIndex}
              endIndex={controls.endIndex}
              filteredCount={controls.filteredCount}
              onPageChange={controls.setPage}
              itemLabel="مستخدم"
            />
          </>
        )}
      </div>
    </div>
  );
}
