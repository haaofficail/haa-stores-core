// Settings → Gift & wrapping tab.
//
// Extracted from Settings.tsx on 2026-06-25 (W4 — split Settings into
// lazy-loaded tabs). State + handlers are owned by SettingsPage and
// passed in as props; this component is purely presentational. Loaded
// via React.lazy so the bundle for the Settings shell shrinks.

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/components/ui/icon';
import { settingsApi } from '@/lib/api';
import { PermissionGate } from '@/lib/permissions';
import { toast } from 'sonner';

interface GiftOptionsValue {
  giftWrapDefaultPrice: string;
  giftMessageMaxLength: number;
  giftWrapInstructions: string | null;
  pickupInstructions: string | null;
}

interface GiftTabProps {
  features: Record<string, boolean>;
  giftOptions: GiftOptionsValue;
  setGiftOptions: React.Dispatch<React.SetStateAction<GiftOptionsValue>>;
  giftOptionsLoading: boolean;
  giftOptionsSaving: boolean;
  setGiftOptionsSaving: React.Dispatch<React.SetStateAction<boolean>>;
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

export default function GiftTab({
  features,
  giftOptions,
  setGiftOptions,
  giftOptionsLoading,
  giftOptionsSaving,
  setGiftOptionsSaving,
  storeId,
}: GiftTabProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
      <SectionHeader
        title={t('settings.sectionGift', 'الهدايا والتغليف')}
        description={t('settings.sectionGiftDesc', 'إعدادات تغليف الهدايا وإرسالها')}
      />
      {!features.giftWrap && !features.sendAsGift ? (
        <div className="p-4 bg-amber-50 text-amber-700 rounded-2xl text-sm">
          <Icon name="AlertTriangle" size="xs" className="inline ms-1" />
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
            <textarea className="flex h-20 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
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
              {giftOptionsSaving && <Icon name="Loader2" size="xs" className="me-2 animate-spin" />}
              {giftOptionsSaving ? t('common.saving') : t('common.save')}
            </Button></PermissionGate>
          </div>
        </div>
      )}
    </div>
  );
}
