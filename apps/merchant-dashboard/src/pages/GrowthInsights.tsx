import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Eye, ShoppingCart, CreditCard, DollarSign, TrendingUp, BarChart3, Lightbulb, Target, MousePointerClick, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { request, ApiClientError } from '@/lib/api';

const DATE_PRESETS = [
  { value: 'today', label: 'اليوم' },
  { value: '7d', label: 'آخر 7 أيام' },
  { value: '30d', label: 'آخر 30 يوم' },
  { value: '90d', label: 'آخر 90 يوم' },
];

function computeDateRange(preset: string): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const dateTo = now.toISOString().slice(0, 10);
  let dateFrom: string;
  const d = new Date(now);
  switch (preset) {
    case 'today':
      dateFrom = dateTo;
      break;
    case '7d':
      d.setDate(d.getDate() - 6);
      dateFrom = d.toISOString().slice(0, 10);
      break;
    case '90d':
      d.setDate(d.getDate() - 89);
      dateFrom = d.toISOString().slice(0, 10);
      break;
    default:
      d.setDate(d.getDate() - 29);
      dateFrom = d.toISOString().slice(0, 10);
  }
  return { dateFrom, dateTo };
}

interface Overview {
  totalEvents: number;
  sessionsCount: number;
  productViews: number;
  addToCarts: number;
  checkoutStarts: number;
  purchases: number;
  cartToCheckoutRate: number | null;
  checkoutToPurchaseRate: number | null;
  estimatedAbandonmentRate: number | null;
  period: { dateFrom: string; dateTo: string };
}

interface ProductMetricsData {
  productId: number;
  productName: string;
  views: number;
  addToCarts: number;
  purchases: number;
  conversionRate: number | null;
}

interface Insight {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  metric: string;
  recommendation: string;
}

interface SourceRow {
  source: string;
  sessions: number;
  orders: number;
  revenue: string;
}

interface CampaignRow {
  campaign: string;
  sessions: number;
  orders: number;
  revenue: string;
}

function pct(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  return (value * 100).toFixed(1) + '%';
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'destructive';
    case 'warning': return 'warning';
    default: return 'default';
  }
}

function Perc({ value }: { value: number | null }) {
  if (value === null) return <span className="text-neutral-400">—</span>;
  const isGood = value >= 0.3;
  return (
    <span className={isGood ? 'text-emerald-600' : 'text-amber-600'}>
      {pct(value)}
    </span>
  );
}

export default function GrowthInsights() {
  const { t } = useTranslation();
  const { storeId } = useAuth();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [products, setProducts] = useState<{ mostViewed: ProductMetricsData[]; highViewsLowPurchases: ProductMetricsData[] } | null>(null);
  const [sources, setSources] = useState<{ bySource: SourceRow[]; byCampaign: CampaignRow[]; bestCampaigns: CampaignRow[]; highVisitsLowConversion: CampaignRow[] } | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [aggregating, setAggregating] = useState(false);
  const [datePreset, setDatePreset] = useState('30d');

  const loadData = useCallback(() => {
    if (!storeId) return;
    const { dateFrom, dateTo } = computeDateRange(datePreset);
    setLoading(true);
    setFetchError(false);
    const q = `?dateFrom=${dateFrom}&dateTo=${dateTo}`;
    Promise.all([
      request<Overview>(`/merchant/${storeId}/marketing/overview${q}`),
      request<{ mostViewed: ProductMetricsData[]; highViewsLowPurchases: ProductMetricsData[] }>(`/merchant/${storeId}/marketing/products${q}`),
      request<{ bySource: SourceRow[]; byCampaign: CampaignRow[]; bestCampaigns: CampaignRow[]; highVisitsLowConversion: CampaignRow[] }>(`/merchant/${storeId}/marketing/sources${q}`),
      request<Insight[]>(`/merchant/${storeId}/marketing/insights${q}`),
    ])
      .then(([o, p, s, i]) => {
        setOverview(o);
        setProducts(p);
        setSources(s);
        setInsights(i);
      })
      .catch((err) => {
        if (err instanceof ApiClientError) toast.error(err.message);
        else toast.error(t('common.error'));
        setFetchError(true);
      })
      .finally(() => setLoading(false));
  }, [storeId, t, datePreset]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAggregate = async () => {
    if (!storeId) return;
    setAggregating(true);
    try {
      await request<{ ok: boolean }>(`/merchant/${storeId}/marketing/aggregate`, { method: 'POST' });
      toast.success('تم تحديث البيانات');
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'فشل التحديث');
    } finally {
      setAggregating(false);
    }
  };

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
        <Button onClick={loadData} className="mt-4">{t('common.retry')}</Button>
      </div>
    );
  }

  const hasEvents = overview && overview.totalEvents > 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">مؤشرات النمو</h1>
          <p className="text-neutral-400 text-sm mt-1">تحليلات التسويق وأداء المتجر</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={datePreset} onValueChange={setDatePreset}>
            <SelectTrigger className="w-36 h-9 text-sm">
              <Calendar className="h-4 w-4 ml-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleAggregate} disabled={aggregating}>
            <BarChart3 className="h-4 w-4 ml-2" />
            {aggregating ? 'جاري التحديث...' : 'تحديث البيانات'}
          </Button>
        </div>
      </div>
      {overview && (
        <p className="text-xs text-neutral-400 -mt-4">
          الفترة: {overview.period.dateFrom} إلى {overview.period.dateTo}
        </p>
      )}

      {!hasEvents ? (
        <Card className="p-12 text-center">
          <BarChart3 className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-neutral-500 mb-2">لا توجد بيانات بعد</h2>
          <p className="text-neutral-400">عند بدء النشاط على المتجر، ستظهر هنا مؤشرات الأداء والتوصيات</p>
        </Card>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">مشاهدات المنتجات</CardTitle>
                <Eye className="h-4 w-4 text-neutral-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview!.productViews.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">إضافة للسلة</CardTitle>
                <ShoppingCart className="h-4 w-4 text-neutral-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview!.addToCarts.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">بدء الدفع</CardTitle>
                <CreditCard className="h-4 w-4 text-neutral-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview!.checkoutStarts.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">مشتريات</CardTitle>
                <DollarSign className="h-4 w-4 text-neutral-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview!.purchases.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          {/* Funnel Visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">مسار التحويل</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>زيارات المنتج ← إضافة للسلة</span>
                    <span className="font-semibold">{overview!.addToCarts.toLocaleString()} / {overview!.productViews.toLocaleString()}</span>
                  </div>
                  <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min((overview!.addToCarts / Math.max(overview!.productViews, 1)) * 100, 100)}%` }} />
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">نسبة التحويل: <Perc value={overview!.productViews > 0 ? overview!.addToCarts / overview!.productViews : null} /></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>إضافة للسلة ← بدء الدفع</span>
                    <span className="font-semibold">{overview!.checkoutStarts.toLocaleString()} / {overview!.addToCarts.toLocaleString()}</span>
                  </div>
                  <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min((overview!.checkoutStarts / Math.max(overview!.addToCarts, 1)) * 100, 100)}%` }} />
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">
                    نسبة التحويل: <Perc value={overview!.cartToCheckoutRate} />
                    {overview!.estimatedAbandonmentRate !== null && overview!.estimatedAbandonmentRate > 0.5 && (
                      <Badge variant="warning" className="mr-2 text-xs">نسبة ترك مرتفعة</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>بدء الدفع ← شراء</span>
                    <span className="font-semibold">{overview!.purchases.toLocaleString()} / {overview!.checkoutStarts.toLocaleString()}</span>
                  </div>
                  <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${Math.min((overview!.purchases / Math.max(overview!.checkoutStarts, 1)) * 100, 100)}%` }} />
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">نسبة التحويل: <Perc value={overview!.checkoutToPurchaseRate} /></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insights */}
          {insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  التوصيات والتنبيهات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {insights.map((insight, idx) => (
                  <div key={idx} className={`p-4 rounded-2xl border ${insight.severity === 'critical' ? 'bg-red-50 border-red-200' : insight.severity === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {insight.severity === 'critical' ? <AlertTriangle className="h-5 w-5 text-red-500" /> :
                         insight.severity === 'warning' ? <Target className="h-5 w-5 text-amber-500" /> :
                         <Lightbulb className="h-5 w-5 text-blue-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm">{insight.title}</h4>
                          <Badge variant={severityColor(insight.severity) as any} className="text-xs">
                            {insight.severity === 'critical' ? 'حرج' : insight.severity === 'warning' ? 'تنبيه' : 'توصية'}
                          </Badge>
                        </div>
                        <p className="text-sm text-neutral-600 mt-1">{insight.description}</p>
                        <div className="mt-2 text-xs text-neutral-500 bg-white/60 rounded-xl p-2">
                          <span className="font-medium">توصية: </span>{insight.recommendation}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Sources & Campaigns */}
          {sources && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MousePointerClick className="h-5 w-5" />
                    أفضل مصادر الزيارات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sources.bySource.length === 0 ? (
                    <p className="text-neutral-400 text-sm">لا توجد بيانات كافية</p>
                  ) : (
                    <div className="space-y-3">
                      {sources.bySource.slice(0, 5).map((src, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                          <div>
                            <span className="font-medium text-sm">{src.source === 'direct' ? 'مباشر' : src.source}</span>
                            <span className="text-xs text-neutral-400 mr-2">{src.sessions} جلسة</span>
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-semibold">{src.orders} طلب</div>
                            <div className="text-xs text-neutral-400">{src.revenue} ر.س</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    أفضل الحملات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sources.bestCampaigns.length === 0 ? (
                    <p className="text-neutral-400 text-sm">لا توجد بيانات كافية</p>
                  ) : (
                    <div className="space-y-3">
                      {sources.bestCampaigns.map((cmp, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                          <div>
                            <span className="font-medium text-sm">{cmp.campaign === 'untagged' ? 'بدون حملة' : cmp.campaign}</span>
                            <span className="text-xs text-neutral-400 mr-2">{cmp.sessions} جلسة</span>
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-semibold">{cmp.orders} طلب</div>
                            <div className="text-xs text-neutral-400">{cmp.revenue} ر.س</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Product Performance */}
          {products && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">المنتجات الأعلى مشاهدة</CardTitle>
                </CardHeader>
                <CardContent>
                  {products.mostViewed.length === 0 ? (
                    <p className="text-neutral-400 text-sm">لا توجد بيانات كافية</p>
                  ) : (
                    <div className="space-y-3">
                      {products.mostViewed.slice(0, 5).map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                          <span className="text-sm font-medium truncate ml-4">{p.productName}</span>
                          <div className="text-left shrink-0">
                            <div className="text-sm">{p.views.toLocaleString()} مشاهدة</div>
                            <div className="text-xs text-neutral-400">{p.purchases} شراء</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    منتجات ضعيفة التحويل
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {products.highViewsLowPurchases.length === 0 ? (
                    <p className="text-neutral-400 text-sm">لا توجد نتائج</p>
                  ) : (
                    <div className="space-y-3">
                      {products.highViewsLowPurchases.slice(0, 5).map((p, idx) => (
                        <div key={idx} className="p-3 bg-amber-50 rounded-2xl">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate ml-4">{p.productName}</span>
                            <span className="text-xs text-amber-600 shrink-0">
                              {p.views} مشاهدة / {p.purchases} شراء
                              {p.conversionRate !== null && <span> ({pct(p.conversionRate)})</span>}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
