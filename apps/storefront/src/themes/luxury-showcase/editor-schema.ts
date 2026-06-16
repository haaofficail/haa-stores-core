import type { ThemeEditorSchema } from '@haa/storefront-themes';

export const luxuryShowcaseEditorSchema: ThemeEditorSchema = {
  groups: [
    {
      id: 'background',
      title: 'خلفية المتجر',
      fields: [
        {
          key: 'background.mode',
          type: 'select',
          label: 'نمط الخلفية',
          options: ['single', 'sectioned', 'editorial'],
        },
        { key: 'background.color', type: 'color', label: 'لون الخلفية الأساسي' },
        { key: 'background.allowSectionContrast', type: 'boolean', label: 'السماح بتباين السكشينات' },
      ],
    },
    {
      id: 'hero',
      title: 'قسم الواجهة الرئيسية',
      fields: [
        { key: 'hero.title', type: 'text', label: 'العنوان الرئيسي' },
        { key: 'hero.subtitle', type: 'text', label: 'العنوان الفرعي' },
        { key: 'hero.description', type: 'textarea', label: 'الوصف' },
        { key: 'hero.imageMode', type: 'select', label: 'نمط الصورة', options: ['editorial', 'product', 'none'] },
        { key: 'hero.ctaLabel', type: 'text', label: 'نص الزر' },
      ],
    },
    {
      id: 'collections',
      title: 'المجموعات المختارة',
      fields: [
        { key: 'collections.enabled', type: 'boolean', label: 'تفعيل القسم' },
        { key: 'collections.layout', type: 'select', label: 'التخطيط', options: ['four-cards', 'editorial-grid'] },
      ],
    },
    {
      id: 'productCard',
      title: 'بطاقة المنتج',
      fields: [
        { key: 'productCard.showRating', type: 'boolean', label: 'إظهار التقييم' },
        { key: 'productCard.showSalesCount', type: 'boolean', label: 'إظهار عدد المبيعات' },
        { key: 'productCard.showWishlist', type: 'boolean', label: 'إظهار المفضلة' },
        { key: 'productCard.imageRatio', type: 'select', label: 'أبعاد الصورة', options: ['1:1', '4:5'] },
      ],
    },
    {
      id: 'banners',
      title: 'البَنرات الداخلية',
      fields: [
        { key: 'banners.enabled', type: 'boolean', label: 'تفعيل البنرات' },
        { key: 'banners.defaultLayout', type: 'select', label: 'التخطيط الافتراضي', options: ['single', 'split', 'two-column', 'three-column'] },
        { key: 'banners.allowMixedLayouts', type: 'boolean', label: 'السماح بتنوع التخطيطات' },
      ],
    },
    {
      id: 'sliders',
      title: 'السلايدرات والعروض المتحركة',
      fields: [
        { key: 'sliders.hero.autoplay', type: 'boolean', label: 'تشغيل تلقائي للهيرو' },
        { key: 'sliders.hero.showArrows', type: 'boolean', label: 'أسهم الهيرو' },
        { key: 'sliders.hero.showDots', type: 'boolean', label: 'نقاط الهيرو' },
        { key: 'sliders.products.mode', type: 'select', label: 'وضع المنتجات', options: ['grid-or-carousel', 'grid', 'carousel'] },
        { key: 'sliders.gallery.showThumbnails', type: 'boolean', label: 'التصغيرات في معرض المنتج' },
      ],
    },
    {
      id: 'footer',
      title: 'الفوتر',
      fields: [
        { key: 'footer.density', type: 'select', label: 'الكثافة', options: ['compact', 'normal'] },
        { key: 'footer.showNewsletter', type: 'boolean', label: 'إظهار الاشتراك البريدي' },
      ],
    },
  ],
};
