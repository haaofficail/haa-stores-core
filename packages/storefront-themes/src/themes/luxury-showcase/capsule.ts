import type { ThemeCapsule, ThemeTokens, ThemeEditorSchema, ThemeSpecificConfig, ThemeCapabilityFlags, ThemePreviewMeta } from '../../contracts/theme-capsule';

export const luxuryTokens: ThemeTokens = {
  colors: {
    bg: '#FAF7F1',
    surface: '#FAF7F1',
    card: '#FAF7F1',
    section: '#FAF7F1',
    hero: '#FAF7F1',
    footer: '#FAF7F1',
    subtleSurface: '#FBF8F2',
    imageFrame: '#F7EFE6',
    primary: '#B88A3D',
    primaryHover: '#9D7432',
    text: '#2B2520',
    muted: '#756B61',
    textTertiary: '#A6947A',
    border: '#E6D8C6',
    softBorder: '#EFE4D6',
    shadow: 'rgba(43, 37, 32, 0.08)',
  },
  radius: {
    card: '6px',
    button: '3px',
    input: '3px',
    image: '4px',
  },
  spacing: {
    sectionY: '40px',
    sectionX: '32px',
    cardGap: '18px',
  },
  typography: {
    headingFamily: 'theme-serif',
    bodyFamily: 'theme-sans',
    heroSize: 'clamp(34px, 5vw, 68px)',
    sectionTitleSize: 'clamp(22px, 3vw, 36px)',
    productNameSize: '14px',
    bodySize: '14px',
  },
  shadows: {
    soft: '0 18px 50px rgba(43, 37, 32, 0.08)',
  },
};

export const luxuryDefaultConfig: ThemeSpecificConfig = {
  background: {
    mode: 'single',
    color: '#FAF7F1',
    surfaceColor: '#FAF7F1',
    cardColor: '#FAF7F1',
    allowSectionContrast: false,
  },
  hero: {
    title: 'عطور خالدة. لحظات لا تُنسى.',
    subtitle: 'جوهر الفخامة',
    description: 'تجربة عطرية راقية صُممت بعناية لتمنح كل لحظة حضورًا لا يُنسى.',
    ctaLabel: 'تسوق المجموعة',
    imageMode: 'editorial',
  },
  collections: {
    enabled: true,
    layout: 'four-cards',
    items: [
      { name: 'عطور رجالية', description: 'عطور رجالية فاخرة', imageUrl: '' },
      { name: 'عطور نسائية', description: 'عطور نسائية راقية', imageUrl: '' },
      { name: 'عود وبخور', description: 'دهن عود طبيعي وبخور فاخر', imageUrl: '' },
      { name: 'زيوت عطرية', description: 'زيوت عطرية مركزة فاخرة', imageUrl: '' },
    ],
  },
  productCard: {
    showRating: true,
    showSalesCount: true,
    showWishlist: true,
    imageRatio: '1:1',
  },
  banners: {
    enabled: true,
    mode: 'curated',
    defaultLayout: 'single',
    allowMixedLayouts: true,
    items: [
      {
        id: 'luxury-main',
        type: 'single',
        position: 'hero',
        title: 'عطور خالدة. لحظات لا تُنسى.',
        subtitle: 'تجربة عطرية راقية صُممت بعناية لتمنح كل لحظة حضورًا لا يُنسى.',
        ctaLabel: 'تسوق المجموعة',
        ctaUrl: '/products',
        enabled: true,
        sortOrder: 1,
      },
      {
        id: 'luxury-gift',
        type: 'thin-promo',
        position: 'between-products',
        title: 'تغليف فاخر للطلبات المختارة',
        ctaLabel: 'اكتشف الهدايا',
        ctaUrl: '/products?category=gifts',
        enabled: true,
        sortOrder: 2,
      },
      {
        id: 'luxury-story',
        type: 'story',
        position: 'before-footer',
        title: 'حكاية عطرية مصنوعة بعناية',
        subtitle: 'من المكونات الراقية إلى التغليف الأخير، كل تفصيل صُمم ليترك أثرًا.',
        ctaLabel: 'اقرأ القصة',
        ctaUrl: '/about',
        enabled: true,
        sortOrder: 3,
      },
    ],
  },
  sliders: {
    hero: {
      enabled: true,
      mode: 'slider',
      autoplay: false,
      showArrows: true,
      showDots: true,
      intervalMs: 5000,
      effect: 'slide',
    },
    banners: {
      enabled: true,
      autoplay: false,
      showArrows: true,
      showDots: false,
      intervalMs: 6000,
    },
    products: {
      enabled: true,
      mode: 'grid-or-carousel',
      showArrows: true,
      showDots: false,
      slidesPerView: { mobile: 2, tablet: 3, desktop: 4 },
    },
    collections: {
      enabled: true,
      showArrows: true,
      showDots: false,
    },
    gallery: {
      enabled: true,
      showThumbnails: true,
      showArrows: true,
      maxHeight: { mobile: 360, tablet: 460, desktop: 520 },
    },
  },
  footer: {
    density: 'compact',
    showNewsletter: true,
  },
};

export const luxuryEditorSchema: ThemeEditorSchema = {
  groups: [
    {
      id: 'background',
      title: 'خلفية المتجر',
      fields: [
        { key: 'background.mode', type: 'select', label: 'نمط الخلفية', options: ['single', 'sectioned', 'editorial'] },
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

export const luxuryCapabilities: ThemeCapabilityFlags = {
  supportsHero: true,
  supportsCollections: true,
  supportsStorySection: true,
  supportsProductBadges: true,
  supportsReviews: true,
  supportsSalesCount: true,
  supportsNewsletter: true,
  supportsTrustBadges: true,
  supportsCustomFooter: true,
};

export const luxuryPreview: ThemePreviewMeta = {
  description: 'A premium product-focused storefront theme for perfumes and luxury goods.',
  descriptionAr: 'ثيم فاخر يركز على عرض المنتج كقطعة راقية — مثالي للعطور والمنتجات الفاخرة.',
  sampleStoreType: 'perfume',
};

export const luxuryShowcaseCapsule: ThemeCapsule = {
  key: 'luxury-showcase',
  name: 'Luxury Showcase',
  nameAr: 'لاكجري شوكيس',
  category: 'luxury',
  version: '0.1.0',
  tokens: luxuryTokens,
  defaultConfig: luxuryDefaultConfig,
  editorSchema: luxuryEditorSchema,
  preview: luxuryPreview,
  capabilities: luxuryCapabilities,
};
