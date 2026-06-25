// IA Wave 3 — namespaced route paths + backwards-compat redirects.
//
// Every leaf page (Products, Orders, Wallet, etc.) is now mounted
// under its section hub (`/catalog/products`, `/sales/orders`,
// `/finance/wallet`, ...). The old top-level paths are kept as
// `<Navigate to="..." replace />` so:
//   - emails / receipts / past invoices keep working
//   - bookmarked merchant URLs keep working
//   - external integrations referencing the old paths keep working
//
// The Sidebar + Hub cards point to the NEW canonical paths.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const APP = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/App.tsx'),
  'utf-8',
);
const SIDEBAR = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/components/layout/Sidebar.tsx'),
  'utf-8',
);

const NAMESPACED_LEAVES: Array<[string, RegExp]> = [
  // [canonical-path, route-element pattern]
  ['/catalog/products',          /path=['"]\/catalog\/products['"]\s+element=\{<GuardedRoute\s+permission=['"]products:read['"]><Products/],
  ['/catalog/categories',        /path=['"]\/catalog\/categories['"]\s+element=\{<GuardedRoute\s+permission=['"]categories:manage['"]><Categories/],
  ['/catalog/brands',            /path=['"]\/catalog\/brands['"]\s+element=\{<GuardedRoute\s+permission=['"]brands:manage['"]><Brands/],
  ['/catalog/tags',              /path=['"]\/catalog\/tags['"]\s+element=\{<GuardedRoute\s+permission=['"]tags:manage['"]><Tags/],
  ['/sales/orders',              /path=['"]\/sales\/orders['"]\s+element=\{<GuardedRoute\s+permission=['"]orders:read['"]><Orders/],
  ['/sales/customers',           /path=['"]\/sales\/customers['"]\s+element=\{<GuardedRoute\s+permission=['"]customers:read['"]><Customers/],
  ['/sales/abandoned-carts',     /path=['"]\/sales\/abandoned-carts['"]\s+element=\{<GuardedRoute\s+permission=['"]orders:read['"]><AbandonedCarts/],
  ['/sales/shipping',            /path=['"]\/sales\/shipping['"]\s+element=\{<GuardedRoute\s+permission=['"]shipping:manage['"]><Shipping/],
  ['/sales/channels',            /path=['"]\/sales\/channels['"]\s+element=\{<GuardedRoute\s+permission=['"]settings:read['"]><Marketplaces/],
  ['/marketing/promotions',      /path=['"]\/marketing\/promotions['"]\s+element=\{<GuardedRoute\s+permission=['"]promotions:read['"]><Promotions/],
  ['/marketing/coupons',         /path=['"]\/marketing\/coupons['"]\s+element=\{<GuardedRoute\s+permission=['"]coupons:read['"]><Coupons/],
  ['/marketing/loyalty',         /path=['"]\/marketing\/loyalty['"]\s+element=\{<GuardedRoute\s+permission=['"]promotions:read['"]><LoyaltyPage/],
  ['/marketing/whatsapp',        /path=['"]\/marketing\/whatsapp['"]\s+element=\{<GuardedRoute\s+permission=['"]settings:read['"]><WhatsAppPage/],
  ['/finance/wallet',            /path=['"]\/finance\/wallet['"]\s+element=\{<GuardedRoute\s+permission=['"]wallet:read['"]><WalletPage/],
  ['/finance/settlements',       /path=['"]\/finance\/settlements['"]\s+element=\{<GuardedRoute\s+permission=['"]wallet:read['"]><SettlementOverview/],
  ['/finance/subscriptions',     /path=['"]\/finance\/subscriptions['"]\s+element=\{<GuardedRoute\s+permission=['"]subscriptions:view['"]><Subscriptions/],
  ['/finance/compliance',        /path=['"]\/finance\/compliance['"]\s+element=\{<GuardedRoute\s+permission=['"]compliance:read['"]><Compliance/],
];

const LEGACY_REDIRECTS: Array<[string, string]> = [
  ['/products',                  '/catalog/products'],
  ['/categories',                '/catalog/categories'],
  ['/brands',                    '/catalog/brands'],
  ['/tags',                      '/catalog/tags'],
  ['/orders',                    '/sales/orders'],
  ['/customers',                 '/sales/customers'],
  ['/abandoned-carts',           '/sales/abandoned-carts'],
  ['/shipping',                  '/sales/shipping'],
  ['/channels',                  '/sales/channels'],
  ['/promotions',                '/marketing/promotions'],
  ['/coupons',                   '/marketing/coupons'],
  ['/loyalty',                   '/marketing/loyalty'],
  ['/whatsapp',                  '/marketing/whatsapp'],
  ['/wallet',                    '/finance/wallet'],
  ['/wallet/settlements',        '/finance/settlements'],
  ['/subscriptions',             '/finance/subscriptions'],
  ['/compliance',                '/finance/compliance'],
];

describe('IA W3 — namespaced canonical paths', () => {
  for (const [path, pattern] of NAMESPACED_LEAVES) {
    it(`mounts ${path}`, () => {
      expect(APP).toMatch(pattern);
    });
  }
});

describe('IA W3 — legacy redirects', () => {
  for (const [oldPath, newPath] of LEGACY_REDIRECTS) {
    it(`${oldPath} → ${newPath}`, () => {
      const escapedOld = oldPath.replace(/\//g, '\\/');
      const escapedNew = newPath.replace(/\//g, '\\/');
      expect(APP).toMatch(
        new RegExp(`path=['"]${escapedOld}['"]\\s+element=\\{<Navigate\\s+to=['"]${escapedNew}['"]\\s+replace\\s*\\/>`),
      );
    });
  }

  it('parameterised legacy redirects use NavWithParams helper', () => {
    // Plain <Navigate to="/sales/orders/:orderId"> would NOT substitute
    // the param. The helper reads useParams() and rewrites the
    // template before rendering Navigate.
    expect(APP).toMatch(/function NavWithParams\(/);
    expect(APP).toMatch(/path=['"]\/orders\/:orderId['"]\s+element=\{<NavWithParams\s+template=['"]\/sales\/orders\/:orderId['"]/);
    expect(APP).toMatch(/path=['"]\/wallet\/settlements\/:batchId['"]\s+element=\{<NavWithParams\s+template=['"]\/finance\/settlements\/:batchId['"]/);
  });
});

describe('IA W3 — sidebar updated to new canonical paths', () => {
  const PATHS_THAT_MUST_BE_NAMESPACED = [
    '/catalog/products',
    '/catalog/categories',
    '/catalog/brands',
    '/catalog/tags',
    '/sales/orders',
    '/sales/customers',
    '/sales/abandoned-carts',
    '/sales/shipping',
    '/sales/channels',
    '/marketing/promotions',
    '/marketing/coupons',
    '/marketing/loyalty',
    '/marketing/whatsapp',
    '/finance/wallet',
    '/finance/subscriptions',
    '/finance/compliance',
  ];

  for (const to of PATHS_THAT_MUST_BE_NAMESPACED) {
    it(`sidebar links to ${to}`, () => {
      expect(SIDEBAR).toMatch(new RegExp(`to:\\s*['"]${to.replace(/\//g, '\\/')}['"]`));
    });
  }

  it('sidebar does NOT keep the old top-level leaf paths', () => {
    // The hub paths (`/catalog`, `/sales`, `/marketing`, `/finance`)
    // and the settings group paths (`/settings`, `/employees`,
    // `/policies`, ...) STAY top-level. The leaf paths must be moved.
    expect(SIDEBAR).not.toMatch(/to:\s*['"]\/products['"]/);
    expect(SIDEBAR).not.toMatch(/to:\s*['"]\/orders['"]/);
    expect(SIDEBAR).not.toMatch(/to:\s*['"]\/wallet['"]/);
    expect(SIDEBAR).not.toMatch(/to:\s*['"]\/promotions['"]/);
  });
});
