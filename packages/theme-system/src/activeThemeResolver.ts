import {
  getDefaultThemeKey,
  getThemeDefaultConfig,
  isKnownThemeKey,
  normalizeThemeKey,
} from './themeRegistry.js';
import type { ThemeConfig, SectionConfig } from './types.js';

export type ThemeKey = 'minimal' | 'royal' | 'night' | 'nature';

export type ResolvedThemeConfig = ThemeConfig & {
  themeKey: ThemeKey;
};

let sectionCounter = 0;
function generateSectionId(): string {
  sectionCounter++;
  return `section-${sectionCounter}-${Date.now()}`;
}

function oldShowToSectionType(key: string): SectionConfig['type'] | null {
  const map: Record<string, SectionConfig['type']> = {
    categories: 'categories',
    bestSellers: 'bestSellers',
    newArrivals: 'newest',
    todayDeals: 'offers',
    featured: 'featured',
  };
  return map[key] ?? null;
}

function hasOldHomepageData(hp: Record<string, unknown>): boolean {
  return Array.isArray(hp.sectionOrder) || Array.isArray(hp.banners) || Array.isArray(hp.trustBadges) ||
    hp.showBanner !== undefined || hp.showTrustBadges !== undefined;
}

function migrateHomepage(homepage: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!homepage || typeof homepage !== 'object') return {};
  if (Array.isArray(homepage.sections)) {
    return {
      ...homepage,
      sectionOrder: Array.isArray(homepage.sectionOrder)
        ? homepage.sectionOrder
        : homepage.sections.map((section: any) => section?.type).filter((type): type is string => typeof type === 'string'),
    };
  }

  const needsMigration = hasOldHomepageData(homepage);
  if (!needsMigration) return homepage;

  const sections: SectionConfig[] = [];
  const oldOrder: string[] = Array.isArray(homepage.sectionOrder)
    ? homepage.sectionOrder
    : ['banner', 'categories', 'bestSellers', 'newArrivals', 'todayDeals', 'featured'];
  const banners: any[] = Array.isArray(homepage.banners) ? homepage.banners : [];
  const trustBadges: any[] = Array.isArray(homepage.trustBadges) ? homepage.trustBadges : [];
  const instanceData: Record<string, any> = (homepage.instanceData as Record<string, any>) || {};

  for (const item of oldOrder) {
    if (item === 'banner') {
      for (const b of banners) {
        sections.push({
          id: generateSectionId(),
          type: 'banner',
          enabled: homepage.showBanner !== false,
          title: b.title || 'بنر',
          settings: {
            imageUrl: b.imageUrl || '',
            imageMobileUrl: b.imageMobileUrl || '',
            subtitle: b.title || '',
            description: b.description || '',
            buttonText: b.buttonText || '',
            linkType: b.linkType || 'all',
            linkValue: b.linkValue || '',
            openInNewTab: false, height: 400, display: 'contained' as const,
            hideOnMobile: false, hideOnDesktop: false,
          },
        });
      }
    } else if (item === 'marketing') {
      const mBanners = Array.isArray(homepage.marketingBanners) ? homepage.marketingBanners : banners;
      for (const b of mBanners.slice(0, 1)) {
        sections.push({
          id: generateSectionId(),
          type: 'banner',
          enabled: homepage.showMarketingBanner !== false,
          title: 'بنر تسويقي',
          settings: {
            imageUrl: b.imageUrl || '', imageMobileUrl: b.imageMobileUrl || '', subtitle: b.title || '',
            description: b.description || '', buttonText: b.buttonText || '', linkType: b.linkType || 'all',
            linkValue: b.linkValue || '', openInNewTab: false, height: 300, display: 'contained' as const,
            hideOnMobile: false, hideOnDesktop: false,
          },
        });
      }
    } else if (item === 'trust') {
      for (const tb of trustBadges) {
        sections.push({
          id: generateSectionId(),
          type: 'text',
          enabled: homepage.showTrustBadges !== false,
          title: tb.title || 'شعار',
          settings: { content: `${tb.icon} - ${tb.title}: ${tb.description}`, alignment: 'center' as const },
        });
      }
    } else if (item === 'featuredProduct') {
      sections.push({
        id: generateSectionId(), type: 'banner',
        enabled: homepage.showFeaturedProduct !== false, title: 'بانر منتج مميز',
        settings: { imageUrl: '', linkType: 'all' as const, linkValue: '', height: 350, display: 'contained' as const, openInNewTab: false, hideOnMobile: false, hideOnDesktop: false },
      });
    } else if (item.includes('#')) {
      const [baseType] = item.split('#');
      const inst = instanceData[item];
      if (baseType === 'trust' && inst?.trustBadges) {
        for (const tb of inst.trustBadges) {
          sections.push({
            id: generateSectionId(), type: 'text', enabled: true,
            title: inst?.label || `${tb.title || 'شعار'}`,
            settings: { content: `${tb.icon} - ${tb.title}: ${tb.description}`, alignment: 'center' as const },
          });
        }
      } else if (baseType === 'marketing' && inst?.banners) {
        for (const b of inst.banners) {
          sections.push({
            id: generateSectionId(), type: 'banner', enabled: true,
            title: inst?.label || b.title || 'بنر تسويقي',
            settings: { imageUrl: b.imageUrl || '', imageMobileUrl: b.imageMobileUrl || '', subtitle: b.title || '',
              description: b.description || '', buttonText: b.buttonText || '', linkType: b.linkType || 'all',
              linkValue: b.linkValue || '', openInNewTab: false, height: 300, display: 'contained' as const,
              hideOnMobile: false, hideOnDesktop: false },
          });
        }
      }
    } else {
      const sectionType = oldShowToSectionType(item);
      if (sectionType) {
        sections.push({
          id: generateSectionId(), type: sectionType,
          enabled: (homepage as any)[`show${item.charAt(0).toUpperCase() + item.slice(1)}`] !== false,
          title: ({ categories: 'التصنيفات', bestSellers: 'الأكثر مبيعاً', newest: 'وصل حديثاً', offers: 'عروض اليوم', featured: 'منتجات مميزة' } as Record<string, string>)[sectionType] || sectionType,
          settings: { source: sectionType as any, limit: 8, layout: 'grid' as const, animated: false,
            slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true },
            showMoreButton: true, showMoreUrl: '' },
        });
      }
    }
  }

  return { sections, sectionOrder: sections.map((section) => section.type) };
}

type ThemeConfigInput = Partial<ThemeConfig> & {
  themeKey?: unknown;
  _history?: unknown;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function mergeThemeConfig(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = clone(base);

  for (const [key, value] of Object.entries(override)) {
    if (value === undefined || key === '_history') continue;

    const current = next[key];
    if (isRecord(current) && isRecord(value)) {
      next[key] = mergeThemeConfig(current, value);
      continue;
    }

    next[key] = value;
  }

  return next;
}

export function isSupportedThemeKey(value: unknown): value is ThemeKey {
  return isKnownThemeKey(value);
}

export function resolveThemeKey(config?: ThemeConfigInput | null): ThemeKey {
  const key = config?.themeKey ?? config?.preset;
  return normalizeThemeKey(key) as ThemeKey;
}

export function resolveActiveThemeConfig(config?: ThemeConfigInput | null): ResolvedThemeConfig {
  const themeKey = resolveThemeKey(config);
  const base = clone(getThemeDefaultConfig(themeKey));
  const merged = mergeThemeConfig(
    base as unknown as Record<string, unknown>,
    (config ?? {}) as Record<string, unknown>,
  ) as unknown as ThemeConfig;

  const result = {
    ...merged,
    preset: themeKey,
    themeKey,
  };

  result.homepage = migrateHomepage(result.homepage as unknown as Record<string, unknown>) as any;
  if (Array.isArray((result.homepage as any)?.sections) && !Array.isArray((result.homepage as any).sectionOrder)) {
    (result.homepage as any).sectionOrder = (result.homepage as any).sections.map((section: SectionConfig) => section.type);
  }

  return result as unknown as ResolvedThemeConfig;
}

export function mergeAndResolveThemeConfig(
  baseConfig: ThemeConfigInput | null | undefined,
  overrideConfig: ThemeConfigInput | null | undefined,
): ResolvedThemeConfig {
  const base = resolveActiveThemeConfig(baseConfig);
  const merged = mergeThemeConfig(
    base as unknown as Record<string, unknown>,
    (overrideConfig ?? {}) as Record<string, unknown>,
  );

  return resolveActiveThemeConfig(merged as ThemeConfigInput);
}

export function getDefaultThemeConfig(): ResolvedThemeConfig {
  return resolveActiveThemeConfig({ preset: getDefaultThemeKey() });
}
