import { useTranslation } from 'react-i18next';
import { TabsContent } from '@/components/ui/tabs';
import { ColorPicker } from '../ColorPicker';
import { SectionHeader } from '../atoms';
import type { ThemeConfig } from '../constants';

interface Props {
  config: ThemeConfig;
  updateConfig: (path: string, value: any) => void;
}

export function ColorsTab({ config, updateConfig }: Props) {
  const { t } = useTranslation();
  const colors = config.colors || {};
  return (
    <TabsContent value="colors" className="space-y-6">
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <SectionHeader title={t('theme.brandColors', 'ألوان العلامة التجارية')} />
        <div className="grid sm:grid-cols-2 gap-3">
          <ColorPicker label={t('theme.primary', 'اللون الأساسي')} value={colors.primary || '#5c9cd5'} onChange={(v) => updateConfig('colors.primary', v)} />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <SectionHeader title={t('theme.surfaceColors', 'ألوان الخلفيات')} />
        <div className="grid sm:grid-cols-2 gap-3">
          <ColorPicker label="Surface 1" value={colors.surface1 || '#ffffff'} onChange={(v) => updateConfig('colors.surface1', v)} />
          <ColorPicker label="Surface 2" value={colors.surface2 || '#f8f9fa'} onChange={(v) => updateConfig('colors.surface2', v)} />
          <ColorPicker label="Surface 3" value={colors.surface3 || '#f1f3f5'} onChange={(v) => updateConfig('colors.surface3', v)} />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <SectionHeader title={t('theme.textColors', 'ألوان النصوص')} />
        <div className="grid sm:grid-cols-2 gap-3">
          <ColorPicker label={t('theme.textPrimary', 'النص الأساسي')} value={colors.textPrimary || '#1a1a1a'} onChange={(v) => updateConfig('colors.textPrimary', v)} />
          <ColorPicker label={t('theme.textSecondary', 'النص الثانوي')} value={colors.textSecondary || '#6b7280'} onChange={(v) => updateConfig('colors.textSecondary', v)} />
          <ColorPicker label={t('theme.textTertiary', 'نص مساعد')} value={colors.textTertiary || '#9ca3af'} onChange={(v) => updateConfig('colors.textTertiary', v)} />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <SectionHeader title={t('theme.statusColors', 'ألوان الحالات')} />
        <div className="grid sm:grid-cols-2 gap-3">
          <ColorPicker label={t('theme.success', 'نجاح')} value={colors.success || '#10b981'} onChange={(v) => updateConfig('colors.success', v)} />
          <ColorPicker label={t('theme.warning', 'تحذير')} value={colors.warning || '#f59e0b'} onChange={(v) => updateConfig('colors.warning', v)} />
          <ColorPicker label={t('theme.error', 'خطأ')} value={colors.error || '#ef4444'} onChange={(v) => updateConfig('colors.error', v)} />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <SectionHeader title={t('theme.headerColors', 'ألوان الهيدر')} />
        <div className="grid sm:grid-cols-2 gap-3">
          <ColorPicker label={t('theme.headerBackground', 'خلفية الهيدر')} value={colors.headerBackground || '#ffffff'} onChange={(v) => updateConfig('colors.headerBackground', v)} />
          <ColorPicker label={t('theme.headerText', 'نص الهيدر')} value={colors.headerText || '#4b5563'} onChange={(v) => updateConfig('colors.headerText', v)} />
          <ColorPicker label={t('theme.announcementBg', 'خلفية شريط الإعلانات')} value={colors.announcementBackground || '#1e293b'} onChange={(v) => updateConfig('colors.announcementBackground', v)} />
          <ColorPicker label={t('theme.announcementText', 'نص شريط الإعلانات')} value={colors.announcementText || '#ffffff'} onChange={(v) => updateConfig('colors.announcementText', v)} />
        </div>
      </div>
    </TabsContent>
  );
}
