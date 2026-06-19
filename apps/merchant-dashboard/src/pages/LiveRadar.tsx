import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, Eye, ShoppingCart, CreditCard, DollarSign, Activity,
  Monitor, Smartphone, Globe, AlertTriangle, Target, Lightbulb,
  RefreshCw, MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { request, ApiClientError } from '@/lib/api';

interface LiveOverview {
  onlineVisitors: number;
  activeProductViewers: number;
  activeCarts: number;
  activeCheckouts: number;
  currentCartValueTotal: string;
  ordersLast30Min: number;
  paidOrdersLast30Min: number;
  revenueLast30Min: string;
  paymentFailuresLast30Min: number;
  updatedAt: string;
}

interface LivePageInfo {
  path: string;
  pageType: string;
  visitorCount: number;
}

interface LivePages {
  activePages: LivePageInfo[];
  activeProductPages: LivePageInfo[];
  topViewedProductsNow: { productId: number; productName: string; viewers: number }[];
}

interface LiveDevices {
  visitorsByDeviceType: { label: string; count: number }[];
  visitorsByOs: { label: string; count: number }[];
  visitorsByBrowser: { label: string; count: number }[];
  visitorsByScreenSize: { label: string; count: number }[];
}

interface LiveSources {
  visitorsByUtmSource: { label: string; count: number }[];
  visitorsByUtmCampaign: { label: string; count: number }[];
  visitorsByReferrer: { label: string; count: number }[];
}

interface LiveFunnel {
  onlineVisitors: number;
  productViewers: number;
  cartUsers: number;
  checkoutUsers: number;
  ordersLast30Min: number;
  paidOrdersLast30Min: number;
  dropOffSignals: { stage: string; count: number }[];
}

interface LiveAlert {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  metric: string;
  recommendation: string;
}

interface LiveSnapshot {
  id: number;
  storeId: number;
  onlineVisitors: number;
  activeProductViewers: number;
  activeCarts: number;
  activeCheckouts: number;
  currentCartValueTotal: string;
  ordersLast30Min: number;
  paidOrdersLast30Min: number;
  revenueLast30Min: string;
  paymentFailuresLast30Min: number;
  topPages: { path: string; pageType: string; visitorCount: number }[];
  topProducts: { productId: number; productName: string; viewers: number }[];
  topSources: { label: string; count: number }[];
  createdAt: string;
}

interface LiveGeo {
  countries: { countryCode: string; countryName: string; count: number }[];
  cities: { countryCode: string; countryName: string; cityName: string; count: number }[];
  updatedAt: string;
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'destructive';
    case 'warning': return 'warning';
    default: return 'default';
  }
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = { critical: 'حرج', warning: 'تنبيه', info: 'توصية' };
  return (
    <Badge variant={severityColor(severity) as any} className="text-xs">
      {map[severity] ?? severity}
    </Badge>
  );
}

export default function LiveRadar() {
  const { t } = useTranslation();
  const { storeId } = useAuth();

  const [overview, setOverview] = useState<LiveOverview | null>(null);
  const [pages, setPages] = useState<LivePages | null>(null);
  const [devices, setDevices] = useState<LiveDevices | null>(null);
  const [sources, setSources] = useState<LiveSources | null>(null);
  const [funnel, setFunnel] = useState<LiveFunnel | null>(null);
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [geo, setGeo] = useState<LiveGeo | null>(null);
  const [history, setHistory] = useState<LiveSnapshot[]>([]);
  const [historyRange, setHistoryRange] = useState<'24h' | '7d'>('24h');
  const [historyInterval, setHistoryInterval] = useState<'15m' | '1h'>('15m');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadData = useCallback(() => {
    if (!storeId) return;
    setLoading(s => s === true ? true : false);
    setFetchError(false);
    Promise.all([
      request<LiveOverview>(`/merchant/${storeId}/marketing/live/overview`),
      request<LivePages>(`/merchant/${storeId}/marketing/live/pages`),
      request<LiveDevices>(`/merchant/${storeId}/marketing/live/devices`),
      request<LiveSources>(`/merchant/${storeId}/marketing/live/sources`),
      request<LiveFunnel>(`/merchant/${storeId}/marketing/live/funnel`),
      request<LiveAlert[]>(`/merchant/${storeId}/marketing/live/alerts`),
      request<LiveGeo>(`/merchant/${storeId}/marketing/live/geo`),
      request<LiveSnapshot[]>(`/merchant/${storeId}/marketing/live/history?range=${historyRange}&interval=${historyInterval}`),
    ])
      .then(([o, p, d, s, f, a, g, h]) => {
        setOverview(o);
        setPages(p);
        setDevices(d);
        setSources(s);
        setFunnel(f);
        setAlerts(a);
        setGeo(g);
        setHistory(h);
      })
      .catch((err) => {
        if (err instanceof ApiClientError) toast.error(err.message);
        else toast.error(t('common.error'));
        setFetchError(true);
      })
      .finally(() => setLoading(false));
  }, [storeId, t, historyRange, historyInterval]);

  useEffect(() => { loadData(); }, [loadData]);

function HistoryCard({ label, value, icon, color, suffix = '' }: { label: string; value: number | string; icon: React.ReactNode; color: string; suffix?: string }) {
  return (
    <div className="text-center p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
      <div className={`w-8 h-8 rounded-full ${color} mx-auto mb-1 flex items-center justify-center`}>
        {icon}
      </div>
      <div className="text-lg font-bold">{value}{suffix}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, 12000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <p className="text-neutral-500">{t('common.error')}</p>
        <button onClick={loadData} className="mt-4 text-primary-600 hover:text-primary-800 text-sm">{t('common.retry')}</button>
      </div>
    );
  }

  const hasOnline = overview && overview.onlineVisitors > 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">الرادار الحي</h1>
          <p className="text-neutral-400 text-sm mt-1">نشاط المتجر الآن</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors ${autoRefresh ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-neutral-50 text-neutral-500 border-neutral-200'}`}
          >
            <RefreshCw className={`h-3 w-3 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'تحديث تلقائي' : 'إيقاف التحديث'}
          </button>
          <button onClick={loadData} className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1">
            <RefreshCw className="h-4 w-4" />
            تحديث
          </button>
        </div>
      </div>

      {/* History Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">المدى:</span>
          <Select value={historyRange} onValueChange={(value) => setHistoryRange(value as '24h' | '7d')}>
            <SelectTrigger className="w-32 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="24h" value="24h">24 ساعة</SelectItem>
              <SelectItem key="7d" value="7d">7 أيام</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">الدقة:</span>
          <Select value={historyInterval} onValueChange={(value) => setHistoryInterval(value as '15m' | '1h')}>
            <SelectTrigger className="w-28 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="15m" value="15m">15 دقيقة</SelectItem>
              <SelectItem key="1h" value="1h">ساعة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {overview && (
        <p className="text-xs text-neutral-400 -mt-4">
          آخر تحديث: {new Date(overview.updatedAt).toLocaleTimeString('ar-SA')}
        </p>
      )}

      {!hasOnline ? (
        <Card className="p-12 text-center">
          <Activity className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-neutral-500 mb-2">لا زوار الآن</h2>
          <p className="text-neutral-400">عند دخول زوار للمتجر، ستظهر هنا بيانات النشاط الحي</p>
        </Card>
      ) : (
        <div>
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">الزوار الآن</CardTitle>
                <Users className="h-4 w-4 text-primary-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview!.onlineVisitors}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">يشاهدون منتجات</CardTitle>
                <Eye className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview!.activeProductViewers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">سلات نشطة</CardTitle>
                <ShoppingCart className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview!.activeCarts}</div>
                <div className="text-xs text-neutral-400">{Number(overview!.currentCartValueTotal).toFixed(2)} ر.س</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">في الدفع</CardTitle>
                <CreditCard className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview!.activeCheckouts}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">إيراد 30 دقيقة</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Number(overview!.revenueLast30Min).toFixed(0)}</div>
                <div className="text-xs text-neutral-400">{overview!.paidOrdersLast30Min} طلب مدفوع</div>
              </CardContent>
            </Card>
          </div>

          {/* Funnel */}
          {funnel && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  مسار التحويل الحي
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
                  <FunnelStep label="زوار" count={funnel.onlineVisitors} color="bg-primary-500" />
                  <FunnelArrow />
                  <FunnelStep label="منتجات" count={funnel.productViewers} color="bg-violet-500" />
                  <FunnelArrow />
                  <FunnelStep label="سلات" count={funnel.cartUsers} color="bg-amber-500" />
                  <FunnelArrow />
                  <FunnelStep label="دفع" count={funnel.checkoutUsers} color="bg-emerald-500" />
                  <FunnelArrow />
                  <FunnelStep label="طلبات" count={funnel.ordersLast30Min} color="bg-emerald-600" />
                  <FunnelArrow />
                  <FunnelStep label="مدفوع" count={funnel.paidOrdersLast30Min} color="bg-green-700" />
                </div>
                {funnel.dropOffSignals.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {funnel.dropOffSignals.map((signal, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-xl p-3">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>توقف في مرحلة "{signal.stage}": {signal.count} زائر</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Top Products */}
          {pages && pages.topViewedProductsNow.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  المنتجات الأكثر مشاهدة الآن
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pages.topViewedProductsNow.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                      <span className="text-sm font-medium truncate ml-4">{p.productName}</span>
                      <span className="text-sm text-neutral-500 shrink-0">{p.viewers} زائر</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Devices & Sources */}
          <div className="grid gap-6 md:grid-cols-2">
            {devices && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    الأجهزة الآن
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DeviceGroup label="نوع الجهاز" data={devices.visitorsByDeviceType} icon={<Smartphone className="h-4 w-4" />} />
                  <DeviceGroup label="نظام التشغيل" data={devices.visitorsByOs} icon={<Monitor className="h-4 w-4" />} />
                  <DeviceGroup label="المتصفح" data={devices.visitorsByBrowser} icon={<Globe className="h-4 w-4" />} />
                  <DeviceGroup label="حجم الشاشة" data={devices.visitorsByScreenSize} />
                </CardContent>
              </Card>
            )}

            {sources && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    مصادر الزيارات الآن
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DeviceGroup label="المصدر" data={sources.visitorsByUtmSource} />
                  <DeviceGroup label="الحملة" data={sources.visitorsByUtmCampaign} />
                  <DeviceGroup label="المرجع" data={sources.visitorsByReferrer} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Geo */}
          {geo && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    الدول
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {geo.countries.length === 0 ? (
                    <p className="text-neutral-400 text-sm">لا توجد بيانات جغرافية</p>
                  ) : (
                    <div className="space-y-2">
                      {geo.countries.slice(0, 10).map((c, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary-500" />
                            <span className="font-medium text-sm">{c.countryName}</span>
                            <span className="text-xs text-neutral-400">({c.countryCode})</span>
                          </div>
                          <span className="text-sm text-neutral-500">{c.count} زائر</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    المدن
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {geo.cities.length === 0 ? (
                    <p className="text-neutral-400 text-sm">لا توجد بيانات مدن</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {geo.cities.slice(0, 15).map((c, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-violet-500" />
                            <span className="font-medium text-sm">{c.cityName}</span>
                            <span className="text-xs text-neutral-400">{c.countryName}</span>
                          </div>
                          <span className="text-sm text-neutral-500">{c.count} زائر</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Alerts */}
          {alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  التنبيهات الحية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {alerts.map((alert, idx) => (
                  <div key={idx} className={`p-4 rounded-2xl border ${alert.severity === 'critical' ? 'bg-red-50 border-red-200' : alert.severity === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-primary-50 border-primary-200'}`}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {alert.severity === 'critical' ? <AlertTriangle className="h-5 w-5 text-red-500" /> :
                         alert.severity === 'warning' ? <Target className="h-5 w-5 text-amber-500" /> :
                         <Lightbulb className="h-5 w-5 text-primary-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm">{alert.title}</h4>
                          <SeverityBadge severity={alert.severity} />
                        </div>
                        <p className="text-sm text-neutral-600 mt-1">{alert.description}</p>
                        <div className="mt-2 text-xs text-neutral-500 bg-white/60 rounded-xl p-2">
                          <span className="font-medium">توصية: </span>{alert.recommendation}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* History */}
          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  السجل التاريخي (آخر {history.length} لقطة)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <HistoryCard label="أعلى زوار" value={Math.max(...history.map(h => h.onlineVisitors))} icon={<Users className="h-4 w-4" />} color="text-primary-500" />
                  <HistoryCard label="أعلى مشاهدين" value={Math.max(...history.map(h => h.activeProductViewers))} icon={<Eye className="h-4 w-4" />} color="text-violet-500" />
                  <HistoryCard label="أعلى سلات" value={Math.max(...history.map(h => h.activeCarts))} icon={<ShoppingCart className="h-4 w-4" />} color="text-amber-500" />
                  <HistoryCard label="أعلى إيراد" value={Number(Math.max(...history.map(h => Number(h.revenueLast30Min)))).toFixed(0)} icon={<DollarSign className="h-4 w-4" />} color="text-emerald-500" suffix="ر.س" />
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="py-2 px-3 font-medium text-neutral-500">الوقت</th>
                        <th className="py-2 px-3 font-medium text-neutral-500">زوار</th>
                        <th className="py-2 px-3 font-medium text-neutral-500">مشاهدين</th>
                        <th className="py-2 px-3 font-medium text-neutral-500">سلات</th>
                        <th className="py-2 px-3 font-medium text-neutral-500">دفع</th>
                        <th className="py-2 px-3 font-medium text-neutral-500">إيراد 30د</th>
                        <th className="py-2 px-3 font-medium text-neutral-500">طلبات 30د</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 50).map((h, idx) => (
                        <tr key={idx} className="border-b border-neutral-100 hover:bg-neutral-50">
                          <td className="py-2 px-3 text-neutral-500">{new Date(h.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="py-2 px-3">{h.onlineVisitors}</td>
                          <td className="py-2 px-3">{h.activeProductViewers}</td>
                          <td className="py-2 px-3">{h.activeCarts}</td>
                          <td className="py-2 px-3">{h.activeCheckouts}</td>
                          <td className="py-2 px-3">{Number(h.revenueLast30Min).toFixed(2)}</td>
                          <td className="py-2 px-3">{h.ordersLast30Min}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alerts */}
        </div>
      )}
    </div>
    );
  }

function FunnelStep({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="text-center p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
      <div className={`w-8 h-8 rounded-full ${color} mx-auto mb-1 flex items-center justify-center text-white text-xs font-bold`}>
        {count}
      </div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}

function FunnelArrow() {
  return (
    <div className="flex items-center justify-center text-neutral-300 text-xl select-none shrink-0">
      ←
    </div>
  );
}

function DeviceGroup({ label, data, icon }: { label: string; data: { label: string; count: number }[]; icon?: React.ReactNode }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  return (
    <div>
      <h4 className="text-xs font-semibold text-neutral-500 mb-2 flex items-center gap-1">
        {icon}
        {label}
      </h4>
      {data.length === 0 ? (
        <p className="text-xs text-neutral-400">لا توجد بيانات</p>
      ) : (
        <div className="space-y-1">
          {data.map((d, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-sm w-24 truncate shrink-0">{d.label}</span>
              <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full" style={{ width: `${total > 0 ? (d.count / total) * 100 : 0}%` }} />
              </div>
              <span className="text-xs text-neutral-500 w-8 text-left">{d.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
