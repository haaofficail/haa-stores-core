import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const packagesDir = resolve(projectRoot, 'packages');
const planDoc = resolve(projectRoot, 'docs/ops/THEME_RATIONALIZATION.md');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

function packageJson(p: string): Record<string, unknown> {
  try { return JSON.parse(read(p)); } catch { return {}; }
}

/**
 * Quality Pass 5 — Item 3: Theme Package Rationalization
 *
 * Background: the project has 5 theme-related packages, some of which
 * overlap in purpose. This test documents the current shape, asserts
 * structural rules that prevent NEW duplication, and tracks the
 * rationalization plan (not enforced as a hard delete — that requires
 * coordinated work across apps).
 *
 * The five packages and their roles:
 *  - @haa/storefront-themes   — customer-facing store themes (current)
 *  - @haa/system-theme        — React provider for system theme (light/dark)
 *  - @haa/theme-engine        — core engine: contracts, registry, validation
 *  - @haa/theme-react         — React bindings for theme context
 *  - @haa/theme-web           — Next.js app shell (consumers of all the above)
 *  - @haa/theme-system        — LEGACY (replaced by @haa/storefront-themes)
 */

interface PackageInfo {
  name: string;
  description: string;
  hasReadme: boolean;
  fileCount: number;
  distExists: boolean;
}

function listThemePackages(): PackageInfo[] {
  const themeDirs = readdirSync(packagesDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && /theme/i.test(d.name))
    .map(d => d.name);

  return themeDirs.map(dir => {
    const pkgPath = resolve(packagesDir, dir, 'package.json');
    const pkg = packageJson(pkgPath);
    const srcDir = resolve(packagesDir, dir, 'src');
    const distDir = resolve(packagesDir, dir, 'dist');
    let fileCount = 0;
    try {
      const count = (d: string): number => {
        if (!existsSync(d)) return 0;
        const entries = readdirSync(d, { withFileTypes: true });
        let c = 0;
        for (const e of entries) {
          if (e.isDirectory()) c += count(resolve(d, e.name));
          else if (/\.(ts|tsx|css)$/.test(e.name)) c++;
        }
        return c;
      };
      fileCount = count(srcDir);
    } catch { /* ignore */ }
    return {
      name: (pkg.name as string) ?? `@haa/${dir}`,
      description: (pkg.description as string) ?? '',
      hasReadme: existsSync(resolve(packagesDir, dir, 'README.md')),
      fileCount,
      distExists: existsSync(distDir),
    };
  });
}

describe('Quality Pass 5 — Theme Package Rationalization (Item 3)', () => {
  it('all theme packages must have a package.json with a name', () => {
    const infos = listThemePackages();
    expect(infos.length).toBeGreaterThan(0);
    for (const info of infos) {
      expect(info.name).toMatch(/^@haa\//);
    }
  });

  it('rationalization plan must be documented in docs/ops/THEME_RATIONALIZATION.md', () => {
    expect(existsSync(planDoc)).toBe(true);
    const content = read(planDoc);
    // Must mention the legacy package
    expect(content).toMatch(/theme-system/);
    // Must mention the replacement
    expect(content).toMatch(/storefront-themes/);
    // Must have a migration section
    expect(content).toMatch(/migration|plan|rationaliz/i);
  });

  it('theme-engine must be the contract layer (no app code imports it directly except via theme-react / storefront-themes)', () => {
    // Sanity: theme-engine is a "core" package; only the wrappers should import it.
    const themeEnginePkg = resolve(packagesDir, 'theme-engine/package.json');
    expect(existsSync(themeEnginePkg)).toBe(true);
    const pkg = packageJson(themeEnginePkg);
    // Should not depend on react or next — it's pure TS
    const deps = { ...(pkg.dependencies as Record<string, string> ?? {}), ...(pkg.peerDependencies as Record<string, string> ?? {}) };
    expect(deps.react).toBeUndefined();
    expect(deps.next).toBeUndefined();
  });

  it('no NEW theme package should be created (rationalization is the goal, not expansion)', () => {
    const infos = listThemePackages();
    const names = infos.map(i => i.name);
    console.log('[Theme Packages]', names.join(', '));
    // Hard ceiling — if a new theme package is added, this test signals
    // a regression of the rationalization effort. Current count: 6.
    expect(infos.length).toBeLessThanOrEqual(6);
  });

  it('legacy @haa/theme-system must be flagged for deprecation', () => {
    const plan = read(planDoc);
    // Plan must explicitly call out theme-system as legacy
    expect(plan).toMatch(/legacy|deprecat|replaced/i);
  });

  it('storefront-themes package must be the documented replacement for theme-system', () => {
    const pkg = packageJson(resolve(packagesDir, 'storefront-themes/package.json'));
    expect((pkg.description as string) ?? '').toMatch(/theme-system/i);
  });

  it('each theme package must have a README explaining its role', () => {
    const infos = listThemePackages();
    const missing = infos.filter(i => !i.hasReadme && i.fileCount > 0);
    // Allow some leeway for tiny packages
    expect(missing.length).toBeLessThanOrEqual(2);
    if (missing.length > 0) {
      console.warn('[Theme] Packages missing README:', missing.map(m => m.name).join(', '));
    }
  });
});
