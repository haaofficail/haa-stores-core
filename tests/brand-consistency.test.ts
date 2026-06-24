// Brand consistency source-grep guard — DECISION-OS-010.
//
// Locks the Haa brand color truth:
//   - `#5c9cd5` is the canonical Haa primary (served by /api/brand + fallback).
//   - `#58a1e2` is a legacy color that must not reappear in source.
//   - `#007aff` is the Apple-style baseline in @haa/tokens — informational.
//
// If this test fails, brand drift was reintroduced. Either:
//   (a) update the canonical fallback in apps/storefront/src/hooks/usePlatformBrand.ts,
//   (b) remove the legacy reference, or
//   (c) get an explicit owner ruling to amend DECISION-OS-010.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.next' || entry === '.turbo') continue;
      walk(full, acc);
    } else if (
      full.endsWith('.ts') ||
      full.endsWith('.tsx') ||
      full.endsWith('.css') ||
      full.endsWith('.json')
    ) {
      acc.push(full);
    }
  }
  return acc;
}

describe('Brand consistency (DECISION-OS-010)', () => {
  it('usePlatformBrand default primary is the canonical Haa #5c9cd5', () => {
    const file = resolve(ROOT, 'apps/storefront/src/hooks/usePlatformBrand.ts');
    const text = readFileSync(file, 'utf-8');
    expect(text).toMatch(/primaryColor:\s*['"]#5c9cd5['"]/);
  });

  it('legacy color #58a1e2 has been purged from src', () => {
    const roots = [
      resolve(ROOT, 'apps/storefront/src'),
      resolve(ROOT, 'apps/merchant-dashboard/src'),
      resolve(ROOT, 'apps/admin-dashboard/src'),
      resolve(ROOT, 'apps/api/src'),
      resolve(ROOT, 'packages'),
    ];
    const violations: string[] = [];
    for (const r of roots) {
      let files: string[];
      try {
        files = walk(r);
      } catch {
        continue;
      }
      for (const file of files) {
        if (file.includes('/node_modules/')) continue;
        if (file.includes('/dist/')) continue;
        // db migration meta snapshots are historical — allow legacy color references in them
        if (file.includes('packages/db/src/migrations/meta/')) continue;
        // db data-fix script is the documented site where legacy colors are normalized
        if (file.includes('packages/db/src/fix-old-store-colors.ts')) continue;
        const text = readFileSync(file, 'utf-8');
        if (/#58a1e2/i.test(text)) {
          violations.push(file.replace(ROOT + '/', ''));
        }
      }
    }
    if (violations.length > 0) {
      throw new Error('Legacy #58a1e2 references found:\n' + violations.join('\n'));
    }
    expect(violations).toEqual([]);
  });

  // W2 cleanup (Autopilot Phase 3): platform-side surfaces must use the
  // primary-* Tailwind palette (centered on the canonical #5c9cd5) instead
  // of the raw blue-* palette. EXCEPTION: third-party marketplace branding
  // (e.g. Zid's actual blue brand color) is documented and allowed via the
  // allow-list below.
  it('platform-side landing + storefront surfaces use primary-* not blue-*', () => {
    const allowList = [
      // Zid marketplace integration uses Zid's actual brand color (blue).
      // Per-vendor branding is legitimate and NOT platform brand drift.
      'apps/storefront/src/landing/sections/AboutHaa.tsx',
      'apps/merchant-dashboard/src/components/modals/MarketplaceGuideModal.tsx',
      'apps/merchant-dashboard/src/pages/MarketplaceGuide.tsx',
      'apps/merchant-dashboard/src/pages/Marketplaces.tsx',
      'apps/merchant-dashboard/src/pages/SyncLogs.tsx',
      'apps/merchant-dashboard/src/pages/IntegrationHub.tsx',
      // Status semantic colors (shipping/in_progress) — debatable, deferred
      // to a separate semantic-color audit. Not platform brand drift.
      'apps/merchant-dashboard/src/pages/Support.tsx',
      'apps/merchant-dashboard/src/pages/orders/OrderDetailDialog.tsx',
    ];
    const PLATFORM_ROOTS = [
      resolve(ROOT, 'apps/storefront/src'),
      resolve(ROOT, 'apps/merchant-dashboard/src'),
    ];
    const violations: string[] = [];
    for (const r of PLATFORM_ROOTS) {
      const files = walk(r);
      for (const file of files) {
        const rel = file.replace(ROOT + '/', '');
        if (allowList.some((a) => rel === a)) continue;
        if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
        const text = readFileSync(file, 'utf-8');
        // Match Tailwind class refs only (avoid matching e.g. `bluebox-shadow`)
        if (/\b(text|bg|from|to|via|ring|shadow|border|hover:text|hover:bg)-blue-(500|600|700|800)\b/.test(text)) {
          violations.push(rel);
        }
      }
    }
    if (violations.length > 0) {
      throw new Error(
        'W2 brand drift — platform surfaces using blue-* instead of primary-*:\n' +
          violations.join('\n') +
          '\n\nIf this is intentional (e.g. third-party brand badge), add the file to the allowList in this test.',
      );
    }
    expect(violations).toEqual([]);
  });
});
