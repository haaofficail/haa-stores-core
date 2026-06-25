import { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { settingsApi, categoriesApi, type StoreConfig } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Settings as SettingsIcon, Store, Phone, CreditCard, Truck, Wallet,
  Loader2, Info, ExternalLink,
  Eye, EyeOff, Gift, Package,
  Ruler,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiClientError } from '@/lib/api';
import { PermissionGate } from '@/lib/permissions';
import { PaymentStatusSection } from './settings/sections/PaymentStatusSection';
import { ReadinessChecklist } from './settings/sections/ReadinessChecklist';
import { PublishSection } from './settings/sections/PublishSection';

// W4 — lazy-loaded tabs (split from Settings.tsx). Only loaded when the
// user activates the tab, shrinking the Settings shell's initial chunk.
const GiftTab = lazy(() => import('./settings/tabs/GiftTab'));
const PickupTab = lazy(() => import('./settings/tabs/PickupTab'));
const SizesTab = lazy(() => import('./settings/tabs/SizesTab'));
const InfoTab = lazy(() => import('./settings/tabs/InfoTab'));
const ContactTab = lazy(() => import('./settings/tabs/ContactTab'));
const GeneralTab = lazy(() => import('./settings/tabs/GeneralTab'));

function TabFallback() {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
      <Skeleton className="h-6 w-1/3 mb-3" />
      <Skeleton className="h-4 w-2/3 mb-4" />
      <div className="space-y-2"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /></div>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h3 className="font-bold text-base text-neutral-900">{title}</h3>
      {description && <p className="text-sm text-neutral-500 mt-1">{description}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  // `setStore` is still used (in loadAll); the `store` value itself
  // was only read by the old Cancel handler that we replaced with the
  // snapshot-based revert below.
  const [, setStore] = useState<{ name?: string; slug?: string; description?: string; status?: string; logoUrl?: string; primaryColor?: string; email?: string; phone?: string; seoTitle?: string; seoDescription?: string } | null>(null);
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

  type PickupLocation = { id: number; nameAr: string; nameEn?: string; address?: string; mapsUrl?: string; phone?: string; hours?: unknown; instructions?: string; isActive: boolean };
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [pickupLocationsLoading, setPickupLocationsLoading] = useState(true);
  const [pickupDialog, setPickupDialog] = useState(false);
  const [pickupEditId, setPickupEditId] = useState<number | null>(null);
  const [pickupForm, setPickupForm] = useState({
    nameAr: '', nameEn: '', address: '', mapsUrl: '', phone: '', hours: '{}', instructions: '', isActive: true,
  });
  const [pickupSaving, setPickupSaving] = useState(false);
  type SizeGuide = { id: number; name: string; type: string; unit: string; rows?: Array<Record<string, string>>; categoryIds?: number[]; productIds?: number[]; isActive: boolean };
  const [sizeGuides, setSizeGuides] = useState<SizeGuide[]>([]);
  const [sizeGuidesLoading, setSizeGuidesLoading] = useState(true);
  const [sizeGuideSaving, setSizeGuideSaving] = useState(false);
  const [sizeGuideEditId, setSizeGuideEditId] = useState<number | null>(null);
  const [categoriesList, setCategoriesList] = useState<Array<{ id: number; name: string }>>([]);
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
    logoUrl: '', primaryColor: '#5c9cd5', email: '', phone: '',
    seoTitle: '', seoDescription: '',
  });

  // Snapshot of the last server-side state for every editable
  // section. Used for: (a) computing isDirty against current values,
  // (b) restoring on Cancel (so Cancel reverts ALL sections, not just
  // `form`), (c) gating the beforeunload prompt. Audit P0 #22–#24
  // (2026-06-25).
  const originalSnapshot = useRef<{
    form: typeof form;
    features: typeof features;
    storeConfig: typeof storeConfig;
    giftOptions: typeof giftOptions;
  } | null>(null);

  const loadAll = useCallback(() => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    settingsApi.get(storeId)
      .then((raw) => {
        const s = raw as { name?: string; slug?: string; description?: string; status?: string; logoUrl?: string; primaryColor?: string; email?: string; phone?: string; seoTitle?: string; seoDescription?: string };
        setStore(s);
        const next = {
          name: s.name ?? '', slug: s.slug ?? '', description: s.description ?? '',
          status: s.status ?? 'active', logoUrl: s.logoUrl ?? '', primaryColor: s.primaryColor ?? '#5c9cd5',
          email: s.email ?? '', phone: s.phone ?? '',
          seoTitle: s.seoTitle ?? '', seoDescription: s.seoDescription ?? '',
        };
        setForm(next);
        // Refresh just the `form` slice of the snapshot — other
        // slices are filled by their own loaders below.
        originalSnapshot.current = {
          ...(originalSnapshot.current ?? { features: {}, storeConfig, giftOptions }),
          form: next,
        };
      })
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));
    settingsApi.getProductFeatures(storeId)
      .then((data) => {
        setFeatures(data);
        if (originalSnapshot.current) originalSnapshot.current.features = data;
      })
      .catch((err: unknown) => console.warn('Settings: failed to load secondary data', err))
      .finally(() => setFeaturesLoading(false));
    settingsApi.getGiftOptions(storeId)
      .then(data => {
        const next = {
          giftWrapDefaultPrice: data.giftWrapDefaultPrice ?? '0',
          giftMessageMaxLength: data.giftMessageMaxLength ?? 250,
          giftWrapInstructions: data.giftWrapInstructions ?? null,
          pickupInstructions: data.pickupInstructions ?? null,
        };
        setGiftOptions(next);
        if (originalSnapshot.current) originalSnapshot.current.giftOptions = next;
      })
      .catch((err: unknown) => console.warn('Settings: failed to load secondary data', err))
      .finally(() => setGiftOptionsLoading(false));
    settingsApi.listPickupLocations(storeId)
      .then((data) => setPickupLocations(data as PickupLocation[]))
      .catch((err: unknown) => console.warn('Settings: failed to load secondary data', err))
      .finally(() => setPickupLocationsLoading(false));
    settingsApi.listSizeGuides(storeId)
      .then((data) => setSizeGuides(data as SizeGuide[]))
      .catch((err: unknown) => console.warn('Settings: failed to load secondary data', err))
      .finally(() => setSizeGuidesLoading(false));
    categoriesApi.list(storeId)
      .then((data) => setCategoriesList(data as Array<{ id: number; name: string }>))
      .catch((err: unknown) => console.warn('Settings: failed to load secondary data', err));
    settingsApi.getStoreConfig(storeId)
      .then((data) => {
        setStoreConfig(data as StoreConfig);
        if (originalSnapshot.current) originalSnapshot.current.storeConfig = data as StoreConfig;
      })
      .catch((err: unknown) => console.warn('Settings: failed to load secondary data', err))
      .finally(() => setStoreConfigLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAll is the initial-load function; it intentionally captures the empty initial state of storeConfig/giftOptions so we can seed originalSnapshot. Subsequent updates flow through setStoreConfig/setGiftOptions which write to the ref directly.
  }, [storeId, t]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Dirty-state guard: when any section diverges from the snapshot,
  // the browser asks the merchant to confirm before navigating away
  // (close tab, reload, back). Without this guard, edits to
  // `storeConfig` / `features` / `giftOptions` were lost silently
  // when the merchant clicked a sidebar link. Audit P0 #23.
  const isDirty = (() => {
    const snap = originalSnapshot.current;
    if (!snap) return false;
    return (
      JSON.stringify(snap.form) !== JSON.stringify(form) ||
      JSON.stringify(snap.features) !== JSON.stringify(features) ||
      JSON.stringify(snap.storeConfig) !== JSON.stringify(storeConfig) ||
      JSON.stringify(snap.giftOptions) !== JSON.stringify(giftOptions)
    );
  })();

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore the custom message but require
      // returnValue to be set to trigger the native prompt.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const updateField = (field: string, value: unknown) => {
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
      const updated = await settingsApi.update(storeId, data) as { name?: string; slug?: string; description?: string; status?: string; logoUrl?: string; primaryColor?: string; email?: string; phone?: string; seoTitle?: string; seoDescription?: string };
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
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{t('settings.title')}</h1>
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{t('settings.title')}</h1>
        {form.slug && (
          <a href={`${import.meta.env.VITE_STOREFRONT_URL || 'http://localhost:5174'}/s/${form.slug}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 text-neutral-700 text-sm font-medium rounded-xl hover:bg-neutral-200 transition-colors">
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

        {/* Info Tab — lazy-loaded (W4 slice 4a) */}
        <TabsContent value="info" className="space-y-4">
          <Suspense fallback={<TabFallback />}>
            <InfoTab
              form={form}
              errors={errors}
              updateField={updateField}
              storeId={storeId}
            />
          </Suspense>
        </TabsContent>

        {/* Contact Tab — lazy-loaded (W4 slice 4b) */}
        <TabsContent value="contact" className="space-y-4">
          <Suspense fallback={<TabFallback />}>
            <ContactTab
              form={form}
              errors={errors}
              updateField={updateField}
              storeConfig={storeConfig}
              setStoreConfig={setStoreConfig}
              storeConfigLoading={storeConfigLoading}
              storeId={storeId}
            />
          </Suspense>
        </TabsContent>

        {/* General Tab — lazy-loaded (W4 slice 4c) */}
        <TabsContent value="general" className="space-y-4">
          <Suspense fallback={<TabFallback />}>
            <GeneralTab
              storeConfig={storeConfig}
              setStoreConfig={setStoreConfig}
              storeConfigLoading={storeConfigLoading}
              storeConfigSaving={storeConfigSaving}
              setStoreConfigSaving={setStoreConfigSaving}
              storeId={storeId}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <PaymentStatusSection />
        </TabsContent>

        <TabsContent value="shipping" className="space-y-4">
          <div className="bg-primary-50/50 border border-primary-200/50 rounded-3xl p-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary-500 mt-0.5 shrink-0" />
              <div className="text-sm text-primary-800">
                <p className="font-bold">{t('settings.shippingInfoTitle')}</p>
                <p className="text-sm mt-1">{t('settings.shippingInfoDesc')}</p>
                <a href="/shipping" className="inline-flex items-center gap-1 text-sm text-primary-700 hover:underline mt-2">
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
                <a href="/finance/wallet" className="inline-flex items-center gap-1 text-sm text-amber-700 hover:underline mt-2">
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
                {featuresSaving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {featuresSaving ? t('common.saving') : t('common.save')}
              </Button></PermissionGate>
            </div>
          </div>
        </TabsContent>

        {/* Sizes Tab — lazy-loaded (W4 slice 3) */}
        <TabsContent value="sizes" className="space-y-4">
          <Suspense fallback={<TabFallback />}>
            <SizesTab
              sizeGuides={sizeGuides}
              setSizeGuides={setSizeGuides}
              sizeGuidesLoading={sizeGuidesLoading}
              sizeGuideSaving={sizeGuideSaving}
              setSizeGuideSaving={setSizeGuideSaving}
              sizeGuideEditId={sizeGuideEditId}
              setSizeGuideEditId={setSizeGuideEditId}
              sizeGuideForm={sizeGuideForm}
              setSizeGuideForm={setSizeGuideForm}
              categoriesList={categoriesList}
              storeId={storeId}
            />
          </Suspense>
        </TabsContent>

        {/* Gift Tab — lazy-loaded (W4) */}
        <TabsContent value="gift" className="space-y-4">
          <Suspense fallback={<TabFallback />}>
            <GiftTab
              features={features}
              giftOptions={giftOptions}
              setGiftOptions={setGiftOptions}
              giftOptionsLoading={giftOptionsLoading}
              giftOptionsSaving={giftOptionsSaving}
              setGiftOptionsSaving={setGiftOptionsSaving}
              storeId={storeId}
            />
          </Suspense>
        </TabsContent>

        {/* Pickup Tab — lazy-loaded (W4 slice 2). Includes its own Dialog. */}
        <TabsContent value="pickup" className="space-y-4">
          <Suspense fallback={<TabFallback />}>
            <PickupTab
              pickupLocations={pickupLocations}
              setPickupLocations={setPickupLocations}
              pickupLocationsLoading={pickupLocationsLoading}
              pickupDialog={pickupDialog}
              setPickupDialog={setPickupDialog}
              pickupEditId={pickupEditId}
              setPickupEditId={setPickupEditId}
              pickupForm={pickupForm}
              setPickupForm={setPickupForm}
              pickupSaving={pickupSaving}
              setPickupSaving={setPickupSaving}
              giftOptions={giftOptions}
              setGiftOptions={setGiftOptions}
              giftOptionsSaving={giftOptionsSaving}
              setGiftOptionsSaving={setGiftOptionsSaving}
              storeId={storeId}
            />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Publish Gate Section */}
      <PublishSection storeId={storeId} />

      <div className="flex justify-end gap-3 sticky bottom-4 bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-white/50 shadow-card">
        {/* Cancel reverts EVERY editable section from the snapshot,
            not just `form` — previously edits to storeConfig /
            features / giftOptions stayed dirty after Cancel (P0 #22). */}
        <Button variant="outline" className="h-9 text-sm" onClick={() => {
          const snap = originalSnapshot.current;
          if (snap) {
            setForm(snap.form);
            setFeatures(snap.features);
            setStoreConfig(snap.storeConfig);
            setGiftOptions(snap.giftOptions);
          }
          setErrors({});
        }}>{t('common.cancel')}</Button>
        <PermissionGate permission="settings:update"><Button className="h-9 text-sm" onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
          {saving ? t('common.loading') : t('common.save')}
        </Button></PermissionGate>
      </div>

      {/* Pickup-location dialog moved into PickupTab (W4 slice 2) so the
          form state, validation, and submit handler colocate with the
          tab that owns them. */}
    </div>
  );
}
