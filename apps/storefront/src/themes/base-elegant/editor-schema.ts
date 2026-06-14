import type { ThemeEditorSchema } from '@haa/storefront-themes';

export const baseElegantEditorSchema: ThemeEditorSchema = {
  groups: [
    {
      id: 'colors',
      title: 'الألوان',
      fields: [
        { key: 'colors.primary', type: 'color', label: 'اللون الأساسي' },
        { key: 'colors.surface1', type: 'color', label: 'الخلفية الأساسية' },
        { key: 'colors.surface2', type: 'color', label: 'الخلفية الثانوية' },
        { key: 'colors.surface3', type: 'color', label: 'الخلفية الثالثة' },
        { key: 'colors.textPrimary', type: 'color', label: 'لون النص الأساسي' },
        { key: 'colors.textSecondary', type: 'color', label: 'لون النص الثانوي' },
        { key: 'colors.textTertiary', type: 'color', label: 'لون النص المساعد' },
        { key: 'colors.headerBackground', type: 'color', label: 'خلفية الهيدر' },
        { key: 'colors.headerText', type: 'color', label: 'نص الهيدر' },
        { key: 'colors.announcementBackground', type: 'color', label: 'خلفية الإعلانات' },
        { key: 'colors.announcementText', type: 'color', label: 'نص الإعلانات' },
      ],
    },
    {
      id: 'fonts',
      title: 'الخطوط',
      fields: [
        { key: 'font.family', type: 'text', label: 'نوع الخط' },
        { key: 'font.headingsSize', type: 'text', label: 'حجم العناوين' },
        { key: 'font.bodySize', type: 'text', label: 'حجم النص' },
      ],
    },
    {
      id: 'layout',
      title: 'التخطيط',
      fields: [
        { key: 'layout.productCardColumns', type: 'text', label: 'عدد أعمدة المنتجات' },
        { key: 'layout.showRating', type: 'boolean', label: 'إظهار التقييم' },
        { key: 'layout.showSalesCount', type: 'boolean', label: 'إظهار المبيعات' },
        { key: 'layout.showStockBadge', type: 'boolean', label: 'إظهار المخزون' },
        { key: 'layout.showDiscountBadge', type: 'boolean', label: 'إظهار الخصم' },
      ],
    },
    {
      id: 'homepage',
      title: 'الصفحة الرئيسية',
      fields: [
        { key: 'header.showAnnouncementBar', type: 'boolean', label: 'شريط الإعلانات' },
        { key: 'header.stickyHeader', type: 'boolean', label: 'هيدر ثابت' },
        { key: 'footer.showPaymentLogos', type: 'boolean', label: 'شعارات الدفع' },
        { key: 'footer.showNewsletter', type: 'boolean', label: 'الاشتراك البريدي' },
      ],
    },
  ],
};
