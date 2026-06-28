/* eslint-disable @typescript-eslint/no-explicit-any -- admin pages carry legacy `any` typing on API responses; proper typing tracked separately (P2-030 follow-up). */
import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import { toast } from 'sonner';
import { AdminTableSkeleton } from '../components/ui/AdminTableSkeleton';
import { ErrorState } from '../components/ui/ErrorState';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    adminApi.getAdminUsers()
      .then(setUsers)
      .catch(() => { setError(true); toast.error('فشل تحميل المستخدمين'); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  const adminCount = users.filter(u => u.isAdmin).length;

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
          <ErrorState message="فشل تحميل المستخدمين" onRetry={load} />
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-footnote text-gray-400">{query ? 'لا توجد نتائج للبحث' : 'لا يوجد مستخدمون'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-start font-medium text-gray-500">الاسم</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">البريد الإلكتروني</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">الدور</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">الحالة</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u: any) => (
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
        )}
      </div>
    </div>
  );
}
