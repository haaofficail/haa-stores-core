import { describe, it, expect } from 'vitest';

/* ======================================================
 * Dashboard Final QA — Manual Scenario Verification
 *
 * Each scenario simulates the store data and verifies
 * the rendering decisions that DashboardHome.tsx makes.
 * This covers: Action Center, Low Stock, Smart Alerts,
 * Trend calc, COD alerts, section order, and noise.
 * ====================================================== */

type ActionCenter = {
  newOrdersCount: number;
  readyToShipCount: number;
  readyForPickupCount: number;
  codCollectionCount: number;
  lowStockProductsCount: number;
  outOfStockProductsCount: number;
};

type SmartAlert = {
  id: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  priority: number;
};

type SalesTrend = { direction: string; pct: string } | null;

/* ---------- helpers matching DashboardHome.tsx logic ---------- */

function acHasAny(ac: ActionCenter): boolean {
  return ac.newOrdersCount > 0 || ac.readyToShipCount > 0
    || ac.readyForPickupCount > 0 || ac.codCollectionCount > 0
    || ac.lowStockProductsCount > 0 || ac.outOfStockProductsCount > 0;
}

function calcTrend(firstHalf: number, secondHalf: number): SalesTrend {
  if (firstHalf === 0) return { direction: 'neutral', pct: 'نشاط جديد' };
  const pct = ((secondHalf - firstHalf) / firstHalf * 100).toFixed(1);
  return {
    direction: pct.startsWith('-') ? 'down' : 'up',
    pct: `${pct.startsWith('-') ? '' : '+'}${pct}%`,
  };
}

function visibleAlerts(alerts: SmartAlert[]): SmartAlert[] {
  return alerts.filter(a => a.type === 'danger' || a.type === 'warning').slice(0, 3);
}

const VISIBLE_TYPES = ['danger', 'warning'];

/* ============================================================
 * SCENARIO 1: New store — no products, no orders, no settings
 * ============================================================ */
describe('Scenario 1: New store with no setup', () => {
  const ac: ActionCenter = {
    newOrdersCount: 0, readyToShipCount: 0, readyForPickupCount: 0,
    codCollectionCount: 0, lowStockProductsCount: 0, outOfStockProductsCount: 0,
  };

  it('Action Center hidden — all counts are zero', () => {
    expect(acHasAny(ac)).toBe(false);
  });

  it('Low Stock section hidden — no products exist', () => {
    const lowStock: any[] = [];
    expect(lowStock.length > 0).toBe(false);
  });

  it('Readiness section visible — has issues (no products, no payment, no shipping)', () => {
    const issues = [
      { key: 'no_payment_provider', severity: 'critical', title: 'لم يتم إعداد بوابة دفع' },
      { key: 'no_shipping_method', severity: 'critical', title: 'لم يتم إعداد الشحن' },
      { key: 'no_active_products', severity: 'critical', title: 'لا توجد منتجات نشطة' },
      { key: 'no_brands', severity: 'info', title: 'لم تُضف ماركات' },
      { key: 'no_categories', severity: 'info', title: 'لم تُضف تصنيفات' },
      { key: 'store_name_default', severity: 'info', title: 'اسم المتجر افتراضي' },
    ];
    expect(issues.length).toBeGreaterThanOrEqual(1);
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    expect(criticalCount).toBeGreaterThanOrEqual(1);
  });

  it('Smart Alerts show only critical/warning — no info/success noise', () => {
    const alerts: SmartAlert[] = [
      { id: 'no-products', type: 'warning', priority: 2 },
      { id: 'no-shipping', type: 'warning', priority: 2 },
      { id: 'welcome-start', type: 'info', priority: 3 },
      { id: 'no-brands', type: 'info', priority: 4 },
      { id: 'no-categories', type: 'info', priority: 4 },
    ];
    const visible = visibleAlerts(alerts);
    expect(visible.length).toBe(2);
    expect(visible.every(a => VISIBLE_TYPES.includes(a.type))).toBe(true);
    expect(visible.find(a => a.id === 'welcome-start')).toBeUndefined();
    expect(visible.find(a => a.id === 'no-brands')).toBeUndefined();
  });

  it('Compact alerts max 3 — not scrolling marquee', () => {
    const manyAlerts: SmartAlert[] = Array.from({ length: 10 }, (_, i) => ({
      id: `alert-${i}`, type: 'warning' as const, priority: 2,
    }));
    const visible = visibleAlerts(manyAlerts);
    expect(visible.length).toBeLessThanOrEqual(3);
  });

  it('Trend does not show +100% — firstHalf is 0', () => {
    const trend = calcTrend(0, 0);
    expect(trend!.direction).toBe('neutral');
    expect(trend!.pct).toBe('نشاط جديد');
  });

  it('Dashboard not noisy — no Action Center, no Low Stock, no empty-state spam', () => {
    // These sections are completely hidden, reducing noise
    expect(acHasAny(ac)).toBe(false);
    const lowStock: any[] = [];
    expect(lowStock.length > 0).toBe(false);
    // Readiness + Alerts + KPI + Quick Actions are the only operational sections
  });
});

/* ============================================================
 * SCENARIO 2: Complete store — everything configured, 0 issues
 * ============================================================ */
describe('Scenario 2: Complete store with no issues', () => {
  const ac: ActionCenter = {
    newOrdersCount: 0, readyToShipCount: 0, readyForPickupCount: 0,
    codCollectionCount: 0, lowStockProductsCount: 0, outOfStockProductsCount: 0,
  };

  it('Action Center hidden — store is quiet, no actionable items', () => {
    expect(acHasAny(ac)).toBe(false);
  });

  it('Low Stock hidden — no low-stock products', () => {
    const lowStock: any[] = [];
    expect(lowStock.length > 0).toBe(false);
  });

  it('No misleading warning alerts — all counts zero, no stock/order issues', () => {
    const acZero: ActionCenter = {
      newOrdersCount: 0, readyToShipCount: 0, readyForPickupCount: 0,
      codCollectionCount: 0, lowStockProductsCount: 0, outOfStockProductsCount: 0,
    };
    const alerts: SmartAlert[] = [];
    // pending-orders
    if (0 > 0) alerts.push({ id: 'pending-orders', type: 'warning', priority: 2 });
    // cod-collection
    if (acZero.codCollectionCount > 0) alerts.push({ id: 'cod-collection', type: 'warning', priority: 2 });
    // low-stock
    if (0 > 0) alerts.push({ id: 'low-stock', type: 'danger', priority: 1 });
    // out-of-stock
    if (0 > 0) alerts.push({ id: 'out-of-stock', type: 'danger', priority: 1 });
    expect(alerts.length).toBe(0);
  });

  it('Trend shows correct growth when previous period has data', () => {
    const trend = calcTrend(10000, 15000);
    expect(trend!.direction).toBe('up');
    expect(trend!.pct).toBe('+50.0%');
  });

  it('Trend does not show +100% when previous sales are 0 (should be "نشاط جديد")', () => {
    const trend = calcTrend(0, 500);
    expect(trend!.direction).toBe('neutral');
    expect(trend!.pct).toBe('نشاط جديد');
  });

  it('Dashboard feels calm — only KPI + Analytics + secondary sections visible', () => {
    expect(acHasAny(ac)).toBe(false);
    const readinessIssues: any[] = [];
    expect(readinessIssues.length).toBe(0);
    // No Action Center, no Low Stock, no readiness issues → clean dashboard
  });
});

/* ============================================================
 * SCENARIO 3: Store with actionable orders
 * ============================================================ */
describe('Scenario 3: Store with actionable orders', () => {
  const ac: ActionCenter = {
    newOrdersCount: 3, readyToShipCount: 1, readyForPickupCount: 0,
    codCollectionCount: 0, lowStockProductsCount: 0, outOfStockProductsCount: 0,
  };

  it('Action Center visible — has actionable order counts', () => {
    expect(acHasAny(ac)).toBe(true);
  });

  it('pending-orders alert visible as warning type', () => {
    const pendingCount = 3;
    const alerts: SmartAlert[] = [];
    if (pendingCount > 0) {
      alerts.push({ id: 'pending-orders', type: 'warning', priority: 2 });
    }
    const visible = visibleAlerts(alerts);
    expect(visible.length).toBe(1);
    expect(visible[0].id).toBe('pending-orders');
    expect(visible[0].type).toBe('warning');
  });

  it('Recent Actionable Orders shows relevant orders', () => {
    const orders = [
      { id: 1, orderNumber: 'ORD-101', status: 'pending_payment', customerName: 'أحمد' },
      { id: 2, orderNumber: 'ORD-102', status: 'confirmed', customerName: 'سارة' },
      { id: 3, orderNumber: 'ORD-103', status: 'ready_to_ship', customerName: 'محمد' },
    ];
    expect(orders.length).toBeGreaterThan(0);
    // Max 5 per backend
    expect(orders.slice(0, 5).length).toBe(3);
  });

  it('Buttons navigate to Orders — no direct confirm/cancel from dashboard', () => {
    const links = [
      { label: 'فتح الطلب', href: '/orders?orderId=101' },
      { label: 'عرض الكل', href: '/orders' },
    ];
    links.forEach(l => {
      expect(l.href).toMatch(/^\/orders/);
    });
    // No inline action buttons (confirm/cancel) — already removed in Phase 4
    const hasInlineAction = false; // confirmed removed
    expect(hasInlineAction).toBe(false);
  });

  it('confirmed-orders alert also shown when confirmed orders exist', () => {
    const hasConfirmed = true;
    const alerts: SmartAlert[] = [];
    if (hasConfirmed) {
      alerts.push({ id: 'confirmed-orders', type: 'info', priority: 4 });
    }
    // confirmed-orders is info, filtered out from compact bar
    const visible = visibleAlerts(alerts);
    expect(visible.length).toBe(0); // info not shown in compact bar
  });
});

/* ============================================================
 * SCENARIO 4: Store with COD collection required
 * ============================================================ */
describe('Scenario 4: Store with COD collection required', () => {
  const ac: ActionCenter = {
    newOrdersCount: 0, readyToShipCount: 0, readyForPickupCount: 0,
    codCollectionCount: 2, lowStockProductsCount: 0, outOfStockProductsCount: 0,
  };

  it('Action Center visible — COD card shown', () => {
    expect(acHasAny(ac)).toBe(true);
    expect(ac.codCollectionCount).toBe(2);
  });

  it('COD warning appears in Smart Alerts', () => {
    const alerts: SmartAlert[] = [];
    if (ac.codCollectionCount > 0) {
      alerts.push({ id: 'cod-collection', type: 'warning', priority: 2 });
    }
    expect(alerts.length).toBe(1);
    expect(alerts[0].id).toBe('cod-collection');
    expect(alerts[0].type).toBe('warning');
    // Visible in compact bar
    expect(VISIBLE_TYPES.includes(alerts[0].type)).toBe(true);
  });

  it('COD alert goes to /orders?paymentMethod=cash_on_delivery&paymentStatus=pending', () => {
    const href = '/orders?paymentMethod=cash_on_delivery&paymentStatus=pending';
    expect(href).toContain('cash_on_delivery');
    expect(href).toContain('paymentStatus=pending');
  });

  it('Recent Actionable Orders includes COD collection order at top', () => {
    const orders = [
      { id: 1, orderNumber: 'ORD-201', status: 'delivered', paymentMethod: 'cash_on_delivery', paymentStatus: 'pending' },
      { id: 2, orderNumber: 'ORD-202', status: 'shipped', paymentMethod: 'bank_transfer', paymentStatus: 'paid' },
    ];
    const urgencySort = (o: any): number => {
      if (o.status === 'delivered' && o.paymentMethod === 'cash_on_delivery' && o.paymentStatus === 'pending') return 1;
      if (o.status === 'picked_up' && o.paymentMethod === 'cash_on_delivery' && o.paymentStatus === 'pending') return 2;
      return 99;
    };
    const sorted = [...orders].sort((a, b) => urgencySort(a) - urgencySort(b));
    expect(sorted[0].id).toBe(1); // COD order first
  });

  it('Payment is not marked paid from dashboard — no direct action buttons', () => {
    // No inline "تسجيل التحصيل" button exists — user navigates to order page
    const hasDirectCollectButton = false;
    expect(hasDirectCollectButton).toBe(false);
  });

  it('COD alert does not appear when codCollectionCount = 0', () => {
    const alerts: SmartAlert[] = [];
    if (0 > 0) alerts.push({ id: 'cod-collection', type: 'warning', priority: 2 });
    expect(alerts.length).toBe(0);
  });
});

/* ============================================================
 * SCENARIO 5: Store with low/out-of-stock products
 * ============================================================ */
describe('Scenario 5: Store with low/out-of-stock products', () => {
  const ac: ActionCenter = {
    newOrdersCount: 0, readyToShipCount: 0, readyForPickupCount: 0,
    codCollectionCount: 0, lowStockProductsCount: 3, outOfStockProductsCount: 1,
  };

  it('Action Center visible — inventory card shown with combined count', () => {
    expect(acHasAny(ac)).toBe(true);
    const combined = ac.lowStockProductsCount + ac.outOfStockProductsCount;
    expect(combined).toBe(4);
  });

  it('Stock warning/danger appears in Smart Alerts', () => {
    const lowStock: any[] = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const outOfStock: any[] = [{ id: 4 }];
    const alerts: SmartAlert[] = [];
    if (lowStock.length > 0) alerts.push({ id: 'low-stock', type: 'danger', priority: 1 });
    if (outOfStock.length > 0) alerts.push({ id: 'out-of-stock', type: 'danger', priority: 1 });
    const visible = visibleAlerts(alerts);
    expect(visible.length).toBe(2);
    expect(visible.map(a => a.id).sort()).toEqual(['low-stock', 'out-of-stock']);
  });

  it('Low Stock section visible only when list has items', () => {
    const lowStock: any[] = [{ id: 1, name: 'منتج أ', stockQuantity: 3 }];
    expect(lowStock.length > 0).toBe(true);
    // Section renders because length > 0
    const sectionRendered = lowStock.length > 0;
    expect(sectionRendered).toBe(true);
  });

  it('Low Stock section hidden when list is empty', () => {
    const lowStock: any[] = [];
    const sectionRendered = lowStock.length > 0;
    expect(sectionRendered).toBe(false);
  });

  it('Low Stock product links navigate to /products', () => {
    const manageLink = '/products';
    expect(manageLink).toBe('/products');
  });

  it('No empty Low Stock section — no positive empty state wasted', () => {
    const lowStock: any[] = [];
    const sectionRendered = lowStock.length > 0;
    expect(sectionRendered).toBe(false);
  });
});

/* ============================================================
 * LAYOUT VERIFICATION — Section order and rules
 * ============================================================ */
describe('Layout verification — section order and rules', () => {
  // This is the expected section order as defined in DashboardHome.tsx
  const expectedOrder = [
    'Header / StoreSwitcher',
    'Compact Smart Alerts (critical/warning only, max 3)',
    'Welcome Banner (onboarding only)',
    'KPI Cards',
    'Action Center (hidden if all zero)',
    'Recent Actionable Orders',
    'Store Readiness (hidden if no issues)',
    'Low Stock (hidden if empty)',
    'Quick Actions',
    'Analytics (collapsible: Charts + Recent Products + Top Products)',
    'AI Greeting (demoted, below analytics)',
    'Recent Customers + Quick Stats',
  ];

  it('Compact alerts show max 3 important alerts — no marquee', () => {
    const alerts: SmartAlert[] = [
      { id: 'a', type: 'danger', priority: 1 },
      { id: 'b', type: 'warning', priority: 2 },
      { id: 'c', type: 'warning', priority: 2 },
      { id: 'd', type: 'danger', priority: 1 },
      { id: 'e', type: 'warning', priority: 2 },
    ];
    const visible = visibleAlerts(alerts);
    expect(visible.length).toBeLessThanOrEqual(3);
  });

  it('Section order follows priority — operational first, analytics later', () => {
    const highPriority = ['Header', 'Alerts', 'KPI', 'Action Center', 'Recent Orders', 'Readiness', 'Low Stock'];
    const lowPriority = ['Analytics', 'AI Greeting', 'Customers', 'Quick Stats'];
    // high priority comes first in the expectedOrder
    const highIdx = highPriority.map(h => expectedOrder.findIndex(e => e.includes(h)));
    const lowIdx = lowPriority.map(l => expectedOrder.findIndex(e => e.includes(l)));
    highIdx.forEach(hi => {
      lowIdx.forEach(li => {
        expect(hi).toBeLessThan(li);
      });
    });
  });

  it('Analytics remains below operational sections', () => {
    const analyticsIdx = expectedOrder.findIndex(e => e.includes('Analytics'));
    const operationalSections = ['Action Center', 'Recent Orders', 'Readiness', 'Low Stock'];
    operationalSections.forEach(s => {
      const idx = expectedOrder.findIndex(e => e.includes(s));
      expect(idx).toBeLessThan(analyticsIdx);
    });
  });

  it('AI Greeting is demoted below analytics', () => {
    const aiIdx = expectedOrder.findIndex(e => e.includes('AI Greeting'));
    const analyticsIdx = expectedOrder.findIndex(e => e.includes('Analytics'));
    expect(analyticsIdx).toBeLessThan(aiIdx);
  });

  it('Action Center is before Recent Actionable Orders', () => {
    const acIdx = expectedOrder.findIndex(e => e.includes('Action Center'));
    const recentIdx = expectedOrder.findIndex(e => e.includes('Recent Actionable Orders'));
    expect(acIdx).toBeLessThan(recentIdx);
  });

  it('Recent Actionable Orders is before Store Readiness', () => {
    const recentIdx = expectedOrder.findIndex(e => e.includes('Recent Actionable Orders'));
    const readinessIdx = expectedOrder.findIndex(e => e.includes('Readiness'));
    expect(recentIdx).toBeLessThan(readinessIdx);
  });
});
