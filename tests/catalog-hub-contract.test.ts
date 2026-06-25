// Catalog Hub contract — completes IA Wave 2.
//
// Final hub of the 4 promised in the IA review. Same shape and
// pattern as Marketing/Sales/Finance: header + 4 KPIs + 6 tool
// cards, all composed via the shared HubShell components.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HUB = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/pages/CatalogHub.tsx'),
  'utf-8',
);
const APP = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/App.tsx'),
  'utf-8',
);
const SIDEBAR = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/components/layout/Sidebar.tsx'),
  'utf-8',
);

describe('CatalogHub — page', () => {
  it('composes data via Promise.allSettled', () => {
    expect(HUB).toMatch(/Promise\.allSettled/);
  });

  it('reads from the 4 catalog data sources', () => {
    expect(HUB).toMatch(/productsApi\.list/);
    expect(HUB).toMatch(/categoriesApi\.list/);
    expect(HUB).toMatch(/brandsApi\.list/);
    expect(HUB).toMatch(/tagsApi\.list/);
  });

  it('renders 4 metric tiles + 6 tool cards', () => {
    const tiles = HUB.match(/<MetricTile/g) ?? [];
    expect(tiles.length).toBe(4);
    const cards = HUB.match(/<HubCard/g) ?? [];
    expect(cards.length).toBe(6);
  });

  it('cross-links to every catalog-section page', () => {
    for (const to of ['/catalog/products', '/catalog/categories', '/catalog/brands', '/catalog/tags', '/imports', '/exports']) {
      expect(HUB, `must link to ${to}`).toMatch(new RegExp(`to=['"]${to.replace(/\//g, '\\/')}['"]`));
    }
  });

  it('reuses HubShell components — does not redeclare them', () => {
    expect(HUB).toMatch(/import\s*\{[^}]*HubHeader[^}]*\}\s*from\s*['"]@\/components\/hub\/HubShell['"]/);
    expect(HUB).not.toMatch(/^function HubHeader/m);
    expect(HUB).not.toMatch(/^function HubCard/m);
  });
});

describe('Route + sidebar wiring', () => {
  it('App.tsx mounts /catalog → CatalogHub with products:read', () => {
    expect(APP).toMatch(/import\(['"]@\/pages\/CatalogHub['"]\)/);
    expect(APP).toMatch(/path=['"]\/catalog['"]\s+element=\{<GuardedRoute\s+permission=['"]products:read['"]><CatalogHub/);
  });

  it('Sidebar lists "مركز الكتالوج" at the top of the Catalog group', () => {
    const hubIdx = SIDEBAR.indexOf("to: '/catalog'");
    const productsIdx = SIDEBAR.indexOf("to: '/catalog/products'");
    expect(hubIdx).toBeGreaterThan(0);
    expect(productsIdx).toBeGreaterThan(hubIdx);
    expect(SIDEBAR).toMatch(/label:\s*['"]nav\.catalogHub['"]/);
  });
});
