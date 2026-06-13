export interface ThemeColors {
  primary: string; surface1: string; surface2: string; surface3: string;
  textPrimary: string; textSecondary: string; textTertiary: string;
  border: string; borderHover: string; success: string; warning: string; error: string;
  headerBackground: string; headerText: string;
  announcementBackground: string; announcementText: string;
}

export interface ThemeFont {
  family: string; url: string; headingsSize: string; bodySize: string;
}

export interface ThemeLayout {
  productCardColumns: number; productCardStyle: string; imageAspectRatio: string;
  showRating: boolean; showSalesCount: boolean; showStockBadge: boolean;
  showCategory: boolean; showDiscountBadge: boolean; showCountdown: boolean;
  categoryCardSize: number;
}

export interface TrustBadgeItem {
  icon: string;
  title: string;
  description: string;
}

export type BannerLinkType = 'all' | 'category' | 'product' | 'custom';

export interface BannerItem {
  imageUrl: string;
  imageMobileUrl?: string;
  title: string;
  description: string;
  buttonText: string;
  linkType: BannerLinkType;
  linkValue: string;
  sizeGuideUrl?: string;
}

export type SectionType = 'products' | 'banner' | 'categories' | 'offers' | 'discounted' | 'featured' | 'newest' | 'bestSellers' | 'text' | 'imageText' | 'brands' | 'faq';

export interface BrandItem {
  imageUrl: string;
  linkUrl?: string;
  name?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface SectionConfig {
  id: string;
  type: SectionType;
  enabled: boolean;
  title: string;
  settings: {
    source?: 'manual' | 'category' | 'newest' | 'bestSellers' | 'discounted' | 'featured';
    categoryId?: number | null;
    productIds?: number[];
    limit?: number;
    layout?: 'grid' | 'slider' | 'horizontal';
    animated?: boolean;
    slider?: { autoplay?: boolean; speed?: number; showArrows?: boolean; showDots?: boolean };
    showMoreButton?: boolean;
    showMoreUrl?: string;
    imageUrl?: string;
    imageMobileUrl?: string;
    subtitle?: string;
    description?: string;
    buttonText?: string;
    linkUrl?: string;
    linkType?: BannerLinkType;
    linkValue?: string;
    openInNewTab?: boolean;
    height?: number;
    display?: 'full' | 'contained' | 'wide';
    hideOnMobile?: boolean;
    hideOnDesktop?: boolean;
    categoryLimit?: number;
    categoryLayout?: 'grid' | 'slider';
    categoryIds?: number[];
    productCardSize?: number;
    content?: string;
    imagePosition?: 'left' | 'right';
    alignment?: 'right' | 'center' | 'left';
  };
}

export type SectionConfigs = SectionConfig[];

export interface HeroSlide {
  imageUrl: string;
  imageMobileUrl?: string;
  title?: string;
  description?: string;
  buttonText?: string;
  linkType?: string;
  linkValue?: string;
  openInNewTab?: boolean;
}

export interface ThemeHomepage {
  sections: SectionConfig[];
  sectionOrder?: string[];
  heroSlider?: HeroSlide[];
}

export interface ThemeHeader {
  showAnnouncementBar: boolean; announcementText: string; stickyHeader: boolean;
  showSearch: boolean; showCart: boolean; showAccount: boolean;
}

export interface ThemeFooter {
  showPaymentLogos: boolean; showSocialLinks: boolean; showNewsletter: boolean;
  companyDescription: string;
}

export interface ThemeSocialLinks {
  instagram: string; twitter: string; tiktok: string; snapchat: string; whatsapp: string;
}

export interface TrustBadgesConfig {
  businessPlatform: {
    enabled: boolean;
    verificationNumber?: string;
    verificationUrl?: string;
    acceptedTerms: boolean;
  };
  commercialRegistration: {
    enabled: boolean;
    crNumber?: string;
    verificationUrl?: string;
    acceptedTerms: boolean;
  };
  unifiedQr: {
    enabled: boolean;
    qrImageUrl?: string;
    qrTargetUrl?: string;
    acceptedTerms: boolean;
  };
  maroof: {
    enabled: boolean;
    maroofNumber?: string;
    verificationUrl?: string;
    acceptedTerms: boolean;
    legacy: true;
  };
  saudiMade: {
    enabled: boolean;
    membershipNumber?: string;
    verificationUrl?: string;
    acceptedTerms: boolean;
    officialAssetUrl?: string;
    memberConfirmed: boolean;
  };
  vat: {
    enabled: boolean;
    vatNumber?: string;
    verificationUrl?: string;
    acceptedTerms: boolean;
  };
}

export interface ThemeAnalytics {
  googleTagManagerId: string; googleAnalyticsId: string; facebookPixelId: string;
}

export interface ThemeConfig {
  preset: string;
  themeKey?: string;
  colors: ThemeColors;
  font: ThemeFont;
  layout: ThemeLayout;
  homepage: ThemeHomepage;
  header: ThemeHeader;
  footer: ThemeFooter;
  socialLinks: ThemeSocialLinks;
  customCss: string;
  analytics: ThemeAnalytics;
  trustBadges: TrustBadgesConfig;
}

export interface PublicThemeConfig {
  colors: Partial<ThemeColors>;
  font: Pick<ThemeFont, 'family' | 'url'>;
  layout: Partial<ThemeLayout>;
  customCss: string;
  socialLinks: Partial<ThemeSocialLinks>;
}

export type ThemeKind = 'config-preset' | 'runtime';

export interface ThemeDefinition {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  author: string;
  price: number;
  featured: boolean;
  kind: ThemeKind;
  categories?: string[];
  tags?: string[];
  screenshotUrl: string;
  demoUrl?: string;
  config: ThemeConfig;
}

export type ThemeStatus = 'stable' | 'beta' | 'experimental';

export type ThemeCategory =
  | 'minimal'
  | 'luxury'
  | 'dark'
  | 'nature'
  | 'general';

export type ThemeSupportedPage =
  | 'home'
  | 'category'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'track'
  | 'about'
  | 'contact';

export interface ThemePreview {
  thumbnailUrl: string;
  demoUrl?: string;
}

export interface ThemeSettingsDefinition {
  colors: boolean;
  font: boolean;
  layout: boolean;
  homepage: boolean;
  header: boolean;
  footer: boolean;
  socialLinks: boolean;
  analytics: boolean;
  customCss: boolean;
}

export interface ThemeCapabilities {
  featured: boolean;
  free: boolean;
  configurableColors: boolean;
  configurableFonts: boolean;
  configurableLayout: boolean;
  customCss: boolean;
  analytics: boolean;
}

export interface ThemeManifest {
  themeKey: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  version: string;
  status: ThemeStatus;
  kind: ThemeKind;
  category: ThemeCategory;
  author: string;
  price: number;
  supportsRTL: boolean;
  supportedPages: ThemeSupportedPage[];
  preview: ThemePreview;
  settingsDefinition: ThemeSettingsDefinition;
  defaultConfig: ThemeConfig;
  capabilities: ThemeCapabilities;
  tags: string[];
  categories: string[];
}
