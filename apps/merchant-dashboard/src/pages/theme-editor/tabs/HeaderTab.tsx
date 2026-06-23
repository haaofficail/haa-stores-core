import { useTranslation } from 'react-i18next';
import { TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';
import { SectionHeader, ToggleRow } from '../atoms';
import type { ThemeConfig } from '../constants';

interface Props {
  config: ThemeConfig;
  updateConfig: (path: string, value: any) => void;
}

export function HeaderTab({ config, updateConfig }: Props) {
  const { t } = useTranslation();
  const header = config.header || {};
  const colors = config.colors || {};
  return (
    <TabsContent value="header" className="space-y-6">
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <SectionHeader title={t('theme.headerSettings', 'إعدادات الهيدر')} />
        <div className="space-y-4">
          <ToggleRow label={t('theme.announcementBar', 'شريط الإعلانات')} description={t('theme.announcementDesc', 'شريط صغير أعلى المتجر')} checked={header.showAnnouncementBar !== false} onChange={(v) => updateConfig('header.showAnnouncementBar', v)} />
          {header.showAnnouncementBar !== false && (
            <div className="space-y-3">
              <Input value={header.announcementText || ''} onChange={(e) => updateConfig('header.announcementText', e.target.value)} placeholder={t('theme.announcementPlaceholder', 'نص الإعلان...')} className="w-full" />
              <div className="grid sm:grid-cols-2 gap-3">
                <ColorPicker label={t('theme.announcementBg', 'خلفية الشريط')} value={colors.announcementBackground || '#1e293b'} onChange={(v) => updateConfig('colors.announcementBackground', v)} />
                <ColorPicker label={t('theme.announcementText', 'نص الشريط')} value={colors.announcementText || '#ffffff'} onChange={(v) => updateConfig('colors.announcementText', v)} />
              </div>
            </div>
          )}
          <ToggleRow label={t('theme.stickyHeader', 'هيدر ثابت')} checked={header.stickyHeader !== false} onChange={(v) => updateConfig('header.stickyHeader', v)} />
          <ToggleRow label={t('theme.showSearch', 'إظهار البحث')} checked={header.showSearch !== false} onChange={(v) => updateConfig('header.showSearch', v)} />
          <ToggleRow label={t('theme.showCart', 'إظهار السلة')} checked={header.showCart !== false} onChange={(v) => updateConfig('header.showCart', v)} />
          <ToggleRow label={t('theme.showAccount', 'إظهار حسابي')} checked={header.showAccount !== false} onChange={(v) => updateConfig('header.showAccount', v)} />
        </div>
      </div>
    </TabsContent>
  );
}
