import { type ThemeConfig } from './types';
import { getDefaultThemeConfig as resolveDefaultThemeConfig } from './activeThemeResolver';

const THEME_VARS = [
  '--primary', '--theme-primary', '--theme-primary-hover', '--theme-primary-soft', '--theme-primary-foreground',
  '--store-primary',
  '--color-primary-50', '--color-primary-100', '--color-primary-500', '--color-primary-600', '--color-primary-700',
  '--surface-1', '--surface-2', '--surface-3',
  '--text-primary', '--text-secondary', '--text-tertiary',
  '--border', '--border-hover',
  '--header-background', '--header-text',
  '--announcement-background', '--announcement-text',
  '--theme-success', '--theme-success-soft', '--theme-success-foreground',
  '--theme-warning', '--theme-warning-soft', '--theme-warning-foreground',
  '--theme-error', '--theme-error-soft', '--theme-error-foreground',
  '--color-success', '--color-warning', '--color-error',
  '--font-sans', '--theme-font-family', '--theme-font-body-size', '--theme-font-heading-size',
] as const;

/**
 * Storefront scope selector.
 * All storefront theme CSS variables are applied ONLY within this scope.
 * They must NEVER leak to document.documentElement.
 */
const STOREFRONT_SCOPE_SELECTOR = '#storefront-scope';

/**
 * Legacy scope selector (kept for backward compatibility).
 * @deprecated Use #storefront-scope instead.
 */
const LEGACY_SCOPE_SELECTOR = '#theme-scope';

const FALLBACK_PRIMARY = '#58a1e2';
const FALLBACK_STATUS = {
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
} as const;

// ─── Scoped helpers (storefront only) ───

function getStorefrontScope(target?: HTMLElement | null): HTMLElement | null {
  if (target) return target;
  return document.querySelector(STOREFRONT_SCOPE_SELECTOR) ?? document.querySelector(LEGACY_SCOPE_SELECTOR);
}

/**
 * Set a CSS variable on the storefront scope element ONLY.
 * NEVER writes to document.documentElement.
 * This prevents storefront themes from polluting global styles.
 */
function setVarScoped(name: string, value: string, scope: HTMLElement) {
  scope.style.setProperty(name, value);
}

/**
 * Clear all theme variables from the storefront scope element ONLY.
 * Also removes font links, custom CSS, and analytics scripts.
 */
export function clearStoreTheme(target?: HTMLElement | null) {
  const scope = getStorefrontScope(target);
  if (scope) {
    THEME_VARS.forEach(v => scope.style.removeProperty(v));
  }
  document.querySelector('link[data-theme-font]')?.remove();
  document.getElementById('haa-custom-css')?.remove();
  ['script[data-gtm]', 'script[data-ga]', 'script[data-fb-pixel]'].forEach(
    s => document.querySelector(s)?.remove()
  );
}

// ─── Legacy helpers (deprecated, writes to global root) ───

function getLegacyScope(): HTMLElement | null {
  return document.querySelector(LEGACY_SCOPE_SELECTOR);
}

/** @deprecated Use clearStoreTheme() instead. */
export function clearTheme() {
  const root = document.documentElement;
  THEME_VARS.forEach(v => root.style.removeProperty(v));
  const legacyScope = getLegacyScope();
  if (legacyScope?.style) {
    THEME_VARS.forEach(v => legacyScope.style.removeProperty(v));
  }

  document.querySelector('link[data-theme-font]')?.remove();
  document.getElementById('haa-custom-css')?.remove();
  ['script[data-gtm]', 'script[data-ga]', 'script[data-fb-pixel]'].forEach(
    s => document.querySelector(s)?.remove()
  );
}

/** @deprecated Use setVarScoped() instead. Writes to document.documentElement — unsafe for multi-theme apps. */
function setVar(name: string, value: string) {
  document.documentElement.style.setProperty(name, value);
  const scope = getLegacyScope();
  if (scope) scope.style.setProperty(name, value);
}

function normalizeHexColor(value: unknown, fallback = FALLBACK_PRIMARY): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  const short = /^#([0-9a-f]{3})$/i.exec(trimmed);
  if (short) {
    return `#${short[1].split('').map((c) => c + c).join('').toLowerCase()}`;
  }
  const full = /^#([0-9a-f]{6})$/i.exec(trimmed);
  return full ? `#${full[1].toLowerCase()}` : fallback;
}

function mixHex(hex: string, target: '#ffffff' | '#000000', amount: number): string {
  const safe = normalizeHexColor(hex);
  const source = [1, 3, 5].map((start) => parseInt(safe.slice(start, start + 2), 16));
  const targetValue = target === '#ffffff' ? 255 : 0;
  const mixed = source.map((channel) => Math.round(channel + (targetValue - channel) * amount));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function getPrimaryScale(primary: unknown) {
  const base = normalizeHexColor(primary);
  return {
    soft: mixHex(base, '#ffffff', 0.92),
    50: mixHex(base, '#ffffff', 0.94),
    100: mixHex(base, '#ffffff', 0.86),
    500: base,
    600: mixHex(base, '#000000', 0.12),
    700: mixHex(base, '#000000', 0.24),
  };
}

function applyPrimaryScaleScoped(primary: unknown, scope: HTMLElement) {
  const scale = getPrimaryScale(primary);
  setVarScoped('--store-primary', scale[500], scope);
  setVarScoped('--primary', scale[500], scope);
  setVarScoped('--theme-primary', scale[500], scope);
  setVarScoped('--theme-primary-hover', scale[600], scope);
  setVarScoped('--theme-primary-soft', scale.soft, scope);
  setVarScoped('--theme-primary-foreground', '#ffffff', scope);
  setVarScoped('--color-primary-50', scale[50], scope);
  setVarScoped('--color-primary-100', scale[100], scope);
  setVarScoped('--color-primary-500', scale[500], scope);
  setVarScoped('--color-primary-600', scale[600], scope);
  setVarScoped('--color-primary-700', scale[700], scope);
}

function applyStatusColorScoped(name: keyof typeof FALLBACK_STATUS, value: unknown, scope: HTMLElement) {
  const base = normalizeHexColor(value, FALLBACK_STATUS[name]);
  const soft = mixHex(base, '#ffffff', 0.9);
  setVarScoped(`--theme-${name}`, base, scope);
  setVarScoped(`--theme-${name}-soft`, soft, scope);
  setVarScoped(`--theme-${name}-foreground`, '#ffffff', scope);
  setVarScoped(`--color-${name}`, base, scope);
}

function applyPrimaryScale(primary: unknown) {
  const scale = getPrimaryScale(primary);
  setVar('--store-primary', scale[500]);
  setVar('--primary', scale[500]);
  setVar('--theme-primary', scale[500]);
  setVar('--theme-primary-hover', scale[600]);
  setVar('--theme-primary-soft', scale.soft);
  setVar('--theme-primary-foreground', '#ffffff');
  setVar('--color-primary-50', scale[50]);
  setVar('--color-primary-100', scale[100]);
  setVar('--color-primary-500', scale[500]);
  setVar('--color-primary-600', scale[600]);
  setVar('--color-primary-700', scale[700]);
}

function applyStatusColor(name: keyof typeof FALLBACK_STATUS, value: unknown) {
  const base = normalizeHexColor(value, FALLBACK_STATUS[name]);
  const soft = mixHex(base, '#ffffff', 0.9);
  setVar(`--theme-${name}`, base);
  setVar(`--theme-${name}-soft`, soft);
  setVar(`--theme-${name}-foreground`, '#ffffff');
  setVar(`--color-${name}`, base);
}

/**
 * Apply storefront theme to a scoped element ONLY.
 *
 * CRITICAL: This function NEVER writes CSS variables to document.documentElement.
 * All theme variables are applied only to the #storefront-scope element.
 * This prevents storefront themes from polluting the merchant dashboard.
 *
 * @param config - The storefront theme configuration
 * @param target - Optional target element. Defaults to #storefront-scope.
 */
export function applyStoreTheme(config: ThemeConfig, target?: HTMLElement | null) {
  clearStoreTheme(target);
  const scope = getStorefrontScope(target);
  if (!scope) return;

  if (config.colors) {
    const aliases: Record<string, string> = {
      primary: '--color-primary-500',
      surface1: '--surface-1', surface2: '--surface-2', surface3: '--surface-3',
      textPrimary: '--text-primary', textSecondary: '--text-secondary', textTertiary: '--text-tertiary',
      border: '--border', borderHover: '--border-hover',
      success: '--color-success', warning: '--color-warning', error: '--color-error',
      headerBackground: '--header-background', headerText: '--header-text',
      announcementBackground: '--announcement-background', announcementText: '--announcement-text',
    };
    for (const [key, val] of Object.entries(config.colors)) {
      if (key === 'primary') {
        applyPrimaryScaleScoped(val, scope);
        continue;
      }
      if (key === 'success' || key === 'warning' || key === 'error') {
        applyStatusColorScoped(key, val, scope);
        continue;
      }
      setVarScoped(`--${key}`, val, scope);
      if (aliases[key]) setVarScoped(aliases[key], val, scope);
    }
    if (!config.colors.primary) applyPrimaryScaleScoped(FALLBACK_PRIMARY, scope);
    if (!config.colors.success) applyStatusColorScoped('success', FALLBACK_STATUS.success, scope);
    if (!config.colors.warning) applyStatusColorScoped('warning', FALLBACK_STATUS.warning, scope);
    if (!config.colors.error) applyStatusColorScoped('error', FALLBACK_STATUS.error, scope);
  }

  if (config.font) {
    if (config.font.url) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = config.font.url;
      link.setAttribute('data-theme-font', '');
      document.head.appendChild(link);
    }
    if (config.font.family) {
      const family = `"${config.font.family}", system-ui, sans-serif`;
      setVarScoped('--font-sans', family, scope);
      setVarScoped('--theme-font-family', family, scope);
    }
    if (config.font.bodySize) setVarScoped('--theme-font-body-size', config.font.bodySize, scope);
    if (config.font.headingsSize) setVarScoped('--theme-font-heading-size', config.font.headingsSize, scope);
  }

  if (config.customCss) {
    const dangerousSelectors = /body\s*\{|html\s*\{|:root\s*\{|\*\s*\{|::?-[a-z]+-/gi;
    if (dangerousSelectors.test(config.customCss)) {
      console.warn('[haa] customCss contains dangerous global selectors — scoping automatically');
    }
    const sanitized = config.customCss
      .replace(/<\s*\/?\s*script[\s>]/gi, '')
      .replace(/javascript\s*:/gi, 'blocked:')
      .replace(/on\w+\s*=/gi, 'disabled=')
      .replace(/expression\s*\(/gi, '/* blocked expression */(');
    const scoped = sanitized
      .split('\n')
      .map(line => {
        const t = line.trim();
        if (!t) return line;
        if (t.startsWith('@') && !t.startsWith('@import')) return line;
        if (t.startsWith('/*') || t.startsWith('*')) return line;
        if (t.startsWith('@import')) return `/* blocked @import */`;
        if (t.includes('{') || t.includes('}')) return line;
        return `${STOREFRONT_SCOPE_SELECTOR} ${line}`;
      })
      .join('\n');
    const style = document.createElement('style');
    style.id = 'haa-custom-css';
    style.setAttribute('data-storefront-scoped', '');
    style.textContent = `@layer theme-custom {\n${scoped}\n}`;
    document.head.appendChild(style);
  }

  if (config.analytics) {
    if (config.analytics.googleTagManagerId && !document.querySelector('script[data-gtm]')) {
      const id = config.analytics.googleTagManagerId;
      const s = document.createElement('script'); s.setAttribute('data-gtm', id);
      s.textContent = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`;
      document.head.appendChild(s);
    }
    if (config.analytics.googleAnalyticsId && !document.querySelector('script[data-ga]')) {
      const id = config.analytics.googleAnalyticsId;
      const s = document.createElement('script'); s.setAttribute('data-ga', id); s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`; document.head.appendChild(s);
      const inline = document.createElement('script');
      inline.setAttribute('data-ga-inline', id);
      inline.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`;
      document.head.appendChild(inline);
    }
    if (config.analytics.facebookPixelId && !document.querySelector('script[data-fb-pixel]')) {
      const id = config.analytics.facebookPixelId;
      const s = document.createElement('script'); s.setAttribute('data-fb-pixel', id);
      s.textContent = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');`;
      document.head.appendChild(s);
    }
  }
}

/** @deprecated Use applyStoreTheme() instead. Applies theme globally — unsafe for multi-theme apps. */
export function applyTheme(config: ThemeConfig) {
  clearTheme();

  if (config.colors) {
    const aliases: Record<string, string> = {
      primary: '--color-primary-500',
      surface1: '--surface-1', surface2: '--surface-2', surface3: '--surface-3',
      textPrimary: '--text-primary', textSecondary: '--text-secondary', textTertiary: '--text-tertiary',
      border: '--border', borderHover: '--border-hover',
      success: '--color-success', warning: '--color-warning', error: '--color-error',
      headerBackground: '--header-background', headerText: '--header-text',
      announcementBackground: '--announcement-background', announcementText: '--announcement-text',
    };
    for (const [key, val] of Object.entries(config.colors)) {
      if (key === 'primary') {
        applyPrimaryScale(val);
        continue;
      }
      if (key === 'success' || key === 'warning' || key === 'error') {
        applyStatusColor(key, val);
        continue;
      }
      setVar(`--${key}`, val);
      if (aliases[key]) setVar(aliases[key], val);
    }
    if (!config.colors.primary) applyPrimaryScale(FALLBACK_PRIMARY);
    if (!config.colors.success) applyStatusColor('success', FALLBACK_STATUS.success);
    if (!config.colors.warning) applyStatusColor('warning', FALLBACK_STATUS.warning);
    if (!config.colors.error) applyStatusColor('error', FALLBACK_STATUS.error);
  }

  if (config.font) {
    if (config.font.url) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = config.font.url;
      link.setAttribute('data-theme-font', '');
      document.head.appendChild(link);
    }
    if (config.font.family) {
      const family = `"${config.font.family}", system-ui, sans-serif`;
      setVar('--font-sans', family);
      setVar('--theme-font-family', family);
    }
    if (config.font.bodySize) setVar('--theme-font-body-size', config.font.bodySize);
    if (config.font.headingsSize) setVar('--theme-font-heading-size', config.font.headingsSize);
  }

  if (config.customCss) {
    const sanitized = config.customCss
      .replace(/<\s*\/?\s*script[\s>]/gi, '')
      .replace(/javascript\s*:/gi, 'blocked:')
      .replace(/on\w+\s*=/gi, 'disabled=')
      .replace(/expression\s*\(/gi, '/* blocked expression */(');
    const scoped = sanitized
      .split('\n')
      .map(line => {
        const t = line.trim();
        if (!t) return line;
        if (t.startsWith('@') && !t.startsWith('@import')) return line;
        if (t.startsWith('/*') || t.startsWith('*')) return line;
        if (t.startsWith('@import')) return `/* blocked @import */`;
        if (t.includes('{') || t.includes('}')) return line;
        return `${LEGACY_SCOPE_SELECTOR} ${line}`;
      })
      .join('\n');
    const style = document.createElement('style');
    style.id = 'haa-custom-css';
    style.setAttribute('data-storefront-scoped', '');
    style.textContent = `@layer theme-custom {\n${scoped}\n}`;
    document.head.appendChild(style);
  }

  if (config.analytics) {
    if (config.analytics.googleTagManagerId && !document.querySelector('script[data-gtm]')) {
      const id = config.analytics.googleTagManagerId;
      const s = document.createElement('script'); s.setAttribute('data-gtm', id);
      s.textContent = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`;
      document.head.appendChild(s);
    }
    if (config.analytics.googleAnalyticsId && !document.querySelector('script[data-ga]')) {
      const id = config.analytics.googleAnalyticsId;
      const s = document.createElement('script'); s.setAttribute('data-ga', id); s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`; document.head.appendChild(s);
      const inline = document.createElement('script');
      inline.setAttribute('data-ga-inline', id);
      inline.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`;
      document.head.appendChild(inline);
    }
    if (config.analytics.facebookPixelId && !document.querySelector('script[data-fb-pixel]')) {
      const id = config.analytics.facebookPixelId;
      const s = document.createElement('script'); s.setAttribute('data-fb-pixel', id);
      s.textContent = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');`;
      document.head.appendChild(s);
    }
  }
}

/** الثيم الافتراضي عند فشل تحميل الثيم */
export function getDefaultThemeConfig(): ThemeConfig {
  return resolveDefaultThemeConfig();
}
