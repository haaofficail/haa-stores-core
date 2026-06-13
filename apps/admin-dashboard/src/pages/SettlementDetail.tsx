import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminApi } from '../lib/api';
import { toast } from 'sonner';

const reconciliationColors: Record<string, string> = {
  matched: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  unmatched: 'bg-gray-100 text-gray-700',
};

const settlementStatusColors: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-700',
};

export default function SettlementDetail() {
  const { batchId } = useParams<{ batchId: string }>();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!batchId) return;
    setLoading(true);
    adminApi.getSettlementBatchDetail(Number(batchId))
      .then(setDetail)
      .catch(() => toast.error('فشل تحميل تفاصيل التسوية'))
      .finally(() => setLoading(false));
  }, [batchId]);

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">تفاصيل التسوية</h2>
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-6 w-full bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">تفاصيل التسوية</h2>
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-sm text-gray-500">لم يتم العثور على التسوية</p>
          <Link to="/payments" className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-2 inline-block">العودة للمدفوعات</Link>
        </div>
      </div>
    );
  }

  const settlementRef = `SET-${String(detail.id).padStart(6, '0')}`;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/payments" className="text-sm text-blue-600 hover:text-blue-800">← العودة للمدفوعات</Link>
        <h2 className="text-2xl font-bold">تفاصيل التسوية</h2>
        <span className="font-mono text-sm text-gray-500">{settlementRef}</span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${settlementStatusColors[detail.status] || 'bg-gray-100 text-gray-700'}`}>
          {detail.status}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">الإجمالي</p>
          <p className="text-lg font-bold mt-1">{Number(detail.grossAmount).toFixed(2)} SAR</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">رسوم البوابة</p>
          <p className="text-lg font-bold text-red-600 mt-1">{Number(detail.gatewayFees).toFixed(2)} SAR</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">رسوم المنصة</p>
          <p className="text-lg font-bold text-orange-600 mt-1">{Number(detail.platformFees).toFixed(2)} SAR</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">صافي المستحق</p>
          <p className="text-lg font-bold text-emerald-600 mt-1">{Number(detail.merchantPayable).toFixed(2)} SAR</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-bold">الطلبات المشمولة في التسوية</h3>
          <p className="text-sm text-gray-500 mt-0.5">{detail.transactions?.length ?? 0} عملية</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right font-medium text-gray-500">رقم الطلب</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">تاريخ الدفع</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">إجمالي الطلب</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">رسوم البوابة</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">رسوم المنصة</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">صافي المستحق</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">حالة المطابقة</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">المتجر</th>
            </tr>
          </thead>
          <tbody>
            {detail.transactions?.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">لا توجد معاملات في هذه التسوية</td>
              </tr>
            ) : (
              detail.transactions?.map((tx: any) => (
                <tr key={tx.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <a
                      href={`/admin/orders?storeId=${tx.storeId}&orderId=${tx.orderId}`}
                      className="font-mono text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {tx.orderNumber ?? `#${tx.orderId}`}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('ar-SA') : '-'}
                  </td>
                  <td className="px-4 py-3 font-medium tabular-nums">{Number(tx.amount).toFixed(2)} SAR</td>
                  <td className="px-4 py-3 text-red-600 tabular-nums">{Number(tx.gatewayFees).toFixed(2)} SAR</td>
                  <td className="px-4 py-3 text-orange-600 tabular-nums">{Number(tx.platformFees).toFixed(2)} SAR</td>
                  <td className="px-4 py-3 font-semibold text-emerald-600 tabular-nums">{Number(tx.merchantPayable).toFixed(2)} SAR</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${reconciliationColors[tx.reconciliationStatus] || 'bg-gray-100 text-gray-700'}`}>
                      {tx.reconciliationStatus === 'matched' ? 'مطابق' :
                       tx.reconciliationStatus === 'pending' ? 'قيد المراجعة' :
                       tx.reconciliationStatus === 'failed' ? 'غير مطابق' :
                       'غير مطابق'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">#{tx.storeId}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
