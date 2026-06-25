import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { walletApi } from '@/lib/api';
import { messageFromError } from '@/lib/error-mapper';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, AlertTriangle, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';

interface BatchTransaction {
  id: number;
  orderId: number;
  orderNumber?: string;
  createdAt?: string;
  amount?: number;
  gatewayFees?: number;
  platformFees?: number;
  merchantPayable?: number;
  reconciliationStatus?: string;
  shippingAmount?: number;
  discountAmount?: number;
  refundReserve?: number;
}

interface BatchDetail {
  id: number;
  status: string;
  createdAt?: string;
  grossAmount?: number;
  gatewayFees?: number;
  platformFees?: number;
  merchantPayable?: number;
  transferDate?: string;
  transferReference?: string;
  transactions?: BatchTransaction[];
}

interface TimelineStep {
  key: string;
  label: string;
}

const reconciliationColors: Record<string, 'success' | 'warning' | 'destructive' | 'default'> = {
  matched: 'success',
  pending: 'warning',
  failed: 'destructive',
  unmatched: 'default',
};

const settlementStatusColors: Record<string, 'success' | 'warning' | 'default' | 'secondary'> = {
  completed: 'success',
  pending: 'warning',
  processing: 'default',
  cancelled: 'secondary',
};

const arabicStatusLabels: Record<string, string> = {
  pending: 'معلقة',
  processing: 'قيد المعالجة',
  completed: 'مكتملة',
  cancelled: 'ملغية',
};

const TIMELINE_STEPS: TimelineStep[] = [
  { key: 'created', label: 'stepCreated' },
  { key: 'underReview', label: 'stepUnderReview' },
  { key: 'approved', label: 'stepApproved' },
  { key: 'transferPending', label: 'stepTransferPending' },
  { key: 'transferred', label: 'stepTransferred' },
  { key: 'proofUploaded', label: 'stepProofUploaded' },
  { key: 'verified', label: 'stepVerified' },
];

const STATUS_TIMELINE_INDEX: Record<string, number> = {
  pending: 0,
  processing: 1,
  completed: 6,
};

export default function SettlementDetail() {
  const { t } = useTranslation();
  const { batchId } = useParams<{ batchId: string }>();
  const { storeId } = useAuth();
  const [detail, setDetail] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!storeId || !batchId) return;
    setLoading(true);
    setError(false);
    setErrorMessage('');
    walletApi.settlementBatchDetail(storeId, Number(batchId))
      .then((data) => setDetail(data as BatchDetail))
      .catch((err: unknown) => {
        // Audit PART 3 P0 #3 follow-up: surface a translated, mapped
        // reason rather than a generic "load failed" string so the
        // merchant can tell network failure from access denial etc.
        setError(true);
        setErrorMessage(messageFromError(err, t));
      })
      .finally(() => setLoading(false));
  }, [storeId, batchId, t]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        <Skeleton className="h-8 w-64 rounded-2xl" />
        <Skeleton className="h-6 w-48 rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3">
          {/* Back nav — touch target ≥ 44x44 (WCAG 2.5.5). */}
          <Button variant="ghost" size="icon" className="h-11 w-11" asChild>
            <Link to="/finance/wallet" aria-label={t('common.back', 'رجوع')}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{t('settlement.detailTitle', 'تفاصيل التسوية')}</h1>
        </div>
        <div className="p-12 text-center">
          <div className="inline-flex p-4 rounded-2xl bg-red-50 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <p className="text-sm text-neutral-500">{errorMessage || t('settlement.loadError', 'فشل تحميل تفاصيل التسوية')}</p>
        </div>
      </div>
    );
  }

  const settlementRef = `SET-${String(detail.id).padStart(6, '0')}`;
  const transactions = detail.transactions ?? [];

  // Audit PART 3 P0 #3 (SettlementDetail.tsx:133-135,170):
  //
  // The page used to render TWO different fee totals on the same view:
  // the summary cells preferred the batch-level `detail.gatewayFees` /
  // `detail.platformFees`, while the "Total Fees" cell summed the
  // per-row `tx.gatewayFees` / `tx.platformFees`. When backend rounding
  // diverges between the batch aggregate and the per-row aggregate the
  // merchant sees two different numbers — a clear money-correctness bug.
  //
  // Single source of truth (decision): batch-level fees are the
  // accounting record of what was settled; the per-row breakdown is an
  // explanatory denormalisation. We therefore READ FROM THE BATCH when
  // it is available, and only fall back to the per-row sum when the
  // batch field is null/undefined. Every fee cell on this page derives
  // from `gatewayFees`/`platformFees`/`totalFees` below, so the numbers
  // are guaranteed to reconcile.
  const rowGateway = transactions.reduce((sum, tx) => sum + (tx.gatewayFees ?? 0), 0);
  const rowPlatform = transactions.reduce((sum, tx) => sum + (tx.platformFees ?? 0), 0);
  const gatewayFees = detail.gatewayFees ?? rowGateway;
  const platformFees = detail.platformFees ?? rowPlatform;
  const totalFees = gatewayFees + platformFees;

  // Gross-amount fallback: the previous formula combined the per-row
  // fee sums with the merchant payable, which is equivalent to
  // (fees + net) — it silently DROPPED shipping, discount and refund
  // reserve, so a missing `detail.grossAmount` displayed a value
  // smaller than reality. Compute gross from the per-row `tx.amount`
  // field instead (the row's reported full order amount already
  // includes shipping/discount/reserve), and only use it when
  // `detail.grossAmount` is absent.
  const rowGross = transactions.reduce((sum, tx) => sum + (tx.amount ?? 0), 0);
  const grossAmount = detail.grossAmount ?? rowGross;

  const currentTimelineIdx = STATUS_TIMELINE_INDEX[detail.status] ?? -1;
  const isCancelled = detail.status === 'cancelled';

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* A. Header & Summary Section */}
      <div className="flex items-center gap-3">
        {/* Back nav — touch target ≥ 44x44 (WCAG 2.5.5). */}
        <Button variant="ghost" size="icon" className="h-11 w-11" asChild>
          <Link to="/finance/wallet" aria-label={t('common.back', 'رجوع')}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{t('settlement.detailTitle', 'تفاصيل التسوية')}</h1>
            <Badge variant={settlementStatusColors[detail.status] ?? 'default'} className="text-xs px-3 py-1">
              {arabicStatusLabels[detail.status] ?? detail.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-sm text-neutral-500 font-mono">{settlementRef}</p>
            {detail.createdAt && (
              <>
                <span className="text-neutral-300">|</span>
                <p className="text-sm text-neutral-500">{t('settlement.cycleDate', 'تاريخ الدورة')}: {new Date(detail.createdAt).toLocaleDateString('ar-SA')}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-4">
          <p className="text-sm text-neutral-500">{t('settlement.grossAmount', 'الإجمالي')}</p>
          <p className="text-lg font-bold text-neutral-900 mt-1">{formatCurrency(grossAmount)} {t('common.sar')}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-4">
          <p className="text-sm text-neutral-500">{t('settlement.gatewayFees', 'رسوم البوابة')}</p>
          <p className="text-lg font-bold text-red-600 mt-1">{formatCurrency(gatewayFees)} {t('common.sar')}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-4">
          <p className="text-sm text-neutral-500">{t('settlement.platformFees', 'رسوم المنصة')}</p>
          <p className="text-lg font-bold text-orange-600 mt-1">{formatCurrency(platformFees)} {t('common.sar')}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-4">
          <p className="text-sm text-neutral-500">{t('settlement.netPayable', 'صافي المستحق')}</p>
          <p className="text-lg font-bold text-emerald-600 mt-1">{formatCurrency(detail.merchantPayable ?? 0)} {t('common.sar')}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-4">
          <p className="text-sm text-neutral-500">{t('settlement.totalFees', 'إجمالي الرسوم')}</p>
          <p className="text-lg font-bold text-neutral-900 mt-1">{formatCurrency(totalFees)} {t('common.sar')}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-4">
          <p className="text-sm text-neutral-500">{t('settlement.ordersCount', 'عدد الطلبات')}</p>
          <p className="text-lg font-bold text-neutral-900 mt-1">{transactions.length}</p>
        </div>
      </div>

      {/* Transfer Info */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-sm text-neutral-500">{t('settlement.transferDate', 'تاريخ التحويل')}</p>
            <p className="text-sm font-semibold text-neutral-900 mt-1">
              {detail.transferDate
                ? new Date(detail.transferDate).toLocaleDateString('ar-SA')
                : t('settlement.noTransferYet', 'لم يتم التحويل بعد')}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">{t('settlement.transferReference', 'مرجع التحويل')}</p>
            <p className={`text-sm font-semibold mt-1 ${detail.transferReference ? 'text-neutral-900 font-mono' : 'text-neutral-500'}`}>
              {detail.transferReference ?? t('settlement.noTransferYet', 'لم يتم التحويل بعد')}
            </p>
          </div>
        </div>
      </div>

      {/* C. Status Timeline */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-5">
        <h2 className="text-lg font-bold text-neutral-900 mb-4">{t('settlement.timelineTitle', 'سجل الحالة')}</h2>
        {isCancelled ? (
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{t('settlement.stepCancelled', 'ملغية')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-0">
            {TIMELINE_STEPS.map((step, i) => {
              const isPast = i <= currentTimelineIdx;
              const isCurrent = i === currentTimelineIdx;
              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isPast ? 'bg-emerald-500 text-white shadow-sm' : 'bg-neutral-200 text-neutral-400'
                    } ${isCurrent ? 'ring-2 ring-emerald-300 ring-offset-2' : ''}`}>
                      {isPast ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`text-xs font-medium whitespace-nowrap ${isPast ? 'text-emerald-600' : 'text-neutral-400'}`}>
                      {t(`settlement.${step.label}`)}
                    </span>
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 mb-5 ${isPast && i < currentTimelineIdx ? 'bg-emerald-500' : 'bg-neutral-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* B. Orders Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        <div className="p-4 border-b border-neutral-100">
          <h2 className="text-lg font-bold text-neutral-900">{t('settlement.ordersTitle', 'الطلبات المشمولة في التسوية')}</h2>
          <p className="text-sm text-neutral-500 mt-0.5">{transactions.length} {t('settlement.transactionCount', 'عملية')}</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-100 hover:bg-transparent">
                <TableHead className="h-10 text-sm text-neutral-500 font-medium whitespace-nowrap">{t('settlement.orderNumber', 'رقم الطلب')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium whitespace-nowrap">{t('settlement.paymentDate', 'تاريخ الدفع')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium text-start whitespace-nowrap">{t('settlement.grossAmount', 'إجمالي الطلب')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium text-start whitespace-nowrap">{t('settlement.gatewayFees', 'رسوم البوابة')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium text-start whitespace-nowrap">{t('settlement.platformFees', 'رسوم المنصة')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium text-start whitespace-nowrap">{t('settlement.shippingAmount', 'مبلغ الشحن')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium text-start whitespace-nowrap">{t('settlement.discountAmount', 'الخصم')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium text-start whitespace-nowrap">{t('settlement.refundReserve', 'احتياطي الاسترداد')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium text-start whitespace-nowrap">{t('settlement.netPayable', 'صافي المستحق')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium whitespace-nowrap">{t('settlement.reconciliationStatus', 'حالة المطابقة')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-sm text-neutral-400 py-8">
                    {t('settlement.noTransactions', 'لا توجد معاملات في هذه التسوية')}
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx: BatchTransaction) => (
                  <TableRow key={tx.id} className="border-neutral-100 hover:bg-neutral-50">
                    <TableCell className="p-3 whitespace-nowrap">
                      <Link
                        to={`/sales/orders/${tx.orderId}`}
                        className="font-mono text-sm font-semibold text-primary-600 hover:text-primary-800 hover:underline inline-flex items-center gap-1"
                      >
                        {tx.orderNumber ?? `#${tx.orderId}`}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-neutral-400 p-3 whitespace-nowrap">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('ar-SA') : '-'}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-start tabular-nums p-3 whitespace-nowrap">
                      {formatCurrency(tx.amount ?? 0)} {t('common.sar')}
                    </TableCell>
                    <TableCell className="text-sm text-start tabular-nums text-red-600 p-3 whitespace-nowrap">
                      {formatCurrency(tx.gatewayFees ?? 0)} {t('common.sar')}
                    </TableCell>
                    <TableCell className="text-sm text-start tabular-nums text-orange-600 p-3 whitespace-nowrap">
                      {formatCurrency(tx.platformFees ?? 0)} {t('common.sar')}
                    </TableCell>
                    <TableCell className="text-sm text-start tabular-nums text-neutral-900 p-3 whitespace-nowrap">
                      {tx.shippingAmount != null ? `${formatCurrency(tx.shippingAmount)} ${t('common.sar')}` : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-start tabular-nums text-rose-600 p-3 whitespace-nowrap">
                      {tx.discountAmount != null ? `${formatCurrency(tx.discountAmount)} ${t('common.sar')}` : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-start tabular-nums text-amber-600 p-3 whitespace-nowrap">
                      {tx.refundReserve != null ? `${formatCurrency(tx.refundReserve)} ${t('common.sar')}` : '-'}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-start tabular-nums text-emerald-600 p-3 whitespace-nowrap">
                      {formatCurrency(tx.merchantPayable ?? 0)} {t('common.sar')}
                    </TableCell>
                    <TableCell className="p-3 whitespace-nowrap">
                      <Badge variant={reconciliationColors[tx.reconciliationStatus ?? ''] ?? 'default'} className="text-xs px-2.5 py-0.5">
                        {tx.reconciliationStatus === 'matched' ? t('settlement.matched', 'مطابق') :
                         tx.reconciliationStatus === 'pending' ? t('settlement.pending', 'قيد المراجعة') :
                         tx.reconciliationStatus === 'failed' ? t('settlement.failed', 'غير مطابق') :
                         t('settlement.unmatched', 'غير مطابق')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
