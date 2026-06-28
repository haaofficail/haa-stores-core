/**
 * OrderDetailDialog — order detail modal extracted from Orders.tsx (P2-031).
 *
 * Pure presentation + state plumbing. All state, setters, and side-effect
 * handlers live in the parent <Orders /> page; this component receives them
 * via a single `props` object.
 *
 * NO logic changes from the original Orders.tsx implementation — this is a
 * straight JSX extraction to bring Orders.tsx under the audit's 1000-LOC
 * ceiling. See PR for P2-031 (audit 2026-06-23).
 */
import { Link, type NavigateFunction } from 'react-router-dom';
import type { TFunction } from 'i18next';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Ban,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Heart,
  Loader2,
  MapPin,
  Package,
  PackageCheck,
  PackageOpen,
  Printer,
  RefreshCw,
  Truck,
  Undo2,
  Wallet,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SarIcon } from '@/components/ui/SarIcon';
import { ApiClientError, ordersApi, shippingApi } from '@/lib/api';
import { escapeHtmlText } from '@/lib/html';
import { getOrderActions, type OrderAction } from '@/lib/order-actions';
import { PermissionGate } from '@/lib/permissions';
import { formatCurrency, getDefaultImage, handleImageError } from '@/lib/utils';
import {
  arabicStatusLabels,
  DetailRow,
  DetailSection,
  fulfillmentColors,
  getArabicLabel,
  orderStatusColors,
  paymentStatusColors,
  StatusBadge,
  statusIcons,
} from './orderHelpers';

export interface OrderDetailDialogProps {
  // i18n + routing context
  t: TFunction;
  navigate: NavigateFunction;
  routeOrderId: string | undefined;
  storeId: number | null;

  // dialog open state
  detailOpen: boolean;
  setDetailOpen: (open: boolean) => void;
  loadingDetail: boolean;

  // order detail state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- API response has no shared Order type yet (parity with Orders.tsx)
  detailOrder: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- API response has no shared Order type yet (parity with Orders.tsx)
  setDetailOrder: (o: any) => void;
  changingStatus: boolean;
  setChangingStatus: (b: boolean) => void;

  // confirm dialog
  setConfirmAction: (a: { orderId: number; status: string; label: string } | null) => void;

  // pickup locations + label form state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pickup locations have no shared type yet (parity with Orders.tsx)
  pickupLocations: any[];
  showLabelForm: boolean;
  setShowLabelForm: (b: boolean) => void;
  labelCarrier: string;
  setLabelCarrier: (s: string) => void;
  labelTracking: string;
  setLabelTracking: (s: string) => void;
  savingLabel: boolean;
  setSavingLabel: (b: boolean) => void;

  // handlers from parent
  changeStatus: (orderId: number, status: string) => void | Promise<void>;
  load: () => void;
}

export function OrderDetailDialog(props: OrderDetailDialogProps) {
  const {
    t,
    navigate,
    routeOrderId,
    storeId,
    detailOpen,
    setDetailOpen,
    loadingDetail,
    detailOrder,
    setDetailOrder,
    changingStatus,
    setChangingStatus,
    setConfirmAction,
    pickupLocations,
    showLabelForm,
    setShowLabelForm,
    labelCarrier,
    setLabelCarrier,
    labelTracking,
    setLabelTracking,
    savingLabel,
    setSavingLabel,
    changeStatus,
    load,
  } = props;

  return (
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
                const preparationActions = bySection('preparation');
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
                  // `resend_tracking` handler removed with the action
                  // itself (see lib/order-actions.ts comment). The old
                  // handler showed a success toast without any API
                  // call, which misled merchants into thinking the
                  // tracking notification had been re-sent.
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
                        const title = escapeHtmlText(t('orders.giftMessage', 'رسالة الهدية'));
                        const safeMessage = escapeHtmlText(msg);
                        win.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>${title}</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fdf2f8;color:#9d174d;font-size:24px;padding:40px;text-align:center}</style></head><body>&quot;${safeMessage}&quot;</body></html>`);
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
                  // Preparation status actions (HAA-PREP-001)
                  if (action.section === 'preparation' && action.targetPreparationStatus) {
                    if (!storeId) return;
                    setChangingStatus(true);
                    ordersApi.updatePreparationStatus(storeId, orderId, action.targetPreparationStatus)
                      .then(() => ordersApi.getById(storeId, orderId))
                      .then((o) => { setDetailOrder(o); load(); })
                      .catch(err => toast.error(err instanceof ApiClientError ? err.message : t('common.error')))
                      .finally(() => setChangingStatus(false));
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
                  PackageOpen: <PackageOpen className="h-4 w-4" />,
                  PackageCheck: <PackageCheck className="h-4 w-4" />,
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
                  const isDisabledByGuard = !!action.disabledReason;
                  const baseClass = isDanger
                    ? 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border border-red-600'
                    : isDisabledByGuard
                    ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                    : 'bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 shadow-sm';
                  return (
                    <PermissionGate permission={getActionPermission(action)} fallback={null}>
                      <div key={action.key} className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          className={`h-9 px-4 text-sm font-medium rounded-xl ${baseClass} flex items-center gap-1.5`}
                          disabled={changingStatus || isDisabledByGuard}
                          onClick={() => !isDisabledByGuard && handleAction(action)}
                          variant={isDanger ? 'default' : 'outline'}
                        >
                          {changingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : iconMap[action.icon]}
                          {action.label}
                        </Button>
                        {isDisabledByGuard && (
                          <p className="text-xs text-amber-600 px-1">
                            {action.disabledReason}
                          </p>
                        )}
                      </div>
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
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- order item has no shared type yet */}
                            {detailOrder.items.map((item: any) => {
                              const itemBadges = [];
                              if (item.giftWrapSelected) itemBadges.push('🎁');
                              if (item.sendAsGift) itemBadges.push('💌');
                              return (
                              <TableRow key={item.id} className="border-neutral-100 hover:bg-transparent">
                                <TableCell className="p-3">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={item.productImageUrl || getDefaultImage()}
                                      onError={handleImageError}
                                      alt={item.name}
                                      loading="lazy"
                                      className="h-10 w-10 shrink-0 rounded-lg border border-neutral-100 object-cover"
                                    />
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-neutral-900">{item.name}</p>
                                      {item.sku && <p className="text-xs text-neutral-400 font-mono" dir="ltr">{item.sku}</p>}
                                    </div>
                                  </div>
                                </TableCell>
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

                    {/* 7b. Preparation workflow (HAA-PREP-001) — delivery orders at processing status */}
                    {!orderActions.isPickup && preparationActions.length > 0 && (
                      <DetailSection title={t('orders.preparation', 'مرحلة التجهيز')}>
                        <div className="flex items-center gap-2 mb-3">
                          <PackageOpen className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-neutral-600">
                            {t('orders.prep_status_label', 'حالة التجهيز')}:{' '}
                            <span className="font-medium text-neutral-800">
                              {(() => {
                                const ps = detailOrder?.preparationStatus ?? 'not_started';
                                const map: Record<string, string> = { not_started: 'لم يبدأ', preparing: 'قيد التجهيز', prepared: 'تم التجهيز', packed: 'تم التغليف' };
                                return map[ps] ?? ps;
                              })()}
                            </span>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {preparationActions.map(renderActionButton)}
                        </div>
                      </DetailSection>
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
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pickup location has no shared type yet
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
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- shippingAddress is an untyped API payload; values must render as ReactNode */}
                      {detailOrder.shippingAddress && (detailOrder.shippingAddress as any).city && (
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- same: shippingAddress untyped API payload
                        <DetailRow label={t('orders.city', 'المدينة')}>{(detailOrder.shippingAddress as any).city}</DetailRow>
                      )}
                      {detailOrder.shippingAddress && (
                        <DetailRow label={t('orders.customer_address', 'العنوان')}>
                          <div className="text-sm space-y-0.5">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- shippingAddress untyped API payload */}
                            {(detailOrder.shippingAddress as any).street && <div>{(detailOrder.shippingAddress as any).street}</div>}
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- shippingAddress untyped API payload */}
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
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- status history entry has no shared type yet */}
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
  );
}

// TODO(P2-031 follow-up): the inner IIFE that defines `handleAction`,
// `handleCreateLabel`, `renderActionButton`, etc. should eventually be
// hoisted into a dedicated `useOrderActions` hook so this file gets under
// the 500-LOC ceiling. Out of scope for the P2-031 split; see audit
// 2026-06-23.
