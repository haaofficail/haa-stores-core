import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ordersApi, settingsApi, shippingApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShoppingCart, Eye, Search, Truck, Clock, CheckCircle2, XCircle, AlertTriangle, Loader2, ExternalLink, ChevronLeft, ChevronRight, RotateCcw, MapPin, Check, Package, Ban, RefreshCw, Undo2, Heart, Printer, FileText, Copy, Wallet, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClientError } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { SarIcon } from '@/components/ui/SarIcon';
import { getOrderActions, OrderAction } from '@/lib/order-actions';
import { PermissionGate } from '@/lib/permissions';
import {
  orderStatusColors,
  paymentStatusColors,
  fulfillmentColors,
  statusIcons,
  arabicStatusLabels,
  StatusBadge,
  DetailSection,
  DetailRow,
  getArabicLabel,
} from './orders/orderHelpers';

export default function Orders() {
  const { t, i18n } = useTranslation();
  const { storeId } = useAuth();
  const { orderId: routeOrderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [fulfillmentTypeFilter, setFulfillmentTypeFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ orderId: number; status: string; label: string } | null>(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [pickupLocations, setPickupLocations] = useState<any[]>([]);
  const [showLabelForm, setShowLabelForm] = useState(false);
  const [labelCarrier, setLabelCarrier] = useState('');
  const [labelTracking, setLabelTracking] = useState('');
  const [savingLabel, setSavingLabel] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const isFirstLoad = useRef(true);
  const limit = 20;

  const load = useCallback(() => {
    if (!storeId) { setLoading(false); return; }
    if (isFirstLoad.current) {
      setLoading(true);
      isFirstLoad.current = false;
    } else {
      setTableLoading(true);
    }
    setFetchError(false);
    ordersApi.list(storeId, {
      page, limit,
      status: statusFilter || undefined,
      paymentStatus: paymentFilter || undefined,
      fulfillmentStatus: fulfillmentFilter || undefined,
      source: sourceFilter || undefined,
      fulfillmentType: fulfillmentTypeFilter || undefined,
      paymentMethod: paymentMethodFilter || undefined,
      search: search || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
      .then(r => { setOrders(r.data); setTotal(r.total); })
      .catch(() => { setFetchError(true); toast.error(t('common.error')); })
      .finally(() => {
        setLoading(false);
        setTableLoading(false);
      });
  }, [storeId, page, statusFilter, paymentFilter, fulfillmentFilter, sourceFilter, fulfillmentTypeFilter, paymentMethodFilter, search, dateFrom, dateTo, t]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (routeOrderId && storeId) {
      openDetail(Number(routeOrderId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openDetail recreated each render; effect intentionally runs on [routeOrderId, storeId] only to avoid a fetch/re-run loop
  }, [routeOrderId, storeId]);

  const resetFilters = () => {
    setStatusFilter('');
    setPaymentFilter('');
    setFulfillmentFilter('');
    setSourceFilter('');
    setFulfillmentTypeFilter('');
    setPaymentMethodFilter('');
    setSearchInput('');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasActiveFilters = statusFilter || paymentFilter || fulfillmentFilter || sourceFilter || fulfillmentTypeFilter || paymentMethodFilter || search || dateFrom || dateTo;

  const openDetail = async (id: number) => {
    if (!storeId) return;
    setLoadingDetail(true);
    setDetailOpen(true);
    try {
      const [o, pl] = await Promise.all([
        ordersApi.getById(storeId, id),
        settingsApi.listPickupLocations(storeId),
      ]);
      setDetailOrder(o);
      setPickupLocations(pl);
    } catch {
      toast.error(t('common.error'));
      setDetailOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const changeStatus = async (orderId: number, status: string) => {
    if (!storeId) return;
    setChangingStatus(true);
    try {
      await ordersApi.changeStatus(storeId, orderId, status);
      toast.success(t('orders.statusUpdated'));
      const o = await ordersApi.getById(storeId, orderId);
      setDetailOrder(o);
      load();
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error(t('orders.errorTransition', { status: t(`orders.status_${status}`) }));
      }
    } finally {
      setChangingStatus(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-neutral-900">{t('orders.title')}</h1>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
        <div className="space-y-3">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative flex-1 max-w-xs">
<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder={t('orders.search')}
                  value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); }}
                  className="pe-10 h-9 text-sm"
              />
            </div>
            
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-9 text-sm gap-1" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4" />
                {t('orders.resetFilters')}
              </Button>
            )}
          </div>

          <div className="flex gap-3 flex-wrap">
            <Select value={statusFilter || undefined} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder={t('orders.filterStatus')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('orders.all')}</SelectItem>
                <SelectItem value="draft">{t('orders.status_draft')}</SelectItem>
                <SelectItem value="pending_payment">{t('orders.status_pending_payment')}</SelectItem>
                <SelectItem value="confirmed">{t('orders.status_confirmed')}</SelectItem>
                <SelectItem value="processing">{t('orders.status_processing')}</SelectItem>
                <SelectItem value="ready_to_ship">{t('orders.status_ready_to_ship')}</SelectItem>
                <SelectItem value="ready_for_pickup">{t('orders.status_ready_for_pickup')}</SelectItem>
                <SelectItem value="shipped">{t('orders.status_shipped')}</SelectItem>
                <SelectItem value="picked_up">{t('orders.status_picked_up')}</SelectItem>
                <SelectItem value="delivered">{t('orders.status_delivered')}</SelectItem>
                <SelectItem value="completed">{t('orders.status_completed')}</SelectItem>
                <SelectItem value="cancelled">{t('orders.status_cancelled')}</SelectItem>
                <SelectItem value="returned">{t('orders.status_returned')}</SelectItem>
                <SelectItem value="refunded">{t('orders.status_refunded')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentFilter || undefined} onValueChange={(v) => { setPaymentFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder={t('orders.filterPayment')} /></SelectTrigger>
              <SelectContent>
                  <SelectItem value="all">{t('orders.all')}</SelectItem>
                  <SelectItem value="unpaid">{t('orders.payment_unpaid')}</SelectItem>
                  <SelectItem value="pending">{t('orders.payment_pending', 'بانتظار التحصيل')}</SelectItem>
                  <SelectItem value="paid">{t('orders.payment_paid')}</SelectItem>
                  <SelectItem value="refunded">{t('orders.payment_refunded')}</SelectItem>
                </SelectContent>
            </Select>

            <Select value={fulfillmentFilter || undefined} onValueChange={(v) => { setFulfillmentFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder={t('orders.filterFulfillment')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('orders.all')}</SelectItem>
                <SelectItem value="unfulfilled">{t('orders.fulfillment_unfulfilled')}</SelectItem>
                <SelectItem value="partial">{t('orders.fulfillment_partial')}</SelectItem>
                <SelectItem value="fulfilled">{t('orders.fulfillment_fulfilled')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sourceFilter || undefined} onValueChange={(v) => { setSourceFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-32 h-9 text-sm"><SelectValue placeholder={t('orders.source', 'المصدر')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('orders.all')}</SelectItem>
                <SelectItem value="storefront">{t('orders.source_storefront', 'المتجر')}</SelectItem>
                <SelectItem value="salla">{t('orders.source_salla', 'سلة')}</SelectItem>
                <SelectItem value="zid">{t('orders.source_zid', 'زد')}</SelectItem>
                <SelectItem value="noon">{t('orders.source_noon', 'نون')}</SelectItem>
                <SelectItem value="amazon">{t('orders.source_amazon', 'أمازون')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={fulfillmentTypeFilter || undefined} onValueChange={(v) => { setFulfillmentTypeFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder={t('orders.filterFulfillmentType', 'نوع التنفيذ')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('orders.all')}</SelectItem>
                <SelectItem value="shipping">{t('orders.shipping_short', 'توصيل')}</SelectItem>
                <SelectItem value="local_pickup">{t('orders.pickup_short', 'استلام')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentMethodFilter || undefined} onValueChange={(v) => { setPaymentMethodFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder={t('orders.filterPaymentMethod', 'طريقة الدفع')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('orders.all')}</SelectItem>
                <SelectItem value="cash_on_delivery">{t('orders.cod_payment', 'الدفع عند الاستلام')}</SelectItem>
                <SelectItem value="other">{t('orders.paid_online', 'مدفوع أونلاين')}</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-36 h-9 text-sm" placeholder={t('orders.dateFrom')} />
              <span className="text-neutral-400 text-sm">—</span>
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-36 h-9 text-sm" placeholder={t('orders.dateTo')} />
            </div>
          </div>
        </div>
      </div>

      {/* Selection Bar */}
      {selectedOrders.size > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-primary-100 shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-primary-700">{t('orders.selectedCount', '{{count}} طلب محدد', { count: selectedOrders.size })}</span>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-neutral-400" onClick={() => setSelectedOrders(new Set())}>
              {t('orders.clearSelection', 'إلغاء التحديد')}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-xs bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50" onClick={() => {
              selectedOrders.forEach(id => {
                const order = orders.find(o => o.id === id);
                if (order) {
                  const win = window.open('', '_blank');
                  if (win) {
                    win.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>${order.orderNumber}</title><style>body{font-family:sans-serif;padding:40px;max-width:800px;margin:0 auto}</style></head><body><h2>${order.orderNumber}</h2><p>${order.customerName} - ${order.customerPhone}</p><p>${t(`orders.status_${order.status}`)}</p></body></html>`);
                    win.document.close();
                    win.print();
                  }
                }
              });
            }}>{t('orders.bulk_print', 'طباعة')}</Button>
            <PermissionGate permission="orders:export" fallback={null}>
              <Button size="sm" className="h-8 text-xs bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50" onClick={() => {
                const csv = [['رقم الطلب', 'العميل', 'الجوال', 'الحالة', 'المجموع', 'التاريخ']];
                selectedOrders.forEach(id => {
                  const o = orders.find(o => o.id === id);
                  if (o) csv.push([o.orderNumber, o.customerName, o.customerPhone, t(`orders.status_${o.status}`), `${formatCurrency(o.total)} ${t('common.sar')}`, new Date(o.createdAt).toLocaleDateString('ar-SA')]);
                });
                const blob = new Blob(['\uFEFF' + csv.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `orders-${Date.now()}.csv`; a.click();
              }}>{t('orders.bulk_export', 'تصدير CSV')}</Button>
            </PermissionGate>
            <PermissionGate permission="orders:update_status" fallback={null}>
              <Button size="sm" className="h-8 text-xs bg-emerald-500 hover:bg-emerald-600 text-white" disabled={changingStatus}
                onClick={async () => {
                  if (!storeId) return;
                  setChangingStatus(true);
                  const total = selectedOrders.size;
                  let succeeded = 0;
                  const errors: string[] = [];
                  for (const id of selectedOrders) {
                    try {
                      await ordersApi.changeStatus(storeId, id, 'confirmed');
                      succeeded++;
                    } catch {
                      const order = orders.find(o => o.id === id);
                      errors.push(order?.orderNumber ?? String(id));
                    }
                  }
                  const failed = total - succeeded;
                  if (failed === 0) {
                    toast.success(t('orders.bulkConfirmed', 'تم تأكيد {{count}} طلب', { count: succeeded }));
                  } else {
                    toast.warning(t('orders.bulkConfirmedPartial', 'تم تأكيد {{succeeded}} من {{total}} طلب. {{failed}} طلب لم يتم تأكيده.', { succeeded, total, failed }));
                  }
                  setSelectedOrders(new Set());
                  setChangingStatus(false);
                  load();
                }}>{t('orders.bulk_confirm', 'تأكيد الدفع')}</Button>
            </PermissionGate>
          </div>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden relative">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
              <span className="text-sm text-neutral-400">{t('orders.loadingOrders', 'جاري تحميل الطلبات...')}</span>
            </div>
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}
          </div>
        ) : fetchError ? (
          <div className="p-16 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-red-50 mb-4">
              <AlertTriangle className="h-10 w-10 text-red-400" />
            </div>
            <p className="text-base font-medium text-neutral-700 mb-1">{t('orders.loadErrorTitle', 'تعذر تحميل الطلبات')}</p>
            <p className="text-sm text-neutral-500 mb-6 max-w-sm mx-auto">{t('orders.loadErrorDesc', 'حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصالك والمحاولة مرة أخرى.')}</p>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5" onClick={load}>
              <RotateCcw className="h-4 w-4" /> {t('common.retry', 'إعادة المحاولة')}
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-neutral-100 mb-4">
              {hasActiveFilters ? <Search className="h-10 w-10 text-neutral-400" /> : <ShoppingCart className="h-10 w-10 text-neutral-400" />}
            </div>
            <p className="text-base font-medium text-neutral-700 mb-1">
              {hasActiveFilters ? t('orders.noMatchTitle', 'لا توجد نتائج') : t('orders.noOrdersTitle', 'لا توجد طلبات بعد')}
            </p>
            <p className="text-sm text-neutral-500 max-w-xs mx-auto">
              {hasActiveFilters
                ? t('orders.noMatchDesc', 'لم يتم العثور على طلبات تطابق معايير البحث. حاول تغيير الفلاتر.')
                : t('orders.noOrdersDesc', 'عندما يتم تقديم أول طلب في متجرك، سيظهر هنا.')}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" className="h-9 text-sm mt-6 gap-1.5" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4" /> {t('orders.resetFilters', 'إعادة ضبط الفلاتر')}
              </Button>
            )}
          </div>
        ) : (
          <div className="relative">
            {tableLoading && (
              <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-b-3xl">
                <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
              </div>
            )}
            <Table>
              <TableHeader>
              <TableRow className="border-neutral-100 hover:bg-transparent">
                <TableHead className="w-10 h-9">
                  <input type="checkbox" className="rounded border-neutral-300 h-4 w-4 cursor-pointer"
                    checked={orders.length > 0 && selectedOrders.size === orders.length}
                    onChange={() => {
                      if (selectedOrders.size === orders.length) {
                        setSelectedOrders(new Set());
                      } else {
                        setSelectedOrders(new Set(orders.map(o => o.id)));
                      }
                    }} />
                </TableHead>
                <TableHead className="h-9 text-sm text-neutral-500 font-medium">{t('orders.orderNumber')}</TableHead>
                <TableHead className="h-9 text-sm text-neutral-500 font-medium">{t('orders.customer')}</TableHead>
                <TableHead className="h-9 text-sm text-neutral-500 font-medium">{t('orders.status')}</TableHead>
                <TableHead className="h-9 text-sm text-neutral-500 font-medium">{t('orders.paymentStatus')}</TableHead>
                <TableHead className="h-9 text-sm text-neutral-500 font-medium">{t('orders.fulfillment', 'نوع التنفيذ')}</TableHead>
                <TableHead className="h-9 text-sm text-neutral-500 font-medium">{t('orders.total')}</TableHead>
                <TableHead className="h-9 text-sm text-neutral-500 font-medium">{t('orders.date')}</TableHead>
                <TableHead className="w-12 h-9"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                const isPickup = o.fulfillmentType === 'local_pickup';
                const isCOD = o.paymentMethod === 'cash_on_delivery';
                return (
                  <TableRow key={o.id} className={`border-neutral-100 hover:bg-neutral-50 cursor-pointer transition-colors ${selectedOrders.has(o.id) ? 'bg-primary-50' : ''}`} onClick={() => openDetail(o.id)}>
                    <TableCell className="p-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-neutral-300 h-4 w-4 cursor-pointer"
                        checked={selectedOrders.has(o.id)}
                        onChange={() => {
                          const next = new Set(selectedOrders);
                          if (next.has(o.id)) next.delete(o.id); else next.add(o.id);
                          setSelectedOrders(next);
                        }} />
                    </TableCell>
                    <TableCell className="font-mono text-sm font-semibold text-neutral-900 p-3">{o.orderNumber}</TableCell>
                    <TableCell className="p-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-neutral-900">{o.customerName}</span>
                        <PermissionGate permission="orders:view_sensitive" fallback={<span className="text-xs text-neutral-300 font-mono" dir="ltr">••••••••</span>}>
                          <span className="text-xs text-neutral-400 font-mono" dir="ltr">{o.customerPhone}</span>
                        </PermissionGate>
                      </div>
                    </TableCell>
                    <TableCell className="p-3">
                      <StatusBadge status={o.status} colors={orderStatusColors} icon={statusIcons[o.status]} label={t(`orders.status_${o.status}`)} />
                    </TableCell>
                    <TableCell className="p-3">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={o.paymentStatus} colors={paymentStatusColors} label={t(`orders.payment_${o.paymentStatus}`)} />
                        {isCOD && o.paymentStatus !== 'paid' && (
                          <span className="text-xs text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded-full">{t('orders.cod_short', 'COD')}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="p-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        isPickup ? 'bg-purple-100 text-purple-700' : 'bg-primary-100 text-primary-700'
                      }`}>
                        {isPickup ? t('orders.pickup_short', 'استلام') : t('orders.shipping_short', 'توصيل')}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-neutral-900 p-3 tabular-nums">{formatCurrency(o.total)} <SarIcon size="sm" /></TableCell>
                    <TableCell className="text-sm text-neutral-400 whitespace-nowrap p-3">{new Date(o.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : i18n.language)}</TableCell>
                    <TableCell className="p-3">
                      {/* Row action — hit area ≥ 44x44 (WCAG 2.5.5). */}
                      <Button variant="ghost" size="icon" className="h-11 w-11" onClick={(e) => { e.stopPropagation(); openDetail(o.id); }} aria-label={t('orders.view_details', 'عرض تفاصيل الطلب')}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              </TableBody>
            </Table>
            </div>
      )}
      </div>

      {total > 0 && (
        <div className="flex justify-between items-center text-sm text-neutral-400">
          <span>{t('orders.showingResults', { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total })}</span>
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="icon" className="h-11 w-11" disabled={page <= 1} onClick={() => setPage(p => p - 1)} aria-label={t('orders.prev_page', 'الصفحة السابقة')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm tabular-nums">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-11 w-11" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} aria-label={t('orders.next_page', 'الصفحة التالية')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={(open) => {
        setDetailOpen(open);
        if (!open && routeOrderId) {
          navigate('/orders', { replace: true });
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900 flex items-center gap-3">
              <span className="font-mono text-sm text-neutral-400">{detailOrder?.orderNumber}</span>
              {detailOrder && detailOrder.source && detailOrder.source !== 'storefront' && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  detailOrder.source === 'salla' ? 'bg-green-100 text-green-700' :
                  detailOrder.source === 'zid' ? 'bg-primary-100 text-primary-700' :
                  detailOrder.source === 'noon' ? 'bg-amber-100 text-amber-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {detailOrder.source === 'salla' ? t('orders.source_salla', 'سلة') : detailOrder.source === 'zid' ? t('orders.source_zid', 'زد') : detailOrder.source === 'noon' ? t('orders.source_noon', 'نون') : t('orders.source_amazon', 'أمازون')}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {loadingDetail ? (
            <div className="space-y-5">
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
                <span className="text-sm text-neutral-400">{t('orders.loadingOrderDetail', 'جاري تحميل تفاصيل الطلب...')}</span>
              </div>
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : detailOrder && (
            <div className="space-y-5">
              {/* Settlement Info Badge */}
              {detailOrder.settlementInfo && (() => {
                const si = detailOrder.settlementInfo;
                const settlementRef = `SET-${String(si.settlementBatchId).padStart(6, '0')}`;
                return (
                  <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-primary-600">{t('orders.settlementBadge', 'هذا الطلب مشمول في تسوية')}</p>
                        <Link
                          to={`/wallet/settlements/${si.settlementBatchId}`}
                          className="font-mono text-sm font-bold text-primary-700 hover:text-primary-900 hover:underline inline-flex items-center gap-1"
                        >
                          {settlementRef}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        <p className="text-xs text-primary-500">
                          {t('orders.settlementStatus', 'حالة التسوية')}: {si.status}
                        </p>
                        <p className="text-xs text-primary-500">
                          {t('orders.netPayable', 'صافي المستحق')}: {formatCurrency(si.merchantPayable)} <SarIcon size="sm" />
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-medium ${
                        si.reconciliationStatus === 'matched' ? 'bg-emerald-100 text-emerald-700' :
                        si.reconciliationStatus === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {si.reconciliationStatus === 'matched' ? t('settlement.matched', 'مطابق') :
                         si.reconciliationStatus === 'pending' ? t('settlement.pending', 'قيد المراجعة') :
                         t('settlement.failed', 'غير مطابق')}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Dynamic Status Timeline */}
              {(() => {
                const FLOW: Record<string, { step: string; label: string }[]> = {
                  checkout_started: [
                    { step: 'checkout_started', label: t('orders.flow_checkout_started', 'بدء الطلب') },
                    { step: 'pending_payment', label: t('orders.flow_pending_payment', 'الدفع') },
                    { step: 'confirmed', label: t('orders.flow_confirmed', 'تأكيد') },
                    { step: 'completed', label: t('orders.flow_completed', 'اكتمال') },
                  ],
                  pending_payment: [
                    { step: 'pending_payment', label: t('orders.flow_pending_payment', 'الدفع') },
                    { step: 'confirmed', label: t('orders.flow_confirmed', 'تأكيد') },
                    { step: 'completed', label: t('orders.flow_completed', 'اكتمال') },
                  ],
                  confirmed: [
                    { step: 'confirmed', label: t('orders.flow_confirmed', 'تأكيد') },
                    { step: 'processing', label: t('orders.flow_processing', 'تجهيز') },
                    { step: 'shipped', label: t('orders.flow_shipped', 'شحن') },
                    { step: 'delivered', label: t('orders.flow_delivered', 'توصيل') },
                  ],
                  processing: [
                    { step: 'confirmed', label: t('orders.flow_confirmed', 'تأكيد') },
                    { step: 'processing', label: t('orders.flow_processing', 'تجهيز') },
                    { step: 'shipped', label: t('orders.flow_shipped', 'شحن') },
                    { step: 'delivered', label: t('orders.flow_delivered', 'توصيل') },
                  ],
                  ready_to_ship: [
                    { step: 'confirmed', label: t('orders.flow_confirmed', 'تأكيد') },
                    { step: 'processing', label: t('orders.flow_processing', 'تجهيز') },
                    { step: 'ready_to_ship', label: t('orders.flow_ready_to_ship', 'جاهز') },
                    { step: 'shipped', label: t('orders.flow_shipped', 'شحن') },
                    { step: 'delivered', label: t('orders.flow_delivered', 'توصيل') },
                  ],
                  shipped: [
                    { step: 'confirmed', label: t('orders.flow_confirmed', 'تأكيد') },
                    { step: 'processing', label: t('orders.flow_processing', 'تجهيز') },
                    { step: 'shipped', label: t('orders.flow_shipped', 'شحن') },
                    { step: 'delivered', label: t('orders.flow_delivered', 'توصيل') },
                  ],
                  delivered: [
                    { step: 'confirmed', label: t('orders.flow_confirmed', 'تأكيد') },
                    { step: 'processing', label: t('orders.flow_processing', 'تجهيز') },
                    { step: 'shipped', label: t('orders.flow_shipped', 'شحن') },
                    { step: 'delivered', label: t('orders.flow_delivered', 'توصيل') },
                    { step: 'completed', label: t('orders.flow_completed_full', 'مكتمل') },
                  ],
                  cancelled: [
                    { step: 'cancelled', label: t('orders.flow_cancelled', 'ملغي') },
                  ],
                  refunded: [
                    { step: 'refunded', label: t('orders.flow_refunded', 'مسترد') },
                  ],
                  returned: [
                    { step: 'returned', label: t('orders.flow_returned', 'مرتجع') },
                    { step: 'refunded', label: t('orders.flow_refunded', 'مسترد') },
                  ],
                  partially_refunded: [
                    { step: 'partially_refunded', label: t('orders.flow_partially_refunded', 'مسترد جزئيًا') },
                    { step: 'refunded', label: t('orders.flow_refunded', 'مسترد') },
                  ],
                  returned_to_sender: [
                    { step: 'returned_to_sender', label: t('orders.flow_returned_to_sender', 'مرتجع للمرسل') },
                  ],
                };
                const flow = FLOW[detailOrder.status] || [
                  { step: detailOrder.status, label: arabicStatusLabels[detailOrder.status] || t(`orders.status_${detailOrder.status}`) }
                ];
                const currentIdx = flow.findIndex(f => f.step === detailOrder.status);
                return (
                  <div className="bg-neutral-50 rounded-2xl p-5">
                    <div className="flex items-center gap-0">
                      {flow.map((f, i) => {
                        const isPast = i <= currentIdx;
                        const isCurrent = i === currentIdx;
                        return (
                          <div key={f.step} className="flex items-center flex-1 last:flex-none">
                            <div className="flex flex-col items-center gap-1">
                               <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                 isPast ? 'bg-emerald-500 text-white shadow-sm' : 'bg-neutral-200 text-neutral-400'
                               } ${isCurrent ? 'ring-2 ring-emerald-300 ring-offset-2' : ''}`}>
                                 {isPast ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                               </div>
                               <span className={`text-xs font-medium whitespace-nowrap ${isPast ? 'text-emerald-600' : 'text-neutral-400'}`}>
                                 {f.label}
                               </span>
                            </div>
                             {i < flow.length - 1 && <div className={`h-0.5 flex-1 mx-1 mb-5 ${isPast && i < currentIdx ? 'bg-emerald-500' : 'bg-neutral-200'}`} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

               {/* Summary Cards */}
               <div className="grid grid-cols-3 gap-3">
                  {(() => (
                      <>
                        <div className="text-center p-4">
                         <p className="text-xs text-neutral-400 mb-2">{t('orders.summary_status', 'الحالة')}</p>
                         <StatusBadge status={detailOrder.status} colors={orderStatusColors} icon={statusIcons[detailOrder.status]} label={t(`orders.status_${detailOrder.status}`)} />
                       </div>
                       <div className="text-center p-4">
                         <p className="text-xs text-neutral-400 mb-2">{t('orders.summary_payment', 'الدفع')}</p>
                         <StatusBadge status={detailOrder.paymentStatus} colors={paymentStatusColors} label={t(`orders.payment_${detailOrder.paymentStatus}`)} />
                       </div>
                       <div className="text-center p-4">
                         <p className="text-xs text-neutral-400 mb-2">{t('orders.summary_fulfillment', 'التجهيز')}</p>
                         <StatusBadge status={detailOrder.fulfillmentStatus} colors={fulfillmentColors} label={t(`orders.fulfillment_${detailOrder.fulfillmentStatus}`)} />
                       </div>
                      </>
                  ))()}
                </div>
                
                {/* Action Sections — driven by getOrderActions resolver */}
                {(() => {
                  const orderActions = getOrderActions(detailOrder);
                  const bySection = (section: string) => orderActions.actions.filter(a => a.section === section);
                  const paymentActions = bySection('payment');
                  const shippingActions = bySection('shipping');
                  const pickupActions = bySection('pickup');
                  const giftActions = bySection('gift');
                  const documentActions = bySection('documents');
                  const dangerActions = bySection('danger');
                  const isExternal = ['salla', 'zid', 'noon', 'amazon'].includes(detailOrder.source);

                  const handleAction = (action: OrderAction) => {
                    const orderId = detailOrder.id;
                    if (action.section === 'danger') {
                      setConfirmAction({ orderId, status: action.targetStatus, label: action.label });
                      return;
                    }
                    if (action.key === 'create_label') {
                      setShowLabelForm(true);
                      return;
                    }
                    if (action.key === 'print_label') {
                      const url = detailOrder?.shipment?.labelUrl || detailOrder?.labelUrl;
                      if (url) window.open(url, '_blank');
                      else toast.error(t('orders.noLabelUrl', 'لا يوجد رابط للبوليصة'));
                      return;
                    }
                    if (action.key === 'download_pdf') {
                      const url = detailOrder?.shipment?.labelUrl || detailOrder?.labelUrl;
                      if (url) {
                        const a = document.createElement('a'); a.href = url; a.download = 'label.pdf'; a.click();
                      } else {
                        toast.error(t('orders.noLabelUrl', 'لا يوجد رابط للبوليصة'));
                      }
                      return;
                    }
                    if (action.key === 'copy_tracking') {
                      const tn = detailOrder?.shipment?.trackingNumber;
                      if (tn) {
                        navigator.clipboard.writeText(tn).then(() => toast.success(t('orders.trackingCopied', 'تم نسخ رقم التتبع'))).catch(() => {});
                      }
                      return;
                    }
                    if (action.key === 'open_tracking') {
                      const url = detailOrder?.shipment?.trackingUrl;
                      if (url) window.open(url, '_blank');
                      return;
                    }
                    if (action.key === 'resend_tracking') {
                      toast.success(t('orders.trackingResent', 'تم إعادة إرسال بيانات الشحن'));
                      return;
                    }
                    // COD actions
                    if (action.key === 'collect_payment') {
                      if (!storeId) return;
                      setChangingStatus(true);
                      ordersApi.collectCOD(storeId, orderId)
                        .then(() => {
                          toast.success(t('orders.cod_collected', 'تم تسجيل التحصيل'));
                          return Promise.all([
                            ordersApi.getById(storeId, orderId),
                          ]);
                        })
                        .then(([o]) => { setDetailOrder(o); load(); })
                        .catch(err => toast.error(err instanceof ApiClientError ? err.message : t('common.error')))
                        .finally(() => setChangingStatus(false));
                      return;
                    }
                    if (action.key === 'customer_refused') {
                      if (!storeId) return;
                      if (!confirm(t('orders.confirm_refused', 'هل أنت متأكد من تسجيل رفض العميل للدفع؟ سيتم إرجاع الطلب.'))) return;
                      setChangingStatus(true);
                      ordersApi.markCODRefused(storeId, orderId)
                        .then(() => {
                          toast.success(t('orders.cod_refused', 'تم تسجيل رفض الدفع'));
                          return ordersApi.getById(storeId, orderId);
                        })
                        .then((o) => { setDetailOrder(o); load(); })
                        .catch(err => toast.error(err instanceof ApiClientError ? err.message : t('common.error')))
                        .finally(() => setChangingStatus(false));
                      return;
                    }
                    if (action.key === 'collection_failed') {
                      if (!storeId) return;
                      setChangingStatus(true);
                      ordersApi.markCODFailed(storeId, orderId)
                        .then(() => {
                          toast.success(t('orders.cod_failed', 'تم تسجيل فشل التحصيل'));
                        })
                        .catch(err => toast.error(err instanceof ApiClientError ? err.message : t('common.error')))
                        .finally(() => setChangingStatus(false));
                      return;
                    }
                    // Gift actions
                    if (action.key === 'view_gift_message') {
                      const msg = detailOrder?.giftOptions?.message;
                      if (msg) toast.message(t('orders.giftMessage', 'رسالة الهدية'), { description: msg });
                      return;
                    }
                    if (action.key === 'print_gift_message') {
                      const msg = detailOrder?.giftOptions?.message;
                      if (msg) {
                        const win = window.open('', '_blank');
                        if (win) {
                          win.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>${t('orders.giftMessage', 'رسالة الهدية')}</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fdf2f8;color:#9d174d;font-size:24px;padding:40px;text-align:center}</style></head><body>"${msg}"</body></html>`);
                          win.document.close();
                          win.print();
                        }
                      }
                      return;
                    }
                    if (action.key === 'copy_gift_message') {
                      const msg = detailOrder?.giftOptions?.message;
                      if (msg) {
                        navigator.clipboard.writeText(msg).then(() => toast.success(t('orders.giftMessageCopied', 'تم نسخ رسالة الهدية'))).catch(() => {});
                      }
                      return;
                    }
                    // Default: status transition via API
                    changeStatus(orderId, action.targetStatus);
                  };

                  const handleCreateLabel = async () => {
                    if (!storeId || !labelCarrier.trim() || !labelTracking.trim()) {
                      toast.error(t('orders.labelFormRequired', 'يرجى إدخال اسم شركة الشحن ورقم التتبع'));
                      return;
                    }
                    setSavingLabel(true);
                    try {
                      // Add tracking info via the shipping API
                      if (detailOrder?.shipment?.id) {
                        await shippingApi.shipments.updateTracking(storeId, detailOrder.shipment.id, {
                          trackingNumber: labelTracking.trim(),
                          carrierName: labelCarrier.trim(),
                        });
                      }
                      // Reload order to get updated data
                      const o = await ordersApi.getById(storeId, detailOrder.id);
                      setDetailOrder(o);
                      toast.success(t('orders.labelCreated', 'تم إنشاء البوليصة'));
                      setShowLabelForm(false);
                      setLabelCarrier('');
                      setLabelTracking('');
                    } catch (err) {
                      toast.error(err instanceof ApiClientError ? err.message : t('common.error'));
                    } finally {
                      setSavingLabel(false);
                    }
                  };

                  const iconMap: Record<string, React.ReactNode> = {
                    Check: <Check className="h-4 w-4" />,
                    Ban: <Ban className="h-4 w-4" />,
                    Package: <Package className="h-4 w-4" />,
                    CheckCircle2: <CheckCircle2 className="h-4 w-4" />,
                    Truck: <Truck className="h-4 w-4" />,
                    FileText: <FileText className="h-4 w-4" />,
                    Printer: <Printer className="h-4 w-4" />,
                    RefreshCw: <RefreshCw className="h-4 w-4" />,
                    ExternalLink: <ExternalLink className="h-4 w-4" />,
                    Copy: <Copy className="h-4 w-4" />,
                    Wallet: <Wallet className="h-4 w-4" />,
                    Heart: <Heart className="h-4 w-4" />,
                    Bell: <Bell className="h-4 w-4" />,
                    Undo2: <Undo2 className="h-4 w-4" />,
                    AlertTriangle: <AlertTriangle className="h-4 w-4" />,
                    XCircle: <XCircle className="h-4 w-4" />,
                    Clock: <Clock className="h-4 w-4" />,
                  };
                  const getActionPermission = (action: OrderAction): string => {
                    if (action.section === 'danger') {
                      if (action.key.includes('cancel')) return 'orders:cancel';
                      if (action.key.includes('refund')) return 'orders:refund';
                      return 'orders:cancel';
                    }
                    return 'orders:update_status';
                  };
                  const renderActionButton = (action: OrderAction) => {
                    const isDanger = action.section === 'danger';
                    const baseClass = isDanger
                      ? 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border border-red-600'
                      : 'bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 shadow-sm';
                    return (
                      <PermissionGate permission={getActionPermission(action)} fallback={null}>
                        <Button
                          key={action.key}
                          size="sm"
                          className={`h-9 px-4 text-sm font-medium rounded-xl ${baseClass} flex items-center gap-1.5`}
                          disabled={changingStatus}
                          onClick={() => handleAction(action)}
                          variant={isDanger ? 'default' : 'outline'}
                        >
                          {changingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : iconMap[action.icon]}
                          {action.label}
                        </Button>
                      </PermissionGate>
                    );
                  };

                  const isTerminal = !isExternal && orderActions.actions.length === 0;
                  const nextAction = orderActions.primaryAction;

                  return (
                    <>
                      {/* Next Action Panel */}
                      {!isExternal && nextAction && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3 mb-4">
                          <p className="font-bold text-sm text-emerald-800">{t('orders.next_action', 'الإجراء التالي')}</p>
                          {nextAction.description && (
                            <p className="text-sm text-emerald-700">{nextAction.description}</p>
                          )}
                          <PermissionGate permission="orders:update_status" fallback={null}>
                            <Button
                              size="lg"
                              className="h-11 px-6 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 flex items-center gap-2 w-fit shadow-sm"
                              disabled={changingStatus}
                              onClick={() => handleAction(nextAction)}
                            >
                              {changingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : iconMap[nextAction.icon]}
                              {nextAction.label}
                            </Button>
                          </PermissionGate>
                        </div>
                      )}

                      {/* Terminal state notice */}
                      {isTerminal && (
                        <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-5 text-center mb-4">
                          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-neutral-300" />
                          <p className="text-sm font-medium text-neutral-600">{t('orders.terminal_message', 'الطلب في حالة نهائية')}</p>
                          <p className="text-xs text-neutral-400 mt-1">{t('orders.terminal_subtext', 'لا توجد إجراءات تشغيلية مطلوبة')}</p>
                        </div>
                      )}

                      {/* 3. Products */}
                      {detailOrder.items && detailOrder.items.length > 0 && (
                        <DetailSection title={`${t('orders.products', 'المنتجات')} (${detailOrder.items.length})`}>
                          <Table>
                            <TableHeader>
                              <TableRow className="border-neutral-100 hover:bg-transparent">
                                <TableHead className="h-9 text-sm text-neutral-500 font-medium">{t('orders.product_name', 'المنتج')}</TableHead>
                                <TableHead className="h-9 text-sm text-neutral-500 font-medium text-center">{t('orders.quantity', 'الكمية')}</TableHead>
                                <TableHead className="h-9 text-sm text-neutral-500 font-medium">{t('orders.notes', 'ملاحظات')}</TableHead>
                                <TableHead className="h-9 text-sm text-neutral-500 font-medium text-start">{t('orders.unit_price', 'السعر')}</TableHead>
                                <TableHead className="h-9 text-sm text-neutral-500 font-medium text-start">{t('orders.total_header', 'الإجمالي')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {detailOrder.items.map((item: any) => {
                                const itemBadges = [];
                                if (item.giftWrapSelected) itemBadges.push('🎁');
                                if (item.sendAsGift) itemBadges.push('💌');
                                return (
                                <TableRow key={item.id} className="border-neutral-100 hover:bg-transparent">
                                  <TableCell className="text-sm font-medium text-neutral-900 p-3">{item.name}</TableCell>
                                  <TableCell className="text-sm text-center text-neutral-900 p-3">{item.quantity}</TableCell>
                                  <TableCell className="text-sm text-neutral-500 p-3">
                                    <div className="flex flex-wrap gap-1">
                                      {itemBadges.map((badge, i) => (
                                        <span key={i} className="text-xs">{badge}</span>
                                      ))}
                                       {item.notes && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">{item.notes}</span>}
                                       {item.giftMessage && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-pink-50 text-pink-700 rounded-full text-xs font-medium">"{item.giftMessage}"</span>}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm text-start text-neutral-900 p-3 tabular-nums">{formatCurrency(item.unitPrice)} <SarIcon size="sm" /></TableCell>
                                  <TableCell className="text-sm text-start font-semibold text-neutral-900 p-3 tabular-nums">{formatCurrency(item.totalPrice)} <SarIcon size="sm" /></TableCell>
                                </TableRow>
                              )})}
                            </TableBody>
                          </Table>
                          <div className="space-y-1.5 pt-3 border-t border-neutral-100 text-sm">
                            <DetailRow label={t('orders.subtotal', 'المجموع')}>{formatCurrency(detailOrder.subtotal)} <SarIcon size="sm" /></DetailRow>
                            {detailOrder.shippingCost && <DetailRow label={t('orders.shipping_cost', 'الشحن')}>{formatCurrency(detailOrder.shippingCost)} <SarIcon size="sm" /></DetailRow>}
                            {detailOrder.couponDiscount && Number(detailOrder.couponDiscount) > 0 && (
                              <DetailRow label={t('orders.discount', 'الخصم')}>-{formatCurrency(detailOrder.couponDiscount)} <SarIcon size="sm" /></DetailRow>
                            )}
                            <div className="flex justify-between items-center font-bold pt-2 border-t border-neutral-100">
                              <span>{t('orders.grand_total', 'الإجمالي')}</span>
                              <span>{formatCurrency(detailOrder.total)} <SarIcon size="sm" /></span>
                            </div>
                          </div>
                        </DetailSection>
                      )}

                      {/* 4. Payment — shows COD info or payment actions */}
                      {!isExternal && (paymentActions.length > 0 || orderActions.isCOD) && (
                        <DetailSection title={t('orders.payment', 'الدفع')}>
                          {/* COD info */}
                          {orderActions.isCOD && (
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-1.5 mb-3">
                              <div className="flex items-center gap-1.5 text-sm font-medium text-amber-800">
                                <Wallet className="h-4 w-4" />
                                {t('orders.cod_payment', 'الدفع عند الاستلام')}
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-amber-600">{t('orders.payment_status', 'حالة الدفع')}</span>
                                <span className="font-medium text-amber-800">
                                  {detailOrder.paymentStatus === 'paid'
                                    ? t('orders.payment_paid_cod', 'تم التحصيل')
                                    : t('orders.payment_pending_cod', 'بانتظار التحصيل')}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-amber-600">{t('orders.amount_due', 'المبلغ المطلوب')}</span>
                                <span className="font-medium text-amber-800 tabular-nums">{formatCurrency(detailOrder.total)} <SarIcon size="sm" /></span>
                              </div>
                            </div>
                          )}
                          {/* Payment action buttons (secondary) */}
                          {paymentActions.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-neutral-400">{t('orders.additional_actions', 'إجراءات إضافية')}</p>
                              <div className="flex flex-wrap gap-2">
                                {paymentActions.map(renderActionButton)}
                              </div>
                            </div>
                          )}
                        </DetailSection>
                      )}

                    {/* 7. Gift */}
                      {orderActions.hasGift && (
                        <div className="p-4 bg-pink-50 border border-pink-100 rounded-2xl space-y-3">
                          <p className="font-bold text-sm text-pink-800 flex items-center gap-1.5">
                            <Heart className="h-4 w-4" /> {t('orders.sendAsGift', 'إرسال كهدية')}
                          </p>
                          {detailOrder.giftOptions?.message ? (
                            <div className="bg-white border border-pink-200 rounded-xl p-3 text-sm text-pink-700 leading-relaxed italic">
                              "{detailOrder.giftOptions.message}"
                            </div>
                          ) : (
                            <p className="text-sm text-pink-600">{t('orders.markedAsGift', 'هذا الطلب محدد كهدية')}</p>
                          )}
                          {(detailOrder.giftOptions?.recipientName || detailOrder.giftOptions?.recipientPhone) && (
                            <div className="space-y-1">
                              {detailOrder.giftOptions?.recipientName && (
                                <DetailRow label={t('orders.recipient', 'المستلم')}>
                                  {detailOrder.giftOptions.recipientName}
                                </DetailRow>
                              )}
                              {detailOrder.giftOptions?.recipientPhone && (
                                <DetailRow label={t('orders.recipientPhone', 'جوال المستلم')}>
                                  {detailOrder.giftOptions.recipientPhone}
                                </DetailRow>
                              )}
                            </div>
                          )}
                          {!isExternal && giftActions.length > 0 && (
                            <div className="space-y-2 pt-1">
                              <p className="text-xs font-medium text-neutral-400">{t('orders.additional_actions', 'إجراءات إضافية')}</p>
                              <div className="flex flex-wrap gap-2">
                                {giftActions.map((a) => {
                                  const isPlaceholder = a.key === 'notify_buyer' || a.key === 'notify_recipient';
                                  return (
                                    <Button
                                      key={a.key}
                                      size="sm"
                                      className={`h-9 px-4 text-sm font-medium rounded-xl flex items-center gap-1.5 shadow-sm ${
                                        isPlaceholder
                                          ? 'bg-pink-100 hover:bg-pink-100 text-pink-400 border border-pink-200 cursor-not-allowed'
                                          : 'bg-pink-500 hover:bg-pink-600 active:bg-pink-700 text-white border border-pink-600'
                                      }`}
                                      disabled={changingStatus || isPlaceholder}
                                      onClick={() => isPlaceholder ? toast.info(t('orders.notificationsComingSoon', 'الإشعارات غير متاحة بعد')) : handleAction(a)}
                                    >
                                      {changingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : iconMap[a.icon]}
                                      {a.label}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 8. Shipping & Delivery — show for delivery orders */}
                      {!orderActions.isPickup && (() => {
                        const hasShipData = detailOrder.shipment;
                        const hasShipActions = shippingActions.length > 0;
                        if (!hasShipData && !hasShipActions) return null;
                        return (
                          <DetailSection title={t('orders.shipping', 'الشحن والتوصيل')}>
                            {detailOrder.status === 'ready_to_ship' && (
                              <StatusBadge status={detailOrder.status} colors={orderStatusColors} icon={<Package className="h-4 w-4" />} />
                            )}
                            {detailOrder.status === 'shipped' && (
                              <StatusBadge status={detailOrder.status} colors={orderStatusColors} icon={<Truck className="h-4 w-4" />} />
                            )}
                            {detailOrder.status === 'delivered' && (
                              <StatusBadge status={detailOrder.status} colors={orderStatusColors} icon={<CheckCircle2 className="h-4 w-4" />} />
                            )}
                            {hasShipData && (
                              <div className="space-y-2 mb-3">
                                <DetailRow label={t('orders.carrier', 'الشركة')}>{detailOrder.shipment.carrierName ?? '-'}</DetailRow>
                                <DetailRow label={t('orders.label_status', 'حالة البوليصة')}>
                                  {detailOrder.shipment.labelUrl ? (
                                    <span className="text-emerald-600 font-medium">{t('orders.label_ready', 'جاهزة')}</span>
                                  ) : (
                                    <span className="text-amber-600 font-medium">{t('orders.label_pending', 'قيد الإنشاء')}</span>
                                  )}
                                </DetailRow>
                                <DetailRow label={t('orders.tracking_number', 'رقم التتبع')}>
                                  {detailOrder.shipment.trackingNumber ? (
                                    <span dir="ltr" className="font-mono">{detailOrder.shipment.trackingNumber}</span>
                                  ) : '-'}
                                </DetailRow>
                                {detailOrder.shipment.trackingUrl && (
                                  <DetailRow label={t('orders.tracking_url', 'الرابط')}>
                                    <a href={detailOrder.shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline flex items-center gap-1 text-sm">
                                      {t('orders.open_tracking', 'فتح التتبع')} <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </DetailRow>
                                )}
                              </div>
                            )}
                            {!isExternal && hasShipActions && (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-neutral-400">{t('orders.additional_actions', 'إجراءات إضافية')}</p>
                                <div className="flex flex-wrap gap-2">
                                  {shippingActions.map(renderActionButton)}
                                </div>
                              </div>
                            )}
                            {showLabelForm && (
                              <div className="mt-3 p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3">
                                <p className="text-sm font-bold text-neutral-800">{t('orders.createLabel', 'إنشاء بوليصة جديدة')}</p>
                                <div className="space-y-1.5">
                                  <Label className="text-sm text-neutral-500">{t('orders.carrierName', 'اسم شركة الشحن')}</Label>
                                  <Input value={labelCarrier} onChange={e => setLabelCarrier(e.target.value)} className="h-9 text-sm" placeholder="مثل: سمسا, زاجل..." />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-sm text-neutral-500">{t('orders.trackingNumber', 'رقم التتبع')}</Label>
                                  <Input value={labelTracking} onChange={e => setLabelTracking(e.target.value)} className="h-9 text-sm" dir="ltr" placeholder="رقم الشحنة..." />
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <Button variant="outline" size="sm" className="h-9 text-sm" onClick={() => { setShowLabelForm(false); setLabelCarrier(''); setLabelTracking(''); }}>{t('common.cancel')}</Button>
                                  <Button size="sm" className="h-9 text-sm" disabled={savingLabel || !labelCarrier.trim() || !labelTracking.trim()} onClick={handleCreateLabel}>
                                    {savingLabel && <Loader2 className="h-4 w-4 me-1 animate-spin" />}
                                    {t('orders.save', 'حفظ')}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DetailSection>
                        );
                      })()}

                      {/* 9. Pickup — show for pickup orders */}
                      {orderActions.isPickup && (() => {
                        const loc = pickupLocations.find((l: any) => l.id === detailOrder.pickupLocationId);
                        const isReady = detailOrder.status === 'ready_for_pickup';
                        const isPicked = detailOrder.status === 'picked_up';
                        const isProcessing = detailOrder.status === 'processing' || detailOrder.status === 'confirmed';
                        const showPickupActions = pickupActions.length > 0;
                        const instructions = loc?.instructions || detailOrder.pickupInstructions;
                        return (
                          <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl space-y-4">
                            <p className="font-bold text-sm text-neutral-800 flex items-center gap-1.5">
                              <MapPin className="h-4 w-4" /> {t('orders.pickup', 'استلام من الفرع')}
                            </p>
                            {loc ? (
                              <>
                                <p className="text-sm font-medium text-neutral-700">{loc.nameAr}</p>
                                {loc.phone && <p className="text-xs text-neutral-600 flex items-center gap-1" dir="ltr"><span className="font-mono">{loc.phone}</span></p>}
                                {loc.address && <p className="text-xs text-neutral-600">{loc.address}</p>}
                                {loc.mapsUrl && (
                                  <a href={loc.mapsUrl} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-1 text-primary-600 text-xs underline">
                                    <MapPin className="h-4 w-4" /> {t('orders.viewOnMap', 'عرض على الخريطة')}
                                  </a>
                                )}
                              </>
                            ) : (
                              <p className="text-sm text-neutral-500">{t('orders.noPickupLocation', 'لم يتم تحديد الفرع')}</p>
                            )}
                            {instructions && (
                              <div className="bg-white border border-amber-100 text-amber-800 text-xs p-2.5 rounded-xl">
                                <p className="font-medium mb-0.5">{t('orders.pickupInstructions', 'تعليمات الاستلام')}</p>
                                <p>{instructions}</p>
                              </div>
                            )}
                            {isProcessing && (
                              <StatusBadge status={detailOrder.status} colors={orderStatusColors} icon={<Clock className="h-4 w-4" />} />
                            )}
                            {isReady && (
                              <StatusBadge status={detailOrder.status} colors={orderStatusColors} icon={<CheckCircle2 className="h-4 w-4" />} />
                            )}
                            {isPicked && (
                              <StatusBadge status={detailOrder.status} colors={orderStatusColors} icon={<CheckCircle2 className="h-4 w-4" />} />
                            )}
                            {!isExternal && showPickupActions && (
                              <div className="space-y-2 pt-1">
                                <p className="text-xs font-medium text-neutral-400">{t('orders.additional_actions', 'إجراءات إضافية')}</p>
                                <div className="flex flex-wrap gap-2">
                                  {pickupActions.map(renderActionButton)}
                                </div>
                              </div>
                            )}
                            {isReady && !isExternal && (
                              <div className="pt-1">
                                <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-neutral-400" disabled
                                  title={t('orders.pickupNotifyPending', 'إرسال إشعار جاهز للاستلام — قيد التطوير')}>
                                  <Bell className="h-4 w-4" />
                                  {t('orders.notifyCustomerPickup', 'إشعار العميل بالاستلام')}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* 10. Customer / Recipient */}
                      <DetailSection title={t('orders.customer', 'العميل')}>
                        <DetailRow label={t('orders.customer_name', 'الاسم')}>{detailOrder.customerName}</DetailRow>
                        <DetailRow label={t('orders.customer_phone', 'الجوال')}>
                          <PermissionGate permission="orders:view_sensitive" fallback={<span dir="ltr" className="font-mono text-neutral-300">••••••••</span>}>
                            <span dir="ltr" className="font-mono">{detailOrder.customerPhone}</span>
                          </PermissionGate>
                        </DetailRow>
                        {detailOrder.customerEmail && (
                          <DetailRow label={t('orders.customer_email', 'البريد')}>
                            <PermissionGate permission="orders:view_sensitive" fallback={<span className="text-neutral-300">••••••••</span>}>
                              {detailOrder.customerEmail}
                            </PermissionGate>
                          </DetailRow>
                        )}
                        {detailOrder.shippingAddress && (detailOrder.shippingAddress as any).city && (
                          <DetailRow label={t('orders.city', 'المدينة')}>{(detailOrder.shippingAddress as any).city}</DetailRow>
                        )}
                        {detailOrder.shippingAddress && (
                          <DetailRow label={t('orders.customer_address', 'العنوان')}>
                            <div className="text-sm space-y-0.5">
                              {(detailOrder.shippingAddress as any).street && <div>{(detailOrder.shippingAddress as any).street}</div>}
                              {(detailOrder.shippingAddress as any).district && <div>{(detailOrder.shippingAddress as any).district}</div>}
                            </div>
                          </DetailRow>
                        )}
                      </DetailSection>

                      {/* 11. Documents */}
                      {!isExternal && documentActions.length > 0 && (
                        <DetailSection title={t('orders.documents', 'المستندات')}>
                          <div className="flex flex-wrap gap-2">
                            {documentActions.map(renderActionButton)}
                          </div>
                        </DetailSection>
                      )}

                      {/* 12. Notes */}
                      {detailOrder.notes && (
                        <DetailSection title={t('orders.notes', 'ملاحظات')}>
                          <p className="text-sm text-neutral-900 bg-neutral-50 p-3 rounded-2xl">{detailOrder.notes}</p>
                        </DetailSection>
                      )}

                      {/* 13. Status History */}
                      {detailOrder.statusHistory && detailOrder.statusHistory.length > 0 && (
                        <DetailSection title={t('orders.status_history', 'سجل الحالة')}>
                          <div className="space-y-1.5">
                            {[...detailOrder.statusHistory].reverse().slice(0, 5).map((h: any) => {
                              const isDestructive = ['cancelled', 'refunded', 'returned'].includes(h.toStatus);
                              const dotColor = isDestructive ? 'bg-red-500' : 'bg-emerald-500';
                              return (
                                <div key={h.id} className="flex items-center gap-2 text-sm">
                                  <div className={`h-1.5 w-1.5 rounded-full ${dotColor} shrink-0 mt-1`} />
                                  <Badge className="text-xs">{(() => { const sv = h.toStatus || h.status || h.newStatus || h.to || h.from || h.toPaymentStatus || h.paymentStatus || h.fromStatus || h.fromPaymentStatus || Object.values(h).find(v => typeof v === 'string' && !v.includes('/') && getArabicLabel(v)); return getArabicLabel(sv) || sv || '—'; })()}</Badge>
                                  <span className="text-xs text-neutral-400">{new Date(h.createdAt).toLocaleString('ar-SA')}</span>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-xs text-neutral-400 mt-1">* التواريخ في البيانات التجريبية متطابقة للعرض فقط.</p>
                        </DetailSection>
                      )}

                      {/* 14. Danger Zone */}
                      {!isExternal && dangerActions.length > 0 && (
                        <DetailSection title={t('orders.danger_zone', 'الإجراءات الخطرة')}>
                          <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {dangerActions.map(renderActionButton)}
                            </div>
                          </div>
                        </DetailSection>
                      )}

                    </>
                  );
                })()}

              </div>
           )}
         </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={(o) => { if (!o) setConfirmAction(null); }}>
        <DialogContent className="max-w-sm bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900">{t('orders.confirm_title', 'تأكيد الإجراء')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">
            {t('orders.confirm_text', 'هل أنت متأكد من {{label}} هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.', { label: confirmAction?.label })}
          </p>
           <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
             <Button variant="outline" className="h-10 px-4 text-sm rounded-xl" onClick={() => setConfirmAction(null)}>{t('orders.cancel', 'إلغاء')}</Button>
             <Button className="h-10 px-4 text-sm rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border border-red-600"
               disabled={changingStatus}
               onClick={() => {
                 if (confirmAction) {
                   changeStatus(confirmAction.orderId, confirmAction.status);
                   setConfirmAction(null);
                 }
               }}>
               {changingStatus ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Ban className="h-4 w-4 me-1" />}
               {confirmAction?.label}
             </Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
