import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const merchantOrders = readFileSync(new URL('../apps/merchant-dashboard/src/pages/Orders.tsx', import.meta.url), 'utf-8');
const settlementDetail = readFileSync(new URL('../apps/merchant-dashboard/src/pages/SettlementDetail.tsx', import.meta.url), 'utf-8');
const settlementBatchDetail = readFileSync(new URL('../apps/admin-dashboard/src/pages/SettlementBatchDetail.tsx', import.meta.url), 'utf-8');
const merchantApp = readFileSync(new URL('../apps/merchant-dashboard/src/App.tsx', import.meta.url), 'utf-8');

describe('Settlement Order Drill-Down', () => {
  it('merchant order numbers link to /orders/:orderId in settlement detail', () => {
    expect(settlementDetail).toContain('to={`/orders/${tx.orderId}`}');
  });

  it('admin order numbers link with store context in batch detail', () => {
    expect(settlementBatchDetail).toContain('storeId');
    expect(settlementBatchDetail).toContain('orderId');
  });

  it('merchant dashboard has /orders/:orderId route', () => {
    expect(merchantApp).toContain('/orders/:orderId');
  });

  it('order detail page shows settlement badge', () => {
    expect(merchantOrders).toContain('settlementInfo');
    expect(merchantOrders).toContain('settlementBadge');
    expect(merchantOrders).toContain('merchantPayable');
  });

  it('settlement badge does not expose sensitive customer data', () => {
    const badgeStart = merchantOrders.indexOf('settlementInfo &&');
    const badgeEnd = merchantOrders.indexOf('Dynamic Status Timeline');
    const badgeSection = merchantOrders.substring(badgeStart, badgeEnd);
    expect(badgeSection).not.toContain('customerName');
    expect(badgeSection).not.toContain('customerPhone');
    expect(badgeSection).not.toContain('customerEmail');
  });

  it('settlement badge links back to settlement detail', () => {
    expect(merchantOrders).toContain('wallet/settlements');
    expect(merchantOrders).toContain('settlementBatchId');
  });

  it('merchant cannot access orders from another store via URL', () => {
    expect(merchantOrders).toContain('storeId');
    expect(merchantOrders).toContain('routeOrderId');
  });

  it('order detail auto-opens when navigating to /orders/:orderId', () => {
    expect(merchantOrders).toContain('openDetail(Number(routeOrderId))');
  });
});
