import { THEMES } from './themes.js';
import type { ThemeConfig, ThemeManifest, ThemeSupportedPage } from './types.js';

const DEFAULT_THEME_KEY = 'minimal';

const SUPPORTED_STOREFRONT_PAGES: ThemeSupportedPage[] = [
  'home',
  'category',
  'product',
  'cart',
  'checkout',
  'track',
  'about',
  'contact',
];

const BASE_SETTINGS_DEFINITION = {
  colors: true,
  font: true,
  layout: true,
  homepage: true,
  header: true,
  footer: true,
  socialLinks: true,
  analytics: true,
  customCss: true,
};

const CATEGORY_BY_THEME: Record<string, ThemeManifest['category']> = {
  minimal: 'minimal',
  royal: 'luxury',
  night: 'dark',
  nature: 'nature',
  'luxury-showcase': 'luxury',
};

function cloneConfig(config: ThemeConfig): ThemeConfig {
  return JSON.parse(JSON.stringify(config)) as ThemeConfig;
}

function createManifest(theme: (typeof THEMES)[number]): ThemeManifest {
  const themeKey = theme.id;

  return {
    themeKey,
    name: theme.name,
    nameAr: theme.nameAr,
    description: theme.description,
    descriptionAr: theme.descriptionAr,
    version: '1.0.0',
    status: 'stable',
    kind: theme.kind,
    category: CATEGORY_BY_THEME[themeKey] ?? 'general',
    author: theme.author,
    price: theme.price,
    supportsRTL: true,
    supportedPages: [...SUPPORTED_STOREFRONT_PAGES],
    preview: {
      thumbnailUrl: theme.screenshotUrl,
      demoUrl: theme.demoUrl,
    },
    settingsDefinition: { ...BASE_SETTINGS_DEFINITION },
    defaultConfig: {
      ...cloneConfig(theme.config),
      preset: themeKey,
      themeKey,
    },
    capabilities: {
      featured: theme.featured,
      free: theme.price === 0,
      configurableColors: true,
      configurableFonts: true,
      configurableLayout: true,
      customCss: true,
      analytics: true,
    },
    tags: [...(theme.tags ?? [])],
    categories: [...(theme.categories ?? [])],
  };
}

const THEME_MANIFESTS: ThemeManifest[] = THEMES.map(createManifest);
const MANIFEST_BY_KEY = new Map(THEME_MANIFESTS.map((manifest) => [manifest.themeKey, manifest]));

export function getDefaultThemeKey(): string {
  return DEFAULT_THEME_KEY;
}

export function normalizeThemeKey(input: unknown): string {
  return typeof input === 'string' && MANIFEST_BY_KEY.has(input) ? input : DEFAULT_THEME_KEY;
}

export function isKnownThemeKey(themeKey: unknown): themeKey is string {
  return typeof themeKey === 'string' && MANIFEST_BY_KEY.has(themeKey);
}

export function getThemeManifest(themeKey: unknown): ThemeManifest | undefined {
  return MANIFEST_BY_KEY.get(normalizeThemeKey(themeKey));
}

export function getAllThemeManifests(): ThemeManifest[] {
  return THEME_MANIFESTS.map((manifest) => ({
    ...manifest,
    supportedPages: [...manifest.supportedPages],
    settingsDefinition: { ...manifest.settingsDefinition },
    defaultConfig: cloneConfig(manifest.defaultConfig),
    capabilities: { ...manifest.capabilities },
    tags: [...manifest.tags],
    categories: [...manifest.categories],
    preview: { ...manifest.preview },
  }));
}

export function getDefaultThemeManifest(): ThemeManifest {
  return getThemeManifest(DEFAULT_THEME_KEY)!;
}

export function getThemeDefaultConfig(themeKey: unknown): ThemeConfig {
  const manifest = getThemeManifest(themeKey) ?? getDefaultThemeManifest();
  return cloneConfig(manifest.defaultConfig);
}
