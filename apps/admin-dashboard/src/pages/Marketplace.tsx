import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminApi } from '../lib/api';

const statusLabels: Record<string, string> = {
  pending: 'بانتظار المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
  suspended: 'موقوف',
  submitted: 'مقدم',
  under_review: 'قيد المراجعة',
  resolved: 'محلول',
  paid: 'مدفوع',
  unpaid: 'غير مدفوع',
  mixed: 'متعدد',
};

function money(value: unknown) {
  return `${Number(value ?? 0).toFixed(2)} ر.س`;
}

export default function Marketplace() {
  const [summary, setSummary] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [deepReport, setDeepReport] = useState<any>(null);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);

  const load = async (nextStatus = status) => {
    setLoading(true);
    try {
      const [summaryResult, productsResult, sellersResult, ordersResult, settlementsResult, deepReportResult] = await Promise.all([
        adminApi.getMarketplaceSummary(),
        adminApi.getMarketplaceProducts(nextStatus || undefined),
        adminApi.getMarketplaceSellers(),
        adminApi.getMarketplaceOrders(),
        adminApi.getMarketplaceSettlements(),
        adminApi.getMarketplaceDeepReport(),
      ]);
      setSummary(summaryResult);
      setProducts(productsResult);
      setSellers(sellersResult);
      setOrders(ordersResult);
      setSettlements(settlementsResult);
      setDeepReport(deepReportResult);
    } catch (error: any) {
      toast.error(error?.message || 'فشل تحميل سوق هاء');
    } finally {
      setLoading(false);
    }
  };

  // Mount-only initial load. Subsequent reloads are triggered explicitly:
  // the status filter's onChange calls load(nextStatus), and mutation
  // handlers call load() after success. Adding `load` to the deps would
  // double-fetch on every filter change, so the empty array is intentional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const review = async (id: number, nextStatus: 'approved' | 'rejected' | 'suspended' | 'pending') => {
    try {
      const note = nextStatus === 'rejected' ? window.prompt('سبب الرفض') || undefined : undefined;
      await adminApi.reviewMarketplaceProduct(id, nextStatus, note);
      toast.success('تم تحديث حالة المنتج');
      load();
    } catch (error: any) {
      toast.error(error?.message || 'فشل تحديث المنتج');
    }
  };

  const toggleFeature = async (product: any) => {
    try {
      await adminApi.featureMarketplaceProduct(product.id, {
        featured: !product.haaMarketplaceFeatured,
        sortOrder: product.haaMarketplaceFeatured ? 0 : 10,
      });
      toast.success(product.haaMarketplaceFeatured ? 'تم إلغاء التمييز' : 'تم تمييز المنتج');
      load();
    } catch (error: any) {
      toast.error(error?.message || 'فشل تمييز المنتج');
    }
  };

  const cards = [
    ['منتجات بانتظار الاعتماد', summary?.pendingProducts ?? 0],
    ['منتجات معتمدة', summary?.approvedProducts ?? 0],
    ['البائعون', summary?.sellers ?? 0],
    ['طلبات السوق', summary?.marketplaceOrders ?? 0],
    ['عمولة هاء', money(summary?.platformCommission)],
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">إدارة سوق هاء</h2>
          <p className="mt-1 text-sm text-gray-500">قناة تسويق ورقابة على المنتجات والطلبات القادمة من السوق.</p>
        </div>
        <a href="/marketplace" target="_blank" rel="noreferrer" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">فتح السوق</a>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-2 text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold">مراجعة منتجات السوق</h3>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); load(e.target.value); }}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">كل الحالات</option>
            <option value="pending">بانتظار المراجعة</option>
            <option value="approved">معتمدة</option>
            <option value="rejected">مرفوضة</option>
            <option value="suspended">موقوفة</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="p-3 text-start">المنتج</th>
                <th className="p-3 text-start">البائع</th>
                <th className="p-3 text-start">السعر</th>
                <th className="p-3 text-start">الحالة</th>
                <th className="p-3 text-start">تمييز</th>
                <th className="p-3 text-start">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t">
                  <td className="p-3 font-medium">{product.name}</td>
                  <td className="p-3">{product.storeName}</td>
                  <td className="p-3">{money(product.price)}</td>
                  <td className="p-3">{statusLabels[product.haaMarketplaceReviewStatus] ?? product.haaMarketplaceReviewStatus}</td>
                  <td className="p-3">{product.haaMarketplaceFeatured ? 'مميز' : 'عادي'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => review(product.id, 'approved')} className="rounded bg-green-600 px-2 py-1 text-xs text-white">اعتماد</button>
                      <button onClick={() => review(product.id, 'rejected')} className="rounded bg-red-600 px-2 py-1 text-xs text-white">رفض</button>
                      <button onClick={() => review(product.id, 'suspended')} className="rounded bg-gray-700 px-2 py-1 text-xs text-white">إيقاف</button>
                      <button onClick={() => toggleFeature(product)} className="rounded bg-blue-600 px-2 py-1 text-xs text-white">{product.haaMarketplaceFeatured ? 'إلغاء التمييز' : 'تمييز'}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && products.length === 0 && (
                <tr><td className="p-6 text-center text-gray-500" colSpan={6}>لا توجد منتجات في هذا العرض.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold">البائعون</h3>
          <div className="space-y-2">
            {sellers.map((seller) => (
              <div key={seller.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm">
                <div>
                  <p className="font-semibold">{seller.name}</p>
                  <p className="text-xs text-gray-500">{seller.city || 'بدون مدينة'} · {seller.approvedCount} معتمد · {seller.pendingCount} معلق</p>
                </div>
                <a href={`/marketplace/sellers/${seller.slug}`} target="_blank" rel="noreferrer" className="text-blue-600">عرض</a>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">التسويات والعمولات</h3>
              <p className="mt-1 text-xs text-gray-500">تقرير رقابي فقط؛ تنفيذ التحويلات يتم عبر مسار التسويات اليدوية.</p>
            </div>
            <a href="/payments/settlements" className="rounded-lg border px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50">فتح التسويات اليدوية</a>
          </div>
          <div className="space-y-2">
            {settlements.map((row) => (
              <div key={row.storeId} className="rounded-lg bg-gray-50 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <p className="font-semibold">{row.storeName}</p>
                  <p>{row.orderCount} طلب</p>
                </div>
                <p className="mt-1 text-xs text-gray-500">المبيعات: {money(row.grossSales)} · عمولة هاء: {money(row.platformCommission)} · صافي التاجر: {money(row.sellerNet)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold">تقرير السوق العميق</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">GMV</p><p className="mt-1 font-bold">{money(deepReport?.totals?.gmv)}</p></div>
            <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">العمولة</p><p className="mt-1 font-bold">{money(deepReport?.totals?.commission)}</p></div>
            <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">الطلبات</p><p className="mt-1 font-bold">{deepReport?.totals?.orders ?? 0}</p></div>
            <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">الشحن</p><p className="mt-1 font-bold">{money(deepReport?.totals?.shipping)}</p></div>
          </div>
          <h4 className="mt-5 text-sm font-bold">أفضل البائعين</h4>
          <div className="mt-2 space-y-2">
            {(deepReport?.topSellers ?? []).slice(0, 5).map((seller: any) => (
              <div key={seller.storeSlug} className="flex justify-between rounded-lg bg-gray-50 p-2 text-xs">
                <span>{seller.storeName}</span>
                <span>{money(seller.gmv)} · {seller.orders} طلب</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold">طلبات السوق الموحدة</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="p-3 text-start">رقم الطلب</th>
                <th className="p-3 text-start">العميل</th>
                <th className="p-3 text-start">الدفع</th>
                <th className="p-3 text-start">الإجمالي</th>
                <th className="p-3 text-start">العمولة</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t">
                  <td className="p-3 font-semibold">{order.marketplaceOrderNumber}</td>
                  <td className="p-3">{order.customerName}</td>
                  <td className="p-3">{statusLabels[order.paymentStatus] ?? order.paymentStatus}</td>
                  <td className="p-3">{money(order.total)}</td>
                  <td className="p-3">{money(order.platformCommission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
