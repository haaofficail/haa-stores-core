import { useTranslation } from 'react-i18next';
import { TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SectionHeader } from '../atoms';
import { FONT_OPTIONS, type ThemeConfig } from '../constants';

interface Props {
  config: ThemeConfig;
  updateConfig: (path: string, value: any) => void;
}

export function FontsTab({ config, updateConfig }: Props) {
  const { t } = useTranslation();
  const font = config.font || {};
  return (
    <TabsContent value="fonts" className="space-y-6">
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <SectionHeader title={t('theme.fontSettings', 'إعدادات الخط')} />
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-2 block">{t('theme.fontFamily', 'نوع الخط')}</Label>
            <Select value={font.family || 'IBM Plex Sans Arabic'} onValueChange={(v) => {
              const opt = FONT_OPTIONS.find(f => f.value === v);
              updateConfig('font.family', v);
              if (opt) updateConfig('font.url', opt.url);
            }}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-neutral-700 mb-2 block">{t('theme.headingSize', 'حجم العناوين')}</Label>
              <Select value={font.headingsSize || '1.5rem'} onValueChange={(v) => updateConfig('font.headingsSize', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['1.25rem','1.5rem','1.75rem','2rem','2.25rem'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-neutral-700 mb-2 block">{t('theme.bodySize', 'حجم النص')}</Label>
              <Select value={font.bodySize || '1rem'} onValueChange={(v) => updateConfig('font.bodySize', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['0.875rem','1rem','1.125rem'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </TabsContent>
  );
}
