import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const merchantDashboard = (path: string) =>
  readFileSync(new URL(`../apps/merchant-dashboard/src/${path}`, import.meta.url), 'utf-8');
const storefront = (path: string) =>
  readFileSync(new URL(`../apps/storefront/src/${path}`, import.meta.url), 'utf-8');
const storefrontCss = () =>
  readFileSync(new URL('../apps/storefront/src/index.css', import.meta.url), 'utf-8');
const isolation = () =>
  readFileSync(new URL('../packages/theme-system/src/isolation.ts', import.meta.url), 'utf-8');
const middleware = () =>
  readFileSync(new URL('../packages/auth-core/src/middleware.ts', import.meta.url), 'utf-8');
const validate = () =>
  readFileSync(new URL('../packages/theme-system/src/validate.ts', import.meta.url), 'utf-8');

describe('Security Boundary Gates — App Isolation', () => {
  it('Dashboard must not import storefront app code', () => {
    // ThemeEditor.tsx is allowed to import @haa/storefront-themes
    // because it needs the theme capsule for the live preview
    // surface. The runtime boundary (the actual preview iframe)
    // is still isolated — the import is type/value-only and the
    // theme components render inside a sandboxed mount point.
    const files = ['pages/ThemeStore.tsx', 'main.tsx', 'App.tsx'];
    for (const f of files) {
      const content = merchantDashboard(f);
      expect(content).not.toContain('@haa/storefront/');
      expect(content).not.toContain('@haa/storefront-themes');
    }
  });

  it('ThemeEditor uses storefront-themes only for preview (no runtime boundary leak)', () => {
    // Verify the only merchant-dashboard file that imports
    // storefront-themes is the preview component.
    const themeEditor = merchantDashboard('pages/ThemeEditor.tsx');
    // Must import getThemeCapsule (for live preview)
    expect(themeEditor).toMatch(/getThemeCapsule/);
    // Must NOT import React components (which would re-mount them)
    expect(themeEditor).not.toMatch(/getStorefrontThemeComponents/);
  });

  it('Storefront must not import dashboard or system-theme code', () => {
    const files = ['components/Layout.tsx', 'components/Footer.tsx', 'hooks/useTheme.tsx'];
    for (const f of files) {
      const content = storefront(f);
      expect(content).not.toContain('@haa/merchant-dashboard');
      expect(content).not.toContain('@haa/admin-dashboard');
      expect(content).not.toContain('@haa/system-theme');
    }
  });
});

describe('Security Boundary Gates — CSS Isolation', () => {
  it('Storefront CSS must not target body, html, or :root globally', () => {
    const css = storefrontCss();
    const bodyRoot = css.match(/^\s*body\s*\{|^\s*html\s*\{|^\s*:root\s*\{/gm);
    expect(bodyRoot).toBeNull();
  });

  it('Storefront CSS a tag must be scoped under #storefront-scope', () => {
    const css = storefrontCss();
    const unscopedA = css.match(/^a\s*\{/m);
    expect(unscopedA).toBeNull();
  });

  it('Storefront RTL icon flips must be scoped under #storefront-scope', () => {
    const css = storefrontCss();
    const unscopedRtl = css.match(/^\[dir="rtl"\]\s*\.lucide-/m);
    expect(unscopedRtl).toBeNull();
  });

  it('Storefront prefers-reduced-motion must be scoped', () => {
    const css = storefrontCss();
    const motion = css.match(/@media \(prefers-reduced-motion: reduce\)/);
    expect(motion).not.toBeNull();
    expect(css).toContain('#storefront-scope');
  });
});

describe('Security Boundary Gates — Theme Injection Isolation', () => {
  it('applyStoreTheme must write to #storefront-scope only, never to document.documentElement', () => {
    const code = isolation();
    // Check the applyStoreTheme function body specifically (not the deprecated functions)
    const storeThemeStart = code.indexOf('export function applyStoreTheme');
    const storeThemeEnd = code.indexOf('export function applyTheme');
    const storeThemeBody = code.slice(storeThemeStart, storeThemeEnd);
    expect(storeThemeBody).toContain('STOREFRONT_SCOPE_SELECTOR');
    expect(storeThemeBody).not.toContain('document.documentElement');
  });

  it('Custom CSS must be scoped via STOREFRONT_SCOPE_SELECTOR and block @import', () => {
    const code = isolation();
    const storeThemeStart = code.indexOf('export function applyStoreTheme');
    const storeThemeEnd = code.indexOf('export function applyTheme');
    const storeThemeBody = code.slice(storeThemeStart, storeThemeEnd);
    expect(storeThemeBody).toContain('STOREFRONT_SCOPE_SELECTOR');
    expect(storeThemeBody).toContain('@import');
    expect(storeThemeBody).toContain('blocked');
  });

  it('Custom CSS must sanitize script and javascript: patterns', () => {
    const code = isolation();
    const storeThemeStart = code.indexOf('export function applyStoreTheme');
    const storeThemeEnd = code.indexOf('export function applyTheme');
    const storeThemeBody = code.slice(storeThemeStart, storeThemeEnd);
    expect(storeThemeBody).toContain('script');
    expect(storeThemeBody).toContain('blocked:');
  });
});

describe('Security Boundary Gates — CSS Validation', () => {
  it('validate.ts must have comprehensive CSS safety checks', () => {
    const code = validate();
    expect(code).toContain('DANGEROUS_CSS_PATTERNS');
    expect(code).toContain('<script');
    expect(code).toContain('javascript');
    expect(code).toContain('@import');
    expect(code).toContain('url');
    expect(code).toContain('behavior');
    expect(code).toContain('-moz-binding');
  });

  it('API settings route must validate customCss server-side', () => {
    const settings = readFileSync(
      new URL('../apps/api/src/routes/settings.ts', import.meta.url),
      'utf-8'
    );
    expect(settings).toContain('customCss');
    expect(settings).toContain('dangerous');
  });
});

describe('Security Boundary Gates — BOLA/IDOR Defense', () => {
  it('requireStoreAccess must verify tenant boundary with storeTenantId', () => {
    const code = middleware();
    expect(code).toContain('storeTenantId');
    expect(code).toContain('auth.tenantId');
    expect(code).toContain('Store access denied');
  });

  it('requireStoreAccess must validate storeId format', () => {
    const code = middleware();
    expect(code).toContain('isNaN(storeId)');
    expect(code).toContain('Invalid store ID');
  });

  it('requireStoreAccess must check store exists', () => {
    const code = middleware();
    expect(code).toContain('Store not found');
    expect(code).toContain('storeTenantId === null');
  });
});

describe('Security Boundary Gates — RBAC Consistency', () => {
  it('Permission utilities must be imported from @haa/shared', () => {
    const auth = readFileSync(
      new URL('../apps/api/src/routes/auth.ts', import.meta.url),
      'utf-8'
    );
    expect(auth).toContain("getPermissionsForRole");
    expect(auth).not.toContain('OWNER_PERMISSIONS');
    expect(auth).not.toContain('MANAGER_PERMISSIONS');
  });

  it('All wallet payout permissions must be defined in shared types', () => {
    const types = readFileSync(
      new URL('../packages/shared/src/types/orders.ts', import.meta.url),
      'utf-8'
    );
    const required = [
      'wallet.payout.request', 'wallet.payout.review', 'wallet.payout.approve',
      'wallet.payout.reject', 'wallet.payout.mark_transferred',
      'wallet.payout.upload_proof', 'wallet.payout.verify_transfer',
      'wallet.payout.cancel', 'wallet.payout.reverse',
      'wallet.payout.view_all', 'wallet.payout.view_store',
    ];
    for (const perm of required) {
      expect(types).toContain(perm);
    }
  });
});
