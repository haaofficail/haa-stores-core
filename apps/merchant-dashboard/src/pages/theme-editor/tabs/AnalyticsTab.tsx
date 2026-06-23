import { useTranslation } from 'react-i18next';
import { TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionHeader } from '../atoms';
import type { ThemeConfig } from '../constants';

interface Props {
  config: ThemeConfig;
  updateConfig: (path: string, value: any) => void;
}

export function AnalyticsTab({ config, updateConfig }: Props) {
  const { t } = useTranslation();
  return (
    <TabsContent value="analytics" className="space-y-6">
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <SectionHeader title={t('theme.analyticsSettings', 'إعدادات التحليلات')} description={t('theme.analyticsDesc', 'أضف أكواد التتبع من جوجل وفيسبوك')} />
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-1 block">Google Tag Manager ID</Label>
            <Input value={config.analytics?.googleTagManagerId || ''} onChange={(e) => updateConfig('analytics.googleTagManagerId', e.target.value)} placeholder="GTM-XXXXXXX" dir="ltr" />
          </div>
          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-1 block">Google Analytics ID</Label>
            <Input value={config.analytics?.googleAnalyticsId || ''} onChange={(e) => updateConfig('analytics.googleAnalyticsId', e.target.value)} placeholder="G-XXXXXXXXXX" dir="ltr" />
          </div>
          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-1 block">Facebook Pixel ID</Label>
            <Input value={config.analytics?.facebookPixelId || ''} onChange={(e) => updateConfig('analytics.facebookPixelId', e.target.value)} placeholder="123456789" dir="ltr" />
          </div>
        </div>
      </div>
    </TabsContent>
  );
}
