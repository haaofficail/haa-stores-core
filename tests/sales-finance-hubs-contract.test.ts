// Sales + Finance hubs contract — IA Wave 2 part 2.
//
// Continues the pattern from MarketingHub (PR #237): each section
// gets a single landing page with KPIs + tool cards. Sales = orders/
// customers/segments/abandoned/shipping/channels. Finance = wallet/settlements/
// subscription/compliance.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const SALES = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/pages/SalesHub.tsx'),
  'utf-8',
);
const FINANCE = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/pages/FinanceHub.tsx'),
  'utf-8',
);
const SHELL_PATH = resolve(__dirname, '../apps/merchant-dashboard/src/components/hub/HubShell.tsx');
const APP = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/App.tsx'),
  'utf-8',
);
const SIDEBAR = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/components/layout/Sidebar.tsx'),
  'utf-8',
);

describe('Shared HubShell components', () => {
  it('extracted to a reusable module so future hubs do not copy-paste', () => {
    expect(existsSync(SHELL_PATH)).toBe(true);
    const SHELL = readFileSync(SHELL_PATH, 'utf-8');
    expect(SHELL).toMatch(/export function HubHeader/);
    expect(SHELL).toMatch(/export function MetricGrid/);
    expect(SHELL).toMatch(/export function MetricTile/);
    expect(SHELL).toMatch(/export function HubCard/);
  });
});

describe('SalesHub', () => {
  it('composes data via Promise.allSettled', () => {
    expect(SALES).toMatch(/Promise\.allSettled/);
  });

  it('reads from orders + customers + abandoned-carts + marketplace', () => {
    expect(SALES).toMatch(/ordersApi\.list/);
    expect(SALES).toMatch(/customersApi\.list/);
    expect(SALES).toMatch(/abandonedCartsApi\.stats/);
    expect(SALES).toMatch(/marketplaceApi\.hub/);
  });

  it('renders 4 metric tiles + 7 tool cards', () => {
    const tiles = SALES.match(/<MetricTile/g) ?? [];
    expect(tiles.length).toBe(4);
    const cards = SALES.match(/<HubCard/g) ?? [];
    expect(cards.length).toBe(7);
  });

  it('cross-links to every sales-section page', () => {
    for (const to of [
      '/sales/orders',
      '/sales/customers',
      '/sales/customers/segments',
      '/sales/abandoned-carts',
      '/sales/shipping',
      '/sales/channels',
      '/catalog/products',
    ]) {
      expect(SALES, `must link to ${to}`).toMatch(new RegExp(`to=['"]${to.replace(/\//g, '\\/')}['"]`));
    }
  });
});

describe('FinanceHub', () => {
  it('composes data via Promise.allSettled', () => {
    expect(FINANCE).toMatch(/Promise\.allSettled/);
  });

  it('reads from wallet + subscription + compliance', () => {
    expect(FINANCE).toMatch(/walletApi\.summary/);
    expect(FINANCE).toMatch(/walletApi\.payouts/);
    expect(FINANCE).toMatch(/subscriptionApi\.getCurrent/);
    expect(FINANCE).toMatch(/complianceApi\.getStatus/);
  });

  it('counts pending payouts by filtering on status', () => {
    expect(FINANCE).toMatch(/p\.status === ['"]requested['"]\s*\|\|\s*p\.status === ['"]under_review['"]/);
  });

  it('renders 4 metric tiles + 4 tool cards', () => {
    const tiles = FINANCE.match(/<MetricTile/g) ?? [];
    expect(tiles.length).toBe(4);
    const cards = FINANCE.match(/<HubCard/g) ?? [];
    expect(cards.length).toBe(4);
  });

  it('cross-links to every finance-section page', () => {
    for (const to of ['/finance/wallet', '/finance/settlements', '/finance/subscriptions', '/finance/compliance']) {
      expect(FINANCE, `must link to ${to}`).toMatch(new RegExp(`to=['"]${to.replace(/\//g, '\\/')}['"]`));
    }
  });
});

describe('Route + sidebar wiring', () => {
  it('App.tsx mounts /sales → SalesHub with orders:read', () => {
    expect(APP).toMatch(/import\(['"]@\/pages\/SalesHub['"]\)/);
    expect(APP).toMatch(/path=['"]\/sales['"]\s+element=\{<GuardedRoute\s+permission=['"]orders:read['"]><SalesHub/);
  });

  it('App.tsx mounts /finance → FinanceHub with wallet:read', () => {
    expect(APP).toMatch(/import\(['"]@\/pages\/FinanceHub['"]\)/);
    expect(APP).toMatch(/path=['"]\/finance['"]\s+element=\{<GuardedRoute\s+permission=['"]wallet:read['"]><FinanceHub/);
  });

  it('Sidebar lists Sales Hub at the top of the Sales group', () => {
    const hubIdx = SIDEBAR.indexOf("to: '/sales'");
    const ordersIdx = SIDEBAR.indexOf("to: '/sales/orders'");
    expect(hubIdx).toBeGreaterThan(0);
    expect(ordersIdx).toBeGreaterThan(hubIdx);
    expect(SIDEBAR).toMatch(/label:\s*['"]nav\.salesHub['"]/);
  });

  it('Sidebar lists Finance Hub at the top of the Finance group', () => {
    const hubIdx = SIDEBAR.indexOf("to: '/finance'");
    const walletIdx = SIDEBAR.indexOf("to: '/finance/wallet'");
    expect(hubIdx).toBeGreaterThan(0);
    expect(walletIdx).toBeGreaterThan(hubIdx);
    expect(SIDEBAR).toMatch(/label:\s*['"]nav\.financeHub['"]/);
  });
});
