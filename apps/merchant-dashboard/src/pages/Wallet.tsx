import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { walletApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { SarIcon } from '@/components/ui/SarIcon';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Wallet, DollarSign, CreditCard, ArrowUpCircle, ArrowDownCircle,
  TrendingUp, Clock, CheckCircle2, AlertTriangle,
  Search, RotateCcw, ChevronLeft, ChevronRight, Info, ExternalLink,
  Banknote, Ship, RefreshCw, Loader2, Landmark,
} from 'lucide-react';

const directionStyles: Record<string, { bg: string; icon: string; badge: string }> = {
  credit: { bg: 'bg-emerald-50', icon: 'text-emerald-600', badge: 'border-emerald-200 bg-emerald-50/60 text-emerald-700' },
  debit:  { bg: 'bg-rose-50',    icon: 'text-rose-600',    badge: 'border-rose-200 bg-rose-50/60 text-rose-700' },
};

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  pending: 'warning',
  available: 'success',
  settled: 'default',
  cancelled: 'destructive',
  disputed: 'destructive',
};

const typeIcons: Record<string, React.ReactNode> = {
  sale: <DollarSign className="h-3.5 w-3.5" />,
  platform_fee: <Banknote className="h-3.5 w-3.5" />,
  payment_fee: <CreditCard className="h-3.5 w-3.5" />,
  shipping_fee: <Ship className="h-3.5 w-3.5" />,
  refund: <RefreshCw className="h-3.5 w-3.5" />,
  payout: <ArrowDownCircle className="h-3.5 w-3.5" />,
  adjustment: <TrendingUp className="h-3.5 w-3.5" />,
  deposit: <Landmark className="h-3.5 w-3.5" />,
};

const typeColors: Record<string, { bg: string; icon: string; badge: string }> = {
  sale:         { bg: 'bg-emerald-50',     icon: 'text-emerald-600',   badge: 'border-emerald-200 bg-emerald-50/60 text-emerald-700' },
  platform_fee: { bg: 'bg-primary-50',        icon: 'text-primary-600',      badge: 'border-primary-200 bg-primary-50/60 text-primary-700' },
  payment_fee:  { bg: 'bg-amber-50',       icon: 'text-amber-600',     badge: 'border-amber-200 bg-amber-50/60 text-amber-700' },
  shipping_fee: { bg: 'bg-purple-50',      icon: 'text-purple-600',    badge: 'border-purple-200 bg-purple-50/60 text-purple-700' },
  refund:       { bg: 'bg-rose-50',        icon: 'text-rose-600',      badge: 'border-rose-200 bg-rose-50/60 text-rose-700' },
  payout:       { bg: 'bg-neutral-100',    icon: 'text-neutral-600',   badge: 'border-neutral-200 bg-neutral-100 text-neutral-700' },
  adjustment:   { bg: 'bg-cyan-50',        icon: 'text-cyan-600',      badge: 'border-cyan-200 bg-cyan-50/60 text-cyan-700' },
  deposit:      { bg: 'bg-emerald-50',     icon: 'text-emerald-600',   badge: 'border-emerald-200 bg-emerald-50/60 text-emerald-700' },
};

function SummaryCard({ title, value, icon, color, subtitle }: {
  title: string; value: string; icon: React.ReactNode; color: string; subtitle?: string;
}) {
  return (
    <div className="dashboard-card p-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm text-neutral-500 truncate">{title}</p>
          <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-2xl shrink-0 ${color.replace('text-', 'bg-').replace('600', '50').replace('500', '50')}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function fmt(n: number | string | undefined): string {
  return formatCurrency(n ?? 0);
}

export default function WalletPage() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [page, setPage] = useState(1);
  const isFirstLoad = useRef(true);

  const [typeFilter, setTypeFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

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
    Promise.all([
      walletApi.summary(storeId).catch(() => null),
      walletApi.entries(storeId, {
        page, limit,
        type: typeFilter || undefined,
        direction: directionFilter || undefined,
        status: statusFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: search || undefined,
      }).catch(() => { setFetchError(true); return null; }),
    ]).then(([s, e]) => {
      if (s) setSummary(s);
      if (e) { setEntries(e.data ?? []); setTotal(e.total ?? 0); }
    }).finally(() => {
      setLoading(false);
      setTableLoading(false);
    });
  }, [storeId, page, typeFilter, directionFilter, statusFilter, dateFrom, dateTo, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = () => { setSearch(searchInput); setPage(1); };
  const handleSearchKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };

  const resetFilters = () => {
    setTypeFilter(''); setDirectionFilter(''); setStatusFilter('');
    setDateFrom(''); setDateTo(''); setSearch(''); setSearchInput('');
    setPage(1);
  };

  const hasActiveFilters = typeFilter || directionFilter || statusFilter || search || dateFrom || dateTo;
  const totalPages = Math.ceil(total / limit);

  if (loading && !summary) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        <h1 className="text-2xl font-bold text-neutral-900">{t('wallet.title')}</h1>
        <div className="grid gap-3 md:grid-cols-5">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 rounded-3xl" />)}</div>
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">{t('wallet.title')}</h1>
          <Button variant="outline" className="h-9 text-sm gap-1.5" asChild>
            <Link to="/wallet/settlements">{t('wallet.viewSettlements', 'التسويات')}</Link>
          </Button>
        </div>

        {/* Q1 — Gateway Fee UX (TASK-0034 sub-item 6):
            "You receive X" hero card with collapsible breakdown.
            Owner decision (2026-06-16): show the net amount prominently
            with a collapsible breakdown, matching Saudi BNPL UX
            conventions. The native <details>/<summary> is used to keep
            the change dependency-free (no Radix Collapsible or similar). */}
        <div className="bg-gradient-to-br from-primary-50 to-emerald-50/50 border border-primary-200/60 rounded-3xl p-5 shadow-card">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm text-neutral-600">
                {t('wallet.youWillReceive', 'ستحصل على')}
              </p>
              <p className="text-3xl font-bold text-primary-700 mt-1">
                {fmt(summary?.netBalance)} <SarIcon size="md" />
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {t('wallet.youWillReceiveHint', 'صافي رصيدك بعد خصم رسوم المنصة ورسوم معالجة الدفع ورسوم الشحن')}
              </p>
            </div>
            <details className="text-sm group">
              <summary className="cursor-pointer text-primary-600 hover:text-primary-700 font-medium select-none inline-flex items-center gap-1.5">
                <span>{t('wallet.viewBreakdown', 'عرض التفاصيل')}</span>
                <ChevronLeft className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-3 bg-white/70 backdrop-blur rounded-2xl border border-white/60 p-4 space-y-2 min-w-[280px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-600 text-xs">{t('wallet.totalSales')}</span>
                  <span className="tabular-nums text-sm text-emerald-700">
                    <span className="text-neutral-400 me-1">+</span>
                    {fmt(summary?.totalSales)} <SarIcon size="sm" />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-600 text-xs">{t('wallet.platformFees')}</span>
                  <span className="tabular-nums text-sm text-rose-600">
                    <span className="text-neutral-400 me-1">−</span>
                    {fmt(summary?.platformFees)} <SarIcon size="sm" />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-600 text-xs">{t('wallet.paymentFees')}</span>
                  <span className="tabular-nums text-sm text-orange-600">
                    <span className="text-neutral-400 me-1">−</span>
                    {fmt(summary?.paymentFees)} <SarIcon size="sm" />
                  </span>
                </div>
                {Number(summary?.shippingFees ?? 0) > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-neutral-600 text-xs">{t('wallet.shippingFees')}</span>
                    <span className="tabular-nums text-sm text-purple-600">
                      <span className="text-neutral-400 me-1">−</span>
                      {fmt(summary?.shippingFees)} <SarIcon size="sm" />
                    </span>
                  </div>
                )}
                <div className="border-t border-neutral-200 pt-2 mt-2">
                  <div className="flex items-center justify-between gap-3 font-bold">
                    <span className="text-neutral-900 text-xs">{t('wallet.netBalance')}</span>
                    <span className="tabular-nums text-sm text-primary-700">
                      <span className="text-neutral-400 me-1">=</span>
                      {fmt(summary?.netBalance)} <SarIcon size="md" />
                    </span>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            title={t('wallet.totalSales')}
            value={`${fmt(summary?.totalSales)} ${t('common.sar')}`}
            icon={<TrendingUp className="h-4 w-4" />}
            color="text-green-600"
          />
          <SummaryCard
            title={t('wallet.platformFees')}
            value={`${fmt(summary?.platformFees)} ${t('common.sar')}`}
            icon={<Banknote className="h-4 w-4" />}
            color="text-red-600"
          />
          <SummaryCard
            title={t('wallet.paymentFees')}
            value={`${fmt(summary?.paymentFees)} ${t('common.sar')}`}
            icon={<CreditCard className="h-4 w-4" />}
            color="text-orange-600"
          />
          <SummaryCard
            title={t('wallet.shippingFees')}
            value={`${fmt(summary?.shippingFees)} ${t('common.sar')}`}
            icon={<Ship className="h-4 w-4" />}
            color="text-purple-600"
          />
          <SummaryCard
            title={t('wallet.netBalance')}
            value={`${fmt(summary?.netBalance)} ${t('common.sar')}`}
            icon={<Wallet className="h-4 w-4" />}
            color={(summary?.netBalance ?? 0) >= 0 ? 'text-primary-600' : 'text-red-600'}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <SummaryCard
            title={t('wallet.available')}
            value={`${fmt(summary?.availableBalance)} ${t('common.sar')}`}
            icon={<CheckCircle2 className="h-4 w-4" />}
            color="text-emerald-600"
          />
          <SummaryCard
            title={t('wallet.pending')}
            value={`${fmt(summary?.pendingBalance)} ${t('common.sar')}`}
            icon={<Clock className="h-4 w-4" />}
            color="text-amber-600"
          />
          <SummaryCard
            title={t('wallet.totalPayouts')}
            value={`${fmt(summary?.totalPayouts)} ${t('common.sar')}`}
            icon={<ArrowDownCircle className="h-4 w-4" />}
            color="text-neutral-600"
          />
          <SummaryCard
            title={t('wallet.refunds')}
            value={`${fmt(summary?.refunds)} ${t('common.sar')}`}
            icon={<RefreshCw className="h-4 w-4" />}
            color="text-rose-600"
          />
        </div>

        <div className="bg-primary-50/50 border border-primary-200/50 rounded-3xl p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary-500 mt-0.5 shrink-0" />
            <div className="text-sm text-primary-800 space-y-1">
              <p className="font-medium">{t('wallet.explanationTitle')}</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li><strong>{t('wallet.totalSales')}:</strong> {t('wallet.expSales')}</li>
                <li><strong>{t('wallet.platformFees')}:</strong> {t('wallet.expPlatformFees')}</li>
                <li><strong>{t('wallet.paymentFees')}:</strong> {t('wallet.expPaymentFees')}</li>
                <li><strong>{t('wallet.shippingFees')}:</strong> {t('wallet.expShippingFees')}</li>
                <li><strong>{t('wallet.netBalance')}:</strong> {t('wallet.expNetBalance')}</li>
                <li><strong>{t('wallet.pending')}:</strong> {t('wallet.expPending')}</li>
                <li><strong>{t('wallet.available')}:</strong> {t('wallet.expAvailable')}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Phase 8 — Configurable Platform Fee Policy (read-only).
            Merchants can see how the platform fee is calculated but cannot
            modify it. The PATCH endpoint is admin-only. */}
        {summary?.platformFee && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-2xl bg-primary-50 text-primary-600 shrink-0">
                <Banknote className="h-4 w-4" />
              </div>
              <div className="text-sm text-neutral-700 space-y-1.5 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-medium text-neutral-900">
                    {t('wallet.platformFeePolicyTitle', 'رسوم منصة Haa')}
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-primary-200 bg-primary-50/60 text-primary-700 px-2 py-1 text-xs">
                    {summary.platformFee.label}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {t(
                    'wallet.platformFeePolicyDescription',
                    'رسوم منصة Haa تُحتسب حسب باقة متجرك أو الاتفاق التجاري الخاص بك، وتظهر منفصلة عن رسوم معالجة الدفع. لا يمكن للتاجر تعديل هذه الرسوم — يتم تحديثها من قبل إدارة Haa عند الحاجة.',
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6 space-y-3">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder={t('wallet.searchPlaceholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pe-9 h-9 text-sm"
              />
            </div>
            <Button variant="outline" className="h-9 text-sm" onClick={handleSearch}>{t('common.search')}</Button>
            {hasActiveFilters && (
              <Button variant="ghost" className="h-9 text-sm gap-1" onClick={resetFilters}>
                <RotateCcw className="h-3.5 w-3.5" />
                {t('orders.resetFilters')}
              </Button>
            )}
          </div>

          <div className="flex gap-3 flex-wrap">
            <Select value={typeFilter || undefined} onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder={t('wallet.filterType')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('orders.all')}</SelectItem>
                <SelectItem value="sale">{t('wallet.sale')}</SelectItem>
                <SelectItem value="platform_fee">{t('wallet.platform_fee')}</SelectItem>
                <SelectItem value="payment_fee">{t('wallet.payment_fee')}</SelectItem>
                <SelectItem value="shipping_fee">{t('wallet.shipping_fee')}</SelectItem>
                <SelectItem value="refund">{t('wallet.refund')}</SelectItem>
                <SelectItem value="payout">{t('wallet.payout')}</SelectItem>
                <SelectItem value="adjustment">{t('wallet.adjustment')}</SelectItem>
                <SelectItem value="deposit">{t('wallet.deposit')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={directionFilter || undefined} onValueChange={(v) => { setDirectionFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder={t('wallet.filterDirection')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('orders.all')}</SelectItem>
                <SelectItem value="credit">{t('wallet.credit')}</SelectItem>
                <SelectItem value="debit">{t('wallet.debit')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter || undefined} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder={t('wallet.filterStatus')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('orders.all')}</SelectItem>
                <SelectItem value="pending">{t('wallet.status_pending')}</SelectItem>
                <SelectItem value="available">{t('wallet.status_available')}</SelectItem>
                <SelectItem value="settled">{t('wallet.status_settled')}</SelectItem>
                <SelectItem value="cancelled">{t('wallet.status_cancelled')}</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-40 h-9 text-sm" />
              <span className="text-neutral-400 text-sm">—</span>
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-40 h-9 text-sm" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden relative">
          {loading ? (
            <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}</div>
          ) : fetchError ? (
            <div className="p-12 text-center">
              <div className="inline-flex p-4 rounded-2xl bg-red-50 mb-4">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-sm text-neutral-500 mb-3">{t('wallet.loadError')}</p>
              <Button variant="outline" className="h-9 text-sm" onClick={load}>{t('common.retry')}</Button>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex p-4 rounded-2xl bg-neutral-100 mb-4">
                <Wallet className="h-8 w-8 text-neutral-400" />
              </div>
              <p className="text-sm text-neutral-500">{hasActiveFilters ? t('wallet.noMatch') : t('wallet.noEntries')}</p>
              {hasActiveFilters && (
                <Button variant="outline" className="h-9 text-sm mt-4" onClick={resetFilters}>{t('orders.resetFilters')}</Button>
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
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('wallet.date')}</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('wallet.type')}</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('wallet.direction')}</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium text-start">{t('wallet.amount')}</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('wallet.status')}</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('wallet.description')}</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('wallet.reference')}</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e: any) => (
                  <TableRow key={e.id} className="border-neutral-100 hover:bg-neutral-50">
                    <TableCell className="text-xs whitespace-nowrap text-neutral-400 p-3">
                      {new Date(e.createdAt).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell className="p-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${typeColors[e.type]?.badge ?? 'border-neutral-200 bg-neutral-50 text-neutral-700'}`}>
                        <span className={`flex h-5 w-5 items-center justify-center rounded ${typeColors[e.type]?.bg ?? 'bg-neutral-100'} ${typeColors[e.type]?.icon ?? 'text-neutral-600'}`}>
                          {typeIcons[e.type] ?? null}
                        </span>
                        {t(`wallet.${e.type}` as any)}
                      </span>
                    </TableCell>
                    <TableCell className="p-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${directionStyles[e.direction]?.badge ?? 'border-neutral-200 bg-neutral-50 text-neutral-700'}`}>
                        <span className={`flex h-5 w-5 items-center justify-center rounded ${directionStyles[e.direction]?.bg ?? 'bg-neutral-100'} ${directionStyles[e.direction]?.icon ?? 'text-neutral-600'}`}>
                          {e.direction === 'credit' ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                        </span>
                        {t(`wallet.${e.direction}` as any)}
                      </span>
                    </TableCell>
                    <TableCell className={`text-sm font-medium text-start tabular-nums p-3 ${e.direction === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {e.direction === 'credit' ? '+' : '-'}{fmt(e.amount)} <SarIcon size="sm" />
                    </TableCell>
                    <TableCell className="p-3">
                      <Badge variant={statusColors[e.status] ?? 'default'} className="text-xs px-2.5 py-0.5">
                        {t(`wallet.status_${e.status}` as any)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-neutral-400 max-w-[200px] truncate p-3">{e.description ?? '-'}</TableCell>
                    <TableCell className="text-xs text-neutral-400 font-mono p-3">
                      {e.referenceType && e.referenceId ? `${e.referenceType}#${e.referenceId}` : '-'}
                    </TableCell>
                    <TableCell className="p-3">
                      {e.referenceType === 'order' && e.referenceId && (
                        // Touch target ≥ 44x44 (WCAG 2.5.5).
                        <Button variant="ghost" size="icon" className="h-11 w-11" asChild>
                          <Link to={`/orders?id=${e.referenceId}`} title={t('wallet.viewOrder')} aria-label={t('wallet.viewOrder', 'عرض الطلب')}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </div>

        {total > 0 && (
          <div className="flex justify-between items-center text-sm text-neutral-500">
            <span>{t('orders.showingResults', { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total })}</span>
            <div className="flex gap-2 items-center">
              {/* Pagination buttons — touch target ≥ 44x44 (WCAG 2.5.5). */}
              <Button variant="outline" size="icon" className="h-11 w-11" disabled={page <= 1} onClick={() => setPage(p => p - 1)} aria-label={t('wallet.prevPage', 'الصفحة السابقة')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-sm tabular-nums">{page} / {totalPages}</span>
              <Button variant="outline" size="icon" className="h-11 w-11" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} aria-label={t('wallet.nextPage', 'الصفحة التالية')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {summary && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card">
            <div className="p-3 flex items-center justify-between text-xs text-neutral-500">
              <span>{t('wallet.entryCount')}: {summary.entryCount}</span>
              {summary.lastUpdated && (
                <span>{t('wallet.lastUpdated')}: {new Date(summary.lastUpdated).toLocaleString('en-US')}</span>
              )}
            </div>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200/50 rounded-3xl p-4">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2 rounded-2xl bg-amber-100 text-amber-600 cursor-default">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('wallet.withdrawDisabled')}</p>
              </TooltipContent>
            </Tooltip>
            <div className="text-sm text-amber-800">
              <p className="font-medium">{t('wallet.withdrawDisabled')}</p>
              <p className="text-xs mt-0.5">{t('wallet.withdrawDisabledDetail')}</p>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
