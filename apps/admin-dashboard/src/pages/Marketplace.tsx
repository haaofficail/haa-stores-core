/* eslint-disable @typescript-eslint/no-explicit-any -- admin pages carry legacy `any` typing on API responses; proper typing tracked separately (P2-030 follow-up). */
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdminDialog } from '../components/ui/AdminDialog';
import { SortableTh } from '../components/ui/SortableTh';
import { TablePager } from '../components/ui/TablePager';
import { useTableControls } from '../lib/useTableControls';
import { adminApi, hasAdminPermission } from '../lib/api';
import { queryKeys } from '../lib/queryClient';

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

const MARKETPLACE_PRODUCTS_PAGE_SIZE = 50;
const MARKETPLACE_ORDERS_PAGE_SIZE = 50;

function money(value: unknown) {
  return `${Number(value ?? 0).toFixed(2)} ر.س`;
}

type MarketplaceDecisionModal = {
  id: number;
  name: string;
  status: 'rejected' | 'suspended';
};

export default function Marketplace() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('pending');
  const [serverPage, setServerPage] = useState(1);
  const [ordersServerPage, setOrdersServerPage] = useState(1);
  const [decisionModal, setDecisionModal] = useState<MarketplaceDecisionModal | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const canReviewMarketplaceProduct = hasAdminPermission('marketplace.review');
  const canFeatureMarketplaceProduct = hasAdminPermission('marketplace.feature');

  // Primary products table — status is part of the query key so changing the
  // filter triggers a server refetch automatically.
  const { data: productsPage, isPending: loading, isError: error, refetch } = useQuery({
    queryKey: [...queryKeys.marketplaceProducts, status, serverPage, MARKETPLACE_PRODUCTS_PAGE_SIZE],
    queryFn: () => adminApi.getMarketplaceProducts({
      status: status || undefined,
      page: serverPage,
      limit: MARKETPLACE_PRODUCTS_PAGE_SIZE,
    }),
  });
  const products = productsPage?.data ?? [];

  // Secondary, read-only panels (summary, sellers, settlements, deep
  // report). These have no status dependency and are not part of this table's
  // data layer; they share one query so the dashboard renders unchanged.
  const { data: aux } = useQuery<any>({
    queryKey: [...queryKeys.marketplaceProducts, 'aux'],
    queryFn: async () => {
      const [summary, sellers, settlements, deepReport] = await Promise.all([
        adminApi.getMarketplaceSummary(),
        adminApi.getMarketplaceSellers(),
        adminApi.getMarketplaceSettlements(),
        adminApi.getMarketplaceDeepReport(),
      ]);
      return { summary, sellers, settlements, deepReport };
    },
  });

  const {
    data: ordersPage,
    isPending: ordersLoading,
    isError: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: [...queryKeys.marketplaceOrders, ordersServerPage, MARKETPLACE_ORDERS_PAGE_SIZE],
    queryFn: () => adminApi.getMarketplaceOrders({
      page: ordersServerPage,
      limit: MARKETPLACE_ORDERS_PAGE_SIZE,
    }),
  });

  const summary = aux?.summary ?? null;
  const sellers: any[] = aux?.sellers ?? [];
  const orders: any[] = ordersPage?.data ?? [];
  const settlements: any[] = aux?.settlements ?? [];
  const deepReport = aux?.deepReport ?? null;

  useEffect(() => {
    if (productsPage && productsPage.totalPages > 0 && serverPage > productsPage.totalPages) {
      setServerPage(productsPage.totalPages);
    }
  }, [productsPage, serverPage]);

  useEffect(() => {
    if (ordersPage && ordersPage.totalPages > 0 && ordersServerPage > ordersPage.totalPages) {
      setOrdersServerPage(ordersPage.totalPages);
    }
  }, [ordersPage, ordersServerPage]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.marketplaceProducts });

  const reviewMutation = useMutation({
    mutationFn: (vars: { id: number; nextStatus: 'approved' | 'rejected' | 'suspended' | 'pending'; note?: string }) =>
      adminApi.reviewMarketplaceProduct(vars.id, vars.nextStatus, vars.note),
    onSuccess: () => {
      toast.success('تم تحديث حالة المنتج');
      setDecisionModal(null);
      setRejectNote('');
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || 'فشل تحديث المنتج'),
  });

  const featureMutation = useMutation({
    mutationFn: (product: any) =>
      adminApi.featureMarketplaceProduct(product.id, {
        featured: !product.haaMarketplaceFeatured,
        sortOrder: product.haaMarketplaceFeatured ? 0 : 10,
      }),
    onSuccess: (_data, product) => {
      toast.success(product.haaMarketplaceFeatured ? 'تم إلغاء التمييز' : 'تم تمييز المنتج');
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || 'فشل تمييز المنتج'),
  });

  const review = (id: number, nextStatus: 'approved' | 'rejected' | 'suspended' | 'pending', note?: string) => {
    if (!canReviewMarketplaceProduct) {
      toast.error('لا تملك صلاحية مراجعة منتجات السوق');
      return;
    }
    reviewMutation.mutate({ id, nextStatus, note });
  };

  const toggleFeature = (product: any) => {
    if (!canFeatureMarketplaceProduct) {
      toast.error('لا تملك صلاحية تمييز منتجات السوق');
      return;
    }
    featureMutation.mutate(product);
  };

  const cards = [
    ['منتجات بانتظار الاعتماد', summary?.pendingProducts ?? 0],
    ['منتجات معتمدة', summary?.approvedProducts ?? 0],
    ['البائعون', summary?.sellers ?? 0],
    ['طلبات السوق', summary?.marketplaceOrders ?? 0],
    ['عمولة هاء', money(summary?.platformCommission)],
  ];

  const controls = useTableControls<any>({
    rows: products,
    searchFields: ['name', 'storeName', 'haaMarketplaceReviewStatus'],
    initialSort: { key: 'name', dir: 'desc' },
    pageSize: MARKETPLACE_PRODUCTS_PAGE_SIZE,
    storageKey: 'marketplaceProductsServerPaged',
  });
  const { query, setQuery } = controls;
  const totalProducts = productsPage?.total ?? 0;
  const totalPages = productsPage?.totalPages ?? 0;
  const pageStartIndex = totalProducts === 0 ? 0 : (serverPage - 1) * MARKETPLACE_PRODUCTS_PAGE_SIZE + 1;
  const pageEndIndex = Math.min(serverPage * MARKETPLACE_PRODUCTS_PAGE_SIZE, totalProducts);
  const totalOrders = ordersPage?.total ?? 0;
  const orderTotalPages = ordersPage?.totalPages ?? 0;
  const orderStartIndex = totalOrders === 0 ? 0 : (ordersServerPage - 1) * MARKETPLACE_ORDERS_PAGE_SIZE + 1;
  const orderEndIndex = Math.min(ordersServerPage * MARKETPLACE_ORDERS_PAGE_SIZE, totalOrders);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-title2 font-bold text-gray-900 tracking-tight">إدارة سوق هاء</h2>
          <p className="mt-1 text-sm text-gray-500">قناة تسويق ورقابة على المنتجات والطلبات القادمة من السوق.</p>
        </div>
        <a href="/marketplace" target="_blank" rel="noreferrer" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">فتح السوق</a>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-2 text-title2 font-bold text-gray-900 tabular-nums tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold">مراجعة منتجات السوق</h3>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث باسم المنتج أو البائع..."
              className="w-full max-w-sm rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setServerPage(1);
              }}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">كل الحالات</option>
              <option value="pending">بانتظار المراجعة</option>
              <option value="approved">معتمدة</option>
              <option value="rejected">مرفوضة</option>
              <option value="suspended">موقوفة</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <SortableTh sortKey="name" label="المنتج" sort={controls.sort} onToggle={controls.toggleSort} className="p-3" />
                <SortableTh sortKey="storeName" label="البائع" sort={controls.sort} onToggle={controls.toggleSort} className="p-3" />
                <SortableTh sortKey="price" label="السعر" sort={controls.sort} onToggle={controls.toggleSort} className="p-3" />
                <SortableTh sortKey="haaMarketplaceReviewStatus" label="الحالة" sort={controls.sort} onToggle={controls.toggleSort} className="p-3" />
                <SortableTh sortKey="haaMarketplaceFeatured" label="تمييز" sort={controls.sort} onToggle={controls.toggleSort} className="p-3" />
                <th className="p-3 text-start">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {controls.rows.map((product) => (
                <tr key={product.id} className="border-t">
                  <td className="p-3 font-medium">{product.name}</td>
                  <td className="p-3">{product.storeName}</td>
                  <td className="p-3">{money(product.price)}</td>
                  <td className="p-3">{statusLabels[product.haaMarketplaceReviewStatus] ?? product.haaMarketplaceReviewStatus}</td>
                  <td className="p-3">{product.haaMarketplaceFeatured ? 'مميز' : 'عادي'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button disabled={!canReviewMarketplaceProduct || reviewMutation.isPending} onClick={() => review(product.id, 'approved')} className="rounded bg-green-600 px-2 py-1 text-xs text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500">اعتماد</button>
                      <button disabled={!canReviewMarketplaceProduct || reviewMutation.isPending} onClick={() => { setRejectNote(''); setDecisionModal({ id: product.id, name: product.name, status: 'rejected' }); }} className="rounded bg-red-600 px-2 py-1 text-xs text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500">رفض</button>
                      <button disabled={!canReviewMarketplaceProduct || reviewMutation.isPending} onClick={() => { setRejectNote(''); setDecisionModal({ id: product.id, name: product.name, status: 'suspended' }); }} className="rounded bg-gray-700 px-2 py-1 text-xs text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500">إيقاف</button>
                      <button disabled={!canFeatureMarketplaceProduct || featureMutation.isPending} onClick={() => toggleFeature(product)} className="rounded bg-primary-600 px-2 py-1 text-xs text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500">{product.haaMarketplaceFeatured ? 'إلغاء التمييز' : 'تمييز'}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr><td className="p-6 text-center text-gray-500" colSpan={6}>جارٍ التحميل...</td></tr>
              )}
              {!loading && error && (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={6}>
                    <span className="me-3">فشل تحميل منتجات السوق</span>
                    <button onClick={() => refetch()} className="rounded border px-3 py-1 text-xs font-medium hover:bg-gray-50">إعادة المحاولة</button>
                  </td>
                </tr>
              )}
              {!loading && !error && products.length === 0 && (
                <tr><td className="p-6 text-center text-gray-500" colSpan={6}>لا توجد منتجات في هذا العرض.</td></tr>
              )}
              {!loading && !error && products.length > 0 && controls.filteredCount === 0 && (
                <tr><td className="p-6 text-center text-gray-500" colSpan={6}>لا توجد نتائج مطابقة</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalProducts > 0 && (
          <TablePager
            page={serverPage}
            totalPages={totalPages}
            startIndex={pageStartIndex}
            endIndex={pageEndIndex}
            filteredCount={totalProducts}
            onPageChange={setServerPage}
            itemLabel="منتج"
          />
        )}
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
                <a href={`/marketplace/sellers/${seller.slug}`} target="_blank" rel="noreferrer" className="text-primary-600">عرض</a>
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
            <a href="/payments/settlements" className="rounded-lg border px-3 py-2 text-xs font-semibold text-primary-600 hover:bg-primary-50">فتح التسويات اليدوية</a>
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
              {ordersLoading && (
                <tr><td className="p-6 text-center text-gray-500" colSpan={5}>جارٍ تحميل طلبات السوق...</td></tr>
              )}
              {!ordersLoading && ordersError && (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={5}>
                    <span className="me-3">فشل تحميل طلبات السوق</span>
                    <button onClick={() => refetchOrders()} className="rounded border px-3 py-1 text-xs font-medium hover:bg-gray-50">إعادة المحاولة</button>
                  </td>
                </tr>
              )}
              {!ordersLoading && !ordersError && orders.length === 0 && (
                <tr><td className="p-6 text-center text-gray-500" colSpan={5}>لا توجد طلبات سوق في هذا العرض.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalOrders > 0 && (
          <TablePager
            page={ordersServerPage}
            totalPages={orderTotalPages}
            startIndex={orderStartIndex}
            endIndex={orderEndIndex}
            filteredCount={totalOrders}
            onPageChange={setOrdersServerPage}
            itemLabel="طلب"
          />
        )}
      </section>
      {decisionModal && (
        <AdminDialog
          title={decisionModal.status === 'rejected' ? 'رفض المنتج' : 'إيقاف المنتج'}
          description={<span>المنتج: <span className="font-medium">{decisionModal.name}</span></span>}
          onClose={() => { setDecisionModal(null); setRejectNote(''); }}
        >
          <div className="rounded-lg bg-amber-50 text-amber-800 text-xs leading-5 p-3">
            سيظهر سبب القرار في سجل مراجعة المنتج. لا تتابع بدون سبب واضح وقابل للتنفيذ من البائع.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {decisionModal.status === 'rejected' ? 'سبب الرفض *' : 'سبب الإيقاف *'}
            </label>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              aria-label={decisionModal.status === 'rejected' ? 'سبب الرفض *' : 'سبب الإيقاف *'}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 h-28"
              placeholder={decisionModal.status === 'rejected' ? 'مثال: الصورة غير واضحة، الوصف ناقص...' : 'مثال: مخالفة سياسة السوق أو منتج منظّم بلا إثبات.'}
            />
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={() => review(decisionModal.id, decisionModal.status, rejectNote.trim())}
              disabled={!rejectNote.trim() || reviewMutation.isPending}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {decisionModal.status === 'rejected' ? 'تأكيد الرفض' : 'تأكيد الإيقاف'}
            </button>
            <button
              onClick={() => { setDecisionModal(null); setRejectNote(''); }}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </AdminDialog>
      )}
    </div>
  );
}
