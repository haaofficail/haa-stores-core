// Marketing Hub — IA W2 landing page contract.
//
// Implements the Apple-style "Hub per section" pattern from the IA
// review: every top-level section gets a single landing screen that
// answers "what's happening across these tools and what should I do
// next?" — not a flat list view.
//
// This Hub composes existing endpoints (promotions, coupons,
// abandoned-carts stats, loyalty analytics) into one degradable
// overview. Promise.allSettled keeps the page rendering even when
// one downstream API is down.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HUB = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/pages/MarketingHub.tsx'),
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

describe('MarketingHub — page', () => {
  it('composes data via Promise.allSettled (degradable, not blocking)', () => {
    expect(HUB).toMatch(/Promise\.allSettled/);
  });

  it('reads from the existing 4 data sources', () => {
    expect(HUB).toMatch(/promotionsApi\.list/);
    expect(HUB).toMatch(/couponsApi\.list/);
    expect(HUB).toMatch(/abandonedCartsApi\.stats/);
    expect(HUB).toMatch(/loyaltyApi\.analytics/);
  });

  it('renders 4 metric tiles + 6 tool cards (all marketing surfaces)', () => {
    // 4 metric tiles — corresponds to the 4 data sources.
    const tiles = HUB.match(/<MetricTile/g) ?? [];
    expect(tiles.length).toBe(4);
    // 6 HubCards covering all marketing pages.
    const cards = HUB.match(/<HubCard/g) ?? [];
    expect(cards.length).toBe(6);
  });

  it('cross-links to all 6 marketing pages', () => {
    for (const to of ['/marketing/promotions', '/marketing/coupons', '/marketing/loyalty', '/marketing/whatsapp', '/sales/abandoned-carts', '/marketing/actions']) {
      expect(HUB, `must link to ${to}`).toMatch(new RegExp(`to=['"]${to.replace(/\//g, '\\/')}['"]`));
    }
  });

  it('each tile falls back to "—" when the slice is null', () => {
    // The Hub MUST stay usable when one downstream API is down. The
    // fallback marker is the em-dash.
    expect(HUB).toMatch(/value \?\? '—'/);
  });
});

describe('MarketingHub — route + nav wiring', () => {
  it('App.tsx mounts /marketing → MarketingHub with promotions:read', () => {
    expect(APP).toMatch(/import\(['"]@\/pages\/MarketingHub['"]\)/);
    expect(APP).toMatch(/path=['"]\/marketing['"]\s+element=\{<GuardedRoute\s+permission=['"]promotions:read['"]><MarketingHub/);
  });

  it('Sidebar lists "مركز التسويق" at the top of the Marketing group', () => {
    // The Hub item must appear BEFORE the leaf items so the merchant
    // lands on overview first.
    const hubIdx = SIDEBAR.indexOf("to: '/marketing'");
    const promosIdx = SIDEBAR.indexOf("to: '/marketing/promotions'");
    expect(hubIdx).toBeGreaterThan(0);
    expect(promosIdx).toBeGreaterThan(hubIdx);
    expect(SIDEBAR).toMatch(/label:\s*['"]nav\.marketingHub['"]/);
  });
});
