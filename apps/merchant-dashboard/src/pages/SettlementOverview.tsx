import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { walletApi } from '@/lib/api';
import { messageFromError } from '@/lib/error-mapper';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, XCircle, Clock, Wallet, CalendarDays, Banknote, Package, ArrowLeft, Info, Send } from 'lucide-react';
import { toast } from 'sonner';

interface SettlementOverviewSummary {
  pendingBalance?: string;
  availableBalance?: string;
}

interface SettlementOverviewReadiness {
  settlementReadiness: 'not_ready' | 'partial' | 'ready';
  storeActive?: boolean;
  kycApproved: boolean;
  bankAccountVerified: boolean;
  reconciliationHealthy: boolean;
  refundRiskClear?: boolean;
  disputeRiskClear?: boolean;
}

interface SettlementOverviewBatch {
  id: number;
  status: string;
  createdAt?: string;
  grossAmount?: string;
  merchantPayable?: string;
  transactionCount?: number;
}

interface SettlementOverviewPayout {
  id: number;
  amount: string;
  status: string;
  reference: string;
  requestedAt: string;
}

const settlementStatusColors: Record<string, 'default' | 'success' | 'warning' | 'secondary'> = {
  completed: 'success',
  pending: 'warning',
  processing: 'default',
  cancelled: 'secondary',
};

const payoutStatusColors: Record<string, 'default' | 'success' | 'warning' | 'secondary' | 'destructive'> = {
  requested: 'warning',
  under_review: 'default',
  approved: 'default',
  rejected: 'destructive',
  transfer_pending: 'warning',
  transferred: 'default',
  proof_uploaded: 'default',
  transfer_verified: 'success',
  failed: 'destructive',
  cancelled: 'secondary',
  reversed: 'secondary',
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

export default function SettlementOverview() {
  const { t } = useTranslation();
  const { storeId } = useAuth();

  const [summary, setSummary] = useState<SettlementOverviewSummary | null>(null);
  const [readiness, setReadiness] = useState<SettlementOverviewReadiness | null>(null);
  const [batches, setBatches] = useState<SettlementOverviewBatch[]>([]);
  const [payouts, setPayouts] = useState<SettlementOverviewPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');
  // Two-stage confirm flow — MD_PAGES_AUDIT_PART_3_COMMERCE finding #1.
  // Stage `input` collects the amount; stage `confirm` shows a final
  // review screen and is the ONLY stage that fires the POST. This,
  // combined with `requesting` button-disable, blocks a double-click
  // from firing two payout POSTs before the first network round-trip
  // completes. (Network-layer idempotency is also enforced by
  // `Idempotency-Key` auto-attached in `lib/api.ts` request().)
  const [confirmStage, setConfirmStage] = useState<'input' | 'confirm'>('input');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    setError(false);
    Promise.all([
      walletApi.summary(storeId).catch(() => null),
      walletApi.settlementReadiness(storeId).catch(() => null),
      walletApi.settlementBatches(storeId).catch(() => []),
      walletApi.payouts(storeId).catch(() => []),
    ]).then(([s, r, b, p]) => {
      if (s) setSummary(s as SettlementOverviewSummary);
      if (r) setReadiness(r as SettlementOverviewReadiness);
      if (Array.isArray(b)) setBatches(b as SettlementOverviewBatch[]);
      if (Array.isArray(p)) setPayouts(p as SettlementOverviewPayout[]);
    }).catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [storeId]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        <Skeleton className="h-8 w-48 rounded-2xl" />
        <Skeleton className="h-6 w-72 rounded-2xl" />
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3">
          {/* Back nav — touch target ≥ 44x44 (WCAG 2.5.5). */}
          <Button variant="ghost" size="icon" className="h-11 w-11" asChild>
            <Link to="/finance/wallet" aria-label={t('common.back', 'رجوع')}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{t('settlement.overviewTitle')}</h1>
        </div>
        <div className="p-12 text-center">
          <div className="inline-flex p-4 rounded-2xl bg-red-50 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <p className="text-sm text-neutral-500 mb-3">{t('settlement.loadError')}</p>
          <Button variant="outline" className="h-9 text-sm" onClick={() => window.location.reload()}>
            {t('common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  const pendingBalance = summary.pendingBalance ?? '0';
  const availableBalance = summary.availableBalance ?? '0';
  const totalOrders = batches.reduce((sum, b) => sum + (b.transactionCount ?? 0), 0);
  const lastPayout = payouts.length > 0 ? payouts[0] : null;
  const isEligible = readiness?.settlementReadiness === 'ready';

  const blockedReasons: Array<{ key: string; label: string; check: boolean }> = [
    { key: 'storeInactive', label: 'لا يمكن طلب التسوية لأن المتجر موقوف أو غير نشط.', check: readiness?.storeActive === false },
    { key: 'bankNotVerified', label: t('settlement.reasonBankNotVerified'), check: readiness?.bankAccountVerified !== true },
    { key: 'kycIncomplete', label: t('settlement.reasonKycIncomplete'), check: readiness?.kycApproved !== true },
    { key: 'reconciliationPending', label: t('settlement.reasonReconciliationPending'), check: readiness?.reconciliationHealthy !== true },
    { key: 'refundRisk', label: 'لا يمكن طلب التسوية لوجود مخاطر استرداد مفتوحة.', check: readiness?.refundRiskClear === false },
    { key: 'disputeRisk', label: 'لا يمكن طلب التسوية لوجود اعتراض أو نزاع دفع مفتوح.', check: readiness?.disputeRiskClear === false },
    { key: 'noBalance', label: t('settlement.reasonNoBalance'), check: Number(availableBalance) <= 0 },
  ];

  // Validate amount and advance from `input` to `confirm` stage. The
  // POST only fires from `submitPayout()` after the user clicks the
  // confirm button in the second stage.
  const handleReviewPayout = () => {
    if (!storeId || !isEligible || Number(availableBalance) <= 0) return;
    const amount = Number(requestAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('أدخل مبلغ تسوية صحيح');
      return;
    }
    if (amount > Number(availableBalance)) {
      toast.error('مبلغ التسوية لا يمكن أن يتجاوز الرصيد المتاح');
      return;
    }
    setConfirmStage('confirm');
  };

  // The single point that fires the payout POST. Guarded by `requesting`
  // so a fast double-click cannot fire two requests. `Idempotency-Key`
  // is auto-attached by `lib/api.ts` request() as a defense-in-depth
  // second layer at the network boundary (PR #82).
  const submitPayout = async () => {
    if (!storeId || requesting) return;
    const amount = Number(requestAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setRequesting(true);
    try {
      await walletApi.requestPayout(storeId, amount);
      const updated = await walletApi.payouts(storeId);
      setPayouts(updated as SettlementOverviewPayout[]);
      setRequestModalOpen(false);
      setRequestAmount('');
      setConfirmStage('input');
      toast.success('تم إنشاء طلب التسوية');
    } catch (e) {
      // Surface the actual API error code via central mapper instead
      // of a generic toast — Audit Part 4 cross-cutting fix.
      toast.error(messageFromError(e, t));
    } finally {
      setRequesting(false);
    }
  };

  const closeModal = () => {
    if (requesting) return;
    setRequestModalOpen(false);
    setRequestAmount('');
    setConfirmStage('input');
  };

  // Single entry-point from the page header. Guarded so a fast
  // double-click on the trigger cannot open the modal twice or
  // bypass the confirm stage. Named `handleRequestPayout` to preserve
  // the symbol contract asserted by
  // `tests/manual-settlement-dashboard-ux.test.ts` (already on main).
  const handleRequestPayout = () => {
    if (requestModalOpen || requesting) return;
    setRequestAmount(String(availableBalance));
    setConfirmStage('input');
    setRequestModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Back nav — touch target ≥ 44x44 (WCAG 2.5.5). */}
          <Button variant="ghost" size="icon" className="h-11 w-11" asChild>
            <Link to="/finance/wallet" aria-label={t('common.back', 'رجوع')}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{t('settlement.overviewTitle')}</h1>
        </div>
        <Button
          className="h-10 gap-2"
          onClick={handleRequestPayout}
          disabled={!isEligible || Number(availableBalance) <= 0 || requesting || requestModalOpen}
          data-testid="settlement-trigger"
        >
          <Send className="h-4 w-4" />
          {requesting ? 'جاري الطلب...' : 'طلب تسوية'}
        </Button>
      </div>

      <div className="bg-primary-50/50 border border-primary-200/50 rounded-3xl p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary-500 mt-0.5 shrink-0" />
          <div className="text-sm text-primary-800 space-y-1">
            <p className="font-medium">{t('settlement.scheduleInfo')}</p>
            <p className="text-xs">{t('settlement.availableInfo')}</p>
            <p className="text-xs">{t('settlement.pendingInfo')}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm text-neutral-500 truncate">{t('settlement.pendingBalance')}</p>
              <p className="text-lg font-bold text-amber-600 mt-0.5">{formatCurrency(pendingBalance)} {t('common.sar')}</p>
            </div>
            <div className="p-2.5 rounded-2xl shrink-0 bg-amber-50">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm text-neutral-500 truncate">{t('settlement.availableBalance')}</p>
              <p className="text-lg font-bold text-emerald-600 mt-0.5">{formatCurrency(availableBalance)} {t('common.sar')}</p>
            </div>
            <div className="p-2.5 rounded-2xl shrink-0 bg-emerald-50">
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm text-neutral-500 truncate">{t('settlement.nextSettlement')}</p>
              <p className="text-lg font-bold text-neutral-900 mt-0.5">الأحد والأربعاء</p>
            </div>
            <div className="p-2.5 rounded-2xl shrink-0 bg-neutral-100">
              <CalendarDays className="h-4 w-4 text-neutral-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm text-neutral-500 truncate">{t('settlement.settlementEligibility')}</p>
              <p className={`text-lg font-bold mt-0.5 ${isEligible ? 'text-emerald-600' : 'text-red-600'}`}>
                {isEligible ? t('settlement.eligible') : t('settlement.notEligible')}
              </p>
            </div>
            <div className={`p-2.5 rounded-2xl shrink-0 ${isEligible ? 'bg-emerald-50' : 'bg-red-50'}`}>
              {isEligible
                ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                : <XCircle className="h-4 w-4 text-red-600" />}
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm text-neutral-500 truncate">{t('settlement.lastSettlement')}</p>
              <p className="text-lg font-bold text-neutral-900 mt-0.5">
                {lastPayout
                  ? new Date(lastPayout.requestedAt).toLocaleDateString('ar-SA')
                  : t('settlement.noSettlementYet')}
              </p>
            </div>
            <div className="p-2.5 rounded-2xl shrink-0 bg-neutral-100">
              <Banknote className="h-4 w-4 text-neutral-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm text-neutral-500 truncate">{t('settlement.ordersCount')}</p>
              <p className="text-lg font-bold text-neutral-900 mt-0.5">{totalOrders}</p>
            </div>
            <div className="p-2.5 rounded-2xl shrink-0 bg-neutral-100">
              <Package className="h-4 w-4 text-neutral-600" />
            </div>
          </div>
        </div>
      </div>

      {!isEligible && (
        <div className="bg-amber-50/50 border border-amber-200/50 rounded-3xl p-5">
          <h3 className="text-sm font-bold text-amber-800 mb-3">{t('settlement.settlementEligibility')}</h3>
          <ul className="space-y-2">
            {blockedReasons.filter(r => r.check).map(reason => (
              <li key={reason.key} className="flex items-center gap-2 text-sm text-amber-700">
                <XCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <span>{reason.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog
        open={requestModalOpen}
        onOpenChange={(open) => {
          // Block close while in-flight to avoid orphaning a payout
          // request the merchant cannot see the result of.
          if (!open && !requesting) closeModal();
        }}
      >
        <DialogContent className="max-w-md" data-testid="settlement-dialog">
          {confirmStage === 'input' ? (
            <>
              <DialogHeader>
                <DialogTitle>طلب تسوية</DialogTitle>
                <DialogDescription>
                  الرصيد المتاح: {formatCurrency(availableBalance)} {t('common.sar')}
                </DialogDescription>
              </DialogHeader>
              <div>
                <label htmlFor="payout-amount" className="block text-xs text-neutral-500 mb-1">
                  مبلغ التسوية
                </label>
                <input
                  id="payout-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  className="w-full border border-neutral-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  data-testid="settlement-amount-input"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeModal} disabled={requesting}>
                  إلغاء
                </Button>
                <Button
                  onClick={handleReviewPayout}
                  disabled={requesting || !requestAmount}
                  data-testid="settlement-review"
                >
                  متابعة
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>تأكيد طلب التحويل</DialogTitle>
                <DialogDescription>
                  راجع التفاصيل قبل إرسال الطلب — لا يمكن التراجع بعد التأكيد.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-2xl bg-neutral-50 border border-neutral-100 p-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">المبلغ</span>
                  <span className="font-bold tabular-nums text-neutral-900">
                    {formatCurrency(requestAmount)} {t('common.sar')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">الوجهة</span>
                  <span className="text-neutral-900">
                    الحساب البنكي الموثَّق المسجَّل في إعدادات المتجر
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">الرصيد المتاح</span>
                  <span className="tabular-nums text-neutral-900">
                    {formatCurrency(availableBalance)} {t('common.sar')}
                  </span>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setConfirmStage('input')}
                  disabled={requesting}
                >
                  رجوع
                </Button>
                <Button
                  onClick={submitPayout}
                  disabled={requesting}
                  data-testid="settlement-confirm"
                >
                  {requesting ? 'جاري الطلب...' : 'تأكيد طلب التحويل'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        <div className="p-4 border-b border-neutral-100">
          <h2 className="text-lg font-bold text-neutral-900">طلبات التسوية اليدوية</h2>
        </div>
        {payouts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-100 hover:bg-transparent">
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">رقم الطلب</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">تاريخ الطلب</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">الحالة</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium text-start">المبلغ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((payout) => (
                <TableRow key={payout.id} className="border-neutral-100 hover:bg-neutral-50">
                  <TableCell className="p-3 font-mono text-sm font-semibold text-neutral-900">
                    {payout.reference || `PAYOUT-${String(payout.id).padStart(6, '0')}`}
                  </TableCell>
                  <TableCell className="text-xs text-neutral-400 p-3">
                    {new Date(payout.requestedAt).toLocaleDateString('ar-SA')}
                  </TableCell>
                  <TableCell className="p-3">
                    <Badge variant={payoutStatusColors[payout.status] ?? 'default'} className="text-xs px-2.5 py-0.5">
                      {payoutStatusLabels[payout.status] ?? payout.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-semibold tabular-nums text-start text-emerald-600 p-3">
                    {formatCurrency(payout.amount)} {t('common.sar')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm text-neutral-500">لا توجد طلبات تسوية يدوية حتى الآن</p>
          </div>
        )}
      </div>

      {batches.length > 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
          <div className="p-4 border-b border-neutral-100">
            <h2 className="text-lg font-bold text-neutral-900">{t('settlement.detailTitle')}</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-100 hover:bg-transparent">
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('settlement.orderNumber')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('settlement.paymentDate')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('settlement.status')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium text-start">{t('settlement.grossAmount')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium text-start">{t('settlement.netPayable')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map(batch => {
                const settlementRef = `SET-${String(batch.id).padStart(6, '0')}`;
                return (
                  <TableRow key={batch.id} className="border-neutral-100 hover:bg-neutral-50">
                    <TableCell className="p-3">
                      <Link
                        to={`/finance/settlements/${batch.id}`}
                        className="font-mono text-sm font-semibold text-primary-600 hover:text-primary-800 hover:underline inline-flex items-center gap-1"
                      >
                        {settlementRef}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-neutral-400 p-3">
                      {batch.createdAt ? new Date(batch.createdAt).toLocaleDateString('ar-SA') : '-'}
                    </TableCell>
                    <TableCell className="p-3">
                      <Badge variant={settlementStatusColors[batch.status] ?? 'default'} className="text-xs px-2.5 py-0.5">
                        {batch.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-start p-3">
                      {batch.grossAmount ? `${formatCurrency(batch.grossAmount)} ${t('common.sar')}` : '-'}
                    </TableCell>
                    <TableCell className="text-sm font-semibold tabular-nums text-start text-emerald-600 p-3">
                      {batch.merchantPayable ? `${formatCurrency(batch.merchantPayable)} ${t('common.sar')}` : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="p-12 text-center">
          <div className="inline-flex p-4 rounded-2xl bg-neutral-100 mb-4">
            <Wallet className="h-8 w-8 text-neutral-400" />
          </div>
          <p className="text-sm text-neutral-500">{t('settlement.noSettlementYet')}</p>
        </div>
      )}
    </div>
  );
}
