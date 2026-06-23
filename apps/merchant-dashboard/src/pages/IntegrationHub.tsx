import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { marketplaceApi } from '@/lib/api';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, ExternalLink, Unlink, ShoppingCart, TrendingUp, Globe,
  CheckCircle2, XCircle, Clock, ArrowLeft, Database, Store, ListChecks, Loader2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

const PROVIDERS = [
  { code: 'salla', name: 'سلة', color: 'from-green-400 via-green-600 to-green-800', bg: 'bg-green-50' },
  { code: 'zid', name: 'زد', color: 'from-blue-400 via-blue-600 to-blue-800', bg: 'bg-blue-50' },
  { code: 'noon', name: 'نون', color: 'from-amber-300 via-amber-500 to-amber-600', bg: 'bg-amber-50' },
  { code: 'amazon', name: 'أمازون', color: 'from-orange-400 via-orange-600 to-neutral-900', bg: 'bg-neutral-50' },
];

function formatDate(d: string | null) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
  } catch {
    return '—';
  }
}

function StatusDot({ status }: { status: string }) {
  if (status === 'connected') return <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block shadow-sm shadow-green-500/50" />;
  if (status === 'error') return <span className="h-2.5 w-2.5 rounded-full bg-danger inline-block shadow-sm shadow-danger/50" />;
  return <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 inline-block" />;
}

export default function IntegrationHub() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<Awaited<ReturnType<typeof marketplaceApi.hub>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnectConfirm, setDisconnectConfirm] = useState<string | null>(null);

  const loadHub = useCallback(() => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    marketplaceApi.hub(storeId)
      .then(setData)
      .catch(() => toast.error(t('common.error', 'حدث خطأ')))
      .finally(() => setLoading(false));
  }, [storeId, t]);

  useEffect(() => { loadHub(); }, [loadHub]);

  const handleSyncAll = useCallback(async () => {
    if (!storeId || syncing) return;
    setSyncing(true);
    try {
      const result = await marketplaceApi.syncAll(storeId);
      toast.success(t('integrationHub.syncAllDone', 'تمت المزامنة الكلية'), {
        description: `${result.totalSynced} عنصر مستورد، ${result.totalFailed} فشل`,
      });
      result.results.forEach(r => {
        if (r.ordersResult.status === 'failed') {
          toast.error(`${r.providerCode}: ${r.ordersResult.error || 'فشلت المزامنة'}`);
        }
      });
      loadHub();
    } catch {
      toast.error(t('integrationHub.syncAllFailed', 'فشلت المزامنة الكلية'));
    } finally {
      setSyncing(false);
    }
  }, [storeId, syncing, t, loadHub]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid gap-5 grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-3xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  const summary = data?.summary || { totalSales: '0', totalOrders: 0, connectedCount: 0, activeCount: 4 };

  const statCards = [
    {
      label: t('integrationHub.totalSales', 'إجمالي مبيعات الأسواق'),
      value: formatCurrency(summary.totalSales),
      suffix: t('dashboard.currency', 'ر.س'),
      gradient: 'from-emerald-400 via-emerald-500 to-teal-600',
      bgGlow: 'bg-emerald-500/5',
      icon: TrendingUp,
    },
    {
      label: t('integrationHub.totalOrders', 'إجمالي الطلبات المستوردة'),
      value: formatNumber(summary.totalOrders),
      suffix: '',
      gradient: 'from-primary-400 via-primary-500 to-primary-700',
      bgGlow: 'bg-primary-500/5',
      icon: ShoppingCart,
    },
    {
      label: t('integrationHub.connectedCount', 'الأسواق المتصلة'),
      value: `${summary.connectedCount}`,
      suffix: `/ ${summary.activeCount}`,
      gradient: 'from-amber-400 via-amber-500 to-orange-600',
      bgGlow: 'bg-amber-500/5',
      icon: Globe,
    },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{t('integrationHub.title', 'مركز الربط')}</h1>
          <p className="text-sm text-neutral-500 mt-1">{t('integrationHub.subtitle', 'لوحة تحكم ربط المتجر بمنصات البيع')}</p>
        </div>
        <div className="flex items-center gap-2">
          {data?.summary && data.summary.connectedCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-neutral-200"
              onClick={handleSyncAll}
              disabled={syncing}
            >
              {syncing ? <Loader2 className="h-4 w-4 ms-1 animate-spin" /> : <ListChecks className="h-4 w-4 ms-1" />}
              {syncing ? t('integrationHub.syncing', 'جاري المزامنة...') : t('integrationHub.syncAll', 'مزامنة الكل')}
            </Button>
          )}
          <Button
            size="sm"
            className="rounded-full bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40"
            onClick={loadHub}
          >
            <RefreshCw className="h-4 w-4 ms-1" />
            {t('integrationHub.refresh', 'تحديث')}
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-5 grid-cols-3">
        {statCards.map(s => (
          <div
            key={s.label}
            className="relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-card hover:shadow-card-hover transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 ${s.bgGlow} rounded-full translate-x-16 -translate-y-16 blur-2xl group-hover:scale-150 transition-transform duration-500`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${s.gradient} text-white shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  <s.icon className="h-6 w-6" />
                </div>
              </div>
              <p className="text-4xl font-bold text-neutral-900 tabular-nums leading-none mb-2">
                {s.value}
                {s.suffix && <span className="text-base font-medium text-neutral-400 me-1">{s.suffix}</span>}
              </p>
              <p className="text-sm text-neutral-500 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PROVIDERS.map(provider => {
          const p = data?.providers?.find(x => x.code === provider.code);
          const connected = p?.isConnected ?? false;

          return (
            <Card
              key={provider.code}
              className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            >
              <CardHeader className="p-6 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${provider.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <StatusDot status={p?.status || 'disconnected'} />
                        <span className={`text-xs font-medium ${connected ? 'text-green-600' : 'text-neutral-400'}`}>
                          {connected ? t('marketplaces.connected', 'متصل') : t('marketplaces.disconnected', 'غير متصل')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => navigate(`/channels/${provider.code}`)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                {/* Connection Info */}
                {connected && p?.storeName && (
                  <div className="mb-3 flex items-center gap-1.5 text-xs text-neutral-500">
                    <Store className="h-3.5 w-3.5" />
                    <span>{p.storeName}{p.externalStoreId ? ` (#${p.externalStoreId})` : ''}</span>
                  </div>
                )}

                {/* Sales Summary */}
                <div className="flex items-center gap-4 text-sm mb-4">
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <TrendingUp className="h-4 w-4 text-neutral-400" />
                    <span>{t('marketplaces.totalSales', 'المبيعات')}: <strong className="text-neutral-900">{formatNumber(p?.totalSales || 0)} {p?.currency || 'SAR'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <ShoppingCart className="h-4 w-4 text-neutral-400" />
                    <span>{t('marketplaces.totalOrders', 'الطلبات')}: <strong className="text-neutral-900">{p?.totalOrders ?? 0}</strong></span>
                  </div>
                </div>

                {/* Last Sync */}
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-4">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t('integrationHub.lastSync', 'آخر مزامنة')}: {formatDate(p?.lastSyncAt || null)}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {connected ? (
                    <>
                      <Button
                        size="sm"
                        className="rounded-full bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 text-xs"
                        onClick={() => navigate(`/channels/${provider.code}/listings`)}
                      >
                        <Database className="h-3.5 w-3.5 ms-1" />
                        {t('integrationHub.viewProducts', 'المنتجات')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-neutral-200 text-xs"
                        onClick={async () => {
                          if (!storeId) return;
                          const syncToast = toast.loading(t('integrationHub.syncing', 'جاري المزامنة...'));
                          try {
                            const res = await marketplaceApi.syncOrders(storeId, provider.code) as unknown[];
                            toast.dismiss(syncToast);
                            const count = res?.length ?? 0;
                            toast.success(t('integrationHub.syncDone', 'تمت المزامنة'), {
                              description: `${count} ${t('integrationHub.syncedItems', 'عنصر')}`,
                            });
                            loadHub();
                          } catch {
                            toast.dismiss(syncToast);
                            toast.error(t('integrationHub.syncFailed', 'فشلت المزامنة'));
                          }
                        }}
                      >
                        <RefreshCw className="h-3.5 w-3.5 ms-1" />
                        {t('integrationHub.sync', 'مزامنة')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 text-xs mr-auto"
                        onClick={() => setDisconnectConfirm(provider.code)}
                      >
                        <Unlink className="h-3.5 w-3.5 ms-1" />
                        {t('marketplaces.disconnect', 'فصل')}
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      className="rounded-full bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 text-xs"
                      onClick={() => navigate(`/channels/${provider.code}`)}
                    >
                      <ExternalLink className="h-3.5 w-3.5 ms-1" />
                      {t('marketplaces.connect', 'ربط السوق')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sync Logs */}
      <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card">
        <CardHeader className="p-6 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-neutral-400" />
              {t('integrationHub.syncLogs', 'سجل المزامنة')}
            </CardTitle>
            <Button variant="ghost" size="sm" className="rounded-full text-xs" onClick={() => navigate('/channels/sync-logs')}>
              {t('integrationHub.viewAll', 'عرض الكل')}
              <ArrowLeft className="h-3.5 w-3.5 me-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-2">
          {!data?.syncLogs?.length ? (
            <p className="text-sm text-neutral-400 py-4 text-center">{t('integrationHub.noSyncLogs', 'لا توجد مزامنات سابقة')}</p>
          ) : (
            <div className="space-y-2">
              {data.syncLogs.slice(0, 8).map(log => {
                const provider = PROVIDERS.find(p => p.code === log.providerCode);
                return (
                  <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/50 hover:bg-white transition-colors">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${provider?.color || 'from-neutral-400 to-neutral-600'} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                      {log.providerName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-900">{log.providerName}</span>
                        <span className="text-xs text-neutral-400">•</span>
                        <span className="text-xs text-neutral-500">
                          {log.syncType === 'orders' ? t('integrationSync.orders', 'طلبات') :
                           log.syncType === 'products' ? t('integrationSync.products', 'منتجات') :
                           log.syncType === 'inventory' ? t('integrationSync.inventory', 'مخزون') : log.syncType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-neutral-400">{formatDate(log.startedAt)}</span>
                        {log.itemsSynced > 0 && (
                          <span className="text-xs text-neutral-500">{log.itemsSynced} عنصر</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {log.status === 'completed' ? (
                        <Badge className="bg-green-500/10 text-green-700 border-green-200 text-xs">
                          <CheckCircle2 className="h-3 w-3 ms-1" />
                          {t('integrationSync.completed', 'تم')}
                        </Badge>
                      ) : log.status === 'failed' ? (
                        <Badge className="bg-red-500/10 text-red-700 border-red-200 text-xs" title={log.errorMessage || ''}>
                          <XCircle className="h-3 w-3 ms-1" />
                          {t('integrationSync.failed', 'فشل')}
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-700 border-amber-200 text-xs">
                          <RefreshCw className="h-3 w-3 ms-1 animate-spin" />
                          {t('integrationSync.running', 'قيد التشغيل')}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={disconnectConfirm !== null} onOpenChange={(open) => { if (!open) setDisconnectConfirm(null); }}>
        <DialogContent className="max-w-sm bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900">تأكيد الفصل</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">هل أنت متأكد من فصل هذه القناة؟ سيتوقف تزامن الطلبات والمنتجات.</p>
          <DialogFooter className="gap-2 flex-row-reverse">
            <Button variant="ghost" className="h-9 text-sm" onClick={() => setDisconnectConfirm(null)}>إلغاء</Button>
            <Button variant="destructive" className="h-9 text-sm" onClick={async () => {
              if (!storeId || !disconnectConfirm) return;
              const code = disconnectConfirm;
              setDisconnectConfirm(null);
              try {
                await marketplaceApi.disconnect(storeId, code);
                toast.success(t('integrationHub.disconnected', 'تم قطع الاتصال'));
                loadHub();
              } catch {
                toast.error(t('common.error', 'حدث خطأ'));
              }
            }}>فصل</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}