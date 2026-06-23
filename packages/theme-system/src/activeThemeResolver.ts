import {
  getDefaultThemeKey,
  getThemeDefaultConfig,
  isKnownThemeKey,
  normalizeThemeKey,
} from './themeRegistry.js';
import type { ThemeConfig, SectionConfig, BannerLinkType } from './types.js';

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

// Legacy homepage data is unstructured JSONB carried over from the
// pre-section-config era. Migration only reads a handful of string
// fields off each entry — we model them as bag-of-strings records so
// the read sites stay safe without rebuilding their full schema.
type LegacyBanner = {
  title?: string;
  imageUrl?: string;
  imageMobileUrl?: string;
  description?: string;
  buttonText?: string;
  // `linkType` is BannerLinkType in the canonical schema, but legacy
  // rows may carry arbitrary strings. Treat as nominal-string here;
  // the destination `settings.linkType` only accepts the union.
  linkType?: BannerLinkType;
  linkValue?: string;
};
type LegacyTrustBadge = { icon?: string; title?: string; description?: string };
type LegacyInstanceData = Record<
  string,
  { label?: string; banners?: LegacyBanner[]; trustBadges?: LegacyTrustBadge[] } | undefined
>;

function migrateHomepage(homepage: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!homepage || typeof homepage !== 'object') return {};
  if (Array.isArray(homepage.sections)) {
    return {
      ...homepage,
      sectionOrder: Array.isArray(homepage.sectionOrder)
        ? homepage.sectionOrder
        : (homepage.sections as Array<{ type?: unknown }>)
            .map((section) => section?.type)
            .filter((type): type is string => typeof type === 'string'),
    };
  }

  const needsMigration = hasOldHomepageData(homepage);
  if (!needsMigration) return homepage;

  const sections: SectionConfig[] = [];
  const oldOrder: string[] = Array.isArray(homepage.sectionOrder)
    ? (homepage.sectionOrder as string[])
    : ['banner', 'categories', 'bestSellers', 'newArrivals', 'todayDeals', 'featured'];
  const banners: LegacyBanner[] = Array.isArray(homepage.banners) ? (homepage.banners as LegacyBanner[]) : [];
  const trustBadges: LegacyTrustBadge[] = Array.isArray(homepage.trustBadges)
    ? (homepage.trustBadges as LegacyTrustBadge[])
    : [];
  const instanceData: LegacyInstanceData = (homepage.instanceData as LegacyInstanceData | undefined) ?? {};

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
      const mBanners: LegacyBanner[] = Array.isArray(homepage.marketingBanners)
        ? (homepage.marketingBanners as LegacyBanner[])
        : banners;
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
        // The legacy `show<Item>` flags are stored as untyped booleans
        // on the homepage record. Indexing into the Record<string, unknown>
        // returns `unknown`, so we explicitly compare it.
        const showKey = `show${item.charAt(0).toUpperCase() + item.slice(1)}`;
        sections.push({
          id: generateSectionId(), type: sectionType,
          enabled: homepage[showKey] !== false,
          title: ({ categories: 'التصنيفات', bestSellers: 'الأكثر مبيعاً', newest: 'وصل حديثاً', offers: 'عروض اليوم', featured: 'منتجات مميزة' } as Record<string, string>)[sectionType] || sectionType,
          // The legacy `oldShowToSectionType()` map returns section types
          // ('categories' | 'offers') that are not in `source`'s union.
          // Preserve the legacy data verbatim via an unknown step.
          settings: { source: sectionType as unknown as SectionConfig['settings']['source'], limit: 8, layout: 'grid' as const, animated: false,
            slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true },
            showMoreButton: true, showMoreUrl: '' },
        });
      }
    }
  }

  return { sections, sectionOrder: sections.map((section) => section.type) };
}

/**
 * The user-supplied input shape for theme configuration. Used by
 * resolveActiveThemeConfig + resolveThemeKey, and exported so the
 * jsonb column in db/schema/stores.ts can carry the proper `$type<>`
 * (avoiding `as any` casts in store-settings-service.ts).
 */
export type ThemeConfigInput = Partial<ThemeConfig> & {
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

  // migrateHomepage returns a raw record; cast back to the canonical
  // ThemeHomepage shape. Then ensure sectionOrder stays in sync with sections.
  const migrated = migrateHomepage(result.homepage as unknown as Record<string, unknown>);
  result.homepage = migrated as unknown as ThemeConfig['homepage'];
  const hp = result.homepage as { sections?: SectionConfig[]; sectionOrder?: string[] } | undefined;
  if (hp && Array.isArray(hp.sections) && !Array.isArray(hp.sectionOrder)) {
    hp.sectionOrder = hp.sections.map((section) => section.type);
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
