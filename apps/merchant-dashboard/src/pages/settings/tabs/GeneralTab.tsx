// Settings → General (welcome message / prep time / min order) tab.
//
// Extracted from Settings.tsx on 2026-06-25 (W4 slice 4c). All three
// controls write to `storeConfig`; save/cancel hits the storeConfig
// endpoints. Owns its own save button — does not piggy-back on the
// shared Settings save flow because storeConfig is a separate API
// resource.

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/components/ui/icon';
import { settingsApi, type StoreConfig } from '@/lib/api';
import { PermissionGate } from '@/lib/permissions';
import { toast } from 'sonner';

interface GeneralTabProps {
  storeConfig: StoreConfig;
  setStoreConfig: React.Dispatch<React.SetStateAction<StoreConfig>>;
  storeConfigLoading: boolean;
  storeConfigSaving: boolean;
  setStoreConfigSaving: React.Dispatch<React.SetStateAction<boolean>>;
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

export default function GeneralTab({
  storeConfig,
  setStoreConfig,
  storeConfigLoading,
  storeConfigSaving,
  setStoreConfigSaving,
  storeId,
}: GeneralTabProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
      <SectionHeader title={t('settings.sectionGeneral')} description={t('settings.sectionGeneralDesc')} />
      {storeConfigLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-400"><Icon name="MessageCircle" size="xs" /></div>
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
                className="mt-2 w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                rows={2} maxLength={500}
                placeholder={t('settings.welcomeMessagePlaceholder', 'رسالة ترحيبية تظهر للعملاء...')} />
              <p className="text-xs text-neutral-400 mt-1">{t('settings.welcomeMessageHint', 'تظهر في صفحة المتجر الرئيسية')}</p>
            </div>
          </div>

          <hr className="border-neutral-100" />

          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-400"><Icon name="Clock" size="xs" /></div>
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
                  className="w-20 border border-neutral-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary-500" />
                <span className="text-sm text-neutral-500">{t('settings.prepTimeUnit', 'أيام')}</span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">{t('settings.prepTimeHint', 'الوقت المتوقع لتجهيز الطلب قبل الشحن')}</p>
            </div>
          </div>

          <hr className="border-neutral-100" />

          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-400"><Icon name="ShoppingCart" size="xs" /></div>
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
                  className="w-24 border border-neutral-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary-500" />
                <span className="text-sm text-neutral-500">SAR</span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">{t('settings.minOrderHint', 'الحد الأدنى لقيمة الطلب ليتم تأكيده')}</p>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-neutral-100">
        <Button variant="outline" className="h-9 text-sm"
          onClick={() => settingsApi.getStoreConfig(storeId!).then((data) => setStoreConfig(data as StoreConfig))}>
          {t('common.cancel')}
        </Button>
        <PermissionGate permission="settings:update">
          <Button className="h-9 text-sm" disabled={storeConfigSaving || storeConfigLoading}
            onClick={async () => {
              if (!storeId) return;
              setStoreConfigSaving(true);
              try {
                const updated = await settingsApi.updateStoreConfig(storeId, storeConfig) as StoreConfig;
                setStoreConfig(updated);
                toast.success(t('settings.saved'));
              } catch { toast.error(t('common.error')); }
              finally { setStoreConfigSaving(false); }
            }}>
            {storeConfigSaving && <Icon name="Loader2" size="xs" className="me-2 animate-spin" />}
            {storeConfigSaving ? t('common.saving') : t('common.save')}
          </Button>
        </PermissionGate>
      </div>
    </div>
  );
}
