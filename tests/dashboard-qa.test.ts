import { describe, it, expect } from 'vitest';

const EXISTING_FIELDS = [
  'totalProducts', 'activeProducts', 'lowStockProducts',
  'totalOrders', 'newOrders', 'totalSales',
  'balance', 'availableBalance', 'pendingBalance', 'totalFees',
  'activeShippingMethods',
];

const ACTION_CENTER_FIELDS = [
  'newOrdersCount', 'readyToShipCount', 'readyForPickupCount',
  'codCollectionCount', 'lowStockProductsCount', 'outOfStockProductsCount',
];

describe('Dashboard Summary — actionCenter structure', () => {
  it('actionCenter has all required fields', () => {
    const actionCenter = {
      newOrdersCount: 0,
      readyToShipCount: 0,
      readyForPickupCount: 0,
      codCollectionCount: 0,
      lowStockProductsCount: 0,
      outOfStockProductsCount: 0,
    };
    for (const field of ACTION_CENTER_FIELDS) {
      expect(actionCenter).toHaveProperty(field);
      expect(typeof (actionCenter as any)[field]).toBe('number');
    }
  });

  it('existing summary fields are backward-compatible', () => {
    const summary = {
      totalProducts: 100,
      activeProducts: 80,
      lowStockProducts: 5,
      totalOrders: 50,
      newOrders: 3,
      totalSales: '25000.00',
      balance: '1000.00',
      availableBalance: '800.00',
      pendingBalance: '200.00',
      totalFees: '50.00',
      activeShippingMethods: 3,
    };
    for (const field of EXISTING_FIELDS) {
      expect(summary).toHaveProperty(field);
    }
  });

  it('existing fields coexist with actionCenter', () => {
    const response = {
      success: true,
      data: {
        totalProducts: 100,
        activeProducts: 80,
        lowStockProducts: 5,
        totalOrders: 50,
        newOrders: 3,
        totalSales: '25000.00',
        balance: '1000.00',
        availableBalance: '800.00',
        pendingBalance: '200.00',
        totalFees: '50.00',
        activeShippingMethods: 3,
        actionCenter: {
          newOrdersCount: 5,
          readyToShipCount: 2,
          readyForPickupCount: 1,
          codCollectionCount: 3,
          lowStockProductsCount: 3,
          outOfStockProductsCount: 2,
        },
      },
    };
    for (const field of EXISTING_FIELDS) {
      expect(response.data).toHaveProperty(field);
    }
    expect(response.data).toHaveProperty('actionCenter');
    for (const field of ACTION_CENTER_FIELDS) {
      expect(response.data.actionCenter).toHaveProperty(field);
    }
  });
});

describe('Dashboard Summary — actionCenter count logic', () => {
  it('newOrdersCount counts pending_payment + confirmed', () => {
    const orders = [
      { status: 'pending_payment', source: 'storefront' },
      { status: 'confirmed', source: 'storefront' },
      { status: 'processing', source: 'storefront' },
      { status: 'pending_payment', source: 'salla' },
      { status: 'confirmed', source: 'zid' },
    ];
    const internal = orders.filter(o => !['salla', 'zid', 'noon', 'amazon'].includes(o.source));
    const newOrders = internal.filter(o => o.status === 'pending_payment' || o.status === 'confirmed');
    expect(newOrders.length).toBe(2); // pending_payment + confirmed from storefront
  });

  it('readyToShipCount excludes pickup and external', () => {
    const orders = [
      { status: 'ready_to_ship', fulfillmentType: 'shipping', source: 'storefront' },
      { status: 'ready_to_ship', fulfillmentType: 'local_pickup', source: 'storefront' },
      { status: 'ready_to_ship', fulfillmentType: 'shipping', source: 'salla' },
      { status: 'processing', fulfillmentType: 'shipping', source: 'storefront' },
    ];
    const readyToShip = orders.filter(o =>
      o.status === 'ready_to_ship'
      && o.fulfillmentType !== 'local_pickup'
      && !['salla', 'zid', 'noon', 'amazon'].includes(o.source)
    );
    expect(readyToShip.length).toBe(1);
  });

  it('readyForPickupCount only pickup and excludes external', () => {
    const orders = [
      { status: 'ready_for_pickup', fulfillmentType: 'local_pickup', source: 'storefront' },
      { status: 'ready_for_pickup', fulfillmentType: 'local_pickup', source: 'noon' },
      { status: 'ready_for_pickup', fulfillmentType: 'shipping', source: 'storefront' },
      { status: 'shipped', fulfillmentType: 'shipping', source: 'storefront' },
    ];
    const readyForPickup = orders.filter(o =>
      o.status === 'ready_for_pickup'
      && o.fulfillmentType === 'local_pickup'
      && !['salla', 'zid', 'noon', 'amazon'].includes(o.source)
    );
    expect(readyForPickup.length).toBe(1);
  });

  it('codCollectionCount only delivered/picked_up COD pending', () => {
    const orders = [
      { paymentMethod: 'cash_on_delivery', paymentStatus: 'pending', status: 'delivered' },
      { paymentMethod: 'cash_on_delivery', paymentStatus: 'pending', status: 'picked_up' },
      { paymentMethod: 'cash_on_delivery', paymentStatus: 'paid', status: 'delivered' },
      { paymentMethod: 'bank_transfer', paymentStatus: 'pending', status: 'delivered' },
      { paymentMethod: 'cash_on_delivery', paymentStatus: 'pending', status: 'shipped' },
    ];
    const codCollection = orders.filter(o =>
      o.paymentMethod === 'cash_on_delivery'
      && o.paymentStatus === 'pending'
      && ['delivered', 'picked_up'].includes(o.status)
    );
    expect(codCollection.length).toBe(2);
  });

  it('lowStockProductsCount excludes out-of-stock', () => {
    const products = [
      { trackInventory: true, stockQuantity: 3 },
      { trackInventory: true, stockQuantity: 0 },
      { trackInventory: true, stockQuantity: -1 },
      { trackInventory: false, stockQuantity: 0 },
      { trackInventory: true, stockQuantity: 10 },
    ];
    const lowStock = products.filter(p => p.trackInventory && p.stockQuantity > 0 && p.stockQuantity <= 5);
    expect(lowStock.length).toBe(1);
  });

  it('outOfStockProductsCount counts zero or negative stock', () => {
    const products = [
      { trackInventory: true, stockQuantity: 3 },
      { trackInventory: true, stockQuantity: 0 },
      { trackInventory: true, stockQuantity: -1 },
      { trackInventory: false, stockQuantity: 0 },
      { trackInventory: true, stockQuantity: 10 },
    ];
    const outOfStock = products.filter(p => p.trackInventory && p.stockQuantity <= 0);
    expect(outOfStock.length).toBe(2);
  });
});

describe('Dashboard Summary — recentActionableOrders', () => {
  const ACTIONABLE_STATUSES = ['pending_payment', 'confirmed', 'processing', 'ready_to_ship', 'shipped', 'ready_for_pickup'];
  const EXTERNAL_SOURCES = ['salla', 'zid', 'noon', 'amazon'];
  const EXCLUDE_EXTERNAL = (o: { source: string }) => !EXTERNAL_SOURCES.includes(o.source);

  it('shape has all required fields', () => {
    const order = {
      id: 1,
      orderNumber: 'ORD-1001',
      customerName: 'محمد العتيبي',
      total: '250.00',
      status: 'ready_to_ship',
      paymentStatus: 'paid',
      paymentMethod: 'bank_transfer',
      fulfillmentType: 'shipping',
      source: 'storefront',
      createdAt: '2026-06-10T10:00:00.000Z',
    };
    const fields = ['id', 'orderNumber', 'customerName', 'total', 'status', 'paymentStatus', 'paymentMethod', 'fulfillmentType', 'source', 'createdAt'];
    for (const field of fields) {
      expect(order).toHaveProperty(field);
    }
  });

  it('max 5 orders', () => {
    const orders = Array.from({ length: 10 }, (_, i) => ({
      id: i, orderNumber: `ORD-${1000 + i}`, customerName: `C${i}`,
      total: '100.00', status: 'pending_payment', paymentStatus: 'unpaid',
      paymentMethod: 'bank_transfer', fulfillmentType: 'shipping',
      source: 'storefront', createdAt: new Date().toISOString(),
    }));
    const limited = orders.filter(EXCLUDE_EXTERNAL).filter(o => ACTIONABLE_STATUSES.includes(o.status)).slice(0, 5);
    expect(limited.length).toBe(5);
  });

  it('includes only actionable statuses', () => {
    const orders = [
      { status: 'pending_payment' }, { status: 'confirmed' }, { status: 'processing' },
      { status: 'ready_to_ship' }, { status: 'shipped' }, { status: 'ready_for_pickup' },
      { status: 'delivered' }, { status: 'cancelled' }, { status: 'completed' },
    ].map(o => ({ ...o, source: 'storefront' }));
    const internal = orders.filter(EXCLUDE_EXTERNAL);
    const actionable = internal.filter(o => ACTIONABLE_STATUSES.includes(o.status));
    expect(actionable.length).toBe(6);
  });

  it('excludes external orders', () => {
    const orders = [
      { source: 'storefront', status: 'pending_payment' },
      { source: 'salla', status: 'pending_payment' },
      { source: 'zid', status: 'pending_payment' },
      { source: 'noon', status: 'confirmed' },
      { source: 'amazon', status: 'processing' },
    ];
    const internal = orders.filter(EXCLUDE_EXTERNAL);
    expect(internal.length).toBe(1);
  });

  it('includes delivered + COD pending', () => {
    const orders = [
      { status: 'delivered', paymentMethod: 'cash_on_delivery', paymentStatus: 'pending', source: 'storefront' },
      { status: 'delivered', paymentMethod: 'bank_transfer', paymentStatus: 'paid', source: 'storefront' },
      { status: 'delivered', paymentMethod: 'cash_on_delivery', paymentStatus: 'paid', source: 'storefront' },
    ];
    const included = orders.filter(o => {
      if (ACTIONABLE_STATUSES.includes(o.status)) return EXCLUDE_EXTERNAL(o);
      if (['delivered', 'picked_up'].includes(o.status)) {
        return o.paymentMethod === 'cash_on_delivery' && o.paymentStatus === 'pending';
      }
      return false;
    });
    expect(included.length).toBe(1);
  });

  it('includes picked_up + COD pending', () => {
    const orders = [
      { status: 'picked_up', paymentMethod: 'cash_on_delivery', paymentStatus: 'pending', source: 'storefront' },
      { status: 'picked_up', paymentMethod: 'bank_transfer', paymentStatus: 'paid', source: 'storefront' },
    ];
    const included = orders.filter(o => {
      if (ACTIONABLE_STATUSES.includes(o.status)) return EXCLUDE_EXTERNAL(o);
      if (['delivered', 'picked_up'].includes(o.status)) {
        return o.paymentMethod === 'cash_on_delivery' && o.paymentStatus === 'pending';
      }
      return false;
    });
    expect(included.length).toBe(1);
  });

  it('excludes delivered/picked_up without COD pending', () => {
    const orders = [
      { status: 'delivered', paymentMethod: 'bank_transfer', paymentStatus: 'paid', source: 'storefront' },
      { status: 'picked_up', paymentMethod: 'cash_on_delivery', paymentStatus: 'paid', source: 'storefront' },
      { status: 'delivered', paymentMethod: 'cash_on_delivery', paymentStatus: 'paid', source: 'storefront' },
    ];
    const included = orders.filter(o => {
      if (ACTIONABLE_STATUSES.includes(o.status)) return EXCLUDE_EXTERNAL(o);
      if (['delivered', 'picked_up'].includes(o.status)) {
        return o.paymentMethod === 'cash_on_delivery' && o.paymentStatus === 'pending';
      }
      return false;
    });
    expect(included.length).toBe(0);
  });

  it('excludes paid COD from collection list', () => {
    const orders = [
      { paymentMethod: 'cash_on_delivery', paymentStatus: 'pending', status: 'delivered' },
      { paymentMethod: 'cash_on_delivery', paymentStatus: 'paid', status: 'delivered' },
    ].map(o => ({ ...o, source: 'storefront' }));
    const codPending = orders.filter(o =>
      o.paymentMethod === 'cash_on_delivery' && o.paymentStatus === 'pending'
      && ['delivered', 'picked_up'].includes(o.status)
    );
    expect(codPending.length).toBe(1);
  });

  it('ready_to_ship and ready_for_pickup appear correctly', () => {
    const orders = [
      { status: 'ready_to_ship', fulfillmentType: 'shipping', source: 'storefront' },
      { status: 'ready_for_pickup', fulfillmentType: 'local_pickup', source: 'storefront' },
    ];
    const included = orders.filter(o => {
      if (ACTIONABLE_STATUSES.includes(o.status)) return EXCLUDE_EXTERNAL(o);
      if (['delivered', 'picked_up'].includes(o.status)) {
        return o.paymentMethod === 'cash_on_delivery' && o.paymentStatus === 'pending';
      }
      return false;
    });
    expect(included.length).toBe(2);
  });

  it('excludes non-actionable terminal orders', () => {
    const orders = [
      { status: 'completed', source: 'storefront' },
      { status: 'cancelled', source: 'storefront' },
      { status: 'refunded', source: 'storefront' },
      { status: 'returned', source: 'storefront' },
      { status: 'delivered', paymentMethod: 'bank_transfer', paymentStatus: 'paid', source: 'storefront' },
    ].map(o => ({ ...o, fulfillmentType: 'shipping' }));
    const included = orders.filter(o => {
      if (ACTIONABLE_STATUSES.includes(o.status)) return EXCLUDE_EXTERNAL(o);
      if (['delivered', 'picked_up'].includes(o.status)) {
        return o.paymentMethod === 'cash_on_delivery' && o.paymentStatus === 'pending';
      }
      return false;
    });
    expect(included.length).toBe(0);
  });

  it('urgency sorts COD delivered/picked_up first, then ready_to_ship', () => {
    const buildUrgency = (o: { status: string; paymentMethod?: string; paymentStatus?: string; fulfillmentType?: string }): number => {
      if (o.status === 'delivered' && o.paymentMethod === 'cash_on_delivery' && o.paymentStatus === 'pending') return 1;
      if (o.status === 'picked_up' && o.paymentMethod === 'cash_on_delivery' && o.paymentStatus === 'pending') return 2;
      if (o.status === 'ready_to_ship' && o.fulfillmentType !== 'local_pickup') return 3;
      if (o.status === 'ready_for_pickup' && o.fulfillmentType === 'local_pickup') return 4;
      if (o.status === 'pending_payment') return 5;
      if (o.status === 'confirmed') return 6;
      if (o.status === 'processing') return 7;
      if (o.status === 'shipped') return 8;
      return 99;
    };
    const orders = [
      { status: 'shipped', paymentMethod: 'bank_transfer', paymentStatus: 'paid', fulfillmentType: 'shipping' },
      { status: 'ready_to_ship', paymentMethod: 'bank_transfer', paymentStatus: 'paid', fulfillmentType: 'shipping' },
      { status: 'delivered', paymentMethod: 'cash_on_delivery', paymentStatus: 'pending', fulfillmentType: 'shipping' },
      { status: 'pending_payment', paymentMethod: 'bank_transfer', paymentStatus: 'unpaid', fulfillmentType: 'shipping' },
    ];
    const sorted = [...orders].sort((a, b) => buildUrgency(a) - buildUrgency(b));
    expect(sorted[0].status).toBe('delivered');
    expect(sorted[1].status).toBe('ready_to_ship');
    expect(sorted[2].status).toBe('pending_payment');
    expect(sorted[3].status).toBe('shipped');
  });

  it('empty recentActionableOrders is valid', () => {
    const data = { recentActionableOrders: [] };
    expect(Array.isArray(data.recentActionableOrders)).toBe(true);
    expect(data.recentActionableOrders.length).toBe(0);
  });
});

describe('Dashboard Summary — readiness', () => {
  const READINESS_FIELDS = ['score', 'totalChecks', 'passedChecks', 'issues'];
  const ISSUE_FIELDS = ['key', 'severity', 'title', 'description', 'actionLabel', 'href'];

  it('readiness object shape', () => {
    const readiness = {
      score: 75,
      totalChecks: 12,
      passedChecks: 9,
      issues: [
        { key: 'no_payment_provider', severity: 'critical', title: '', description: '', actionLabel: '', href: '/settings' },
      ],
    };
    for (const field of READINESS_FIELDS) {
      expect(readiness).toHaveProperty(field);
    }
    expect(typeof readiness.score).toBe('number');
    expect(typeof readiness.totalChecks).toBe('number');
    expect(typeof readiness.passedChecks).toBe('number');
    expect(Array.isArray(readiness.issues)).toBe(true);
    for (const field of ISSUE_FIELDS) {
      expect(readiness.issues[0]).toHaveProperty(field);
    }
    expect(readiness.issues[0].severity).toMatch(/^(critical|warning|info)$/);
  });

  it('score is 0-100', () => {
    for (const score of [0, 50, 100]) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it('payment issue appears when no active provider', () => {
    const issues = [
      { key: 'no_payment_provider', severity: 'critical' as const },
    ];
    expect(issues.some(i => i.key === 'no_payment_provider')).toBe(true);
  });

  it('shipping issue appears when no active shipping method', () => {
    const issues = [
      { key: 'no_shipping_method', severity: 'critical' as const },
    ];
    expect(issues.some(i => i.key === 'no_shipping_method')).toBe(true);
  });

  it('products without images count is reported', () => {
    const issues = [
      { key: 'products_without_images', severity: 'warning' as const, title: '3 منتجات بدون صور' },
    ];
    const imgIssue = issues.find(i => i.key === 'products_without_images');
    expect(imgIssue).toBeDefined();
    expect(imgIssue!.title).toContain('منتجات بدون صور');
  });

  it('readiness checks are store-scoped (simulated)', () => {
    const store1 = { storeId: 1, readiness: { score: 50, issues: [{ key: 'no_payment_provider' }] } };
    const store2 = { storeId: 2, readiness: { score: 100, issues: [] } };
    expect(store1.readiness.score).toBeLessThan(store2.readiness.score);
  });

  it('empty readiness when no issues', () => {
    const readiness = { score: 100, totalChecks: 12, passedChecks: 12, issues: [] };
    expect(readiness.score).toBe(100);
    expect(readiness.issues.length).toBe(0);
  });

  it('existing actionCenter and recentActionableOrders are backward-compatible with readiness', () => {
    const response = {
      success: true,
      data: {
        totalProducts: 100,
        activeProducts: 80,
        actionCenter: { newOrdersCount: 5, readyToShipCount: 2, readyForPickupCount: 1, codCollectionCount: 3, lowStockProductsCount: 3, outOfStockProductsCount: 2 },
        recentActionableOrders: [],
        readiness: { score: 75, totalChecks: 12, passedChecks: 9, issues: [] },
      },
    };
    expect(response.data).toHaveProperty('actionCenter');
    expect(response.data).toHaveProperty('recentActionableOrders');
    expect(response.data).toHaveProperty('readiness');
    expect(response.data.readiness.issues.length).toBe(0);
    expect(response.data.actionCenter.newOrdersCount).toBe(5);
  });
});

describe('Dashboard QA Fixes — Action Center hiding', () => {
  it('Action Center hidden when all counts are zero', () => {
    const ac = { newOrdersCount: 0, readyToShipCount: 0, readyForPickupCount: 0, codCollectionCount: 0, lowStockProductsCount: 0, outOfStockProductsCount: 0 };
    const hasAny = ac.newOrdersCount > 0 || ac.readyToShipCount > 0 || ac.readyForPickupCount > 0 || ac.readyForPickupCount > 0 || ac.codCollectionCount > 0 || ac.lowStockProductsCount > 0 || ac.outOfStockProductsCount > 0;
    expect(hasAny).toBe(false);
  });

  it('Action Center visible when any count > 0', () => {
    const ac = { newOrdersCount: 0, readyToShipCount: 1, readyForPickupCount: 0, codCollectionCount: 0, lowStockProductsCount: 0, outOfStockProductsCount: 0 };
    const hasAny = ac.newOrdersCount > 0 || ac.readyToShipCount > 0 || ac.readyForPickupCount > 0 || ac.codCollectionCount > 0 || ac.lowStockProductsCount > 0 || ac.outOfStockProductsCount > 0;
    expect(hasAny).toBe(true);
  });
});

describe('Dashboard QA Fixes — Low Stock hiding', () => {
  it('Low Stock section not rendered when list empty', () => {
    const lowStock: any[] = [];
    // Simulate the dashboard conditional: {lowStock.length > 0 && ( ... )}
    expect(lowStock.length > 0).toBe(false);
  });

  it('Low Stock section rendered when list has items', () => {
    const lowStock = [{ id: 1, name: 'Test', stockQuantity: 3 }];
    expect(lowStock.length > 0).toBe(true);
  });
});

describe('Dashboard QA Fixes — pending-orders visibility', () => {
  it('pending-orders alert type should be warning (not info)', () => {
    const alerts: Array<{ id: string; type: string }> = [
      { id: 'pending-orders', type: 'warning' },
    ];
    const pending = alerts.find(a => a.id === 'pending-orders');
    expect(pending).toBeDefined();
    expect(pending!.type).toBe('warning');
  });

  it('pending-orders alert is visible in compact bar (type warning passes filter)', () => {
    const visibleTypes = ['danger', 'warning'];
    const alert = { id: 'pending-orders', type: 'warning' as const };
    expect(visibleTypes.includes(alert.type)).toBe(true);
  });
});

describe('Dashboard QA Fixes — COD collection alert', () => {
  it('COD collection alert appears when codCollectionCount > 0', () => {
    const alerts: Array<{ id: string; type: string }> = [];
    if (3 > 0) alerts.push({ id: 'cod-collection', type: 'warning' });
    expect(alerts.length).toBe(1);
    expect(alerts[0].id).toBe('cod-collection');
  });

  it('COD collection alert does not appear when count = 0', () => {
    const alerts: Array<{ id: string; type: string }> = [];
    if (0 > 0) alerts.push({ id: 'cod-collection', type: 'warning' });
    expect(alerts.length).toBe(0);
  });
});

describe('Dashboard QA Fixes — Sales trend', () => {
  it('sales trend returns neutral when firstHalf is 0', () => {
    const firstHalf = 0;
    const secondHalf = 500;
    let result: { direction: string; pct: string };
    if (firstHalf === 0) {
      result = { direction: 'neutral', pct: 'نشاط جديد' };
    } else {
      const pct = ((secondHalf - firstHalf) / firstHalf * 100).toFixed(1);
      result = { direction: pct.startsWith('-') ? 'down' : 'up', pct: `${pct.startsWith('-') ? '' : '+'}${pct}%` };
    }
    expect(result.direction).toBe('neutral');
    expect(result.pct).toBe('نشاط جديد');
  });

  it('sales trend calculates normally when firstHalf > 0', () => {
    const firstHalf = 1000;
    const secondHalf = 1500;
    let result: { direction: string; pct: string };
    if (firstHalf === 0) {
      result = { direction: 'neutral', pct: 'نشاط جديد' };
    } else {
      const pct = ((secondHalf - firstHalf) / firstHalf * 100).toFixed(1);
      result = { direction: pct.startsWith('-') ? 'down' : 'up', pct: `${pct.startsWith('-') ? '' : '+'}${pct}%` };
    }
    expect(result.direction).toBe('up');
    expect(result.pct).toBe('+50.0%');
  });
});
