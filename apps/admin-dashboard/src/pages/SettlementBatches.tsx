import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../lib/api';
import type { Payout, SettlementBatch } from '../lib/api';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-primary-100 text-primary-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-700',
};

const statusLabels: Record<string, string> = {
  pending: 'معلق',
  processing: 'قيد المعالجة',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

const payoutStatusColors: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-700',
  under_review: 'bg-primary-100 text-primary-700',
  approved: 'bg-sky-100 text-sky-700',
  rejected: 'bg-red-100 text-red-700',
  transfer_pending: 'bg-amber-100 text-amber-700',
  transferred: 'bg-indigo-100 text-indigo-700',
  proof_uploaded: 'bg-purple-100 text-purple-700',
  transfer_verified: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700',
  reversed: 'bg-orange-100 text-orange-700',
};

const payoutStatusLabels: Record<string, string> = {
  requested: 'تم الطلب',
  under_review: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
  transfer_pending: 'بانتظار التحويل',
  transferred: 'تم التحويل',
  proof_uploaded: 'تم رفع الإثبات',
  transfer_verified: 'تم التحقق',
  failed: 'فشل',
  cancelled: 'ملغي',
  reversed: 'معكوس',
};

export default function SettlementBatches() {
  const [batches, setBatches] = useState<SettlementBatch[]>([]);
  const [manualPayouts, setManualPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('');
  const [storeIdFilter, setStoreIdFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    Promise.all([
      adminApi.getSettlementBatches(storeIdFilter ? Number(storeIdFilter) : undefined),
      adminApi.listPayouts(payoutStatusFilter || undefined),
    ])
      .then(([data, payouts]) => {
        let filtered = data;
        if (statusFilter) {
          filtered = filtered.filter((b) => b.status === statusFilter);
        }
        if (dateFrom) {
          const from = new Date(dateFrom);
          filtered = filtered.filter((b) => new Date(b.createdAt) >= from);
        }
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          filtered = filtered.filter((b) => new Date(b.createdAt) <= to);
        }
        setBatches(filtered);
        const filteredPayouts = storeIdFilter ? payouts.filter((p) => p.storeId === Number(storeIdFilter)) : payouts;
        setManualPayouts(filteredPayouts);
      })
      .catch(() => {
        setError(true);
        toast.error('فشل تحميل التسويات');
      })
      .finally(() => setLoading(false));
  }, [statusFilter, payoutStatusFilter, storeIdFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">دفعات التسوية</h2>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">حالة الدفعة</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">الكل</option>
            <option value="pending">معلق</option>
            <option value="processing">قيد المعالجة</option>
            <option value="completed">مكتمل</option>
            <option value="cancelled">ملغي</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">حالة التسوية اليدوية</label>
          <select
            value={payoutStatusFilter}
            onChange={(e) => setPayoutStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">الكل</option>
            <option value="requested">تم الطلب</option>
            <option value="under_review">قيد المراجعة</option>
            <option value="approved">معتمد</option>
            <option value="transfer_pending">بانتظار التحويل</option>
            <option value="transferred">تم التحويل</option>
            <option value="proof_uploaded">تم رفع الإثبات</option>
            <option value="transfer_verified">تم التحقق</option>
            <option value="rejected">مرفوض</option>
            <option value="cancelled">ملغي</option>
            <option value="reversed">معكوس</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">رقم المتجر</label>
          <input
            type="number"
            value={storeIdFilter}
            onChange={(e) => setStoreIdFilter(e.target.value)}
            placeholder="storeId"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">من تاريخ</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">إلى تاريخ</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={() => { setStatusFilter(''); setPayoutStatusFilter(''); setStoreIdFilter(''); setDateFrom(''); setDateTo(''); }}
          className="text-sm text-primary-600 hover:text-primary-700 px-3 py-2"
        >
          إعادة تعيين
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-bold">التسويات اليدوية</h3>
          <p className="text-sm text-gray-500 mt-0.5">{manualPayouts.length} طلب</p>
        </div>
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : manualPayouts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">لا توجد تسويات يدوية</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-start font-medium text-gray-500">رقم التسوية</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">المتجر</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">المبلغ</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">الحالة</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">تاريخ الطلب</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">آخر إجراء</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500" />
              </tr>
            </thead>
            <tbody>
              {manualPayouts.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-gray-900">{p.reference}</td>
                  <td className="px-4 py-3 text-gray-500">#{p.storeId}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-600 tabular-nums">{Number(p.amount).toFixed(2)} {p.currency}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${payoutStatusColors[p.status] || 'bg-gray-100 text-gray-700'}`}>
                      {payoutStatusLabels[p.status] || p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(p.requestedAt).toLocaleDateString('ar-SA')}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(p.updatedAt).toLocaleString('ar-SA')}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/payments/settlements/${p.id}?manual=1`}
                      className="text-primary-600 hover:text-primary-700 font-medium text-xs"
                    >
                      التفاصيل
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500 mb-3">فشل تحميل دفعات التسوية</p>
            <button
              onClick={() => load()}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : batches.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">لا توجد دفعات تسوية</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-start font-medium text-gray-500">رقم الدفعة</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">تاريخ الدورة</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">عدد المتاجر</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">عدد الطلبات</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">إجمالي المبلغ</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">صافي التسوية</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">الحالة</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500" />
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-gray-900">
                    SET-{String(b.id).padStart(6, '0')}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(b.createdAt).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="px-4 py-3 text-gray-500">-</td>
                  <td className="px-4 py-3 text-gray-500">-</td>
                  <td className="px-4 py-3 font-medium tabular-nums">
                    {Number(b.grossAmount).toFixed(2)} SAR
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-600 tabular-nums">
                    {Number(b.merchantPayable).toFixed(2)} SAR
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[b.status] || 'bg-gray-100 text-gray-700'}`}>
                      {statusLabels[b.status] || b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/payments/settlements/${b.id}`}
                      className="text-primary-600 hover:text-primary-700 font-medium text-xs"
                    >
                      التفاصيل
                    </Link>
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
