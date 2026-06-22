import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Crown, Repeat, UserPlus, UserX, ShoppingCart, AlertTriangle as RiskIcon, Package, Tag, Users, Settings, ArrowLeft, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { request, ApiClientError } from '@/lib/api';

interface Segment {
  type: string;
  labelAr: string;
  descriptionAr: string;
  count: number;
  totalSpent: string;
  avgOrderValue: string;
}

interface SegmentSummary {
  totalCustomers: number;
  segments: Segment[];
  computedAt: string;
}

interface SegmentMember {
  customerId: number;
  name: string;
  phone: string;
  email: string | null;
  totalOrders: number;
  totalSpent: string;
  lastOrderAt: string | null;
  lastSeenAt: string | null;
  segmentType: string;
}

interface SegmentListResponse {
  data: SegmentMember[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Thresholds {
  highValueMinSpent: number;
  inactiveDays: number;
  atRiskDays: number;
  newCustomerDays: number;
}

const SEGMENT_ICONS: Record<string, typeof Crown> = {
  high_value: Crown,
  repeat_buyers: Repeat,
  new_customers: UserPlus,
  inactive: UserX,
  cart_abandoners: ShoppingCart,
  at_risk: RiskIcon,
  one_time_buyers: Package,
  coupon_users: Tag,
};

const SEGMENT_COLORS: Record<string, string> = {
  high_value: 'bg-amber-100 text-amber-700',
  repeat_buyers: 'bg-emerald-100 text-emerald-700',
  new_customers: 'bg-primary-100 text-primary-700',
  inactive: 'bg-neutral-100 text-neutral-600',
  cart_abandoners: 'bg-orange-100 text-orange-700',
  at_risk: 'bg-red-100 text-red-700',
  one_time_buyers: 'bg-violet-100 text-violet-700',
  coupon_users: 'bg-cyan-100 text-cyan-700',
};

function formatCurrency(val: string): string {
  const num = Number(val);
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toFixed(0);
}

export default function CustomerSegments() {
  const { t } = useTranslation();
  const { storeId } = useAuth();

  const [summary, setSummary] = useState<SegmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [members, setMembers] = useState<SegmentMember[]>([]);
  const [membersPage, setMembersPage] = useState(1);
  const [membersTotalPages, setMembersTotalPages] = useState(1);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [editingThresholds, setEditingThresholds] = useState<Thresholds | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const loadSummary = useCallback(() => {
    if (!storeId) return;
    setLoading(true);
    setFetchError(false);
    Promise.all([
      request<SegmentSummary>(`/merchant/${storeId}/marketing/segments/summary`),
      request<Thresholds>(`/merchant/${storeId}/marketing/segments/settings/thresholds`),
    ])
      .then(([s, th]) => {
        setSummary(s);
        setThresholds(th);
      })
      .catch((err) => {
        if (err instanceof ApiClientError) toast.error(err.message);
        else toast.error(t('common.error'));
        setFetchError(true);
      })
      .finally(() => setLoading(false));
  }, [storeId, t]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const loadMembers = useCallback(async (type: string, page: number) => {
    if (!storeId) return;
    setLoadingMembers(true);
    try {
      const res = await request<SegmentListResponse>(`/merchant/${storeId}/marketing/segments/${type}?page=${page}&limit=20`);
      setMembers(res.data);
      setMembersPage(res.page);
      setMembersTotalPages(res.totalPages);
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحميل الأعضاء');
    } finally {
      setLoadingMembers(false);
    }
  }, [storeId]);

  const handleSelectSegment = (type: string) => {
    setSelectedSegment(type);
    setMembersPage(1);
    loadMembers(type, 1);
  };

  const handleSaveThresholds = async () => {
    if (!storeId || !editingThresholds) return;
    setSavingSettings(true);
    try {
      await request(`/merchant/${storeId}/marketing/segments/settings/thresholds`, {
        method: 'PATCH',
        body: JSON.stringify(editingThresholds),
      });
      toast.success('تم حفظ الإعدادات');
      setThresholds(editingThresholds);
      setShowSettings(false);
      loadSummary();
    } catch (err: any) {
      toast.error(err?.message || 'فشل الحفظ');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <p className="text-neutral-500">{t('common.error')}</p>
        <Button onClick={loadSummary} className="mt-4">{t('common.retry')}</Button>
      </div>
    );
  }

  if (selectedSegment) {
    const seg = summary?.segments.find(s => s.type === selectedSegment);
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in p-6" dir="rtl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedSegment(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{seg?.labelAr || selectedSegment}</h1>
            <p className="text-neutral-400 text-sm mt-1">{seg?.descriptionAr} — {seg?.count} عميل</p>
          </div>
        </div>

        {loadingMembers ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-3xl" />)}
          </div>
        ) : members.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-neutral-500">لا يوجد عملاء في هذا الشريحة</h2>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {members.map((m) => (
                <Card key={m.customerId}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-bold text-neutral-600">
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{m.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-neutral-400">
                            <Phone className="h-3 w-3" />
                            {m.phone}
                            {m.email && (
                              <>
                                <Mail className="h-3 w-3 me-1" />
                                {m.email}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="text-sm font-semibold">{Number(m.totalSpent).toLocaleString()} ر.س</div>
                        <div className="text-xs text-neutral-400">{m.totalOrders} طلب</div>
                        {m.lastOrderAt && (
                          <div className="text-xs text-neutral-400">
                            آخر طلب: {new Date(m.lastOrderAt).toLocaleDateString('ar-SA')}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {membersTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const nextPage = Math.max(1, membersPage - 1);
                  setMembersPage(nextPage);
                  loadMembers(selectedSegment, nextPage);
                }} disabled={membersPage === 1}>
                  السابق
                </Button>
                <span className="text-sm text-neutral-500">صفحة {membersPage} من {membersTotalPages}</span>
                <Button variant="outline" size="sm" onClick={() => {
                  const nextPage = Math.min(membersTotalPages, membersPage + 1);
                  setMembersPage(nextPage);
                  loadMembers(selectedSegment, nextPage);
                }} disabled={membersPage === membersTotalPages}>
                  التالي
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in p-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">شرائح العملاء</h1>
          <p className="text-neutral-400 text-sm mt-1">تصنيف العملاء حسب السلوك والقيمة</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => { setEditingThresholds(thresholds ? { ...thresholds } : null); setShowSettings(true); }}>
            <Settings className="h-4 w-4 ms-2" />
            الإعدادات
          </Button>
        </div>
      </div>

      {summary && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-neutral-400" />
              <span className="text-sm text-neutral-500">إجمالي العملاء:</span>
              <span className="text-lg font-bold">{summary.totalCustomers.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {summary.segments.map((seg) => {
            const Icon = SEGMENT_ICONS[seg.type] || Users;
            const colorClass = SEGMENT_COLORS[seg.type] || 'bg-neutral-100 text-neutral-600';
            return (
              <Card key={seg.type} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleSelectSegment(seg.type)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-xl ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="text-xs">{seg.count}</Badge>
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{seg.labelAr}</h3>
                  <p className="text-xs text-neutral-400 mb-3 line-clamp-2">{seg.descriptionAr}</p>
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>إجمالي: {formatCurrency(seg.totalSpent)} ر.س</span>
                    <span>متوسط: {formatCurrency(seg.avgOrderValue)} ر.س</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showSettings && editingThresholds && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                إعدادات الشرائح
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-1">الحد الأدنى للقيمة العالية (ر.س)</label>
                <input type="number" className="w-full border rounded-xl px-3 py-2 text-sm" value={editingThresholds.highValueMinSpent} onChange={e => setEditingThresholds({ ...editingThresholds, highValueMinSpent: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-1">أيام عدم النشاط</label>
                <input type="number" className="w-full border rounded-xl px-3 py-2 text-sm" value={editingThresholds.inactiveDays} onChange={e => setEditingThresholds({ ...editingThresholds, inactiveDays: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-1">أيام الخطر</label>
                <input type="number" className="w-full border rounded-xl px-3 py-2 text-sm" value={editingThresholds.atRiskDays} onChange={e => setEditingThresholds({ ...editingThresholds, atRiskDays: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-1">أيام العميل الجديد</label>
                <input type="number" className="w-full border rounded-xl px-3 py-2 text-sm" value={editingThresholds.newCustomerDays} onChange={e => setEditingThresholds({ ...editingThresholds, newCustomerDays: Number(e.target.value) })} />
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
