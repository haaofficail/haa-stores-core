import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ordersApi, settingsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, Eye, Search, AlertTriangle, Loader2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClientError } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { SarIcon } from '@/components/ui/SarIcon';
import { PermissionGate, usePermissions } from '@/lib/permissions';
import { escapeCsvCell } from '@/lib/csv';
import { escapeHtmlText } from '@/lib/html';
import {
  orderStatusColors,
  paymentStatusColors,
  statusIcons,
  StatusBadge,
} from './orders/orderHelpers';
import { OrderDetailDialog } from './orders/OrderDetailDialog';
import { OrderConfirmDialog } from './orders/OrderConfirmDialog';

export default function Orders() {
  const { t, i18n } = useTranslation();
  const orderPerms = usePermissions();
  const { storeId } = useAuth();
  const { orderId: routeOrderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- API response has no shared Order type yet
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- API response has no shared Order type yet
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ orderId: number; status: string; label: string } | null>(null);
  const [tableLoading, setTableLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pickup locations response has no shared type yet
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
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{t('orders.title')}</h1>

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
              // PII guard: print echoes customerPhone, which is masked
              // in the table for users without orders:view_sensitive.
              // Mirror that guard here — and apply CSV-injection escape
              // on every cell so an Excel-opened printout cannot run a
              // formula injected via a malicious customer name.
              const canSeeSensitive = orderPerms.can('orders:view_sensitive');
              const safeHtml = (v: unknown) => escapeHtmlText(v);
              selectedOrders.forEach(id => {
                const order = orders.find(o => o.id === id);
                if (order) {
                  const win = window.open('', '_blank');
                  if (win) {
                    const phoneLine = canSeeSensitive ? ` - ${safeHtml(order.customerPhone)}` : '';
                    win.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>${safeHtml(order.orderNumber)}</title><style>body{font-family:sans-serif;padding:40px;max-width:800px;margin:0 auto}</style></head><body><h2>${safeHtml(order.orderNumber)}</h2><p>${safeHtml(order.customerName)}${phoneLine}</p><p>${safeHtml(t(`orders.status_${order.status}`))}</p></body></html>`);
                    win.document.close();
                    win.print();
                  }
                }
              });
            }}>{t('orders.bulk_print', 'طباعة')}</Button>
            <PermissionGate permission="orders:export" fallback={null}>
              <Button size="sm" className="h-8 text-xs bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50" onClick={() => {
                // PII guard + CSV-injection escape. Users without
                // orders:view_sensitive get the phone column masked.
                // Every cell runs through escapeCsvCell so a name like
                // `=cmd|'/C calc'!A1` cannot execute in Excel.
                const canSeeSensitive = orderPerms.can('orders:view_sensitive');
                const phoneHeader = canSeeSensitive ? t('orders.phone', 'الجوال') : '';
                const csv: string[][] = [
                  [t('orders.orderNumber', 'رقم الطلب'), t('orders.customer', 'العميل'), phoneHeader, t('orders.status', 'الحالة'), t('orders.total', 'المجموع'), t('orders.date', 'التاريخ')]
                    .filter(h => h !== ''),
                ];
                selectedOrders.forEach(id => {
                  const o = orders.find(o => o.id === id);
                  if (!o) return;
                  const row: string[] = [o.orderNumber, o.customerName];
                  if (canSeeSensitive) row.push(o.customerPhone);
                  row.push(t(`orders.status_${o.status}`));
                  row.push(`${formatCurrency(o.total)} ${t('common.sar')}`);
                  row.push(new Date(o.createdAt).toLocaleDateString('ar-SA'));
                  csv.push(row);
                });
                const escaped = csv.map(r => r.map(escapeCsvCell).join(',')).join('\n');
                const blob = new Blob(['﻿' + escaped], { type: 'text/csv;charset=utf-8' });
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

      <OrderDetailDialog
        t={t}
        navigate={navigate}
        routeOrderId={routeOrderId}
        storeId={storeId}
        detailOpen={detailOpen}
        setDetailOpen={setDetailOpen}
        loadingDetail={loadingDetail}
        detailOrder={detailOrder}
        setDetailOrder={setDetailOrder}
        changingStatus={changingStatus}
        setChangingStatus={setChangingStatus}
        setConfirmAction={setConfirmAction}
        pickupLocations={pickupLocations}
        showLabelForm={showLabelForm}
        setShowLabelForm={setShowLabelForm}
        labelCarrier={labelCarrier}
        setLabelCarrier={setLabelCarrier}
        labelTracking={labelTracking}
        setLabelTracking={setLabelTracking}
        savingLabel={savingLabel}
        setSavingLabel={setSavingLabel}
        changeStatus={changeStatus}
        load={load}
      />

      <OrderConfirmDialog
        t={t}
        confirmAction={confirmAction}
        setConfirmAction={setConfirmAction}
        changingStatus={changingStatus}
        changeStatus={changeStatus}
      />
    </div>
  );
}
