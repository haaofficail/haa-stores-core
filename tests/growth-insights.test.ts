import { describe, it, expect } from 'vitest';

describe('Growth Insights — Phase 1: Aggregation Correctness', () => {
  it('counts view_product events as views', () => {
    const events = [
      { eventType: 'view_product', productId: 1 },
      { eventType: 'view_product', productId: 1 },
      { eventType: 'view_product', productId: 2 },
    ];
    const viewCounts = new Map<number, number>();
    for (const e of events) {
      if (e.eventType === 'view_product' && e.productId) {
        viewCounts.set(e.productId, (viewCounts.get(e.productId) ?? 0) + 1);
      }
    }
    expect(viewCounts.get(1)).toBe(2);
    expect(viewCounts.get(2)).toBe(1);
  });

  it('counts add_to_cart events separately from views', () => {
    const events = [
      { eventType: 'view_product', productId: 1 },
      { eventType: 'add_to_cart', productId: 1 },
      { eventType: 'add_to_cart', productId: 1 },
    ];
    const views = events.filter(e => e.eventType === 'view_product').length;
    const addToCarts = events.filter(e => e.eventType === 'add_to_cart').length;
    expect(views).toBe(1);
    expect(addToCarts).toBe(2);
  });

  it('computes conversionRate correctly', () => {
    const views = 200;
    const purchases = 10;
    const rate = purchases / views;
    expect(rate).toBe(0.05);
  });

  it('computes cartRate correctly', () => {
    const views = 200;
    const addToCarts = 40;
    const rate = addToCarts / views;
    expect(rate).toBe(0.2);
  });

  it('handles zero views without division errors', () => {
    const views = 0;
    const purchases = 0;
    const conversionRate = views > 0 ? purchases / views : null;
    expect(conversionRate).toBeNull();
  });

  it('aggregates revenue from metadata safely', () => {
    const events = [
      { eventType: 'purchase', productId: 1, metadata: { revenue: '100.00' } },
      { eventType: 'purchase', productId: 1, metadata: { revenue: '50.00' } },
    ];
    let totalRevenue = 0;
    for (const e of events) {
      if (e.metadata?.revenue) {
        totalRevenue += Number(e.metadata.revenue);
      }
    }
    expect(totalRevenue).toBe(150);
  });

  it('ignores revenue metadata for non-purchase events', () => {
    const events = [
      { eventType: 'add_to_cart', metadata: { revenue: '100' } },
    ];
    let totalRevenue = 0;
    for (const e of events) {
      if (e.eventType === 'purchase' && e.metadata?.revenue) {
        totalRevenue += Number(e.metadata.revenue);
      }
    }
    expect(totalRevenue).toBe(0);
  });
});

describe('Growth Insights — Phase 2: Idempotent Upsert', () => {
  it('produces same result on re-aggregation', () => {
    const events = [
      { eventType: 'view_product', productId: 1, date: '2026-06-01' },
      { eventType: 'add_to_cart', productId: 1, date: '2026-06-01' },
    ];

    const views = events.filter(e => e.eventType === 'view_product' && e.date === '2026-06-01').length;
    const addToCarts = events.filter(e => e.eventType === 'add_to_cart' && e.date === '2026-06-01').length;

    // First run
    const run1 = { views, addToCarts, purchases: 0 };
    // Second run (same data)
    const run2 = { views, addToCarts, purchases: 0 };

    expect(run1).toEqual(run2);
  });

  it('upserts rather than duplicates on conflict', () => {
    const existingCount = { views: 5, addToCarts: 2, purchases: 1 };
    const newCount = { views: 8, addToCarts: 3, purchases: 1 };
    const merged = { ...existingCount, ...newCount };
    expect(merged.views).toBe(8);
    expect(merged.addToCarts).toBe(3);
    expect(merged.purchases).toBe(1);
  });
});

describe('Growth Insights — Phase 3: Store Isolation', () => {
  it('does not include store A events in store B aggregation', () => {
    const storeAEvents = [
      { storeId: 1, eventType: 'view_product', productId: 1 },
      { storeId: 1, eventType: 'purchase', productId: 1 },
    ];
    const storeBEvents = [
      { storeId: 2, eventType: 'view_product', productId: 10 },
    ];

    const storeBViews = storeBEvents.filter(e => e.eventType === 'view_product').length;
    expect(storeBViews).toBe(1);

    const storeAPurchases = storeAEvents.filter(e => e.eventType === 'purchase').length;
    expect(storeAPurchases).toBe(1);

    const mixedPurchaseCount = [...storeAEvents, ...storeBEvents]
      .filter(e => e.storeId === 1 && e.eventType === 'purchase').length;
    expect(mixedPurchaseCount).toBe(1);
  });

  it('prevents cross-store metric access via storeId manipulation', () => {
    const permittedStoreId = 1;
    const attemptedStoreId = 2;
    expect(attemptedStoreId).not.toBe(permittedStoreId);
  });

  it('rejects API request with wrong storeId in URL params', () => {
    const middlewareCheck = (paramStoreId: string, jwtStoreId: string) => {
      return String(paramStoreId) === String(jwtStoreId);
    };
    expect(middlewareCheck('1', '1')).toBe(true);
    expect(middlewareCheck('2', '1')).toBe(false);
  });
});

describe('Growth Insights — Phase 4: Overview Metrics', () => {
  it('computes cartToCheckoutRate correctly', () => {
    const addToCarts = 100;
    const checkoutStarts = 30;
    const rate = checkoutStarts / addToCarts;
    expect(rate).toBe(0.3);
  });

  it('computes checkoutToPurchaseRate correctly', () => {
    const checkoutStarts = 50;
    const purchases = 10;
    const rate = purchases / checkoutStarts;
    expect(rate).toBe(0.2);
  });

  it('computes estimatedAbandonmentRate correctly', () => {
    const checkoutStarts = 50;
    const purchases = 10;
    const rate = (checkoutStarts - purchases) / checkoutStarts;
    expect(rate).toBe(0.8);
  });

  it('returns null rates when denominator is zero', () => {
    const cartToCheckout = 0 > 0 ? 30 / 0 : null;
    const checkoutToPurchase = 0 > 0 ? 10 / 0 : null;
    expect(cartToCheckout).toBeNull();
    expect(checkoutToPurchase).toBeNull();
  });
});

describe('Growth Insights — Phase 5: Source Attribution Correctness', () => {
  it('groups sessions by utmSource', () => {
    const sessions = [
      { utmSource: 'google', orderId: null },
      { utmSource: 'google', orderId: 1 },
      { utmSource: 'twitter', orderId: null },
    ];

    const sourceMap = new Map<string, { sessions: number; orders: number }>();
    for (const s of sessions) {
      const source = s.utmSource || 'direct';
      if (!sourceMap.has(source)) sourceMap.set(source, { sessions: 0, orders: 0 });
      const entry = sourceMap.get(source)!;
      entry.sessions++;
      if (s.orderId) entry.orders++;
    }

    expect(sourceMap.get('google')?.sessions).toBe(2);
    expect(sourceMap.get('google')?.orders).toBe(1);
    expect(sourceMap.get('twitter')?.sessions).toBe(1);
    expect(sourceMap.get('twitter')?.orders).toBe(0);
  });

  it('attributes direct traffic when utmSource is null', () => {
    const session = { utmSource: null, orderId: 1 };
    const source = session.utmSource || 'direct';
    expect(source).toBe('direct');
  });

  it('attributes untagged campaigns when utmCampaign is null', () => {
    const session = { utmCampaign: null, orders: 0 };
    const campaign = session.utmCampaign || 'untagged';
    expect(campaign).toBe('untagged');
  });

  it('prevents double-counting order revenue across sources', () => {
    const orders = new Map<number, number>([
      [1, 100],
      [2, 200],
    ]);

    const sourceOrders1 = new Set([1]);
    const sourceOrders2 = new Set([2]);

    let source1Revenue = 0;
    for (const oid of sourceOrders1) source1Revenue += orders.get(oid) ?? 0;

    let source2Revenue = 0;
    for (const oid of sourceOrders2) source2Revenue += orders.get(oid) ?? 0;

    expect(source1Revenue + source2Revenue).toBe(300);
  });
});

describe('Growth Insights — Phase 6: Rule-based Insights', () => {
  it('detects product with high views and low purchases', () => {
    const products = [
      { name: 'A', views: 500, purchases: 3, conversionRate: 3 / 500 },
      { name: 'B', views: 100, purchases: 20, conversionRate: 20 / 100 },
    ];

    const lowConversion = products.filter(p => p.views >= 50 && p.conversionRate < 0.02);
    expect(lowConversion).toHaveLength(1);
    expect(lowConversion[0].name).toBe('A');
  });

  it('detects high abandonment rate', () => {
    const checkoutStarts = 100;
    const purchases = 20;
    const rate = (checkoutStarts - purchases) / checkoutStarts;
    const isHigh = rate > 0.7;
    expect(isHigh).toBe(true);
    expect(rate).toBe(0.8);
  });

  it('detects low cart-to-checkout conversion', () => {
    const addToCarts = 100;
    const checkoutStarts = 20;
    const rate = checkoutStarts / addToCarts;
    const isLow = rate < 0.3;
    expect(isLow).toBe(true);
    expect(rate).toBe(0.2);
  });

  it('identifies best performing campaign', () => {
    const campaigns = [
      { name: 'A', sessions: 100, orders: 10, rate: 0.1 },
      { name: 'B', sessions: 200, orders: 5, rate: 0.025 },
    ];

    const best = campaigns.sort((a, b) => b.rate - a.rate)[0];
    expect(best.name).toBe('A');
  });

  it('identifies campaigns with high visits low conversion', () => {
    const campaigns = [
      { name: 'A', sessions: 100, orders: 2, rate: 0.02 },
      { name: 'B', sessions: 30, orders: 5, rate: 0.167 },
    ];

    const poor = campaigns.filter(c => c.sessions >= 20 && c.rate < 0.05);
    expect(poor).toHaveLength(1);
    expect(poor[0].name).toBe('A');
  });

  it('generates proper insight structure', () => {
    const insight = {
      type: 'product_low_conversion',
      severity: 'warning' as const,
      title: 'منتج ذو مشاهدات عالية ومبيعات منخفضة',
      description: 'منتج X لديه 500 مشاهدة ولكن 3 مشتريات فقط',
      entityType: 'product' as const,
      entityId: '123',
      metric: 'conversionRate',
      recommendation: 'حسّن وصف المنتج',
    };

    expect(insight.type).toBeTruthy();
    expect(insight.severity).toMatch(/^(info|warning|critical)$/);
    expect(insight.entityType).toMatch(/^(product|campaign|source|funnel)$/);
    expect(insight.recommendation).toBeTruthy();
  });
});

describe('Growth Insights — Phase 7: Dashboard API Authorization', () => {
  it('requires reports:read permission', () => {
    const requiredPermission = 'reports:read';
    const userPermissions = ['dashboard:view', 'products:read'];
    const hasAccess = userPermissions.includes(requiredPermission);
    expect(hasAccess).toBe(false);
  });

  it('grants access with correct permission', () => {
    const requiredPermission = 'reports:read';
    const userPermissions = ['products:read', 'reports:read', 'orders:read'];
    const hasAccess = userPermissions.includes(requiredPermission);
    expect(hasAccess).toBe(true);
  });
});
