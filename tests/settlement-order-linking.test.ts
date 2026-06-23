import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const walletLedger = readFileSync(new URL('../packages/wallet-core/src/ledger.ts', import.meta.url), 'utf-8');
const walletRoutes = readFileSync(new URL('../apps/api/src/routes/wallet.ts', import.meta.url), 'utf-8');
const adminRoutes = [
  'index.ts',
  'auth.ts',
  'tenants-stores.ts',
  'marketplace.ts',
  'operations.ts',
].map((f) => readFileSync(new URL(`../apps/api/src/routes/admin/${f}`, import.meta.url), 'utf-8')).join('\n');
const ordersRoutes = readFileSync(new URL('../apps/api/src/routes/orders.ts', import.meta.url), 'utf-8');
const merchantApi = readFileSync(new URL('../apps/merchant-dashboard/src/lib/api.ts', import.meta.url), 'utf-8');
const merchantApp = readFileSync(new URL('../apps/merchant-dashboard/src/App.tsx', import.meta.url), 'utf-8');
const merchantSettlementDetail = readFileSync(new URL('../apps/merchant-dashboard/src/pages/SettlementDetail.tsx', import.meta.url), 'utf-8');
// PR #142 split the order detail dialog out of Orders.tsx into
// OrderDetailDialog.tsx. The settlement badge JSX moved with it.
const merchantOrders =
  readFileSync(new URL('../apps/merchant-dashboard/src/pages/Orders.tsx', import.meta.url), 'utf-8') +
  '\n' +
  readFileSync(new URL('../apps/merchant-dashboard/src/pages/orders/OrderDetailDialog.tsx', import.meta.url), 'utf-8');

describe('Settlement → Order linking', () => {
  it('wallet ledger provides settlement batch list and detail methods', () => {
    expect(walletLedger).toContain('getSettlementBatches');
    expect(walletLedger).toContain('getSettlementBatchDetail');
    expect(walletLedger).toContain('getOrderSettlementInfo');
  });

  it('getSettlementBatchDetail filters by storeId for merchant', () => {
    expect(walletLedger).toContain("eq(s.paymentProviderTransactions.settlementBatchId, batchId)");
    expect(walletLedger).toContain("eq(s.paymentProviderTransactions.storeId, storeId)");
  });

  it('merchant wallet API exposes settlement batch endpoints', () => {
    expect(walletRoutes).toContain("walletRouter.get('/settlements'");
    expect(walletRoutes).toContain("walletRouter.get('/settlements/:batchId'");
  });

  it('admin API exposes settlement batch endpoints', () => {
    expect(adminRoutes).toContain("/settlements/batches");
    expect(adminRoutes).toContain("getAdminSettlementBatches");
    expect(adminRoutes).toContain("getAdminSettlementBatchDetail");
  });

  it('order detail includes settlementInfo', () => {
    expect(ordersRoutes).toContain('getOrderSettlementInfo');
    expect(ordersRoutes).toContain('settlementInfo');
  });

  it('merchant dashboard links order number to /orders/:orderId', () => {
    expect(merchantSettlementDetail).toContain("to={`/orders/${tx.orderId}`}");
  });

  it('merchant dashboard has /orders/:orderId route', () => {
    expect(merchantApp).toContain('/orders/:orderId');
  });

  it('merchant dashboard has /wallet/settlements/:batchId route', () => {
    expect(merchantApp).toContain('/wallet/settlements/:batchId');
  });

  it('Orders page reads useParams orderId', () => {
    expect(merchantOrders).toContain('useParams<{ orderId: string }>()');
  });

  it('Orders page auto-opens detail when routeOrderId is present', () => {
    expect(merchantOrders).toContain('if (routeOrderId && storeId)');
    expect(merchantOrders).toContain('openDetail(Number(routeOrderId))');
  });

  it('order detail shows settlement badge', () => {
    expect(merchantOrders).toContain('settlementInfo');
    expect(merchantOrders).toContain('settlementBadge');
    expect(merchantOrders).toContain('merchantPayable');
  });

  it('settlement badge does not expose sensitive customer or payment raw data', () => {
    const badgeSection = merchantOrders.substring(
      merchantOrders.indexOf('settlementInfo &&'),
      merchantOrders.indexOf('merchantPayable') + 200,
    );
    expect(badgeSection).not.toContain('customerName');
    expect(badgeSection).not.toContain('customerPhone');
    expect(badgeSection).not.toContain('customerEmail');
  });

  it('merchant dashboard adds walletApi.settlementBatches and settlementBatchDetail', () => {
    expect(merchantApi).toContain('settlementBatches');
    expect(merchantApi).toContain('settlementBatchDetail');
  });
});
