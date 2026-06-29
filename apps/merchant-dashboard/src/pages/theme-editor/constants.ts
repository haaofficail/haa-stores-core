// Static constants extracted verbatim from ThemeEditor.tsx — no behavior change.
import { getAllThemeManifests, type ThemeConfig as BaseThemeConfig } from '@haa/theme-system/server';

export const FONT_OPTIONS = [
  { label: 'IBM Plex Sans Arabic', value: 'IBM Plex Sans Arabic', url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap' },
  { label: 'Cairo', value: 'Cairo', url: 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap' },
  { label: 'Tajawal', value: 'Tajawal', url: 'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap' },
  { label: 'Noto Kufi Arabic', value: 'Noto Kufi Arabic', url: 'https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@300;400;500;600;700&display=swap' },
  { label: 'Readex Pro', value: 'Readex Pro', url: 'https://fonts.googleapis.com/css2?family=Readex+Pro:wght@300;400;500;600;700&display=swap' },
];

export const SECTION_LABELS: Record<string, string> = {
  products: 'منتجات', banner: 'بنر', categories: 'تصنيفات', offers: 'عروض',
  discounted: 'منتجات مخفضة', featured: 'منتجات مميزة', newest: 'أحدث المنتجات',
  bestSellers: 'الأكثر مبيعاً', text: 'نص', imageText: 'صورة ونص',
  brands: 'البراندات', faq: 'الأسئلة الشائعة',
};

export const THEME_MANIFESTS = getAllThemeManifests();
export const HOMEPAGE_SECTIONS_EDITOR_ENABLED = true;

export const ANALYTICS_PATTERNS: Record<string, RegExp> = {
  googleTagManagerId: /^GTM-[A-Z0-9]+$/,
  googleAnalyticsId: /^(G-[A-Z0-9]+|UA-\d+-\d+)$/,
  facebookPixelId: /^\d+$/,
};

export type BrandItem = { imageUrl: string; linkUrl?: string; name?: string };
export type FaqItem = { question: string; answer: string };
export type SliderSettings = { autoplay?: boolean; speed?: number; showArrows?: boolean; showDots?: boolean };
export type SectionSettings = {
  imageUrl?: string;
  imageMobileUrl?: string;
  subtitle?: string;
  description?: string;
  buttonText?: string;
  linkType?: string;
  linkValue?: string;
  height?: number;
  display?: string;
  openInNewTab?: boolean;
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
  source?: string;
  productIds?: Array<number | string>;
  categoryId?: number | null;
  limit?: number;
  layout?: string;
  animated?: boolean;
  slider?: SliderSettings;
  productCardSize?: number;
  showMoreUrl?: string;
  showMoreButton?: boolean;
  categoryIds?: number[];
  categoryLimit?: number;
  categoryLayout?: string;
  content?: string;
  alignment?: string;
  imagePosition?: string;
  items?: BrandItem[] | FaqItem[];
  speed?: number;
  [key: string]: string | number | boolean | null | undefined | Array<number | string> | BrandItem[] | FaqItem[] | SliderSettings;
};
export type HomepageSection = {
  id: string;
  type: string;
  enabled?: boolean;
  title?: string;
  settings?: SectionSettings;
};

export const SECTION_DEFAULT_SETTINGS: Record<string, SectionSettings> = {
  banner: { imageUrl: '', imageMobileUrl: '', linkType: 'all', linkValue: '', height: 400, display: 'contained', openInNewTab: false, hideOnMobile: false, hideOnDesktop: false },
  products: { source: 'newest', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' },
  bestSellers: { source: 'bestSellers', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' },
  newest: { source: 'newest', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' },
  offers: { source: 'discounted', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' },
  discounted: { source: 'discounted', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' },
  featured: { source: 'featured', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' },
  categories: { categoryLimit: 6, categoryLayout: 'grid' },
  text: { content: '', alignment: 'center' },
  imageText: { imageUrl: '', content: '', imagePosition: 'right', alignment: 'center' },
  brands: { items: [], speed: 1 },
  faq: { items: [] },
};

export type ThemeConfig = BaseThemeConfig & {
  themeKey?: string;
  homepage: BaseThemeConfig['homepage'] & { sections?: HomepageSection[] };
};
export type CategoryItem = { id: number; name: string; slug: string };
export type ProductItem = {
  id: number;
  name: string;
  slug: string;
  status?: string;
  categoryId?: number | string | null;
  salesCount?: number | null;
  compareAtPrice?: string | number | null;
  price?: string | number | null;
};
