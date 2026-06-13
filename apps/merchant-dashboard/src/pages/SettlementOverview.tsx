import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { walletApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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
          <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
            <Link to="/wallet"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-2xl font-bold text-neutral-900">{t('settlement.overviewTitle')}</h1>
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

  const handleRequestPayout = async () => {
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
    setRequesting(true);
    try {
      await walletApi.requestPayout(storeId, amount);
      const updated = await walletApi.payouts(storeId);
      setPayouts(updated as SettlementOverviewPayout[]);
      setRequestModalOpen(false);
      setRequestAmount('');
      toast.success('تم إنشاء طلب التسوية');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل إنشاء طلب التسوية');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
            <Link to="/wallet"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-2xl font-bold text-neutral-900">{t('settlement.overviewTitle')}</h1>
        </div>
        <Button
          className="h-10 gap-2"
          onClick={() => {
            setRequestAmount(String(availableBalance));
            setRequestModalOpen(true);
          }}
          disabled={!isEligible || Number(availableBalance) <= 0 || requesting}
        >
          <Send className="h-4 w-4" />
          {requesting ? 'جاري الطلب...' : 'طلب تسوية'}
        </Button>
      </div>

      <div className="bg-blue-50/50 border border-blue-200/50 rounded-3xl p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800 space-y-1">
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

      {requestModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-neutral-900 mb-2">طلب تسوية</h3>
            <p className="text-sm text-neutral-500 mb-4">
              الرصيد المتاح: {formatCurrency(availableBalance)} {t('common.sar')}
            </p>
            <label className="block text-xs text-neutral-500 mb-1">مبلغ التسوية</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={requestAmount}
              onChange={(e) => setRequestAmount(e.target.value)}
              className="w-full border border-neutral-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2 mt-5">
              <Button
                variant="outline"
                onClick={() => { setRequestModalOpen(false); setRequestAmount(''); }}
                disabled={requesting}
              >
                إلغاء
              </Button>
              <Button onClick={handleRequestPayout} disabled={requesting || !requestAmount}>
                {requesting ? 'جاري الطلب...' : 'تأكيد الطلب'}
              </Button>
            </div>
          </div>
        </div>
      )}

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
                <TableHead className="h-10 text-sm text-neutral-500 font-medium text-right">المبلغ</TableHead>
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
                  <TableCell className="text-sm font-semibold tabular-nums text-right text-emerald-600 p-3">
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
                <TableHead className="h-10 text-sm text-neutral-500 font-medium text-right">{t('settlement.grossAmount')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium text-right">{t('settlement.netPayable')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map(batch => {
                const settlementRef = `SET-${String(batch.id).padStart(6, '0')}`;
                return (
                  <TableRow key={batch.id} className="border-neutral-100 hover:bg-neutral-50">
                    <TableCell className="p-3">
                      <Link
                        to={`/wallet/settlements/${batch.id}`}
                        className="font-mono text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
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
                    <TableCell className="text-sm tabular-nums text-right p-3">
                      {batch.grossAmount ? `${formatCurrency(batch.grossAmount)} ${t('common.sar')}` : '-'}
                    </TableCell>
                    <TableCell className="text-sm font-semibold tabular-nums text-right text-emerald-600 p-3">
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
