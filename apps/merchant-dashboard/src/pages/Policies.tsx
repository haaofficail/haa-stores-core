import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Edit3, CheckCircle2, Loader2, AlertTriangle, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClientError, policiesApi } from '@/lib/api';

const POLICY_TYPES = ['privacy', 'terms', 'shipping', 'returns', 'about'] as const;

const typeIcons: Record<string, React.ReactNode> = {
  privacy: <FileText className="h-10 w-10 text-blue-500" />,
  terms: <FileText className="h-10 w-10 text-amber-500" />,
  shipping: <FileText className="h-10 w-10 text-green-500" />,
  returns: <FileText className="h-10 w-10 text-red-500" />,
  about: <FileText className="h-10 w-10 text-purple-500" />,
};

export default function Policies() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [policies, setPolicies] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [editType, setEditType] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const [showGenerator, setShowGenerator] = useState(false);
  const [generatorInput, setGeneratorInput] = useState({
    storeName: '',
    legalName: '',
    commercialRegistrationNumber: '',
    vatNumber: '',
    supportEmail: '',
    supportPhone: '',
    businessAddress: '',
    paymentMethods: [] as string[],
    shippingMethods: [] as string[],
    shippingFee: 0,
    freeShippingThreshold: 0,
    deliveryMinDays: 3,
    deliveryMaxDays: 7,
    returnWindowDays: null as number | null,
    refundProcessingDays: 7,
    excludedReturnCategories: [] as string[],
    carriers: [] as string[],
    privacyContactEmail: '',
    delayCancellationNotice: null as string | null,
  });
  const [generating, setGenerating] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [applying, setApplying] = useState(false);

  const loadPolicies = useCallback(() => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setFetchError(false);
    policiesApi.list(storeId)
      .then((data) => {
        const map: Record<string, any> = {};
        data.forEach((p: any) => { map[p.type] = p; });
        setPolicies(map);
      })
      .catch(() => { setFetchError(true); toast.error(t('common.error')); })
      .finally(() => setLoading(false));
  }, [storeId, t]);

  useEffect(() => { loadPolicies(); }, [loadPolicies]);

  const openEdit = async (type: string) => {
    try {
      const policy = await policiesApi.getByType(storeId!, type);
      setEditType(type);
      setEditTitle(policy.title ?? '');
      setEditContent(policy.content ?? '');
    } catch {
      toast.error(t('common.error'));
      setEditType(type);
      setEditTitle(t(`policies.type_${type}`));
      setEditContent('');
    }
  };

  const closeEdit = () => {
    setEditType(null);
    setEditTitle('');
    setEditContent('');
  };

  const save = async () => {
    if (!storeId || !editType) return;
    setSaving(true);
    try {
      await policiesApi.upsert(storeId, editType, { title: editTitle, content: editContent });
      toast.success(t('policies.saved'));
      closeEdit();
      loadPolicies();
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error(t('common.error'));
      }
    } finally { setSaving(false); }
  };

  const togglePublish = async (type: string, currentlyPublished: boolean) => {
    if (!storeId) return;
    setToggling(type);
    try {
      if (currentlyPublished) {
        await policiesApi.unpublish(storeId, type);
        toast.success(t('policies.unpublished'));
      } else {
        await policiesApi.publish(storeId, type);
        toast.success(t('policies.published'));
      }
      loadPolicies();
    } catch {
      toast.error(t('common.error'));
    } finally { setToggling(null); }
  };

  const handleGeneratePreview = async () => {
    if (!storeId) return;
    setGenerating(true);
    try {
      const result = await policiesApi.generatePreview(storeId, generatorInput);
      setPreviewResult(result);
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error('خطأ في توليد السياسات');
      }
    } finally { setGenerating(false); }
  };

  const handleApplyGenerated = async () => {
    if (!storeId || !previewResult) return;
    setApplying(true);
    try {
      await policiesApi.applyGenerated(storeId, {
        confirmation: true,
        generatedPolicies: previewResult.policies.filter((p: any) => p.content),
      });
      toast.success('تم تطبيق السياسات بنجاح');
      setShowGenerator(false);
      setPreviewResult(null);
      loadPolicies();
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error('خطأ في تطبيق السياسات');
      }
    } finally { setApplying(false); }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        <Skeleton className="h-10 w-60 rounded-2xl" />
        <p className="text-neutral-400 text-sm">{t('policies.description')}</p>
        <div className="grid gap-4 md:grid-cols-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-48 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-12 text-center">
        <div className="inline-flex p-4 rounded-2xl bg-red-50 mb-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <p className="text-sm text-neutral-500 mb-3">{t('policies.loadError')}</p>
        <Button variant="outline" className="h-9 text-sm" onClick={loadPolicies}>{t('common.retry')}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('policies.title')}</h1>
          <p className="text-neutral-400 text-sm mt-1">{t('policies.description')}</p>
        </div>
        <Button
          variant="outline"
          className="h-9 text-sm"
          onClick={() => setShowGenerator(true)}
        >
          <Wand2 className="h-4 w-4 mr-1" />
          توليد سياسات وفق النظام السعودي
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {POLICY_TYPES.map((type) => {
          const policy = policies[type];
          const isPublished = policy?.isPublished ?? false;
          const hasContent = policy?.content && policy.content.length > 0;

          return (
            <div key={type} className={`bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden ${isPublished ? 'border-emerald-200/50' : ''}`}>
              <div className="p-6">
                <div className="flex items-center gap-3">
                  {typeIcons[type]}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-neutral-900">{t(`policies.type_${type}`)}</h3>
                      {isPublished ? (
                        <Badge variant="success" className="text-xs px-2.5 py-0.5"><CheckCircle2 className="h-3 w-3 mr-1" />{t('policies.status_published')}</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs px-2.5 py-0.5">{t('policies.status_draft')}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-neutral-400 mt-1">
                      {t('policies.typeHint', { type: t(`policies.type_${type}`) })}
                    </p>
                    {hasContent ? (
                      <p className="text-sm text-neutral-400 line-clamp-2 mt-2">{policy.content}</p>
                    ) : (
                      <p className="text-sm text-neutral-400 italic mt-2">{t('policies.noContent')}</p>
                    )}
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" className="h-9 text-sm" onClick={() => openEdit(type)}>
                        <Edit3 className="h-4 w-4 mr-1" />
                        {t('policies.edit', { type: t(`policies.type_${type}`) })}
                      </Button>
                      <Button
                        variant={isPublished ? 'outline' : 'default'}
                        className="h-9 text-sm"
                        onClick={() => togglePublish(type, isPublished)}
                        disabled={toggling === type}
                      >
                        {toggling === type && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        {isPublished ? t('policies.unpublish') : t('policies.publish')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editType && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <h2 className="text-lg font-bold text-neutral-900">{t('policies.edit', { type: t(`policies.type_${editType}`) })}</h2>
            <div className="space-y-1">
              <Label className="text-sm text-neutral-500">{t('policies.titleLabel')}</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder={t('policies.titlePlaceholder')} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-neutral-500">{t('policies.contentLabel')}</Label>
              <textarea
                className="flex h-64 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder={t('policies.contentPlaceholder')}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
              <Button variant="outline" className="h-9 text-sm" onClick={closeEdit}>{t('common.cancel')}</Button>
              <Button className="h-9 text-sm px-4" onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {saving ? t('policies.saving') : t('policies.save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showGenerator && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900">توليد سياسات وفق النظام السعودي</h2>
              <Button variant="ghost" size="sm" onClick={() => { setShowGenerator(false); setPreviewResult(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {!previewResult ? (
              <>
                <p className="text-sm text-neutral-500">
                  أدخل بيانات المتجر لتوليد مسودة للسياسات. هذه قوالب تنظيمية عامة ويجب مراجعتها حسب نشاطك التجاري.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm text-neutral-500">اسم المتجر *</Label>
                    <Input
                      value={generatorInput.storeName}
                      onChange={(e) => setGeneratorInput({ ...generatorInput, storeName: e.target.value })}
                      placeholder="اسم المتجر"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-neutral-500">الاسم القانوني</Label>
                    <Input
                      value={generatorInput.legalName}
                      onChange={(e) => setGeneratorInput({ ...generatorInput, legalName: e.target.value })}
                      placeholder="الاسم القانوني للشركة"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-neutral-500">رقم السجل التجاري</Label>
                    <Input
                      value={generatorInput.commercialRegistrationNumber}
                      onChange={(e) => setGeneratorInput({ ...generatorInput, commercialRegistrationNumber: e.target.value })}
                      placeholder="رقم السجل التجاري"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-neutral-500">الرقم الضريبي</Label>
                    <Input
                      value={generatorInput.vatNumber}
                      onChange={(e) => setGeneratorInput({ ...generatorInput, vatNumber: e.target.value })}
                      placeholder="الرقم الضريبي"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-neutral-500">بريد الدعم الفني</Label>
                    <Input
                      value={generatorInput.supportEmail}
                      onChange={(e) => setGeneratorInput({ ...generatorInput, supportEmail: e.target.value })}
                      placeholder="support@example.com"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-neutral-500">رقم الجوال</Label>
                    <Input
                      value={generatorInput.supportPhone}
                      onChange={(e) => setGeneratorInput({ ...generatorInput, supportPhone: e.target.value })}
                      placeholder="+966..."
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-sm text-neutral-500">العنوان</Label>
                    <Input
                      value={generatorInput.businessAddress}
                      onChange={(e) => setGeneratorInput({ ...generatorInput, businessAddress: e.target.value })}
                      placeholder="المدينة، المملكة العربية السعودية"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-neutral-500">مدة التسليم (أقل)</Label>
                    <Input
                      type="number"
                      value={generatorInput.deliveryMinDays}
                      onChange={(e) => setGeneratorInput({ ...generatorInput, deliveryMinDays: Number(e.target.value) })}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-neutral-500">مدة التسليم (أقصى)</Label>
                    <Input
                      type="number"
                      value={generatorInput.deliveryMaxDays}
                      onChange={(e) => setGeneratorInput({ ...generatorInput, deliveryMaxDays: Number(e.target.value) })}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-neutral-500">رسوم الشحن (ريال)</Label>
                    <Input
                      type="number"
                      value={generatorInput.shippingFee}
                      onChange={(e) => setGeneratorInput({ ...generatorInput, shippingFee: Number(e.target.value) })}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-neutral-500">الحد الأدنى للشحن المجاني (ريال)</Label>
                    <Input
                      type="number"
                      value={generatorInput.freeShippingThreshold}
                      onChange={(e) => setGeneratorInput({ ...generatorInput, freeShippingThreshold: Number(e.target.value) })}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-neutral-500">مدة الإرجاع (أيام)</Label>
                    <Input
                      type="number"
                      value={generatorInput.returnWindowDays ?? ''}
                      onChange={(e) => setGeneratorInput({ ...generatorInput, returnWindowDays: e.target.value ? Number(e.target.value) : null })}
                      placeholder="7"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-neutral-500">مدة معالجة الاسترداد (أيام)</Label>
                    <Input
                      type="number"
                      value={generatorInput.refundProcessingDays}
                      onChange={(e) => setGeneratorInput({ ...generatorInput, refundProcessingDays: Number(e.target.value) })}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                  <Button variant="outline" className="h-9 text-sm" onClick={() => { setShowGenerator(false); setPreviewResult(null); }}>إلغاء</Button>
                  <Button
                    className="h-9 text-sm px-4"
                    onClick={handleGeneratePreview}
                    disabled={!generatorInput.storeName || generating}
                  >
                    {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {generating ? 'جاري التوليد...' : 'معاينة'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                  ⚠️ هذه قوالب تنظيمية عامة ويجب مراجعتها حسب نشاطك التجاري. لا تُعتبر استشارة قانونية.
                </div>

                {previewResult.globalWarnings.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
                    {previewResult.globalWarnings.map((w: string, i: number) => <div key={i}>• {w}</div>)}
                  </div>
                )}

                {previewResult.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                    {previewResult.errors.map((e: string, i: number) => <div key={i}>✗ {e}</div>)}
                  </div>
                )}

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {previewResult.policies.map((policy: any, idx: number) => (
                    <div key={idx} className="border border-neutral-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-neutral-900">{policy.title}</h3>
                        {!policy.content && <Badge variant="destructive" className="text-xs">يحتاج بيانات</Badge>}
                      </div>
                      {policy.warnings.length > 0 && (
                        <div className="text-xs text-amber-600 mb-2">
                          {policy.warnings.map((w: string, i: number) => <div key={i}>⚠ {w}</div>)}
                        </div>
                      )}
                      {policy.content ? (
                        <pre className="text-xs text-neutral-600 whitespace-pre-wrap max-h-32 overflow-y-auto bg-neutral-50 rounded-lg p-2">{policy.content.substring(0, 300)}...</pre>
                      ) : (
                        <p className="text-xs text-red-500 italic">لا يمكن التوليد — بيانات ناقصة</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                  <Button variant="outline" className="h-9 text-sm" onClick={() => setPreviewResult(null)}>تعديل البيانات</Button>
                  <Button
                    className="h-9 text-sm px-4"
                    onClick={handleApplyGenerated}
                    disabled={applying || previewResult.errors.length > 0}
                  >
                    {applying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {applying ? 'جاري التطبيق...' : 'تطبيق'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
