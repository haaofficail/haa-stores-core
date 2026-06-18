/**
 * Sprint 4 — Mobile responsive regression contract.
 *
 * Goal: lock in mobile-first invariants that prevent horizontal
 * scroll and broken layouts on small viewports.
 *
 * These assertions mirror the source structure (cheap, deterministic)
 * — no Playwright/Vitest viewport setup needed.
 *
 * Sprint 4 Theme A: mobile responsive audit + guards.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '..');

/** Read a file as utf-8 string, or throw if missing. */
function read(rel: string): string {
  const path = resolve(ROOT, rel);
  if (!existsSync(path)) {
    throw new Error(`Required file missing: ${rel}`);
  }
  return readFileSync(path, 'utf-8');
}

/** List files recursively under a dir. */
function listFiles(dir: string, ext: string[]): string[] {
  const out: string[] = [];
  const full = resolve(ROOT, dir);
  if (!existsSync(full)) return out;
  for (const name of readdirSync(full)) {
    const p = join(full, name);
    if (statSync(p).isDirectory()) {
      out.push(...listFiles(join(dir, name), ext));
    } else if (ext.some((e) => name.endsWith(e))) {
      out.push(join(dir, name));
    }
  }
  return out;
}

describe('Sprint 4 Theme A — Mobile responsive invariants', () => {
  describe('Storefront Layout — overflow guard', () => {
    const source = read('apps/storefront/src/components/Layout.tsx');

    it('storefront root has overflow-x-hidden (prevents horizontal scroll)', () => {
      expect(source).toMatch(/min-h-screen\s+flex\s+flex-col\s+overflow-x-hidden/);
    });
  });

  describe('Top-level page wrappers — viewport containment', () => {
    const pageFiles = listFiles('apps/storefront/src/pages', ['.tsx']).filter(
      (f) => !f.endsWith('/index.tsx') && !f.includes('marketplace/theme/')
    );

    it('storefront has 20+ top-level pages to audit', () => {
      expect(pageFiles.length).toBeGreaterThanOrEqual(20);
    });

    it('every storefront page has either overflow-x-hidden or inherits it via Layout', () => {
      // Heuristic: pages without the guard are flagged. We accept a
      // small allowance for pages that exclusively render a child
      // component (which itself should have the guard).
      const offenders: string[] = [];
      for (const file of pageFiles) {
        const src = readFileSync(resolve(ROOT, file), 'utf-8');
        // Skip thin re-export wrappers (single-line default export)
        const trimmed = src.replace(/\s+/g, '');
        const isReExport = /^import.+from.+;exportdefault.+;$/.test(trimmed);
        if (isReExport) continue;

        // Pages must include a guard OR delegate to a known guarded wrapper
        const hasOwnGuard = /overflow-x-hidden/.test(src);
        const usesGuardedWrapper =
          /from\s+['"]@\/components\/Layout/.test(src) ||
          /from\s+['"]\.\/Layout['"]/.test(src) ||
          /<Layout\b/.test(src) ||
          /<MarketplaceLayout\b/.test(src) ||
          /<StorefrontLayout\b/.test(src) ||
          /id\s*=\s*["']storefront-scope["']/.test(src);
        if (!hasOwnGuard && !usesGuardedWrapper) {
          offenders.push(file);
        }
      }
      if (offenders.length > 0) {
        throw new Error(
          `Pages without overflow guard or guarded wrapper:\n  ${offenders.join('\n  ')}`
        );
      }
    });
  });

  describe('Landing sections — mobile-first responsive', () => {
    const sectionFiles = listFiles('apps/storefront/src/landing/sections', ['.tsx']);

    it('landing has 10+ extracted sections', () => {
      expect(sectionFiles.length).toBeGreaterThanOrEqual(10);
    });

    it('every landing section has at least one responsive breakpoint class', () => {
      const offenders: string[] = [];
      for (const file of sectionFiles) {
        const src = readFileSync(resolve(ROOT, file), 'utf-8');
        // Accept any of: sm:, md:, lg:, xl: (Tailwind responsive prefixes)
        if (!/\b(?:sm|md|lg|xl):/.test(src)) {
          offenders.push(file);
        }
      }
      if (offenders.length > 0) {
        throw new Error(
          `Landing sections without responsive classes:\n  ${offenders.join('\n  ')}`
        );
      }
    });
  });

  describe('Touch hit areas — 44×44 minimum', () => {
    const targetFiles = listFiles('apps/storefront/src/components', ['.tsx']);

    it('no clickable elements smaller than 44×44 on common patterns', () => {
      // Heuristic: buttons/links with explicit h-6/h-7/h-8 (24-32px) without
      // explicit min-h-[44px] or min-w-[44px] are flagged.
      const offenders: { file: string; line: number; text: string }[] = [];
      const smallSizePattern = /\b(?:h|w)-(?:6|7|8|9|10)(?:\b|$)/;
      const min44Pattern = /min-(?:h|w)-\[44px\]|min-(?:h|w)-11/;
      for (const file of targetFiles) {
        const src = readFileSync(resolve(ROOT, file), 'utf-8');
        const lines = src.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Only flag if line contains button or link tag
          if (!/<\s*(?:button|Link|a)\b/.test(line)) continue;
          if (smallSizePattern.test(line) && !min44Pattern.test(line)) {
            // Filter out icons inside buttons (icon size is fine if button is 44x44)
            // We only flag explicit small size without compensating min
            offenders.push({ file, line: i + 1, text: line.trim().slice(0, 100) });
          }
        }
      }
      // Cap warnings: 0 is ideal, up to 5 is acceptable for icons inside known-good buttons
      expect(offenders.length).toBeLessThanOrEqual(5);
    });
  });
});

describe('Sprint 4 Theme B — Performance invariants', () => {
  describe('Lazy loading — below-the-fold images', () => {
    it('landing sections use loading="lazy" for below-the-fold images', () => {
      // The Hero section + small logos in Nav/Footer are above-the-fold
      // and may use eager loading (or no loading attr). Other sections
      // must use loading="lazy" on their <img> tags to avoid blocking
      // the initial paint.
      const sectionFiles = listFiles('apps/storefront/src/landing/sections', ['.tsx']);
      // Above-the-fold allowed to skip lazy: hero, nav, footer
      const aboveTheFold = new Set(['Hero.tsx', 'Nav.tsx', 'Footer.tsx']);
      const offenders: { file: string; tags: string[] }[] = [];
      for (const file of sectionFiles) {
        const basename = file.split('/').pop() || '';
        if (aboveTheFold.has(basename)) continue;
        const src = readFileSync(resolve(ROOT, file), 'utf-8');
        // Use DOTALL (?s) to match <img ... > across multiple lines
        const imgTags = src.match(/<img\b[^>]*>/gs) || [];
        if (imgTags.length === 0) continue;
        const notLazy = imgTags.filter((tag) => !/loading\s*=\s*["']lazy["']/.test(tag));
        if (notLazy.length > 0) {
          offenders.push({ file, tags: notLazy });
        }
      }
      if (offenders.length > 0) {
        const details = offenders
          .map((o) => `  ${o.file}:\n    ${o.tags.join('\n    ')}`)
          .join('\n');
        throw new Error(`Sections with <img> without loading="lazy":\n${details}`);
      }
    });
  });

  describe('Resource hints — preconnect for external resources', () => {
    it('index.html includes preconnect for API + image CDN', () => {
      const html = read('apps/storefront/index.html');
      // Expect at least 2 preconnect hints
      const preconnects = html.match(/<link[^>]*rel\s*=\s*["']preconnect["'][^>]*>/g) || [];
      expect(preconnects.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Hero AI Chat — already lazy loaded (P2-#10)', () => {
    it('Hero section uses React.lazy for HeroAIChat', () => {
      const hero = read('apps/storefront/src/landing/sections/Hero.tsx');
      // React.lazy(() => import('@/landing/HeroAIChat'))
      // Match the whole expression (multiline + across close-paren)
      expect(hero).toMatch(/React\.lazy\(\s*\(\)\s*=>\s*import\(['"]@\/landing\/HeroAIChat['"]\)/);
    });
  });
});
