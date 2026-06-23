import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { marketplaceApi } from '@/lib/api';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, ExternalLink, Unlink, ShoppingCart, TrendingUp, Globe,
  CheckCircle2, XCircle, Clock, ArrowLeft, Store, Loader2,
  HelpCircle, Package, Zap, Wifi, WifiOff, RotateCcw, Eye, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import MarketplaceGuideModal from '@/components/modals/MarketplaceGuideModal';
import { messageFromError } from '@/lib/error-mapper';

const PROVIDERS = [
  { code: 'salla', name: 'سلة', color: 'from-emerald-400 via-emerald-500 to-emerald-700' },
  { code: 'zid', name: 'زد', color: 'from-blue-400 via-blue-500 to-blue-700' },
  { code: 'noon', name: 'نون', color: 'from-yellow-400 via-yellow-500 to-yellow-600' },
  { code: 'amazon', name: 'أمازون', color: 'from-orange-400 via-orange-500 to-orange-700' },
];

const SYNC_TYPE_LABELS: Record<string, string> = {
  orders: 'طلبات',
  products: 'منتجات',
  inventory: 'مخزون',
};

function formatRelativeTime(d: string | null) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 0) return 'الآن';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

function StatusDot({ status }: { status: string }) {
  if (status === 'connected') return <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500/50 animate-pulse" />;
  if (status === 'error') return <span className="h-2 w-2 rounded-full bg-danger inline-block shadow-sm shadow-danger/50" />;
  return <span className="h-2 w-2 rounded-full bg-neutral-300 inline-block" />;
}

function SyncProgress({ provider }: { provider: { isSyncing?: boolean; syncProgress?: number } | null | undefined }) {
  if (!provider?.isSyncing) return null;
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
        <span className="flex items-center gap-1">
          <RotateCcw className="h-3 w-3 animate-spin" />
          جاري المزامنة...
        </span>
        <span>{provider.syncProgress || 0}%</span>
      </div>
      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-500"
          style={{ width: `${provider.syncProgress || 0}%` }}
        />
      </div>
    </div>
  );
}

export default function MarketplacesPage() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const navigate = useNavigate();
  type HubProvider = {
    code: string;
    isConnected?: boolean;
    isSyncing?: boolean;
    syncProgress?: number;
    storeName?: string;
    externalStoreId?: string;
    totalSales?: number | string;
    totalOrders?: number;
    totalListings?: number;
    lastSyncAt?: string | null;
  };
  type HubLog = {
    id: number | string;
    providerCode: string;
    providerName: string;
    syncType: string;
    startedAt: string;
    itemsSynced?: number;
    status: string;
    errorMessage?: string;
  };
  type HubData = {
    summary?: { totalSales: string; totalOrders: number; connectedCount: number; activeCount: number };
    providers?: HubProvider[];
    syncLogs?: HubLog[];
  };
  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null);
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setFetchError(false);
    marketplaceApi.hub(storeId)
      .then((d) => setData(d as unknown as HubData))
      .catch(() => { setFetchError(true); toast.error(t('marketplaces.loadError', 'حدث خطأ في تحميل القنوات')); })
      .finally(() => setLoading(false));
  }, [storeId, t]);

  useEffect(() => { load(); }, [load]);

  const handleSyncAll = useCallback(async () => {
    if (!storeId || syncing) return;
    setSyncing(true);
    try {
      // Audit PART 4 P0 #2 — branch the toast on actual outcome.
      // API returns `{ totalSynced, totalFailed }`; treat `totalSynced` as
      // the succeeded count. A previous version showed `toast.success`
      // even when `totalFailed > 0`, which made partial failures look
      // like full success and merchants didn't realize items were
      // missing.
      const result = await marketplaceApi.syncAll(storeId);
      const totalSucceeded = Number(result?.totalSynced ?? 0);
      const totalFailed = Number(result?.totalFailed ?? 0);

      if (totalFailed > 0 && totalSucceeded === 0) {
        // Total failure — all attempted items failed.
        toast.error(t('marketplaces.syncAllAllFailed', 'فشلت المزامنة الكلية'), {
          description: t(
            'marketplaces.syncAllAllFailedDesc',
            `لم يتم استيراد أي عنصر — ${totalFailed} فشل. راجع سجل المزامنة للتفاصيل.`,
          ),
        });
      } else if (totalFailed > 0 && totalSucceeded > 0) {
        // Partial — surface the imbalance clearly.
        const totalAttempted = totalSucceeded + totalFailed;
        toast.warning(t('marketplaces.syncAllPartial', 'مزامنة جزئية'), {
          description: t(
            'marketplaces.syncAllPartialDesc',
            `نجح ${totalSucceeded} من ${totalAttempted} — ${totalFailed} فشل. راجع سجل المزامنة.`,
          ),
        });
      } else if (totalSucceeded > 0) {
        // Clean success.
        toast.success(t('marketplaces.syncAllSuccess', 'تمت المزامنة الكلية'), {
          description: t(
            'marketplaces.syncAllSuccessDesc',
            `تم استيراد ${totalSucceeded} عنصر`,
          ),
        });
      } else {
        // Nothing to do — neither failed nor succeeded.
        toast.success(t('marketplaces.syncAllEmpty', 'لا توجد عناصر جديدة للمزامنة'));
      }
      load();
    } catch (e) {
      toast.error(messageFromError(e, t));
    }
    finally { setSyncing(false); }
  }, [storeId, syncing, load, t]);

  const handleDisconnect = useCallback(async (code: string) => {
    if (!storeId) return;
    setDisconnecting(code);
    try {
      await marketplaceApi.disconnect(storeId, code);
      toast.success('تم قطع الاتصال');
      setConfirmDisconnect(null);
      load();
    } catch { toast.error('حدث خطأ'); }
    finally { setDisconnecting(null); }
  }, [storeId, load]);

  const handleSync = useCallback(async (code: string) => {
    if (!storeId || syncingProvider) return;
    setSyncingProvider(code);
    try {
      const res = await marketplaceApi.syncOrders(storeId, code) as unknown[];
      toast.success('تمت المزامنة', { description: `${res?.length ?? 0} عنصر` });
      load();
    } catch { toast.error('فشلت المزامنة'); }
    finally { setSyncingProvider(null); }
  }, [storeId, load, syncingProvider]);

  if (fetchError) {
    return (
      <div className="p-12 text-center max-w-7xl mx-auto">
        <div className="inline-flex p-4 rounded-2xl bg-red-50 mb-4"><AlertTriangle className="h-8 w-8 text-red-400" /></div>
        <p className="text-sm font-medium text-neutral-700 mb-1">فشل تحميل قنوات البيع</p>
        <p className="text-sm text-neutral-500 mb-4">حدث خطأ أثناء الاتصال بالخادم.</p>
        <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5" onClick={load}>
          <RotateCcw className="h-4 w-4" />إعادة المحاولة
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-7 w-28 rounded-md" />
            <Skeleton className="h-7 w-28 rounded-md" />
            <Skeleton className="h-7 w-28 rounded-md" />
          </div>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-3xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2].map(i => <Skeleton key={i} className="h-56 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  const summary = data?.summary || { totalSales: '0', totalOrders: 0, connectedCount: 0, activeCount: 4 };
  const connectedProviders = data?.providers?.filter((p) => p.isConnected) || [];
  const disconnectedProviders = data?.providers?.filter((p) => !p.isConnected) || [];
  const totalListings = data?.providers?.reduce((sum: number, p) => sum + (p.totalListings || 0), 0) || 0;

  const statCards = [
    { label: 'إجمالي المبيعات', value: formatCurrency(summary.totalSales), suffix: 'ر.س', icon: TrendingUp, gradient: 'from-emerald-500 to-teal-600' },
    { label: 'الطلبات المستوردة', value: formatNumber(summary.totalOrders), suffix: '', icon: ShoppingCart, gradient: 'from-primary-500 to-primary-700' },
    { label: 'الأسواق المتصلة', value: `${summary.connectedCount}`, suffix: `/ ${summary.activeCount}`, icon: Globe, gradient: 'from-violet-500 to-purple-600' },
    { label: 'المنتجات في الأسواق', value: formatNumber(totalListings), suffix: '', icon: Package, gradient: 'from-amber-500 to-orange-600' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">قنوات البيع</h1>
          <p className="text-sm text-neutral-500 mt-0.5">اربط متجرك بمنصات البيع الإلكترونية وأدر مزامنة المنتجات والطلبات</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => navigate('/channels/sync-logs')}>
            <Clock className="h-3.5 w-3.5 ms-1.5" />سجل المزامنة
          </Button>
          <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}>
            <HelpCircle className="h-3.5 w-3.5 ms-1.5" />دليل الربط
          </Button>
          {connectedProviders.length > 0 && (
            <Button size="sm" onClick={handleSyncAll} disabled={syncing}>
              {syncing ? <Loader2 className="h-3.5 w-3.5 ms-1.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 ms-1.5" />}
              {syncing ? 'جاري...' : 'مزامنة الكل'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5 ms-1.5" />تحديث
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((s, i) => (
          <Card key={i} className="group overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${s.gradient} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                  <s.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 tabular-nums leading-none mb-1">
                {s.value}<span className="text-sm font-medium text-neutral-400 ms-1">{s.suffix}</span>
              </div>
              <p className="text-xs text-neutral-500 font-medium">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {connectedProviders.length === 0 && (
        <Card className="border-dashed border-2 border-neutral-200 bg-gradient-to-br from-primary-50/50 to-primary-100/30">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center mx-auto mb-4">
              <Globe className="h-8 w-8 text-primary-500" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-700 mb-2">لم تربط أي سوق بعد</h3>
            <p className="text-sm text-neutral-500 mb-6 max-w-md mx-auto">
              اربط متجرك بمنصات البيع مثل سلة، زد، نون، أو أمازون لمزامنة المنتجات والطلبات تلقائياً
            </p>
            <Button onClick={() => setGuideOpen(true)}>
              <HelpCircle className="h-4 w-4 ms-1.5" />
              ابدأ بربط أول سوق
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Connected Providers */}
      {connectedProviders.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <Wifi className="h-5 w-5 text-emerald-500" />
            الأسواق المتصلة
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">{connectedProviders.length}</Badge>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {connectedProviders.map((p) => {
              const provider = PROVIDERS.find(x => x.code === p.code);
              if (!provider) return null;
              const isConfirming = confirmDisconnect === p.code;
              const isDisconnectingThis = disconnecting === p.code;
              return (
                <Card key={p.code} className="overflow-hidden group">
                  <div className={`h-1 bg-gradient-to-r ${provider.color}`} />
                  <CardContent className="p-5">
                    {/* Provider Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${provider.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                          <Store className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-neutral-900">{provider.name}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <StatusDot status="connected" />
                            <span className="text-xs font-medium text-emerald-600">متصل</span>
                          </div>
                        </div>
                      </div>
                      {/* Touch target ≥ 44x44 (WCAG 2.5.5). */}
                      <Button variant="ghost" size="icon" className="h-11 w-11 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => navigate(`/channels/${p.code}`)} aria-label={t('marketplaces.viewChannel', 'عرض القناة')}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Store Name */}
                    {p.storeName && (
                      <div className="mb-3 flex items-center gap-1.5 text-xs text-neutral-500 bg-neutral-50 rounded-2xl px-3 py-2">
                        <Store className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{p.storeName}{p.externalStoreId ? ` (#${p.externalStoreId})` : ''}</span>
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { value: formatNumber(p.totalSales || 0), label: 'مبيعات' },
                        { value: p.totalOrders ?? 0, label: 'طلب' },
                        { value: p.totalListings ?? 0, label: 'منتج' },
                      ].map((item, i) => (
                        <div key={i} className="text-center p-2 bg-neutral-50 rounded-2xl">
                          <div className="text-sm font-bold text-neutral-900">{item.value}</div>
                          <div className="text-xs text-neutral-500">{item.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Last Sync */}
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-4">
                      <Clock className="h-3.5 w-3.5" />
                      <span>آخر مزامنة: {formatRelativeTime(p.lastSyncAt || null)}</span>
                    </div>

                    {/* Sync Progress */}
                    <SyncProgress provider={p} />

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4">
                      <Button size="sm" className="flex-1" onClick={() => navigate(`/channels/${p.code}`)}>
                        <ExternalLink className="h-3.5 w-3.5 ms-1" />إدارة
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleSync(p.code)} disabled={syncingProvider === p.code}>
                        {syncingProvider === p.code ? <Loader2 className="h-3.5 w-3.5 ms-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 ms-1" />}
                        {syncingProvider === p.code ? 'جاري...' : 'مزامنة'}
                      </Button>
                      {isConfirming ? (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="destructive" onClick={() => handleDisconnect(p.code)} disabled={isDisconnectingThis}>
                            {isDisconnectingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'نعم'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmDisconnect(null)}>
                            لا
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setConfirmDisconnect(p.code)}>
                          <Unlink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Disconnected Providers */}
      {disconnectedProviders.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <WifiOff className="h-5 w-5 text-neutral-400" />
            الأسواق غير المتصلة
            <Badge variant="secondary" className="text-xs">{disconnectedProviders.length}</Badge>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {disconnectedProviders.map((p) => {
              const provider = PROVIDERS.find(x => x.code === p.code);
              if (!provider) return null;
              return (
                <Card key={p.code} className="border-dashed border-neutral-200 bg-white/50 hover:border-neutral-300 hover:bg-neutral-50 transition-all cursor-pointer group"
                  onClick={() => navigate(`/channels/${p.code}`)}>
                  <CardContent className="p-5 text-center">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${provider.color} flex items-center justify-center text-white shadow-lg mx-auto mb-3 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all`}>
                      <Store className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-bold text-neutral-700 mb-1">{provider.name}</h3>
                    <p className="text-xs text-neutral-400 mb-3">غير متصل</p>
                    <div className="flex items-center justify-center gap-1 text-xs font-medium text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>ربط السوق</span>
                      <ArrowLeft className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Sync Logs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Clock className="h-4 w-4 text-neutral-400" />
            آخر المزامنات
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/channels/sync-logs')}>
            عرض الكل<ArrowLeft className="h-3 w-3 me-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {(data?.syncLogs?.length ?? 0) > 0 ? (
            <div className="divide-y divide-neutral-50">
              {data!.syncLogs!.slice(0, 6).map((log) => {
                const provider = PROVIDERS.find(p => p.code === log.providerCode);
                return (
                  <div key={log.id} className="flex items-center gap-3 px-6 py-3 hover:bg-neutral-50 transition-colors">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${provider?.color || 'from-neutral-400 to-neutral-600'} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                      {log.providerName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-900">{log.providerName}</span>
                        <span className="text-xs text-neutral-400">·</span>
                        <span className="text-xs text-neutral-500">
                          {SYNC_TYPE_LABELS[log.syncType] || log.syncType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-neutral-400">{formatRelativeTime(log.startedAt)}</span>
                        {(log.itemsSynced ?? 0) > 0 && (
                          <span className="text-xs text-neutral-500">{log.itemsSynced} عنصر</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {log.status === 'completed' ? (
                        <Badge variant="success" className="text-xs"><CheckCircle2 className="h-3 w-3 ms-1" />تم</Badge>
                      ) : log.status === 'failed' ? (
                        <Badge variant="destructive" className="text-xs" title={log.errorMessage || ''}><XCircle className="h-3 w-3 ms-1" />فشل</Badge>
                      ) : (
                        <Badge variant="warning" className="text-xs"><RefreshCw className="h-3 w-3 ms-1 animate-spin" />قيد التشغيل</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Clock className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-400">لا توجد مزامنات بعد</p>
            </div>
          )}
        </CardContent>
      </Card>

      <MarketplaceGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
