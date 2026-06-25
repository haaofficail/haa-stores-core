// Getting-Started page contract — IA Wave 5 part 1.
//
// Surfaces the existing readiness checklist OUTSIDE Settings so new
// merchants get a clear "what should I do first?" landing. Reuses the
// ReadinessChecklist component as the single source of truth — this
// PR adds the surface, not new data.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PAGE_PATH = resolve(__dirname, '../apps/merchant-dashboard/src/pages/GettingStarted.tsx');
const APP = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/App.tsx'),
  'utf-8',
);
const SIDEBAR = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/components/layout/Sidebar.tsx'),
  'utf-8',
);

let PAGE = '';
beforeAll(() => {
  if (existsSync(PAGE_PATH)) PAGE = readFileSync(PAGE_PATH, 'utf-8');
});

describe('GettingStarted — page', () => {
  it('the file exists', () => {
    expect(existsSync(PAGE_PATH)).toBe(true);
  });

  it('reuses the shared ReadinessChecklist (single source of truth)', () => {
    // The page MUST NOT redeclare the readiness calls — that would
    // diverge from the Settings panel as the checklist evolves.
    expect(PAGE).toMatch(/import\s*\{\s*ReadinessChecklist\s*\}\s*from\s*['"]\.\/settings\/sections\/ReadinessChecklist['"]/);
    expect(PAGE).toMatch(/<ReadinessChecklist\s+storeId=\{storeId\}\s*\/>/);
  });

  it('renders quick-link tiles that cross-link to the right canonical paths', () => {
    // These are the W3-canonical paths (no legacy /products, /orders, etc.)
    for (const to of ['/settings', '/catalog/products', '/sales/shipping', '/policies', '/support']) {
      expect(PAGE, `must link to ${to}`).toMatch(new RegExp(`to=['"]${to.replace(/\//g, '\\/')}['"]`));
    }
  });

  it('returns null while storeId is unresolved (no flash of partial UI)', () => {
    expect(PAGE).toMatch(/if\s*\(!storeId\)\s*return\s*null/);
  });
});

describe('App.tsx — route wiring', () => {
  it('mounts /getting-started behind dashboard:view', () => {
    expect(APP).toMatch(/import\(['"]@\/pages\/GettingStarted['"]\)/);
    expect(APP).toMatch(/path=['"]\/getting-started['"]\s+element=\{<GuardedRoute\s+permission=['"]dashboard:view['"]><GettingStarted/);
  });
});

describe('Sidebar — getting-started entry', () => {
  it('lists "بدء الاستخدام" in the Main group right after Dashboard', () => {
    const dashIdx = SIDEBAR.indexOf("to: '/dashboard'");
    const gsIdx = SIDEBAR.indexOf("to: '/getting-started'");
    expect(dashIdx).toBeGreaterThan(0);
    expect(gsIdx).toBeGreaterThan(dashIdx);
    expect(SIDEBAR).toMatch(/label:\s*['"]nav\.gettingStarted['"]/);
  });
});
