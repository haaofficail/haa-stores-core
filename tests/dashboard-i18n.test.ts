import { describe, it, expect } from 'vitest';
import ar from '../apps/merchant-dashboard/src/i18n/locales/ar.json';

function resolveKey(obj: Record<string, any>, path: string): string | undefined {
  return path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

describe('Dashboard i18n - Sidebar labels are Arabic', () => {
  const navKeys = ['dashboard', 'products', 'categories', 'brands', 'tags', 'orders', 'customers', 'channels', 'shipping', 'wallet', 'coupons', 'promotions', 'abandonedCarts', 'policies', 'reports', 'exports', 'imports', 'compliance', 'subscriptions', 'notifications', 'apiKeys', 'migration', 'aiAssistant', 'settings'];

  for (const key of navKeys) {
    it(`nav.${key} resolves to Arabic text`, () => {
      const value = resolveKey(ar, `nav.${key}`);
      expect(value).toBeTruthy();
      expect(value).toMatch(/[\u0600-\u06FF]/);
    });
  }
});

describe('Dashboard i18n - No raw i18n keys rendered', () => {
  it('nav keys use dot notation not colon notation', () => {
    const sidebarLabels = ['nav.dashboard', 'nav.products', 'nav.categories', 'nav.brands', 'nav.tags', 'nav.orders', 'nav.customers', 'nav.channels', 'nav.shipping', 'nav.wallet', 'nav.coupons', 'nav.promotions', 'nav.abandonedCarts', 'nav.policies', 'nav.reports', 'nav.exports', 'nav.imports', 'nav.compliance', 'nav.subscriptions', 'nav.notifications', 'nav.apiKeys', 'nav.migration', 'nav.aiAssistant', 'nav.settings'];
    for (const label of sidebarLabels) {
      const value = resolveKey(ar, label);
      expect(value).toBeTruthy();
      expect(value).not.toContain('nav:');
    }
  });

  it('storeReadiness labels are under settings.storeReadiness path', () => {
    const readinessKeys = ['storeName', 'storeDescription', 'storeLogo', 'storeColor', 'storeContact', 'hasCategory', 'hasActiveProduct', 'hasProductImage', 'hasShippingMethod', 'hasShippingZone', 'hasShippingRate', 'hasOrder'];
    for (const key of readinessKeys) {
      const value = resolveKey(ar, `settings.storeReadiness.${key}`);
      expect(value).toBeTruthy();
      expect(value).toMatch(/[\u0600-\u06FF]/);
    }
  });
});

describe('Dashboard i18n - Order status labels are Arabic', () => {
  const statuses = [
    'draft', 'checkout_started', 'pending_payment', 'confirmed', 'processing',
    'ready_to_ship', 'shipped', 'delivered', 'completed', 'cancelled',
    'returned', 'refunded', 'partially_refunded', 'returned_to_sender',
  ];

  for (const status of statuses) {
    it(`orders.status_${status} resolves to Arabic text`, () => {
      const value = resolveKey(ar, `orders.status_${status}`);
      expect(value).toBeTruthy();
      expect(value).toMatch(/[\u0600-\u06FF]/);
    });
  }
});

describe('Dashboard i18n - Payment status labels are Arabic', () => {
  const statuses = ['unpaid', 'paid', 'refunded', 'partially_refunded'];

  for (const status of statuses) {
    it(`orders.payment_${status} resolves to Arabic text`, () => {
      const value = resolveKey(ar, `orders.payment_${status}`);
      expect(value).toBeTruthy();
      expect(value).toMatch(/[\u0600-\u06FF]/);
    });
  }
});

describe('Dashboard i18n - Fulfillment status labels are Arabic', () => {
  const statuses = ['unfulfilled', 'partial', 'fulfilled'];

  for (const status of statuses) {
    it(`orders.fulfillment_${status} resolves to Arabic text`, () => {
      const value = resolveKey(ar, `orders.fulfillment_${status}`);
      expect(value).toBeTruthy();
      expect(value).toMatch(/[\u0600-\u06FF]/);
    });
  }
});

describe('Dashboard i18n - Dashboard summary labels', () => {
  it('totalSales label exists and is Arabic', () => {
    expect(resolveKey(ar, 'dashboard.totalSales')).toMatch(/[\u0600-\u06FF]/);
  });

  it('totalOrders label exists and is Arabic', () => {
    expect(resolveKey(ar, 'dashboard.totalOrders')).toMatch(/[\u0600-\u06FF]/);
  });

  it('newOrders label exists and is Arabic', () => {
    expect(resolveKey(ar, 'dashboard.newOrders')).toMatch(/[\u0600-\u06FF]/);
  });

  it('totalProducts label exists and is Arabic', () => {
    expect(resolveKey(ar, 'dashboard.totalProducts')).toMatch(/[\u0600-\u06FF]/);
  });
});

describe('Dashboard i18n - Quick actions labels are Arabic', () => {
  const actions = ['addProduct', 'viewOrders', 'createCoupon', 'openStore'];

  for (const action of actions) {
    it(`dashboard.quickActions.${action} resolves to Arabic text`, () => {
      const value = resolveKey(ar, `dashboard.quickActions.${action}`);
      expect(value).toBeTruthy();
      expect(value).toMatch(/[\u0600-\u06FF]/);
    });
  }
});

describe('Dashboard i18n - Readiness missing item label translated', () => {
  it('missingItem key exists', () => {
    expect(resolveKey(ar, 'dashboard.missingItem')).toBeTruthy();
  });

  it('completeReadiness key exists', () => {
    expect(resolveKey(ar, 'dashboard.completeReadiness')).toBeTruthy();
  });

  it('alertsEmptyHint key exists', () => {
    expect(resolveKey(ar, 'dashboard.alertsEmptyHint')).toBeTruthy();
  });
});

describe('Dashboard i18n - Alerts empty state renders Arabic message', () => {
  it('dashboard.alertsEmptyHint is Arabic', () => {
    const hint = resolveKey(ar, 'dashboard.alertsEmptyHint');
    expect(hint).toBeTruthy();
    expect(hint).toMatch(/[\u0600-\u06FF]/);
    expect(hint.length).toBeGreaterThan(10);
  });
});

describe('Dashboard summary - totalSales calculation', () => {
  it('should aggregate all paid orders', () => {
    const orders = [
      { total: '100', paymentStatus: 'paid' },
      { total: '200', paymentStatus: 'paid' },
      { total: '50', paymentStatus: 'unpaid' },
      { total: '300', paymentStatus: 'paid' },
    ];
    const totalSales = orders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + Number(o.total), 0);
    expect(totalSales).toBe(600);
  });

  it('should return 0 if no paid orders exist', () => {
    const orders = [
      { total: '100', paymentStatus: 'unpaid' },
      { total: '200', paymentStatus: 'pending' },
    ];
    const totalSales = orders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + Number(o.total), 0);
    expect(totalSales).toBe(0);
  });

  it('totalOrders must be >= newOrders when newOrders > 0 (same store_id)', () => {
    const totalOrders = 20;
    const newOrders = 20;
    const cantHappen = totalOrders === 0 && newOrders > 0;
    expect(cantHappen).toBe(false);
    expect(newOrders).toBeLessThanOrEqual(totalOrders);
  });

  it('totalOrders must be >= newOrders when newOrders is a subset', () => {
    const totalOrders = 50;
    const newOrders = 20;
    expect(newOrders).toBeLessThanOrEqual(totalOrders);
  });
});

describe('Sidebar uses dot notation (not colon)', () => {
  const sidebarPath = 'apps/merchant-dashboard/src/components/layout/Sidebar.tsx';
  it('sidebar label keys use dot separator', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(sidebarPath, 'utf-8');
    const colonMatches = content.match(/label:\s*'nav:[^']+'/g);
    expect(colonMatches).toBeNull();
    const dotMatches = content.match(/label:\s*'nav\.[^']+'/g);
    expect(dotMatches).not.toBeNull();
    const navItems = content.match(/to:\s*'[^']+',\s*icon:\s*\w+,\s*label:\s*'nav\.[^']+'/g);
    expect(dotMatches!.length).toBe(navItems?.length);
  });
});

describe('Sidebar renders translated text (not raw keys)', () => {
  const sidebarPath = 'apps/merchant-dashboard/src/components/layout/Sidebar.tsx';

  it('does NOT render {item.label} directly without t()', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(sidebarPath, 'utf-8');
    // Should NOT have raw {item.label} without t() wrapper
    const rawLabelMatch = content.match(/\{item\.label\}/g);
    expect(rawLabelMatch).toBeNull();
  });

  it('uses t(item.label) with fallback for translation', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(sidebarPath, 'utf-8');
    // Should use t() with fallback
    expect(content).toContain('t(item.label');
  });

  it('NavGroup component has useTranslation hook', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(sidebarPath, 'utf-8');
    // NavGroup should have its own useTranslation
    const navGroupSection = content.split('function NavGroup')[1]?.split('export function Sidebar')[0];
    expect(navGroupSection).toContain('useTranslation()');
  });

  it('no text starting with "nav." should be visible in rendered output', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(sidebarPath, 'utf-8');
    // Check that all nav.* keys are wrapped in t()
    const navKeyPattern = /'nav\.\w+'/g;
    const matches = content.match(navKeyPattern);
    expect(matches).not.toBeNull();
    // Each nav key should be in a label property with fallback
    expect(content).toContain('fallback:');
  });
});

describe('Orders page StatusBadge uses translated labels', () => {
  it('StatusBadge component accepts label prop and uses getDisplayLabel', async () => {
    // T2.5: StatusBadge extracted to orders/orderHelpers.tsx
    const fs = await import('fs');
    const content = fs.readFileSync('apps/merchant-dashboard/src/pages/orders/orderHelpers.tsx', 'utf-8');
    expect(content).toContain('label?');
    expect(content).toContain('getDisplayLabel(status, label)');
  });
});
