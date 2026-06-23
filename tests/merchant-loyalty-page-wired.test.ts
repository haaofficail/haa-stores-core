// Merchant Loyalty page wired guard (L-PR-4).
//
// Source-grep that locks the three insertion points needed for the
// settings UI to reach the Phase-1 routes shipped in PR #94:
//   - loyaltyApi exists in lib/api.ts and hits /merchant/:id/loyalty/settings
//   - App.tsx registers the /loyalty route guarded by promotions:read
//   - Sidebar.tsx exposes the nav entry under the marketing group

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);

const API = readFileSync(resolve(ROOT, 'apps/merchant-dashboard/src/lib/api.ts'), 'utf-8');
const APP = readFileSync(resolve(ROOT, 'apps/merchant-dashboard/src/App.tsx'), 'utf-8');
const SIDEBAR = readFileSync(resolve(ROOT, 'apps/merchant-dashboard/src/components/layout/Sidebar.tsx'), 'utf-8');
const PAGE = readFileSync(resolve(ROOT, 'apps/merchant-dashboard/src/pages/Loyalty.tsx'), 'utf-8');

describe('Merchant Loyalty page wiring (L-PR-4)', () => {
  it('exports loyaltyApi with getSettings + updateSettings', () => {
    expect(API).toMatch(/export const loyaltyApi\s*=/);
    expect(API).toMatch(/getSettings:[\s\S]*?\/merchant\/\$\{storeId\}\/loyalty\/settings/);
    expect(API).toMatch(/updateSettings:[\s\S]*?\/merchant\/\$\{storeId\}\/loyalty\/settings/);
    expect(API).toMatch(/method:\s*['"]PUT['"]/);
  });

  it('registers the /loyalty route guarded by promotions:read', () => {
    expect(APP).toMatch(/lazy\(\(\)\s*=>\s*import\(['"]@\/pages\/Loyalty['"]\)\)/);
    expect(APP).toMatch(/path="\/loyalty"[\s\S]*?permission="promotions:read"/);
  });

  it('Sidebar has a /loyalty entry under marketing group (Coins icon)', () => {
    expect(SIDEBAR).toMatch(/Coins,/);
    expect(SIDEBAR).toMatch(/to:\s*['"]\/loyalty['"][^}]*icon:\s*Coins[^}]*permission:\s*['"]promotions:read['"]/);
  });

  it('Loyalty.tsx uses messageFromError + Coins + the preview calculator', () => {
    expect(PAGE).toMatch(/messageFromError/);
    expect(PAGE).toMatch(/loyaltyApi/);
    expect(PAGE).toMatch(/Calculator/);
    expect(PAGE).toMatch(/previewAmount/);
  });

  it('Loyalty.tsx does NOT bypass request() with raw fetch', () => {
    expect(PAGE).not.toMatch(/\bfetch\(/);
  });
});
