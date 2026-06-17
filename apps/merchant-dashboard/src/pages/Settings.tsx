import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { settingsApi, paymentApi, uploadFile, categoriesApi, publishApi, complianceApi, acknowledgementApi, type StoreConfig } from '@/lib/api';
import { handleImageError } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Settings as SettingsIcon, Store, Phone, CreditCard, Truck, Wallet,
  CheckCircle2, Circle, ArrowLeft, Loader2, Info, ExternalLink,
  AlertTriangle, Globe, MapPin, Eye, EyeOff, Gift, Package,
  Plus, Edit, Trash2, Ruler, MessageCircle, Clock, ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiClientError } from '@/lib/api';
import { PermissionGate } from '@/lib/permissions';

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h3 className="font-bold text-base text-neutral-900">{title}</h3>
      {description && <p className="text-sm text-neutral-500 mt-1">{description}</p>}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500 mt-1">{message}</p>;
}

function PlaceholderCard({ icon, title, description, href, linkLabel }: {
  icon: React.ReactNode; title: string; description: string; href?: string; linkLabel?: string;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-5">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-400">{icon}</div>
        <div className="flex-1">
          <p className="font-bold text-sm text-neutral-900">{title}</p>
          <p className="text-sm text-neutral-400 mt-1">{description}</p>
          {href && linkLabel && (
            <a href={href} className="inline-flex items-center gap-1 text-sm text-blue-500 hover:underline mt-2">
              {linkLabel} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentStatusSection() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) { setLoading(false); return; }
    paymentApi.status(storeId)
      .then(setStatus)
      .catch(() => toast.error(t('common.error', 'فشل تحميل حالة الدفع')))
      .finally(() => setLoading(false));
  }, [storeId]);

  if (loading) return <Skeleton className="h-32 w-full rounded-3xl" />;
  if (!status) return null;

  const { activeProvider, activeMode, moyasarConfigured } = status;

  return (
    <>
      <div className={`bg-white/80 backdrop-blur-xl rounded-3xl border shadow-card p-6 ${activeMode === 'sandbox' ? 'border-emerald-200 bg-emerald-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
        <div className="flex items-start gap-3">
          {activeMode === 'sandbox' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
          ) : (
            <Info className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          )}
          <div className="text-sm">
            <p className="font-bold text-neutral-900">
              {activeMode === 'sandbox'
                ? t('settings.sandboxActive')
                : t('settings.fakePaymentTitle')}
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              {activeMode === 'sandbox'
                ? `${t('settings.activeProvider')}: ${activeProvider} | ${t('settings.mode')}: ${activeMode}`
                : t('settings.fakePaymentDesc')}
            </p>
          </div>
        </div>
      </div>

      {moyasarConfigured && (
        <div className="bg-emerald-50/50 border border-emerald-200/50 rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
            <div className="text-sm text-emerald-800">
              <p className="font-bold">{t('settings.moyasarConfigured')}</p>
              <p className="text-sm mt-1">{t('settings.moyasarSandboxReady')}</p>
            </div>
          </div>
        </div>
      )}

      {!moyasarConfigured && activeMode === 'fake' && (
        <div className="bg-blue-50/50 border border-blue-200/50 rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-bold">{t('settings.sandboxReadyTitle')}</p>
              <p className="text-sm mt-1">{t('settings.sandboxReadyDesc')}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mt-4">
        <PlaceholderCard
          icon={<CreditCard className="h-4 w-4" />}
          title={t('settings.refundSection')}
          description={t('settings.refundSectionDesc')}
        />
        <PlaceholderCard
          icon={<CreditCard className="h-4 w-4" />}
          title={t('settings.reconciliationSection')}
          description={t('settings.reconciliationSectionDesc')}
        />
      </div>
    </>
  );
}

function ReadinessChecklist({ storeId }: { storeId: number }) {
  const { t } = useTranslation();
  const [readiness, setReadiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    settingsApi.readiness(storeId)
      .then(setReadiness)
      .catch(() => toast.error(t('common.error', 'فشل تحميل جاهزية المتجر')))
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6 space-y-3">
        <Skeleton className="h-6 w-48 rounded-2xl" />
        <Skeleton className="h-4 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!readiness) return null;

  const { percentage, completedCount, totalCount, items } = readiness;
  const isComplete = percentage === 100;

  return (
    <div className={`bg-white/80 backdrop-blur-xl rounded-3xl border shadow-card p-6 ${isComplete ? 'border-emerald-200 bg-emerald-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          )}
          <h3 className="font-bold text-neutral-900">{t('settings.setupChecklist')}</h3>
        </div>
        <div className="text-lg font-bold text-neutral-900">{percentage}%</div>
      </div>

      <div className="w-full bg-neutral-100 rounded-full h-2.5 mb-3">
        <div
          className={`h-2.5 rounded-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-sm text-neutral-400 mb-4">
        {t('settings.readinessProgress', { completed: completedCount, total: totalCount })}
      </p>

      <div className="space-y-2">
        {items.map((item: any) => (
          <div key={item.key} className="flex items-center justify-between py-1.5 px-3 rounded-xl hover:bg-white/50">
            <div className="flex items-center gap-2 text-sm">
              {item.completed ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-neutral-300 shrink-0" />
              )}
              <span className={item.completed ? 'text-neutral-400 line-through' : 'text-neutral-900'}>
                {t(item.label)}
              </span>
            </div>
            {!item.completed && item.actionHref && item.actionHref !== '#' && (
              <a href={item.actionHref} className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                {t(item.actionLabel)} <ArrowLeft className="h-3 w-3" />
              </a>
            )}
          </div>
        ))}
      </div>

      {isComplete && (
        <div className="mt-4 p-3 bg-emerald-100 rounded-2xl text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {t('settings.storeReady')}
        </div>
      )}
    </div>
  );
}

const PUBLISH_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'مسودة', color: 'text-neutral-700', bg: 'bg-neutral-100' },
  review: { label: 'قيد المراجعة', color: 'text-blue-700', bg: 'bg-blue-100' },
  published: { label: 'منشور', color: 'text-green-700', bg: 'bg-green-100' },
  restricted: { label: 'مقيّد', color: 'text-orange-700', bg: 'bg-orange-100' },
  suspended: { label: 'موقوف', color: 'text-red-700', bg: 'bg-red-100' },
};

function PublishSection({ storeId }: { storeId: number | null }) {
  const { t } = useTranslation();
  const [publishStatus, setPublishStatus] = useState<string>('draft');
  const [checklist, setChecklist] = useState<{ passed: boolean; blockingErrorsCount: number; warningsCount: number } | null>(null);
  const [acknowledgement, setAcknowledgement] = useState<{ acknowledged: boolean; missingItems: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [showAckDialog, setShowAckDialog] = useState(false);
  const [ackCheckboxes, setAckCheckboxes] = useState<Record<string, boolean>>({});
  const [ackSubmitting, setAckSubmitting] = useState(false);
  const [ackRequired, setAckRequired] = useState<{ requiredItems: Array<{ key: string; label: string }>; requiredCheckboxes: Array<{ key: string; label: string }> } | null>(null);

  const loadData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [statusData, checklistData, ackData] = await Promise.allSettled([
        publishApi.getPublishStatus(storeId),
        complianceApi.getChecklist(storeId),
        acknowledgementApi.getStatus(storeId),
      ]);
      if (statusData.status === 'fulfilled') setPublishStatus(statusData.value.publishStatus);
      if (checklistData.status === 'fulfilled') setChecklist(checklistData.value);
      if (ackData.status === 'fulfilled') setAcknowledgement(ackData.value);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePublish = async () => {
    if (!storeId) return;
    setPublishing(true);
    try {
      const result = await publishApi.publish(storeId);
      setPublishStatus(result.publishStatus);
      toast.success('تم نشر المتجر بنجاح');
      loadData();
    } catch (err: any) {
      const data = err?.data;
      if (data?.error?.code === 'STORE_COMPLIANCE_INCOMPLETE') {
        toast.error('الامتثال غير مكتمل — لا يمكن النشر');
        if (data?.data?.checklist) setChecklist(data.data.checklist);
      } else if (data?.error?.code === 'MERCHANT_ACKNOWLEDGEMENT_REQUIRED') {
        toast.error('الإقرار مطلوب قبل النشر');
        openAckDialog();
      } else {
        toast.error(err instanceof ApiClientError ? err.message : 'فشل النشر');
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!storeId) return;
    setPublishing(true);
    try {
      const result = await publishApi.unpublish(storeId);
      setPublishStatus(result.publishStatus);
      toast.success('تم إلغاء النشر');
      loadData();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'فشل إلغاء النشر');
    } finally {
      setPublishing(false);
    }
  };

  const openAckDialog = async () => {
    if (!storeId) return;
    try {
      const items = await acknowledgementApi.getRequiredItems(storeId);
      setAckRequired(items);
      const initial: Record<string, boolean> = {};
      for (const item of items.requiredCheckboxes) initial[item.key] = false;
      for (const item of items.requiredItems) initial[item.key] = false;
      setAckCheckboxes(initial);
      setShowAckDialog(true);
    } catch {
      toast.error('فشل تحميل متطلبات الإقرار');
    }
  };

  const handleAcknowledge = async () => {
    if (!storeId) return;
    setAckSubmitting(true);
    try {
      await acknowledgementApi.acknowledge(storeId, ackCheckboxes);
      toast.success('تم حفظ الإقرار بنجاح');
      setShowAckDialog(false);
      loadData();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'فشل حفظ الإقرار');
    } finally {
      setAckSubmitting(false);
    }
  };

  const allChecked = ackRequired
    ? [...ackRequired.requiredItems, ...ackRequired.requiredCheckboxes].every(item => ackCheckboxes[item.key])
    : false;

  if (loading) return <Skeleton className="h-24 w-full rounded-2xl" />;

  const statusConfig = PUBLISH_STATUS_CONFIG[publishStatus] || PUBLISH_STATUS_CONFIG.draft;
  const canPublish = (checklist?.passed ?? false) && (acknowledgement?.acknowledged ?? false);

  return (
    <>
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base text-neutral-900">{t('settings.publish.title', 'نشر المتجر')}</h3>
          <p className="text-sm text-neutral-400 mt-1">{t('settings.publish.description', 'تحكم في ظهور المتجر للعملاء')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0`}>{statusConfig.label}</Badge>
          {publishStatus === 'published' ? (
            <PermissionGate permission="settings:update"><Button variant="outline" size="sm" onClick={handleUnpublish} disabled={publishing}>
              {publishing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('settings.publish.unpublish', 'إلغاء النشر')}
            </Button></PermissionGate>
          ) : (
            <PermissionGate permission="settings:update"><Button size="sm" onClick={handlePublish} disabled={publishing || !canPublish}>
              {publishing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('settings.publish.publish', 'نشر المتجر')}
            </Button></PermissionGate>
          )}
        </div>
      </div>
      {checklist && !checklist.passed && (
        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
          <span className="text-sm text-orange-700">
            {checklist.blockingErrorsCount} أخطاء يجب إصلاحها قبل النشر
          </span>
        </div>
      )}
      {acknowledgement && !acknowledgement.acknowledged && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-sm text-amber-700">
              الإقرار مطلوب قبل النشر ({acknowledgement.missingItems.length} بنود مفقودة)
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={openAckDialog}>تقديم الإقرار</Button>
        </div>
      )}
    </div>

    {showAckDialog && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">إقرار المتجر</h3>
          <p className="text-sm text-neutral-500 mb-4">يجب الموافقة على جميع البنود قبل نشر المتجر.</p>
              {ackRequired && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-700 mb-2">الوثائق القانونية</h4>
                    {ackRequired.requiredItems.map(item => (
                  <label key={item.key} className="flex items-start gap-2 p-2 rounded-lg hover:bg-neutral-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      checked={!!ackCheckboxes[item.key]}
                      onChange={(e) => setAckCheckboxes(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    />
                    <span className="text-sm text-neutral-700">{item.label}</span>
                  </label>
                ))}
              </div>
               <div>
                 <h4 className="text-sm font-semibold text-neutral-700 mb-2">الإقرار بالمسؤوليات</h4>
                 {ackRequired.requiredCheckboxes.map(item => (
                  <label key={item.key} className="flex items-start gap-2 p-2 rounded-lg hover:bg-neutral-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      checked={!!ackCheckboxes[item.key]}
                      onChange={(e) => setAckCheckboxes(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    />
                    <span className="text-sm text-neutral-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowAckDialog(false)} className="flex-1">إلغاء</Button>
            <PermissionGate permission="settings:update"><Button onClick={handleAcknowledge} disabled={!allChecked || ackSubmitting} className="flex-1">
              {ackSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              تأكيد الإقرار
            </Button></PermissionGate>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [featuresLoading, setFeaturesLoading] = useState(true);
  const [featuresSaving, setFeaturesSaving] = useState(false);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>({
    welcomeMessage: null, welcomeMessageEnabled: false,
    preparationTime: 0, preparationTimeEnabled: false,
    minOrderAmount: '0', minOrderEnabled: false,
    city: null, district: null, street: null, postalCode: null, latitude: null, longitude: null,
  });
  const [storeConfigLoading, setStoreConfigLoading] = useState(true);
  const [storeConfigSaving, setStoreConfigSaving] = useState(false);

  const [giftOptions, setGiftOptions] = useState<{ giftWrapDefaultPrice: string; giftMessageMaxLength: number; giftWrapInstructions: string | null; pickupInstructions: string | null }>({
    giftWrapDefaultPrice: '0',
    giftMessageMaxLength: 250,
    giftWrapInstructions: null,
    pickupInstructions: null,
  });
  const [giftOptionsLoading, setGiftOptionsLoading] = useState(true);
  const [giftOptionsSaving, setGiftOptionsSaving] = useState(false);

  const [pickupLocations, setPickupLocations] = useState<any[]>([]);
  const [pickupLocationsLoading, setPickupLocationsLoading] = useState(true);
  const [pickupDialog, setPickupDialog] = useState(false);
  const [pickupEditId, setPickupEditId] = useState<number | null>(null);
  const [pickupForm, setPickupForm] = useState({
    nameAr: '', nameEn: '', address: '', mapsUrl: '', phone: '', hours: '{}', instructions: '', isActive: true,
  });
  const [pickupSaving, setPickupSaving] = useState(false);
  const [sizeGuides, setSizeGuides] = useState<any[]>([]);
  const [sizeGuidesLoading, setSizeGuidesLoading] = useState(true);
  const [sizeGuideSaving, setSizeGuideSaving] = useState(false);
  const [sizeGuideEditId, setSizeGuideEditId] = useState<number | null>(null);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [sizeGuideForm, setSizeGuideForm] = useState({
    name: '',
    type: 'clothing',
    unit: 'cm',
    rowsText: 'المقاس,الصدر,الخصر,الأرداف\nS,86-91,71-76,86-91\nM,96-101,81-86,96-101\nL,106-111,91-96,106-111',
    categoryIds: [] as number[],
    productIdsText: '',
    isActive: true,
  });

  const [form, setForm] = useState({
    name: '', slug: '', description: '', status: 'active' as string,
    logoUrl: '', primaryColor: '#56a1e3', email: '', phone: '',
    seoTitle: '', seoDescription: '',
  });

  useEffect(() => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    settingsApi.get(storeId)
      .then((s) => {
        setStore(s);
        setForm({
          name: s.name ?? '', slug: s.slug ?? '', description: s.description ?? '',
          status: s.status ?? 'active', logoUrl: s.logoUrl ?? '', primaryColor: s.primaryColor ?? '#56a1e3',
          email: s.email ?? '', phone: s.phone ?? '',
          seoTitle: s.seoTitle ?? '', seoDescription: s.seoDescription ?? '',
        });
      })
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));
    settingsApi.getProductFeatures(storeId)
      .then(setFeatures)
      .catch(() => {})
      .finally(() => setFeaturesLoading(false));
    settingsApi.getGiftOptions(storeId)
      .then(data => setGiftOptions({
        giftWrapDefaultPrice: data.giftWrapDefaultPrice ?? '0',
        giftMessageMaxLength: data.giftMessageMaxLength ?? 250,
        giftWrapInstructions: data.giftWrapInstructions ?? null,
        pickupInstructions: data.pickupInstructions ?? null,
      }))
      .catch(() => {})
      .finally(() => setGiftOptionsLoading(false));
    settingsApi.listPickupLocations(storeId)
      .then(setPickupLocations)
      .catch(() => {})
      .finally(() => setPickupLocationsLoading(false));
    settingsApi.listSizeGuides(storeId)
      .then(setSizeGuides)
      .catch(() => {})
      .finally(() => setSizeGuidesLoading(false));
    categoriesApi.list(storeId)
      .then(setCategoriesList)
      .catch(() => {});
    settingsApi.getStoreConfig(storeId)
      .then(setStoreConfig)
      .catch(() => {})
      .finally(() => setStoreConfigLoading(false));
  }, [storeId, t]);

  const parseSizeGuideRows = (text: string) => {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim()).filter(Boolean);
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      return headers.reduce<Record<string, string>>((row, header, idx) => {
        row[header] = values[idx] ?? '';
        return row;
      }, {});
    });
  };

  const serializeSizeGuideRows = (rows: Array<Record<string, string>>) => {
    if (!rows.length) return '';
    const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
    return [headers.join(','), ...rows.map(row => headers.map(header => row[header] ?? '').join(','))].join('\n');
  };

  const resetSizeGuideForm = () => {
    setSizeGuideEditId(null);
    setSizeGuideForm({
      name: '',
      type: 'clothing',
      unit: 'cm',
      rowsText: 'المقاس,الصدر,الخصر,الأرداف\nS,86-91,71-76,86-91\nM,96-101,81-86,96-101\nL,106-111,91-96,106-111',
      categoryIds: [],
      productIdsText: '',
      isActive: true,
    });
  };

  const saveSizeGuide = async () => {
    if (!storeId) return;
    const rows = parseSizeGuideRows(sizeGuideForm.rowsText);
    if (!sizeGuideForm.name.trim() || rows.length === 0) {
      toast.error('أدخل اسم الدليل وجدول مقاسات صحيح');
      return;
    }
    setSizeGuideSaving(true);
    try {
      const payload = {
        name: sizeGuideForm.name,
        type: sizeGuideForm.type,
        unit: sizeGuideForm.unit,
        rows,
        categoryIds: sizeGuideForm.categoryIds,
        productIds: sizeGuideForm.productIdsText.split(/[,\s]+/).map(Number).filter(Boolean),
        isActive: sizeGuideForm.isActive,
      };
      const saved = sizeGuideEditId
        ? await settingsApi.updateSizeGuide(storeId, sizeGuideEditId, payload)
        : await settingsApi.createSizeGuide(storeId, payload);
      setSizeGuides(prev => sizeGuideEditId ? prev.map(g => g.id === saved.id ? saved : g) : [saved, ...prev]);
      resetSizeGuideForm();
      toast.success(t('settings.saved'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSizeGuideSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = t('settings.errNameRequired');
    if (!form.slug.trim()) errs.slug = t('settings.errSlugRequired');
    else if (!/^[a-z0-9-]+$/.test(form.slug)) errs.slug = t('settings.errSlugInvalid');
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('settings.errEmailInvalid');
    if (form.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(form.primaryColor)) errs.primaryColor = t('settings.errColorInvalid');
    if (form.seoTitle && form.seoTitle.length > 60) errs.seoTitle = t('settings.errSeoTitleLong');
    if (form.seoDescription && form.seoDescription.length > 160) errs.seoDescription = t('settings.errSeoDescLong');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async () => {
    if (!storeId || !validate()) {
      toast.error(t('settings.fixErrors'));
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: form.name, slug: form.slug, description: form.description || undefined,
        status: form.status, logoUrl: form.logoUrl || undefined, primaryColor: form.primaryColor || undefined,
        email: form.email || undefined, phone: form.phone || undefined,
        seoTitle: form.seoTitle || undefined, seoDescription: form.seoDescription || undefined,
      };
      const updated = await settingsApi.update(storeId, data);
      setStore(updated);
      toast.success(t('settings.saved'));
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.message.includes('slug') || err.code === 'CONFLICT') {
          toast.error(t('settings.errSlugTaken'));
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error(t('common.error'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-neutral-900">{t('settings.title')}</h1>
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">{t('settings.title')}</h1>
        {form.slug && (
          <a href={`http://localhost:5174/s/${form.slug}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 text-sm font-medium rounded-xl hover:bg-primary-100 transition-colors">
            <ExternalLink className="h-4 w-4" />
            {t('settings.viewStore', 'عرض المتجر')}
          </a>
        )}
      </div>

      {storeId && <ReadinessChecklist storeId={storeId} />}

      <Tabs defaultValue="info">
        <TabsList className="flex-wrap">
          <TabsTrigger value="info" className="gap-1"><Store className="h-3.5 w-3.5" />{t('settings.sectionInfo')}</TabsTrigger>
          <TabsTrigger value="contact" className="gap-1"><Phone className="h-3.5 w-3.5" />{t('settings.sectionContact')}</TabsTrigger>
          <TabsTrigger value="general" className="gap-1"><SettingsIcon className="h-3.5 w-3.5" />{t('settings.sectionGeneral')}</TabsTrigger>
          <TabsTrigger value="payment" className="gap-1"><CreditCard className="h-3.5 w-3.5" />{t('settings.sectionPayment')}</TabsTrigger>
          <TabsTrigger value="shipping" className="gap-1"><Truck className="h-3.5 w-3.5" />{t('settings.sectionShipping')}</TabsTrigger>
          <TabsTrigger value="wallet" className="gap-1"><Wallet className="h-3.5 w-3.5" />{t('settings.sectionWallet')}</TabsTrigger>
          <TabsTrigger value="features" className="gap-1"><Eye className="h-3.5 w-3.5" />{t('settings.sectionFeatures', 'ميزات المنتج')}</TabsTrigger>
          <TabsTrigger value="sizes" className="gap-1"><Ruler className="h-3.5 w-3.5" />دليل المقاسات</TabsTrigger>
          <TabsTrigger value="gift" className="gap-1"><Gift className="h-3.5 w-3.5" />{t('settings.sectionGift', 'الهدايا')}</TabsTrigger>
          <TabsTrigger value="pickup" className="gap-1"><Package className="h-3.5 w-3.5" />{t('settings.sectionPickup', 'الاستلام')}</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
            <SectionHeader title={t('settings.sectionInfo')} description={t('settings.sectionInfoDesc')} />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('settings.storeName')} <span className="text-red-500">*</span></Label>
                <Input value={form.name} onChange={e => updateField('name', e.target.value)} className="h-9 text-sm" />
                <FieldError message={errors.name} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('settings.storeSlug')} <span className="text-red-500">*</span></Label>
                <Input value={form.slug} onChange={e => updateField('slug', e.target.value)} dir="ltr" className="text-left h-9 text-sm" />
                <p className="text-xs text-neutral-400">{t('settings.slugHint')}</p>
                <FieldError message={errors.slug} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('settings.status')}</Label>
                <Select value={form.status} onValueChange={v => updateField('status', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('settings.storeActive')}</SelectItem>
                    <SelectItem value="inactive">{t('settings.storeInactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('settings.description')}</Label>
                <textarea className="flex h-20 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" value={form.description} onChange={e => updateField('description', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('settings.logoUrl')}</Label>
                <div className="flex items-center gap-3">
                  {form.logoUrl && (
                    <img src={form.logoUrl} alt="Logo" className="h-12 w-12 rounded-xl object-cover bg-neutral-100 border border-neutral-200" onError={handleImageError} />
                  )}
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-600 cursor-pointer hover:bg-neutral-50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const maxSize = 5 * 1024 * 1024;
                        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
                        if (!allowedTypes.includes(file.type)) {
                          toast.error(t('settings.invalidFileType', 'نوع الملف غير مدعوم. يرجى اختيار صورة'));
                          return;
                        }
                        if (file.size > maxSize) {
                          toast.error(t('settings.fileTooLarge', 'حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت'));
                          return;
                        }
                        if (storeId) {
                          try {
                            const result = await uploadFile(storeId, file);
                            updateField('logoUrl', result.url);
                            toast.success(t('settings.logoUploaded', 'تم رفع الشعار بنجاح'));
                          } catch { toast.error(t('settings.logoUploadFailed', 'فشل رفع الشعار')); }
                        }
                      }}
                    />
                    {t('settings.chooseImage', 'اختر صورة')}
                  </label>
                  {form.logoUrl && (
                    <button onClick={() => updateField('logoUrl', '')} className="text-xs text-red-500 hover:text-red-600">
                      {t('settings.remove', 'إزالة')}
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('settings.primaryColor')}</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.primaryColor} onChange={e => updateField('primaryColor', e.target.value)} className="h-9 w-9 rounded-xl border cursor-pointer" />
                  <Input value={form.primaryColor} onChange={e => updateField('primaryColor', e.target.value)} dir="ltr" className="text-left flex-1 h-9 text-sm" />
                </div>
                <FieldError message={errors.primaryColor} />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
            <SectionHeader title={t('settings.sectionSeo')} description={t('settings.sectionSeoDesc')} />
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('settings.seoTitle')}</Label>
                <Input value={form.seoTitle} onChange={e => updateField('seoTitle', e.target.value)} maxLength={60} className="h-9 text-sm" />
                <p className="text-xs text-neutral-400">{(form.seoTitle?.length ?? 0)}/60</p>
                <FieldError message={errors.seoTitle} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('settings.seoDescription')}</Label>
                <textarea className="flex h-20 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" value={form.seoDescription} onChange={e => updateField('seoDescription', e.target.value)} maxLength={160} />
                <p className="text-xs text-neutral-400">{(form.seoDescription?.length ?? 0)}/160</p>
                <FieldError message={errors.seoDescription} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
            <SectionHeader title={t('settings.sectionContact')} description={t('settings.sectionContactDesc')} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('settings.phone')}</Label>
                <Input value={form.phone} onChange={e => updateField('phone', e.target.value)} dir="ltr" className="text-left h-9 text-sm" placeholder="+966..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('settings.email')}</Label>
                <Input value={form.email} onChange={e => updateField('email', e.target.value)} dir="ltr" className="text-left h-9 text-sm" placeholder="store@example.com" />
                <FieldError message={errors.email} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-400"><Globe className="h-4 w-4" /></div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-neutral-900">{t('settings.socialPlaceholder')}</p>
                    <p className="text-sm text-neutral-400 mt-1">{t('settings.socialLinksHint', 'تعديل روابط التواصل من محرر الثيم')}</p>
                    <a href="/theme" className="inline-flex items-center gap-1 text-sm text-blue-500 hover:underline mt-2">
                      {t('settings.openThemeEditor', 'فتح محرر الثيم')} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
              {storeConfigLoading ? (
                <Skeleton className="h-28 rounded-3xl" />
              ) : (
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-400"><MapPin className="h-4 w-4" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-neutral-900 mb-2">{t('settings.addressPlaceholder')}</p>
                      <div className="space-y-2">
                        <input type="text" value={storeConfig.city ?? ''}
                          onChange={e => setStoreConfig(p => ({ ...p, city: e.target.value || null }))}
                          className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder={t('settings.cityPlaceholder', 'المدينة')} />
                        <input type="text" value={storeConfig.district ?? ''}
                          onChange={e => setStoreConfig(p => ({ ...p, district: e.target.value || null }))}
                          className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder={t('settings.districtPlaceholder', 'الحي')} />
                        <input type="text" value={storeConfig.street ?? ''}
                          onChange={e => setStoreConfig(p => ({ ...p, street: e.target.value || null }))}
                          className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder={t('settings.streetPlaceholder', 'الشارع')} />
                        <input type="text" value={storeConfig.postalCode ?? ''}
                          onChange={e => setStoreConfig(p => ({ ...p, postalCode: e.target.value || null }))}
                          className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder={t('settings.postalCodePlaceholder', 'الرمز البريدي')} />
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => settingsApi.getStoreConfig(storeId!).then(setStoreConfig)}>
                          {t('common.cancel')}
                        </Button>
                        <PermissionGate permission="settings:update"><Button size="sm" className="h-7 text-xs" onClick={async () => {
                          if (!storeId) return;
                          try {
                            const updated = await settingsApi.updateStoreConfig(storeId, {
                              city: storeConfig.city, district: storeConfig.district,
                              street: storeConfig.street, postalCode: storeConfig.postalCode,
                            });
                            setStoreConfig(prev => ({ ...prev, ...updated }));
                            toast.success(t('settings.saved'));
                          } catch { toast.error(t('common.error')); }
                        }}>
                          {t('common.save')}
                        </Button></PermissionGate>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
            <SectionHeader title={t('settings.sectionGeneral')} description={t('settings.sectionGeneralDesc')} />
            {storeConfigLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-400"><MessageCircle className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm text-neutral-900">{t('settings.welcomeMessage')}</p>
                      <label className="flex items-center gap-2 text-xs text-neutral-500 cursor-pointer shrink-0">
                        <input type="checkbox" checked={storeConfig.welcomeMessageEnabled}
                          onChange={e => setStoreConfig(p => ({ ...p, welcomeMessageEnabled: e.target.checked }))}
                          className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                        {t('common.enabled', 'مفعل')}
                      </label>
                    </div>
                    <textarea value={storeConfig.welcomeMessage ?? ''}
                      onChange={e => setStoreConfig(p => ({ ...p, welcomeMessage: e.target.value || null }))}
                      className="mt-2 w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      rows={2} maxLength={500}
                      placeholder={t('settings.welcomeMessagePlaceholder', 'رسالة ترحيبية تظهر للعملاء...')} />
                    <p className="text-xs text-neutral-400 mt-1">{t('settings.welcomeMessageHint', 'تظهر في صفحة المتجر الرئيسية')}</p>
                  </div>
                </div>

                <hr className="border-neutral-100" />

                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-400"><Clock className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm text-neutral-900">{t('settings.prepTime')}</p>
                      <label className="flex items-center gap-2 text-xs text-neutral-500 cursor-pointer shrink-0">
                        <input type="checkbox" checked={storeConfig.preparationTimeEnabled}
                          onChange={e => setStoreConfig(p => ({ ...p, preparationTimeEnabled: e.target.checked }))}
                          className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                        {t('common.enabled', 'مفعل')}
                      </label>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <input type="number" min={0} max={365} value={storeConfig.preparationTime}
                        onChange={e => setStoreConfig(p => ({ ...p, preparationTime: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-20 border border-neutral-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      <span className="text-sm text-neutral-500">{t('settings.prepTimeUnit', 'أيام')}</span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">{t('settings.prepTimeHint', 'الوقت المتوقع لتجهيز الطلب قبل الشحن')}</p>
                  </div>
                </div>

                <hr className="border-neutral-100" />

                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-400"><ShoppingCart className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm text-neutral-900">{t('settings.minOrder')}</p>
                      <label className="flex items-center gap-2 text-xs text-neutral-500 cursor-pointer shrink-0">
                        <input type="checkbox" checked={storeConfig.minOrderEnabled}
                          onChange={e => setStoreConfig(p => ({ ...p, minOrderEnabled: e.target.checked }))}
                          className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                        {t('common.enabled', 'مفعل')}
                      </label>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <input type="number" min={0} step={0.01} value={Number(storeConfig.minOrderAmount)}
                        onChange={e => setStoreConfig(p => ({ ...p, minOrderAmount: e.target.value || '0' }))}
                        className="w-24 border border-neutral-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      <span className="text-sm text-neutral-500">SAR</span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">{t('settings.minOrderHint', 'الحد الأدنى لقيمة الطلب ليتم تأكيده')}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-neutral-100">
              <Button variant="outline" className="h-9 text-sm" onClick={() => settingsApi.getStoreConfig(storeId!).then(setStoreConfig)}>
                {t('common.cancel')}
              </Button>
              <PermissionGate permission="settings:update"><Button className="h-9 text-sm" disabled={storeConfigSaving || storeConfigLoading} onClick={async () => {
                if (!storeId) return;
                setStoreConfigSaving(true);
                try {
                  const updated = await settingsApi.updateStoreConfig(storeId, storeConfig);
                  setStoreConfig(updated);
                  toast.success(t('settings.saved'));
                } catch { toast.error(t('common.error')); }
                finally { setStoreConfigSaving(false); }
              }}>
                {storeConfigSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {storeConfigSaving ? t('common.saving') : t('common.save')}
              </Button></PermissionGate>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <PaymentStatusSection />
        </TabsContent>

        <TabsContent value="shipping" className="space-y-4">
          <div className="bg-blue-50/50 border border-blue-200/50 rounded-3xl p-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-bold">{t('settings.shippingInfoTitle')}</p>
                <p className="text-sm mt-1">{t('settings.shippingInfoDesc')}</p>
                <a href="/shipping" className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline mt-2">
                  {t('settings.goToShipping')} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="wallet" className="space-y-4">
          <div className="bg-amber-50/50 border border-amber-200/50 rounded-3xl p-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-bold">{t('settings.walletDisabledTitle')}</p>
                <p className="text-sm mt-1">{t('settings.walletDisabledDesc')}</p>
                <a href="/wallet" className="inline-flex items-center gap-1 text-sm text-amber-700 hover:underline mt-2">
                  {t('settings.goToWallet')} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="features" className="space-y-4">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
            <SectionHeader title={t('settings.sectionFeatures', 'ميزات صفحة المنتج')} description={t('settings.sectionFeaturesDesc', 'تحكم في إظهار وإخفاء ميزات صفحة عرض المنتج في المتجر')} />
            {featuresLoading ? (
              <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}</div>
            ) : (
              <div className="space-y-1">
                {Object.entries(features).map(([key, value]) => (
                  <label key={key} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      {value ? <Eye className="h-4 w-4 text-primary-500" /> : <EyeOff className="h-4 w-4 text-neutral-300" />}
                      <span className="text-sm text-neutral-700">{t(`settings.feature_${key}`, key)}</span>
                    </div>
                    <div className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${value ? 'bg-primary-500' : 'bg-neutral-200'}`}
                      onClick={() => setFeatures(p => ({ ...p, [key]: !p[key] }))}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-neutral-100">
              <Button variant="outline" className="h-9 text-sm" onClick={() => settingsApi.getProductFeatures(storeId!).then(setFeatures)}>{t('common.cancel')}</Button>
              <PermissionGate permission="settings:update"><Button className="h-9 text-sm" disabled={featuresSaving || featuresLoading} onClick={async () => {
                setFeaturesSaving(true);
                try {
                  await settingsApi.updateProductFeatures(storeId!, features);
                  toast.success(t('settings.saved'));
                } catch { toast.error(t('common.error')); }
                finally { setFeaturesSaving(false); }
              }}>
                {featuresSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {featuresSaving ? t('common.saving') : t('common.save')}
              </Button></PermissionGate>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sizes" className="space-y-4">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
            <SectionHeader title="دليل المقاسات" description="أنشئ جداول مقاسات واربطها بتصنيفات الملابس أو منتجات محددة. لن يظهر زر دليل المقاسات إلا عند وجود دليل مرتبط." />
            <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4">
              <div className="space-y-4 rounded-2xl border border-neutral-100 bg-white p-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-neutral-500">اسم الدليل</Label>
                  <Input value={sizeGuideForm.name} onChange={e => setSizeGuideForm(p => ({ ...p, name: e.target.value }))} className="h-9 text-sm" placeholder="مثال: مقاسات الملابس النسائية" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-neutral-500">النوع</Label>
                    <Select value={sizeGuideForm.type} onValueChange={v => setSizeGuideForm(p => ({ ...p, type: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clothing">ملابس</SelectItem>
                        <SelectItem value="shoes">أحذية</SelectItem>
                        <SelectItem value="custom">مخصص</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-neutral-500">الوحدة</Label>
                    <Select value={sizeGuideForm.unit} onValueChange={v => setSizeGuideForm(p => ({ ...p, unit: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cm">cm</SelectItem>
                        <SelectItem value="in">in</SelectItem>
                        <SelectItem value="eu">EU</SelectItem>
                        <SelectItem value="uk">UK</SelectItem>
                        <SelectItem value="us">US</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-neutral-500">الجدول CSV</Label>
                  <textarea
                    className="flex min-h-36 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-mono text-left direction-ltr focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    dir="ltr"
                    value={sizeGuideForm.rowsText}
                    onChange={e => setSizeGuideForm(p => ({ ...p, rowsText: e.target.value }))}
                  />
                  <p className="text-xs text-neutral-400">السطر الأول عناوين الأعمدة، وكل سطر بعده مقاس.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-neutral-500">التصنيفات المرتبطة</Label>
                  <div className="flex flex-wrap gap-2">
                    {categoriesList.map(cat => {
                      const selected = sizeGuideForm.categoryIds.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSizeGuideForm(p => ({
                            ...p,
                            categoryIds: selected ? p.categoryIds.filter(id => id !== cat.id) : [...p.categoryIds, cat.id],
                          }))}
                          className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${selected ? 'bg-blue-500 text-white border-blue-500' : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-700'}`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-neutral-500">منتجات محددة (اختياري)</Label>
                  <Input value={sizeGuideForm.productIdsText} onChange={e => setSizeGuideForm(p => ({ ...p, productIdsText: e.target.value }))} className="h-9 text-sm" dir="ltr" placeholder="مثال: 12, 18, 24" />
                </div>
                <label className="flex items-center gap-2 text-sm text-neutral-600">
                  <input type="checkbox" checked={sizeGuideForm.isActive} onChange={e => setSizeGuideForm(p => ({ ...p, isActive: e.target.checked }))} className="h-4 w-4 rounded border-neutral-300" />
                  نشط
                </label>
                <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
                  {sizeGuideEditId && <Button variant="outline" className="h-9 text-sm" onClick={resetSizeGuideForm}>إلغاء التعديل</Button>}
                  <PermissionGate permission="settings:update"><Button className="h-9 text-sm" onClick={saveSizeGuide} disabled={sizeGuideSaving}>
                    {sizeGuideSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {sizeGuideEditId ? 'تحديث الدليل' : 'إضافة الدليل'}
                  </Button></PermissionGate>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-100 bg-white overflow-hidden">
                {sizeGuidesLoading ? (
                  <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}</div>
                ) : sizeGuides.length === 0 ? (
                  <div className="p-12 text-center text-sm text-neutral-500">لا توجد أدلة مقاسات بعد</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-neutral-100 hover:bg-transparent">
                        <TableHead className="h-10 text-sm text-neutral-500">الدليل</TableHead>
                        <TableHead className="h-10 text-sm text-neutral-500">الربط</TableHead>
                        <TableHead className="h-10 text-sm text-neutral-500">الحالة</TableHead>
                        <TableHead className="w-24 h-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sizeGuides.map(guide => (
                        <TableRow key={guide.id} className="border-neutral-100 hover:bg-neutral-50">
                          <TableCell className="p-3">
                            <p className="text-sm font-medium text-neutral-900">{guide.name}</p>
                            <p className="text-xs text-neutral-400">{guide.type} · {guide.unit} · {guide.rows?.length ?? 0} صف</p>
                          </TableCell>
                          <TableCell className="p-3 text-xs text-neutral-500">
                            {guide.categoryIds?.length ?? 0} تصنيف · {guide.productIds?.length ?? 0} منتج
                          </TableCell>
                          <TableCell className="p-3">
                            <Badge variant={guide.isActive ? 'success' : 'secondary'} className="text-xs">{guide.isActive ? 'نشط' : 'غير نشط'}</Badge>
                          </TableCell>
                          <TableCell className="p-3">
                            <div className="flex gap-1">
                              <PermissionGate permission="settings:update"><Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => {
                                setSizeGuideEditId(guide.id);
                                setSizeGuideForm({
                                  name: guide.name ?? '',
                                  type: guide.type ?? 'clothing',
                                  unit: guide.unit ?? 'cm',
                                  rowsText: serializeSizeGuideRows(guide.rows ?? []),
                                  categoryIds: guide.categoryIds ?? [],
                                  productIdsText: (guide.productIds ?? []).join(', '),
                                  isActive: guide.isActive,
                                });
                              }}>
                                <Edit className="h-4 w-4" />
                              </Button></PermissionGate>
                              <PermissionGate permission="settings:update"><Button variant="ghost" size="icon" className="h-11 w-11 text-red-500" onClick={async () => {
                                if (!storeId || !confirm('حذف دليل المقاسات؟')) return;
                                try {
                                  await settingsApi.deleteSizeGuide(storeId, guide.id);
                                  setSizeGuides(p => p.filter(g => g.id !== guide.id));
                                  toast.success(t('common.deleted'));
                                } catch {
                                  toast.error(t('common.error'));
                                }
                              }}>
                                <Trash2 className="h-4 w-4" />
                              </Button></PermissionGate>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Gift Tab */}
        <TabsContent value="gift" className="space-y-4">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
            <SectionHeader title={t('settings.sectionGift', 'الهدايا والتغليف')} description={t('settings.sectionGiftDesc', 'إعدادات تغليف الهدايا وإرسالها')} />
            {!features.giftWrap && !features.sendAsGift ? (
              <div className="p-4 bg-amber-50 text-amber-700 rounded-2xl text-sm">
                <AlertTriangle className="h-4 w-4 inline ml-1" />
                {t('settings.giftDisabledHint', 'فعّل خيار تغليف الهدايا أو إرسال كهدية من تبويب الميزات لاستخدام هذه الإعدادات')}
              </div>
            ) : giftOptionsLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-neutral-500">{t('settings.giftWrapDefaultPrice', 'سعر التغليف الافتراضي')} (SAR)</Label>
                    <Input type="number" min="0" value={giftOptions.giftWrapDefaultPrice}
                      onChange={e => setGiftOptions(p => ({ ...p, giftWrapDefaultPrice: e.target.value }))}
                      className="h-9 text-sm" dir="ltr" />
                    <p className="text-xs text-neutral-400">{t('settings.giftWrapDefaultPriceDesc', 'السعر الذي ستُحتسب تلقائيًا عند اختيار تغليف الهدية')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-neutral-500">{t('settings.giftMessageMaxLength', 'الحد الأقصى لأحرف رسالة الهدية')}</Label>
                    <Input type="number" min="1" max="1000" value={giftOptions.giftMessageMaxLength}
                      onChange={e => setGiftOptions(p => ({ ...p, giftMessageMaxLength: Number(e.target.value) }))}
                      className="h-9 text-sm" dir="ltr" />
                    <p className="text-xs text-neutral-400">{t('settings.giftMessageMaxLengthDesc', 'أقصى عدد أحرف مسموح به في رسالة الهدية')}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-neutral-500">{t('settings.giftWrapInstructions', 'تعليمات التغليف')}</Label>
                  <textarea className="flex h-20 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={giftOptions.giftWrapInstructions ?? ''}
                    onChange={e => setGiftOptions(p => ({ ...p, giftWrapInstructions: e.target.value || null }))}
                    placeholder={t('settings.giftWrapInstructionsPlaceholder', 'سيتم تغليف الطلب كهدية مناسبة...')} />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                  <Button variant="outline" className="h-9 text-sm"
                    onClick={() => settingsApi.getGiftOptions(storeId!).then(setGiftOptions)}>
                    {t('common.cancel')}
                  </Button>
                  <PermissionGate permission="settings:update"><Button className="h-9 text-sm" disabled={giftOptionsSaving || giftOptionsLoading}
                    onClick={async () => {
                      setGiftOptionsSaving(true);
                      try {
                        await settingsApi.updateGiftOptions(storeId!, {
                          giftWrapDefaultPrice: Number(giftOptions.giftWrapDefaultPrice),
                          giftMessageMaxLength: giftOptions.giftMessageMaxLength,
                          giftWrapInstructions: giftOptions.giftWrapInstructions,
                          pickupInstructions: giftOptions.pickupInstructions,
                        });
                        toast.success(t('settings.saved'));
                      } catch { toast.error(t('common.error')); }
                      finally { setGiftOptionsSaving(false); }
                    }}>
                    {giftOptionsSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {giftOptionsSaving ? t('common.saving') : t('common.save')}
                  </Button></PermissionGate>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Pickup Tab */}
        <TabsContent value="pickup" className="space-y-4">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader title={t('settings.sectionPickup', 'الاستلام من الفرع')} description={t('settings.sectionPickupDesc', 'إدارة فروع الاستلام وأوقات الدوام')} />
              <PermissionGate permission="settings:update"><Button onClick={() => {
                setPickupEditId(null);
                setPickupForm({ nameAr: '', nameEn: '', address: '', mapsUrl: '', phone: '', hours: '{}', instructions: '', isActive: true });
                setPickupDialog(true);
              }} className="h-9 text-sm"><Plus className="h-4 w-4 mr-2" />{t('settings.createPickup', 'إضافة فرع')}</Button></PermissionGate>
            </div>
            {pickupLocationsLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}</div>
            ) : pickupLocations.length === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-flex p-4 rounded-2xl bg-neutral-100 mb-4"><MapPin className="h-8 w-8 text-neutral-400" /></div>
                <p className="text-sm text-neutral-500">{t('settings.noPickupLocations', 'لا توجد فروع')}</p>
                <p className="text-xs text-neutral-400 mt-1">{t('settings.noPickupLocationsHint', 'أضف فرعًا للسماح بخيار الاستلام من الفرع')}</p>
              </div>
            ) : (
              <div className="bg-white/80 rounded-3xl border border-neutral-100 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-neutral-100 hover:bg-transparent">
                      <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('settings.pickupNameAr', 'اسم الفرع')}</TableHead>
                      <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('settings.pickupAddress', 'العنوان')}</TableHead>
                      <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('settings.pickupIsActive', 'نشط')}</TableHead>
                      <TableHead className="w-24 h-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pickupLocations.map(loc => (
                      <TableRow key={loc.id} className="border-neutral-100 hover:bg-neutral-50">
                        <TableCell className="text-sm font-medium text-neutral-900 p-3">{loc.nameAr}</TableCell>
                        <TableCell className="text-sm text-neutral-400 p-3">{loc.address ?? '-'}</TableCell>
                        <TableCell className="p-3">
                          <Badge variant={loc.isActive ? 'success' : 'secondary'} className="text-xs">
                            {loc.isActive ? t('settings.pickupActive', 'نشط') : t('settings.pickupInactive', 'غير نشط')}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-3">
                          <div className="flex gap-1">
                            <PermissionGate permission="settings:update"><Button variant="ghost" size="icon" className="h-11 w-11"
                              onClick={() => {
                                setPickupEditId(loc.id);
                                setPickupForm({
                                  nameAr: loc.nameAr ?? '',
                                  nameEn: loc.nameEn ?? '',
                                  address: loc.address ?? '',
                                  mapsUrl: loc.mapsUrl ?? '',
                                  phone: loc.phone ?? '',
                                  hours: JSON.stringify(loc.hours ?? {}),
                                  instructions: loc.instructions ?? '',
                                  isActive: loc.isActive,
                                });
                                setPickupDialog(true);
                              }}>
                              <Edit className="h-4 w-4" />
                            </Button></PermissionGate>
                            <PermissionGate permission="settings:update"><Button variant="ghost" size="icon" className="h-11 w-11 text-red-500"
                              onClick={async () => {
                                if (!confirm(t('settings.confirmDeletePickup', 'هل أنت متأكد من حذف هذا الفرع؟'))) return;
                                try {
                                  await settingsApi.deletePickupLocation(storeId!, loc.id);
                                  setPickupLocations(p => p.filter(l => l.id !== loc.id));
                                  toast.success(t('common.deleted'));
                                } catch { toast.error(t('common.error')); }
                              }}>
                              <Trash2 className="h-4 w-4" />
                            </Button></PermissionGate>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {/* Pickup Instructions */}
            <div className="mt-4 space-y-1.5">
              <Label className="text-sm text-neutral-500">{t('settings.pickupInstructions', 'تعليمات الاستلام')}</Label>
              <textarea className="flex h-20 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={giftOptions.pickupInstructions ?? ''}
                onChange={e => setGiftOptions(p => ({ ...p, pickupInstructions: e.target.value || null }))}
                placeholder={t('settings.pickupInstructionsPlaceholder', 'يرجى إحضار رقم الطلب عند الاستلام...')} />
              <div className="flex justify-end">
                <PermissionGate permission="settings:update"><Button className="h-8 text-xs mt-1" size="sm" disabled={giftOptionsSaving}
                  onClick={async () => {
                    setGiftOptionsSaving(true);
                    try {
                      await settingsApi.updateGiftOptions(storeId!, {
                        giftWrapDefaultPrice: Number(giftOptions.giftWrapDefaultPrice),
                        giftMessageMaxLength: giftOptions.giftMessageMaxLength,
                        giftWrapInstructions: giftOptions.giftWrapInstructions,
                        pickupInstructions: giftOptions.pickupInstructions,
                      });
                      toast.success(t('settings.saved'));
                    } catch { toast.error(t('common.error')); }
                    finally { setGiftOptionsSaving(false); }
                  }}>
                  {giftOptionsSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {t('common.save')}
                </Button></PermissionGate>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Publish Gate Section */}
      <PublishSection storeId={storeId} />

      <div className="flex justify-end gap-3 sticky bottom-4 bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-white/50 shadow-card">
        <Button variant="outline" className="h-9 text-sm" onClick={() => {
          if (store) {
            setForm({
              name: store.name ?? '', slug: store.slug ?? '', description: store.description ?? '',
              status: store.status ?? 'active', logoUrl: store.logoUrl ?? '', primaryColor: store.primaryColor ?? '#56a1e3',
              email: store.email ?? '', phone: store.phone ?? '',
              seoTitle: store.seoTitle ?? '', seoDescription: store.seoDescription ?? '',
            });
            setErrors({});
          }
        }}>{t('common.cancel')}</Button>
        <PermissionGate permission="settings:update"><Button className="h-9 text-sm" onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {saving ? t('common.loading') : t('common.save')}
        </Button></PermissionGate>
      </div>

      {/* Pickup Location Dialog */}
      <Dialog open={pickupDialog} onOpenChange={setPickupDialog}>
        <DialogContent className="max-w-lg bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900">
              {pickupEditId ? t('settings.editPickup', 'تعديل الفرع') : t('settings.createPickup', 'إضافة فرع')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('settings.pickupNameAr', 'اسم الفرع (عربي)')} <span className="text-red-500">*</span></Label>
                <Input value={pickupForm.nameAr} onChange={e => setPickupForm(p => ({ ...p, nameAr: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('settings.pickupNameEn', 'اسم الفرع (إنجليزي)')}</Label>
                <Input value={pickupForm.nameEn} onChange={e => setPickupForm(p => ({ ...p, nameEn: e.target.value }))} className="h-9 text-sm" dir="ltr" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-500">{t('settings.pickupAddress', 'العنوان')}</Label>
              <Input value={pickupForm.address} onChange={e => setPickupForm(p => ({ ...p, address: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-500">{t('settings.pickupMapsUrl', 'رابط خرائط Google')}</Label>
              <Input value={pickupForm.mapsUrl} onChange={e => setPickupForm(p => ({ ...p, mapsUrl: e.target.value }))} className="h-9 text-sm" dir="ltr" placeholder="https://maps.google.com/..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-500">{t('settings.pickupPhone', 'رقم التواصل')}</Label>
              <Input value={pickupForm.phone} onChange={e => setPickupForm(p => ({ ...p, phone: e.target.value }))} className="h-9 text-sm" dir="ltr" placeholder="05xxxxxxxx" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-500">{t('settings.pickupHours', 'أوقات الدوام')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(day => {
                  const hours = (() => { try { return JSON.parse(pickupForm.hours); } catch { return {}; } })();
                  return (
                    <div key={day} className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400 w-12">{t(`settings.pickup${day.charAt(0).toUpperCase() + day.slice(1)}`, day)}</span>
                      <Input value={hours[day] ?? ''}
                        onChange={e => {
                          const h = { ...(JSON.parse(pickupForm.hours) || {}), [day]: e.target.value };
                          setPickupForm(p => ({ ...p, hours: JSON.stringify(h) }));
                        }}
                        className="h-8 text-xs" placeholder={t('settings.pickupHoursPlaceholder', '09:00-22:00')} />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-500">{t('settings.pickupInstructions', 'تعليمات الاستلام')}</Label>
              <textarea className="flex h-20 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={pickupForm.instructions} onChange={e => setPickupForm(p => ({ ...p, instructions: e.target.value }))}
                placeholder={t('settings.pickupInstructionsPlaceholder', 'يرجى إحضار رقم الطلب عند الاستلام...')} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="pickupIsActive" checked={pickupForm.isActive}
                onChange={e => setPickupForm(p => ({ ...p, isActive: e.target.checked }))}
                className="rounded border-neutral-300 h-4 w-4" />
              <Label htmlFor="pickupIsActive" className="cursor-pointer text-sm text-neutral-500">{t('settings.pickupIsActive', 'نشط')}</Label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="outline" className="h-9 text-sm" onClick={() => setPickupDialog(false)}>{t('common.cancel')}</Button>
            <PermissionGate permission="settings:update"><Button className="h-9 text-sm" disabled={pickupSaving || !pickupForm.nameAr.trim()}
              onClick={async () => {
                if (!pickupForm.nameAr.trim()) { toast.error(t('common.required')); return; }
                setPickupSaving(true);
                try {
                  const data = {
                    nameAr: pickupForm.nameAr,
                    nameEn: pickupForm.nameEn || null,
                    address: pickupForm.address || null,
                    mapsUrl: pickupForm.mapsUrl || null,
                    phone: pickupForm.phone || null,
                    hours: JSON.parse(pickupForm.hours),
                    instructions: pickupForm.instructions || null,
                    isActive: pickupForm.isActive,
                  };
                  if (pickupEditId) {
                    const updated = await settingsApi.updatePickupLocation(storeId!, pickupEditId, data);
                    setPickupLocations(p => p.map(l => l.id === pickupEditId ? updated : l));
                    toast.success(t('shipping.updated'));
                  } else {
                    const created = await settingsApi.createPickupLocation(storeId!, data);
                    setPickupLocations(p => [...p, created]);
                    toast.success(t('shipping.created'));
                  }
                  setPickupDialog(false);
                } catch (err) {
                  toast.error(err instanceof ApiClientError ? err.message : t('common.error'));
                } finally { setPickupSaving(false); }
              }}>
              {pickupSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {pickupSaving ? t('common.saving') : t('common.save')}
            </Button></PermissionGate>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
