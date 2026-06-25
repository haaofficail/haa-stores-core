// Settings → Contact info tab.
//
// Extracted from Settings.tsx on 2026-06-25 (W4 slice 4b). Owns the
// phone/email portion of `form` plus the address fields on
// `storeConfig`. The hint card linking to the theme editor for social
// links is preserved verbatim.

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/components/ui/icon';
import { settingsApi, type StoreConfig } from '@/lib/api';
import { PermissionGate } from '@/lib/permissions';
import { toast } from 'sonner';

interface ContactForm {
  phone: string;
  email: string;
}

interface ContactTabProps {
  form: ContactForm;
  errors: Record<string, string>;
  updateField: (field: string, value: unknown) => void;
  storeConfig: StoreConfig;
  setStoreConfig: React.Dispatch<React.SetStateAction<StoreConfig>>;
  storeConfigLoading: boolean;
  storeId: number | null;
}

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

export default function ContactTab({
  form,
  errors,
  updateField,
  storeConfig,
  setStoreConfig,
  storeConfigLoading,
  storeId,
}: ContactTabProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
      <SectionHeader title={t('settings.sectionContact')} description={t('settings.sectionContactDesc')} />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm text-neutral-500">{t('settings.phone')}</Label>
          <Input value={form.phone} onChange={e => updateField('phone', e.target.value)} dir="ltr" className="text-end h-9 text-sm" placeholder="+966..." />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-neutral-500">{t('settings.email')}</Label>
          <Input value={form.email} onChange={e => updateField('email', e.target.value)} dir="ltr" className="text-end h-9 text-sm" placeholder="store@example.com" />
          <FieldError message={errors.email} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-400"><Icon name="Globe" size="xs" /></div>
            <div className="flex-1">
              <p className="font-bold text-sm text-neutral-900">{t('settings.socialPlaceholder')}</p>
              <p className="text-sm text-neutral-400 mt-1">{t('settings.socialLinksHint', 'تعديل روابط التواصل من محرر الثيم')}</p>
              <a href="/theme" className="inline-flex items-center gap-1 text-sm text-primary-500 hover:underline mt-2">
                {t('settings.openThemeEditor', 'فتح محرر الثيم')} <Icon name="ExternalLink" size="2xs" />
              </a>
            </div>
          </div>
        </div>
        {storeConfigLoading ? (
          <Skeleton className="h-28 rounded-3xl" />
        ) : (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-400"><Icon name="MapPin" size="xs" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-neutral-900 mb-2">{t('settings.addressPlaceholder')}</p>
                <div className="space-y-2">
                  <input type="text" value={storeConfig.city ?? ''}
                    onChange={e => setStoreConfig(p => ({ ...p, city: e.target.value || null }))}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder={t('settings.cityPlaceholder', 'المدينة')} />
                  <input type="text" value={storeConfig.district ?? ''}
                    onChange={e => setStoreConfig(p => ({ ...p, district: e.target.value || null }))}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder={t('settings.districtPlaceholder', 'الحي')} />
                  <input type="text" value={storeConfig.street ?? ''}
                    onChange={e => setStoreConfig(p => ({ ...p, street: e.target.value || null }))}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder={t('settings.streetPlaceholder', 'الشارع')} />
                  <input type="text" value={storeConfig.postalCode ?? ''}
                    onChange={e => setStoreConfig(p => ({ ...p, postalCode: e.target.value || null }))}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder={t('settings.postalCodePlaceholder', 'الرمز البريدي')} />
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs"
                    onClick={() => settingsApi.getStoreConfig(storeId!).then((data) => setStoreConfig(data as StoreConfig))}>
                    {t('common.cancel')}
                  </Button>
                  <PermissionGate permission="settings:update"><Button size="sm" className="h-7 text-xs"
                    onClick={async () => {
                      if (!storeId) return;
                      try {
                        const updated = await settingsApi.updateStoreConfig(storeId, {
                          city: storeConfig.city, district: storeConfig.district,
                          street: storeConfig.street, postalCode: storeConfig.postalCode,
                        }) as Partial<StoreConfig>;
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
  );
}
