import { useTranslation } from 'react-i18next';
import { TabsContent } from '@/components/ui/tabs';
import { SectionHeader } from '../atoms';
import type { ThemeConfig } from '../constants';

interface Props {
  config: ThemeConfig;
  updateConfig: (path: string, value: any) => void;
}

export function CssTab({ config, updateConfig }: Props) {
  const { t } = useTranslation();
  return (
    <TabsContent value="css" className="space-y-6">
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <SectionHeader title={t('theme.customCss', 'CSS مخصص')} description={t('theme.customCssDesc', 'أضف CSS مخصص. سيتم إضافته في head المتجر. تحذير: الأخطاء قد تؤثر على المظهر.')} />
        <textarea
          value={config.customCss || ''}
          onChange={(e) => updateConfig('customCss', e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-neutral-200 font-mono text-sm focus:outline-none focus:border-primary-500"
          rows={12}
          dir="ltr"
          placeholder={'/* أضف CSS هنا */\n.button-custom {\n  background: red;\n}'}
        />
      </div>
    </TabsContent>
  );
}
