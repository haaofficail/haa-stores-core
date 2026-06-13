import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { marketplaceApi } from '@/lib/api';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, ExternalLink, Unlink, ShoppingCart, TrendingUp, Globe,
  CheckCircle2, XCircle, Clock, ArrowLeft, Store, ListChecks, Loader2, HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import MarketplaceGuideModal from '@/components/modals/MarketplaceGuideModal';

const PROVIDERS = [
  { code: 'salla', name: 'سلة', color: 'from-green-400 via-green-600 to-green-800', bg: 'bg-green-50' },
  { code: 'zid', name: 'زد', color: 'from-blue-400 via-blue-600 to-blue-800', bg: 'bg-blue-50' },
  { code: 'noon', name: 'نون', color: 'from-amber-300 via-amber-500 to-amber-600', bg: 'bg-amber-50' },
  { code: 'amazon', name: 'أمازون', color: 'from-orange-400 via-orange-600 to-neutral-900', bg: 'bg-neutral-50' },
];

function formatDate(d: string | null) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }); }
  catch { return '—'; }
}

function StatusDot({ status }: { status: string }) {
  if (status === 'connected') return <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500/50" />;
  if (status === 'error') return <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block shadow-sm shadow-red-500/50" />;
  return <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 inline-block" />;
}

export default function MarketplacesPage() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const load = useCallback(() => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    marketplaceApi.hub(storeId)
      .then(setData)
      .catch(() => toast.error(t('marketplaces.loadError', 'حدث خطأ في تحميل القنوات')))
      .finally(() => setLoading(false));
  }, [storeId, t]);

  useEffect(() => { load(); }, [load]);

  const handleSyncAll = useCallback(async () => {
    if (!storeId || syncing) return;
    setSyncing(true);
    try {
      const result = await marketplaceApi.syncAll(storeId);
      toast.success(t('marketplaces.syncAllSuccess', 'تمت المزامنة الكلية'), {
        description: t('marketplaces.syncAllDescription', `${result.totalSynced} عنصر مستورد، ${result.totalFailed} فشل`),
      });
      load();
    } catch { toast.error(t('marketplaces.syncAllFailed', 'فشلت المزامنة الكلية')); }
    finally { setSyncing(false); }
  }, [storeId, syncing, load, t]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid gap-5 grid-cols-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-3xl" />)}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-52 rounded-3xl" />)}</div>
      </div>
    );
  }

  const summary = data?.summary || { totalSales: '0', totalOrders: 0, connectedCount: 0, activeCount: 4 };

  const statCards = [
    {
      label: t('marketplaces.stat.totalSales', 'إجمالي مبيعات الأسواق'), value: formatCurrency(summary.totalSales), suffix: t('marketplaces.currency', 'ر.س'),
      gradient: 'from-emerald-400 via-emerald-500 to-teal-600', bgGlow: 'bg-emerald-500/5', icon: TrendingUp,
    },
    {
      label: t('marketplaces.stat.totalOrders', 'إجمالي الطلبات المستوردة'), value: formatNumber(summary.totalOrders), suffix: '',
      gradient: 'from-blue-400 via-blue-500 to-indigo-600', bgGlow: 'bg-blue-500/5', icon: ShoppingCart,
    },
    {
      label: t('marketplaces.stat.connectedMarkets', 'الأسواق المتصلة'), value: `${summary.connectedCount}`, suffix: `/ ${summary.activeCount}`,
      gradient: 'from-amber-400 via-amber-500 to-orange-600', bgGlow: 'bg-amber-500/5', icon: Globe,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('marketplaces.pageTitle', 'قنوات البيع')}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{t('marketplaces.pageSubtitle', 'اربط متجرك بمنصات البيع الإلكترونية')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 text-sm rounded-full" onClick={() => navigate('/channels/sync-logs')}>
            <Clock className="h-3.5 w-3.5 ml-1" />{t('marketplaces.syncLogs', 'سجل المزامنة')}
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-sm rounded-full" onClick={() => setGuideOpen(true)}>
            <HelpCircle className="h-3.5 w-3.5 ml-1" />{t('marketplaces.guide', 'دليل الربط')}
          </Button>
          {data?.summary?.connectedCount > 0 && (
            <Button size="sm" className="h-9 text-sm rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25"
              onClick={handleSyncAll} disabled={syncing}>
              {syncing ? <Loader2 className="h-3.5 w-3.5 ml-1 animate-spin" /> : <ListChecks className="h-3.5 w-3.5 ml-1" />}
              {syncing ? t('marketplaces.syncing', 'جاري...') : t('marketplaces.syncAll', 'مزامنة الكل')}
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-9 text-sm rounded-full" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5 ml-1" />{t('marketplaces.refresh', 'تحديث')}
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-5 grid-cols-3">
        {statCards.map(s => (
          <div key={s.label} className="relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
            <div className={`absolute top-0 right-0 w-32 h-32 ${s.bgGlow} rounded-full translate-x-16 -translate-y-16 blur-2xl group-hover:scale-150 transition-transform duration-500`} />
            <div className="relative">
              <div className="mb-4">
                <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${s.gradient} text-white shadow-lg`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-neutral-900 tabular-nums leading-none mb-1.5">
                {s.value}<span className="text-sm font-medium text-neutral-400 mr-1">{s.suffix}</span>
              </p>
              <p className="text-sm text-neutral-500 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PROVIDERS.map(provider => {
          const p = data?.providers?.find((x: any) => x.code === provider.code);
          const connected = p?.isConnected ?? false;

          return (
            <div key={provider.code} className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
              {/* Colored Top Bar */}
              <div className={`h-1.5 bg-gradient-to-r ${provider.color}`} />

              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${provider.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-neutral-900">{t('marketplaces.provider.' + provider.code, provider.name)}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <StatusDot status={p?.status || 'disconnected'} />
                        <span className={`text-xs font-medium ${connected ? 'text-emerald-600' : 'text-neutral-400'}`}>
                          {connected ? t('marketplaces.connected', 'متصل') : t('marketplaces.disconnected', 'غير متصل')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => navigate(`/channels/${provider.code}`)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </div>

                {/* Connection Info */}
                {connected && p?.storeName && (
                  <div className="mb-3 flex items-center gap-1.5 text-xs text-neutral-500 bg-neutral-50 rounded-xl px-3 py-2">
                    <Store className="h-3.5 w-3.5" />
                    <span>{p.storeName}{p.externalStoreId ? ` (#${p.externalStoreId})` : ''}</span>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm mb-3">
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <TrendingUp className="h-4 w-4 text-neutral-400" />
                    <span>{t('marketplaces.salesLabel', 'المبيعات: ')}<strong className="text-neutral-900">{formatNumber(p?.totalSales || 0)} {p?.currency || 'SAR'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <ShoppingCart className="h-4 w-4 text-neutral-400" />
                    <span>{t('marketplaces.ordersLabel', 'الطلبات: ')}<strong className="text-neutral-900">{p?.totalOrders ?? 0}</strong></span>
                  </div>
                </div>

                {/* Last Sync */}
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-4">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t('marketplaces.lastSync', 'آخر مزامنة: ')}{formatDate(p?.lastSyncAt || null)}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {connected ? (
                    <>
                      <Button size="sm" className="rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md text-xs h-8"
                        onClick={() => navigate(`/channels/${provider.code}`)}>
                        <ExternalLink className="h-3.5 w-3.5 ml-1" />{t('marketplaces.manage', 'إدارة')}
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-full border-neutral-200 text-xs h-8"
                        onClick={async () => {
                          if (!storeId) return;
                          try {
                            const res = await marketplaceApi.syncOrders(storeId, provider.code);
                            toast.success(t('marketplaces.syncSuccess', 'تمت المزامنة'), { description: t('marketplaces.syncDescription', `${res?.length ?? 0} عنصر`) });
                            load();
                          } catch { toast.error(t('marketplaces.syncFailed', 'فشلت المزامنة')); }
                        }}>
                        <RefreshCw className="h-3.5 w-3.5 ml-1" />{t('marketplaces.sync', 'مزامنة')}
                      </Button>
                      <Button size="sm" variant="ghost" className="rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 text-xs h-8 mr-auto"
                        onClick={async () => {
                          if (!storeId) return;
                          try { await marketplaceApi.disconnect(storeId, provider.code); toast.success(t('marketplaces.disconnectedMsg', 'تم قطع الاتصال')); load(); }
                          catch { toast.error(t('marketplaces.error', 'حدث خطأ')); }
                        }}>
                        <Unlink className="h-3.5 w-3.5 ml-1" />{t('marketplaces.disconnect', 'فصل')}
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" className="rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md text-xs h-8"
                      onClick={() => navigate(`/channels/${provider.code}`)}>
                      <ExternalLink className="h-3.5 w-3.5 ml-1" />{t('marketplaces.connect', 'ربط السوق')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sync Logs */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card">
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
          <h3 className="font-bold text-lg text-neutral-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-neutral-400" />{t('marketplaces.syncLogsSection', 'سجل المزامنة')}
          </h3>
          <Button variant="ghost" size="sm" className="rounded-full text-xs" onClick={() => navigate('/channels/sync-logs')}>
            {t('marketplaces.viewAll', 'عرض الكل')}<ArrowLeft className="h-3.5 w-3.5 mr-1" />
          </Button>
        </div>
        <div className="p-4">
          {!data?.syncLogs?.length ? (
            <p className="text-sm text-neutral-400 py-4 text-center">{t('marketplaces.noSyncLogs', 'لا توجد مزامنات سابقة')}</p>
          ) : (
            <div className="space-y-1">
              {data.syncLogs.slice(0, 8).map((log: any) => {
                const provider = PROVIDERS.find(p => p.code === log.providerCode);
                return (
                  <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${provider?.color || 'from-neutral-400 to-neutral-600'} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                      {log.providerName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-900">{log.providerName}</span>
                        <span className="text-xs text-neutral-300">·</span>
                        <span className="text-xs text-neutral-500">{log.syncType === 'orders' ? t('marketplaces.syncType.orders', 'طلبات') : log.syncType === 'products' ? t('marketplaces.syncType.products', 'منتجات') : log.syncType === 'inventory' ? t('marketplaces.syncType.inventory', 'مخزون') : log.syncType}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-neutral-400">{formatDate(log.startedAt)}</span>
                        {log.itemsSynced > 0 && <span className="text-xs text-neutral-500">{t('marketplaces.itemsSynced', `${log.itemsSynced} عنصر`)}</span>}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {log.status === 'completed' ? (
                        <Badge className="bg-green-500/10 text-green-700 border-green-200 text-xs"><CheckCircle2 className="h-3 w-3 ml-1" />{t('marketplaces.status.completed', 'تم')}</Badge>
                      ) : log.status === 'failed' ? (
                        <Badge className="bg-red-500/10 text-red-700 border-red-200 text-xs" title={log.errorMessage || ''}><XCircle className="h-3 w-3 ml-1" />{t('marketplaces.status.failed', 'فشل')}</Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-700 border-amber-200 text-xs"><RefreshCw className="h-3 w-3 ml-1 animate-spin" />{t('marketplaces.status.running', 'قيد التشغيل')}</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <MarketplaceGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
