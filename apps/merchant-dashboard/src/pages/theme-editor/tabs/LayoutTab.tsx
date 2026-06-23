import { useTranslation } from 'react-i18next';
import { TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SectionHeader, ToggleRow } from '../atoms';
import type { ThemeConfig } from '../constants';

interface Props {
  config: ThemeConfig;
  updateConfig: (path: string, value: any) => void;
}

export function LayoutTab({ config, updateConfig }: Props) {
  const { t } = useTranslation();
  const layout = config.layout || {};
  return (
    <TabsContent value="layout" className="space-y-6">
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <SectionHeader title={t('theme.productDisplay', 'عرض المنتجات')} />
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-2 block">{t('theme.productColumns', 'عدد الأعمدة')}</Label>
            <Select value={String(layout.productCardColumns || 4)} onValueChange={(v) => updateConfig('layout.productCardColumns', Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-2 block">{t('theme.cardStyle', 'شكل البطاقة')}</Label>
            <Select value={layout.productCardStyle || 'rounded'} onValueChange={(v) => updateConfig('layout.productCardStyle', v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rounded">{t('theme.cardRounded', 'دائري')}</SelectItem>
                <SelectItem value="square">{t('theme.cardSquare', 'مربع')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-2 block">{t('theme.imageRatio', 'نسبة الصورة')}</Label>
            <Select value={layout.imageAspectRatio || 'square'} onValueChange={(v) => updateConfig('layout.imageAspectRatio', v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="square">1:1</SelectItem>
                <SelectItem value="4:3">4:3</SelectItem>
                <SelectItem value="16:9">16:9</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-2 block">{t('theme.categoryCardSize', 'حجم بطاقة التصنيف')}</Label>
            <Select value={String(layout.categoryCardSize ?? 3)} onValueChange={(v) => updateConfig('layout.categoryCardSize', Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 – {t('theme.categorySizeCompact', 'صغير جداً')}</SelectItem>
                <SelectItem value="2">2 – {t('theme.categorySizeSmall', 'صغير')}</SelectItem>
                <SelectItem value="3">3 – {t('theme.categorySizeMedium', 'وسط')}</SelectItem>
                <SelectItem value="4">4 – {t('theme.categorySizeLarge', 'كبير')}</SelectItem>
                <SelectItem value="5">5 – {t('theme.categorySizeXl', 'كبير جداً')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="border-t border-neutral-100 pt-4 space-y-1">
            <ToggleRow label={t('theme.showRating', 'عرض التقييم')} checked={layout.showRating !== false} onChange={(v) => updateConfig('layout.showRating', v)} />
            <ToggleRow label={t('theme.showSales', 'عرض المبيعات')} checked={layout.showSalesCount !== false} onChange={(v) => updateConfig('layout.showSalesCount', v)} />
            <ToggleRow label={t('theme.showStock', 'عرض المخزون')} checked={layout.showStockBadge !== false} onChange={(v) => updateConfig('layout.showStockBadge', v)} />
            <ToggleRow label={t('theme.showCategory', 'عرض القسم')} checked={layout.showCategory !== false} onChange={(v) => updateConfig('layout.showCategory', v)} />
            <ToggleRow label={t('theme.showDiscount', 'عرض الخصم')} checked={layout.showDiscountBadge !== false} onChange={(v) => updateConfig('layout.showDiscountBadge', v)} />
            <ToggleRow label={t('theme.showCountdown', 'عداد الخصم')} checked={layout.showCountdown !== false} onChange={(v) => updateConfig('layout.showCountdown', v)} />
          </div>
        </div>
      </div>
    </TabsContent>
  );
}
