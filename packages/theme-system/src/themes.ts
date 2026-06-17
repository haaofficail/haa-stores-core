// minimal / royal / night / nature are legacy config presets (kind: 'config-preset'),
// not full runtime storefront themes. They provide color/font/layout defaults for
// backward compatibility with stores created before the runtime theme system.
// Only kind: 'runtime' themes (e.g. luxury-showcase) appear in the Theme Store.
import { type ThemeDefinition, type SectionConfig, type HeroSlide } from './types';
import { generateThemeThumbnail } from './thumbnail.js';

let sectionCounter = 0;
function sec(type: SectionConfig['type'], overrides: Partial<SectionConfig> = {}): SectionConfig {
  sectionCounter++;
  return {
    id: `section-${sectionCounter}-${Date.now()}`,
    type,
    enabled: true,
    title: ({ products: 'منتجات', banner: 'بنر', categories: 'تصنيفات', offers: 'عروض', discounted: 'مخفضة', featured: 'مميزة', newest: 'أحدث', bestSellers: 'الأكثر مبيعاً', text: 'نص', imageText: 'صورة ونص', brands: 'البراندات', faq: 'الأسئلة الشائعة' })[type],
    settings: {},
    ...overrides,
  };
}

const DEFAULT_SECTIONS: SectionConfig[] = [
  sec('banner', { title: 'بنر رئيسي', settings: { imageUrl: '', imageMobileUrl: '', linkType: 'all', linkValue: '', height: 450, display: 'full', subtitle: 'تسوق بأمان', description: 'منتجات أصلية 100% مع ضمان الإرجاع', buttonText: 'تسوق الآن', openInNewTab: false, hideOnMobile: false, hideOnDesktop: false } }),
  sec('categories', { title: 'التصنيفات', settings: { categoryLimit: 8, categoryLayout: 'grid' } }),
  sec('banner', { title: 'بنر ترويجي', settings: { imageUrl: '', imageMobileUrl: '', linkType: 'all', linkValue: '', height: 300, display: 'contained', subtitle: 'عروض حصرية', description: 'خصومات تصل إلى 50% على تشكيلة واسعة', buttonText: 'استكشف العروض', openInNewTab: false, hideOnMobile: false, hideOnDesktop: false } }),
  sec('bestSellers', { title: 'الأكثر مبيعاً', settings: { source: 'bestSellers', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' } }),
  sec('discounted', { title: 'منتجات مخفضة', settings: { source: 'discounted', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' } }),
  sec('newest', { title: 'وصل حديثاً', settings: { source: 'newest', limit: 8, layout: 'grid', animated: true, slider: { autoplay: true, speed: 3000, showArrows: true, showDots: false }, showMoreButton: true, showMoreUrl: '' } }),
  sec('offers', { title: 'عروض اليوم', settings: { source: 'discounted', limit: 4, layout: 'slider', animated: true, slider: { autoplay: true, speed: 4000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' } }),
  sec('featured', { title: 'منتجات مميزة', settings: { source: 'featured', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' } }),
  sec('text', { title: 'نبذة عن المتجر', settings: { content: '<h2 style="font-size:1.25rem;font-weight:700;margin-bottom:0.5rem">مرحباً بكم في متجرنا</h2><p>نقدم لكم أفضل المنتجات بأسعار تنافسية مع خدمة توصيل سريعة ودعم فني متواصل. تسوق الآن واستمتع بتجربة فريدة.</p>', alignment: 'center' } }),
  sec('imageText', { title: 'قصتنا', settings: { imageUrl: '', content: '<h2 style="font-size:1.25rem;font-weight:700;margin-bottom:0.5rem">علامتنا التجارية</h2><p>نحن فريق من المحترفين نعمل بجد لنقدم لك أفضل تجربة تسوق. الجودة والثقة هما أساس عملنا.</p>', imagePosition: 'right', alignment: 'right' } }),
];
function homepage(sections: SectionConfig[], heroSlider?: HeroSlide[]) {
  return { sections, sectionOrder: sections.map((section) => section.type), ...(heroSlider ? { heroSlider } : {}) };
}
const BASE_LAYOUT = { productCardColumns: 4, productCardStyle: 'rounded', imageAspectRatio: 'square', showRating: true, showSalesCount: true, showStockBadge: true, showCategory: true, showDiscountBadge: true, showCountdown: true, categoryCardSize: 3 };
const BASE_HOMEPAGE = homepage(DEFAULT_SECTIONS);
const BASE_HEADER = { showAnnouncementBar: true, announcementText: '', stickyHeader: true, showSearch: true, showCart: true, showAccount: true };
const BASE_FOOTER = { showPaymentLogos: true, showSocialLinks: true, showNewsletter: true, companyDescription: '' };
const BASE_SOCIAL = { instagram: '', twitter: '', tiktok: '', snapchat: '', whatsapp: '' };
const NO_ANALYTICS = { googleTagManagerId: '', googleAnalyticsId: '', facebookPixelId: '' };
const BASE_TRUST_BADGES = {
  businessPlatform: { enabled: false, verificationNumber: '', verificationUrl: '', acceptedTerms: false },
  commercialRegistration: { enabled: false, crNumber: '', verificationUrl: '', acceptedTerms: false },
  unifiedQr: { enabled: false, qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://haa-stores.com', qrTargetUrl: 'https://haa-stores.com', acceptedTerms: false },
  maroof: { enabled: false, maroofNumber: '', verificationUrl: '', acceptedTerms: false, legacy: true as const },
  saudiMade: { enabled: false, membershipNumber: '', verificationUrl: '', acceptedTerms: false, officialAssetUrl: '', memberConfirmed: false },
  vat: { enabled: false, vatNumber: '', verificationUrl: '', acceptedTerms: false },
};

function thumb(c: Record<string, string>) {
  return generateThemeThumbnail(c as any);
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'minimal', name: 'Minimal', nameAr: 'بسيط',
    description: 'Clean modern design with a focus on product imagery. Perfect for fashion and lifestyle stores.',
    descriptionAr: 'تصميم نظيف وعصري يركز على صور المنتجات. مثالي لمتاجر الأزياء ونمط الحياة.',
    author: 'Haa Studio', price: 0, featured: true, kind: 'config-preset',
    categories: ['أزياء', 'إلكترونيات', 'عام'],
    tags: ['خفيف', 'سريع', 'عصري'],
    screenshotUrl: thumb({ primary: '#58a1e2', surface1: '#ffffff', surface2: '#f8f9fa', surface3: '#f1f3f5', textPrimary: '#1a1a1a', textSecondary: '#6b7280', textTertiary: '#9ca3af', border: '#e5e7eb', borderHover: '#d1d5db', success: '#10b981', warning: '#f59e0b', error: '#ef4444', headerBackground: '#ffffff', headerText: '#4b5563', announcementBackground: '#58a1e2', announcementText: '#ffffff' }),
    demoUrl: undefined,
    config: {
      preset: 'minimal',
      colors: { primary: '#58a1e2', surface1: '#ffffff', surface2: '#f8f9fa', surface3: '#f1f3f5', textPrimary: '#1a1a1a', textSecondary: '#6b7280', textTertiary: '#9ca3af', border: '#e5e7eb', borderHover: '#d1d5db', success: '#10b981', warning: '#f59e0b', error: '#ef4444', headerBackground: '#ffffff', headerText: '#4b5563', announcementBackground: '#58a1e2', announcementText: '#ffffff' },
      font: { family: 'IBM Plex Sans Arabic', url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap', headingsSize: '1.5rem', bodySize: '1rem' },
      layout: { ...BASE_LAYOUT }, homepage: { ...BASE_HOMEPAGE }, header: { ...BASE_HEADER }, footer: { ...BASE_FOOTER }, socialLinks: { ...BASE_SOCIAL }, customCss: '', analytics: { ...NO_ANALYTICS }, trustBadges: { ...BASE_TRUST_BADGES },
    },
  },
  {
    id: 'royal', name: 'Royal', nameAr: 'فخم',
    description: 'Elegant gold-accented design for premium brands and luxury goods.',
    descriptionAr: 'تصميم أنيق مع لمسات ذهبية للماركات الفاخرة والمنتجات الراقية.',
    author: 'Haa Studio', price: 0, featured: true, kind: 'config-preset',
    categories: ['فخم', 'عطور', 'هدايا'],
    tags: ['ذهبي', 'فاخر', 'أنيق'],
    screenshotUrl: thumb({ primary: '#b8860b', surface1: '#faf8f5', surface2: '#f0ece4', surface3: '#e8e2d5', textPrimary: '#2d1810', textSecondary: '#7a6b5a', textTertiary: '#b8a99a', border: '#d4c9b8', borderHover: '#c4b9a8', success: '#2d6a4f', warning: '#d4a017', error: '#8b1a1a', headerBackground: '#faf8f5', headerText: '#2d1810', announcementBackground: '#b8860b', announcementText: '#ffffff' }),
    demoUrl: undefined,
    config: {
      preset: 'royal',
      colors: { primary: '#b8860b', surface1: '#faf8f5', surface2: '#f0ece4', surface3: '#e8e2d5', textPrimary: '#2d1810', textSecondary: '#7a6b5a', textTertiary: '#b8a99a', border: '#d4c9b8', borderHover: '#c4b9a8', success: '#2d6a4f', warning: '#d4a017', error: '#8b1a1a', headerBackground: '#faf8f5', headerText: '#2d1810', announcementBackground: '#b8860b', announcementText: '#ffffff' },
      font: { family: 'IBM Plex Sans Arabic', url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap', headingsSize: '1.75rem', bodySize: '1rem' },
      layout: { ...BASE_LAYOUT, productCardColumns: 3, imageAspectRatio: '4:3' },
      homepage: homepage([
        sec('banner', { title: 'بنر رئيسي', settings: { imageUrl: '', imageMobileUrl: '', linkType: 'all', linkValue: '', height: 400, display: 'contained', openInNewTab: false, hideOnMobile: false, hideOnDesktop: false } }),
        sec('categories', { title: 'التصنيفات', settings: { categoryLimit: 8, categoryLayout: 'grid' } }),
        sec('bestSellers', { title: 'الأكثر مبيعاً', settings: { source: 'bestSellers', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' } }),
        sec('newest', { title: 'وصل حديثاً', settings: { source: 'newest', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' } }),
        sec('offers', { title: 'عروض اليوم', settings: { source: 'discounted', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' } }),
        sec('featured', { title: 'منتجات مميزة', settings: { source: 'featured', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' } }),
      ]),
      header: { ...BASE_HEADER }, footer: { ...BASE_FOOTER, showNewsletter: false }, socialLinks: { ...BASE_SOCIAL }, customCss: '', analytics: { ...NO_ANALYTICS }, trustBadges: { ...BASE_TRUST_BADGES },
    },
  },
  {
    id: 'night', name: 'Night', nameAr: 'ليلي',
    description: 'Dark modern theme. Great for tech, gaming, and electronics stores.',
    descriptionAr: 'ثيم داكن عصري. رائع لمتاجر التقنية والألعاب والإلكترونيات.',
    author: 'Haa Studio', price: 0, featured: true, kind: 'config-preset',
    categories: ['إلكترونيات', 'تقنية', 'ألعاب'],
    tags: ['داكن', 'عصري', 'قوي'],
    screenshotUrl: thumb({ primary: '#60a5fa', surface1: '#111827', surface2: '#1f2937', surface3: '#374151', textPrimary: '#f9fafb', textSecondary: '#d1d5db', textTertiary: '#9ca3af', border: '#374151', borderHover: '#4b5563', success: '#34d399', warning: '#fbbf24', error: '#f87171', headerBackground: '#1f2937', headerText: '#f9fafb', announcementBackground: '#1e3a5f', announcementText: '#f9fafb' }),
    demoUrl: undefined,
    config: {
      preset: 'night',
      colors: { primary: '#60a5fa', surface1: '#111827', surface2: '#1f2937', surface3: '#374151', textPrimary: '#f9fafb', textSecondary: '#d1d5db', textTertiary: '#9ca3af', border: '#374151', borderHover: '#4b5563', success: '#34d399', warning: '#fbbf24', error: '#f87171', headerBackground: '#1f2937', headerText: '#f9fafb', announcementBackground: '#1e3a5f', announcementText: '#f9fafb' },
      font: { family: 'Cairo', url: 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap', headingsSize: '1.5rem', bodySize: '1rem' },
      layout: { ...BASE_LAYOUT }, homepage: { ...BASE_HOMEPAGE }, header: { ...BASE_HEADER, showAnnouncementBar: false }, footer: { ...BASE_FOOTER, showNewsletter: false }, socialLinks: { ...BASE_SOCIAL }, customCss: '', analytics: { ...NO_ANALYTICS }, trustBadges: { ...BASE_TRUST_BADGES },
    },
  },
  {
    id: 'nature', name: 'Nature', nameAr: 'طبيعة',
    description: 'Fresh green theme with organic feel. Perfect for health, organic, and eco-friendly stores.',
    descriptionAr: 'ثيم أخضر منعش بطابع عضوي. مثالي لمتاجر الصحة والعضويات والمنتجات الصديقة للبيئة.',
    author: 'Haa Studio', price: 0, featured: false, kind: 'config-preset',
    categories: ['صحة', 'عناية', 'عضوي'],
    tags: ['طبيعي', 'هادئ', 'عصري'],
    screenshotUrl: thumb({ primary: '#059669', surface1: '#f0fdf4', surface2: '#dcfce7', surface3: '#bbf7d0', textPrimary: '#14532d', textSecondary: '#166534', textTertiary: '#4ade80', border: '#bbf7d0', borderHover: '#86efac', success: '#059669', warning: '#d97706', error: '#dc2626', headerBackground: '#f0fdf4', headerText: '#14532d', announcementBackground: '#059669', announcementText: '#ffffff' }),
    demoUrl: undefined,
    config: {
      preset: 'nature',
      colors: { primary: '#059669', surface1: '#f0fdf4', surface2: '#dcfce7', surface3: '#bbf7d0', textPrimary: '#14532d', textSecondary: '#166534', textTertiary: '#4ade80', border: '#bbf7d0', borderHover: '#86efac', success: '#059669', warning: '#d97706', error: '#dc2626', headerBackground: '#f0fdf4', headerText: '#14532d', announcementBackground: '#059669', announcementText: '#ffffff' },
      font: { family: 'Tajawal', url: 'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap', headingsSize: '1.5rem', bodySize: '1rem' },
      layout: { ...BASE_LAYOUT },       homepage: homepage([
        sec('banner', { title: 'بنر رئيسي', settings: { imageUrl: '', imageMobileUrl: '', linkType: 'all', linkValue: '', height: 400, display: 'contained', openInNewTab: false, hideOnMobile: false, hideOnDesktop: false } }),
        sec('categories', { title: 'التصنيفات', settings: { categoryLimit: 8, categoryLayout: 'grid' } }),
        sec('bestSellers', { title: 'الأكثر مبيعاً', settings: { source: 'bestSellers', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' } }),
        sec('newest', { title: 'وصل حديثاً', settings: { source: 'newest', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' } }),
        sec('featured', { title: 'منتجات مميزة', settings: { source: 'featured', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' } }),
      ]),
      header: { ...BASE_HEADER, announcementText: 'توصيل مجاني للطلبات فوق 300 ريال' }, footer: { ...BASE_FOOTER }, socialLinks: { ...BASE_SOCIAL }, customCss: '', analytics: { ...NO_ANALYTICS }, trustBadges: { ...BASE_TRUST_BADGES },
  },
  },
  {
    id: 'luxury-showcase', name: 'Luxury Showcase', nameAr: 'لاكجري شوكيس',
    description: 'A premium product-focused storefront theme with warm tones, minimal elegance, and terracotta accents. Ideal for luxury brands and exclusive boutiques.',
    descriptionAr: 'ثيم فاخر يركز على عرض المنتج كقطعة راقية بألوان دافئة وأناقة بسيطة مع لمسات تراكوتا. مثالي للماركات الفاخرة والبوتيكات الحصرية.',
    author: 'Haa Studio', price: 0, featured: true, kind: 'runtime',
    categories: ['فخم', 'عطور', 'إلكترونيات'],
    tags: ['فاخر', 'بسيط', 'دافئ'],
    screenshotUrl: thumb({ primary: '#a65d4e', surface1: '#faf8f6', surface2: '#f4efe9', surface3: '#f0ece8', textPrimary: '#1a1a1a', textSecondary: '#6b635b', textTertiary: '#8a7e72', border: '#f0ece8', borderHover: '#e5ddd5', success: '#2a5a3b', warning: '#a65d4e', error: '#8b1a1a', headerBackground: '#faf8f6', headerText: '#1a1a1a', announcementBackground: '#f4efe9', announcementText: '#6b635b' }),
    demoUrl: undefined,
    config: {
      preset: 'luxury-showcase',
      colors: { primary: '#a65d4e', surface1: '#faf8f6', surface2: '#f4efe9', surface3: '#f0ece8', textPrimary: '#1a1a1a', textSecondary: '#6b635b', textTertiary: '#8a7e72', border: '#f0ece8', borderHover: '#e5ddd5', success: '#2a5a3b', warning: '#a65d4e', error: '#8b1a1a', headerBackground: '#faf8f6', headerText: '#1a1a1a', announcementBackground: '#f4efe9', announcementText: '#6b635b' },
      font: { family: 'IBM Plex Sans Arabic', url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap', headingsSize: '1.5rem', bodySize: '1rem' },
      layout: { ...BASE_LAYOUT, productCardColumns: 3, productCardStyle: 'square', categoryCardSize: 3 },
      homepage: homepage([
        sec('categories', { title: 'التصنيفات', settings: { categoryLimit: 6, categoryLayout: 'grid' } }),
        sec('newest', { title: 'وصل حديثاً', settings: { source: 'newest', limit: 8, layout: 'grid', animated: true, slider: { autoplay: true, speed: 3000, showArrows: true, showDots: false }, showMoreButton: true, showMoreUrl: '' } }),
        sec('bestSellers', { title: 'الأكثر مبيعاً', settings: { source: 'bestSellers', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' } }),
        sec('discounted', { title: 'منتجات مخفضة', settings: { source: 'discounted', limit: 4, layout: 'slider', animated: true, slider: { autoplay: true, speed: 4000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' } }),
      ], [
        { imageUrl: '', title: 'تشكيلة حصرية', description: 'منتجات مختارة بعناية لتجربة تسوق فاخرة', buttonText: 'اكتشف المجموعة' },
        { imageUrl: '', title: 'تصاميم عصرية', description: 'أحدث الصيحات العالمية في عالم الموضة', buttonText: 'تسوق الآن' },
        { imageUrl: '', title: 'عروض خاصة', description: 'خصومات مميزة على تشكيلة واسعة من المنتجات', buttonText: 'استكشف العروض' },
      ]),
      header: { ...BASE_HEADER, announcementText: 'شحن مجاني للطلبات فوق 500 ريال' },
      footer: { ...BASE_FOOTER, showNewsletter: false },
      socialLinks: { ...BASE_SOCIAL },
      customCss: '',
      analytics: { ...NO_ANALYTICS },
      trustBadges: { ...BASE_TRUST_BADGES },
    },
  },
];

export function getThemeById(id: string): ThemeDefinition | undefined {
  return THEMES.find(t => t.id === id);
}
