import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, Clock, EyeOff, Zap, Settings, Shield, ShoppingCart, CreditCard, Target, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { request, ApiClientError } from '@/lib/api';

interface ActionState {
  id: number;
  storeId: number;
  actionFingerprint: string;
  actionType: string;
  status: 'active' | 'dismissed' | 'done' | 'snoozed';
  snoozedUntil: string | null;
  dismissedAt: string | null;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ActionsResponse {
  data: ActionState[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Thresholds {
  minimumProductViews: number;
  lowAddToCartRateThreshold: number;
  activeCartAgeMinutes: number;
  checkoutNoPaymentMinutes: number;
  paymentFailureThreshold: number;
  sourceNoPurchaseVisitThreshold: number;
  mobileWeakConversionThreshold: number;
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  high_views_low_add_to_cart: 'مشاهدات عالية مع إضافة للسلة منخفضة',
  active_carts_no_checkout: 'سلات نشطة دون انتقال للدفع',
  checkout_no_payment: 'دفع بدون إتمام',
  payment_failures_spike: 'ارتفاع في فشل الدفع',
  source_visits_no_purchases: 'زيارات من مصدر بدون مشتريات',
  mobile_weak_conversion: 'تحويل جوال ضعيف',
};

const ACTION_SEVERITY_LABELS: Record<string, string> = {
  critical: 'حرج',
  high: 'عالي',
  medium: 'متوسط',
  low: 'منخفض',
};

const ACTION_STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  dismissed: 'متجاهل',
  done: 'منجز',
  snoozed: 'مؤجل',
};

const ACTION_TYPE_ICONS: Record<string, typeof AlertTriangle> = {
  high_views_low_add_to_cart: EyeOff,
  active_carts_no_checkout: ShoppingCart,
  checkout_no_payment: CreditCard,
  payment_failures_spike: AlertTriangle,
  source_visits_no_purchases: Target,
  mobile_weak_conversion: Smartphone,
};

function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'destructive';
    case 'high': return 'warning';
    case 'medium': return 'default';
    case 'low': return 'secondary';
    default: return 'default';
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'active': return 'warning';
    case 'dismissed': return 'secondary';
    case 'done': return 'default';
    case 'snoozed': return 'outline';
    default: return 'default';
  }
}

function getSeverityFromType(actionType: string): string {
  if (actionType.includes('spike') || actionType.includes('failures')) return 'critical';
  if (actionType.includes('high_views')) return 'high';
  if (actionType.includes('active_carts') || actionType.includes('checkout_no')) return 'high';
  return 'medium';
}

export default function MarketingActions() {
  const { t } = useTranslation();
  const { storeId } = useAuth();

  const [actions, setActions] = useState<ActionState[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editingThresholds, setEditingThresholds] = useState<Thresholds | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const loadData = useCallback(() => {
    if (!storeId) return;
    setLoading(true);
    setFetchError(false);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    Promise.all([
      request<ActionsResponse>(`/merchant/${storeId}/marketing/actions?${params}`),
      request<Thresholds>(`/merchant/${storeId}/marketing/settings/thresholds`),
    ])
      .then(([a, th]) => {
        setActions(a.data);
        setTotalPages(a.totalPages);
        setThresholds(th);
      })
      .catch((err) => {
        if (err instanceof ApiClientError) toast.error(err.message);
        else toast.error(t('common.error'));
        setFetchError(true);
      })
      .finally(() => setLoading(false));
  }, [storeId, t, page, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGenerate = async () => {
    if (!storeId) return;
    setGenerating(true);
    try {
      const res = await request<{ generated: number }>(`/merchant/${storeId}/marketing/actions/generate`, { method: 'POST' });
      toast.success(`تم توليد ${res.generated} إجراء`);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'فشل التوليد');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string, snoozedUntil?: string) => {
    if (!storeId) return;
    try {
      await request(`/merchant/${storeId}/marketing/actions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, snoozedUntil }),
      });
      toast.success('تم التحديث');
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'فشل التحديث');
    }
  };

  const handleSaveThresholds = async () => {
    if (!storeId || !editingThresholds) return;
    setSavingSettings(true);
    try {
      await request(`/merchant/${storeId}/marketing/settings`, {
        method: 'PATCH',
        body: JSON.stringify({ key: 'thresholds', valueJson: editingThresholds }),
      });
      toast.success('تم حفظ الإعدادات');
      setThresholds(editingThresholds);
      setShowSettings(false);
    } catch (err: any) {
      toast.error(err?.message || 'فشل الحفظ');
    } finally {
      setSavingSettings(false);
    }
  };

  const activeCount = actions.filter(a => a.status === 'active').length;
  const criticalCount = actions.filter(a => a.status === 'active' && getSeverityFromType(a.actionType) === 'critical').length;

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-3xl" />)}
        </div>
        <Skeleton className="h-96 rounded-3xl" />
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">مركز الإجراءات التسويقية</h1>
          <p className="text-neutral-400 text-sm mt-1">تتبع وإدارة التوصيات والأفعال التلقائية</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="dismissed">متجاهل</SelectItem>
              <SelectItem value="done">منجز</SelectItem>
              <SelectItem value="snoozed">مؤجل</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setEditingThresholds(thresholds ? { ...thresholds } : null); setShowSettings(true); }}>
            <Settings className="h-4 w-4 ml-2" />
            الإعدادات
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            <Zap className="h-4 w-4 ml-2" />
            {generating ? 'جاري التوليد...' : 'توليد إجراءات'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">الإجراءات النشطة</CardTitle>
            <Zap className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-neutral-400 mt-1">تحتاج مراجعتك</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">إجراءات حرجة</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
            <p className="text-xs text-neutral-400 mt-1">تحتاج تدخل فوري</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">الإجراءات المكتملة</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actions.filter(a => a.status === 'done').length}</div>
            <p className="text-xs text-neutral-400 mt-1">تم التعامل معها</p>
          </CardContent>
        </Card>
      </div>

      {actions.length === 0 ? (
        <Card className="p-12 text-center">
          <Shield className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-neutral-500 mb-2">لا توجد إجراءات حالياً</h2>
          <p className="text-neutral-400">اضغط "توليد إجراءات" للتحقق من البيانات وتوليد التوصيات</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {actions.map((action) => {
            const Icon = ACTION_TYPE_ICONS[action.actionType] || AlertTriangle;
            const severity = getSeverityFromType(action.actionType);
            const isExpired = action.status === 'snoozed' && action.snoozedUntil && new Date(action.snoozedUntil) < new Date();

            return (
              <Card key={action.id} className={`${action.status === 'active' && severity === 'critical' ? 'border-red-200 bg-red-50/30' : ''}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-xl ${severity === 'critical' ? 'bg-red-100' : severity === 'high' ? 'bg-amber-100' : 'bg-primary-100'}`}>
                      <Icon className={`h-5 w-5 ${severity === 'critical' ? 'text-red-600' : severity === 'high' ? 'text-amber-600' : 'text-primary-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-sm">{ACTION_TYPE_LABELS[action.actionType] || action.actionType}</h3>
                        <Badge variant={severityColor(severity) as any} className="text-xs">
                          {ACTION_SEVERITY_LABELS[severity]}
                        </Badge>
                        <Badge variant={statusColor(action.status) as any} className="text-xs">
                          {isExpired ? 'منتهي الصلاحية' : ACTION_STATUS_LABELS[action.status]}
                        </Badge>
                      </div>
                      <p className="text-xs text-neutral-500 mb-3">
                        {action.actionFingerprint}
                      </p>
                      {action.status === 'active' && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(action.id, 'done')}
                            className="h-7 text-xs"
                          >
                            <CheckCircle2 className="h-3 w-3 ml-1" />
                            تم التعامل
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(action.id, 'dismissed')}
                            className="h-7 text-xs"
                          >
                            <EyeOff className="h-3 w-3 ml-1" />
                            تجاهل
                          </Button>
                          <Select
                            value=""
                            onValueChange={(v) => {
                              const hours = Number(v);
                              const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
                              handleUpdateStatus(action.id, 'snoozed', until);
                            }}
                          >
                            <SelectTrigger className="w-28 h-7 text-xs">
                              <Clock className="h-3 w-3 ml-1" />
                              <SelectValue placeholder="تأجيل" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">ساعة</SelectItem>
                              <SelectItem value="4">4 ساعات</SelectItem>
                              <SelectItem value="24">يوم</SelectItem>
                              <SelectItem value="72">3 أيام</SelectItem>
                              <SelectItem value="168">أسبوع</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {action.status === 'snoozed' && action.snoozedUntil && (
                        <p className="text-xs text-neutral-400">
                          مؤجل حتى: {new Date(action.snoozedUntil).toLocaleDateString('ar-SA')}
                        </p>
                      )}
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-xs text-neutral-400">
                        {new Date(action.createdAt).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            السابق
          </Button>
          <span className="text-sm text-neutral-500">
            صفحة {page} من {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            التالي
          </Button>
        </div>
      )}

      {showSettings && editingThresholds && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                إعدادات الحدود
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-1">الحد الأدنى للمشاهدات</label>
                <input
                  type="number"
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  value={editingThresholds.minimumProductViews}
                  onChange={e => setEditingThresholds({ ...editingThresholds, minimumProductViews: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-1">حد معدل الإضافة للسلة المنخفض (0-1)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  value={editingThresholds.lowAddToCartRateThreshold}
                  onChange={e => setEditingThresholds({ ...editingThresholds, lowAddToCartRateThreshold: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-1">عمر السلة النشطة (دقائق)</label>
                <input
                  type="number"
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  value={editingThresholds.activeCartAgeMinutes}
                  onChange={e => setEditingThresholds({ ...editingThresholds, activeCartAgeMinutes: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-1">مدة الدفع بدون إتمام (دقائق)</label>
                <input
                  type="number"
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  value={editingThresholds.checkoutNoPaymentMinutes}
                  onChange={e => setEditingThresholds({ ...editingThresholds, checkoutNoPaymentMinutes: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-1">حد فشل الدفع</label>
                <input
                  type="number"
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  value={editingThresholds.paymentFailureThreshold}
                  onChange={e => setEditingThresholds({ ...editingThresholds, paymentFailureThreshold: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-1">حد زيارات المصدر بدون مشتريات</label>
                <input
                  type="number"
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  value={editingThresholds.sourceNoPurchaseVisitThreshold}
                  onChange={e => setEditingThresholds({ ...editingThresholds, sourceNoPurchaseVisitThreshold: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-1">حد ضعف تحويل الجوال (0-1)</label>
                <input
                  type="number"
                  step="0.005"
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  value={editingThresholds.mobileWeakConversionThreshold}
                  onChange={e => setEditingThresholds({ ...editingThresholds, mobileWeakConversionThreshold: Number(e.target.value) })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveThresholds} disabled={savingSettings} className="flex-1">
                  {savingSettings ? 'جاري الحفظ...' : 'حفظ'}
                </Button>
                <Button variant="outline" onClick={() => setShowSettings(false)} className="flex-1">
                  إلغاء
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
