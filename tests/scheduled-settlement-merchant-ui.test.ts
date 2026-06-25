import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const settlementOverview = readFileSync(new URL('../apps/merchant-dashboard/src/pages/SettlementOverview.tsx', import.meta.url), 'utf-8');
const settlementDetail = readFileSync(new URL('../apps/merchant-dashboard/src/pages/SettlementDetail.tsx', import.meta.url), 'utf-8');
const merchantWallet = readFileSync(new URL('../apps/merchant-dashboard/src/pages/Wallet.tsx', import.meta.url), 'utf-8');
const merchantApp = readFileSync(new URL('../apps/merchant-dashboard/src/App.tsx', import.meta.url), 'utf-8');

describe('Merchant Scheduled Settlement UI', () => {
  it('settlement overview page shows pending and available balance', () => {
    expect(settlementOverview).toContain('pendingBalance');
    expect(settlementOverview).toContain('availableBalance');
  });

  it('settlement overview shows next settlement schedule info', () => {
    expect(settlementOverview).toContain('scheduleInfo');
    expect(settlementOverview).toContain('availableInfo');
    expect(settlementOverview).toContain('pendingInfo');
  });

  it('settlement overview shows settlement eligibility status', () => {
    expect(settlementOverview).toContain('settlementEligibility');
  });

  it('settlement overview shows readiness blockers when not eligible', () => {
    expect(settlementOverview).toContain('reasonBankNotVerified');
    expect(settlementOverview).toContain('reasonKycIncomplete');
    expect(settlementOverview).toContain('reasonReconciliationPending');
    expect(settlementOverview).toContain('reasonNoBalance');
  });

  it('settlement overview has loading state', () => {
    expect(settlementOverview).toContain('loading');
    expect(settlementOverview).toContain('Skeleton');
  });

  it('settlement overview has error state with retry', () => {
    expect(settlementOverview).toContain('error');
    expect(settlementOverview).toContain('retry');
  });

  it('settlement overview has empty state', () => {
    expect(settlementOverview).toContain('noSettlementYet');
  });

  it('merchant settlement detail shows orders table', () => {
    expect(settlementDetail).toContain('ordersTitle');
    expect(settlementDetail).toContain('orderNumber');
  });

  it('merchant settlement detail shows shipping, discount, refund reserve columns', () => {
    expect(settlementDetail).toContain('shippingAmount');
    expect(settlementDetail).toContain('discountAmount');
    expect(settlementDetail).toContain('refundReserve');
  });

  it('merchant settlement detail shows status timeline', () => {
    expect(settlementDetail).toContain('timelineTitle');
    expect(settlementDetail).toContain('stepCreated');
    expect(settlementDetail).toContain('stepUnderReview');
    expect(settlementDetail).toContain('stepApproved');
    expect(settlementDetail).toContain('stepTransferPending');
    expect(settlementDetail).toContain('stepTransferred');
    expect(settlementDetail).toContain('stepVerified');
  });

  it('merchant settlement detail does NOT expose sensitive customer data', () => {
    const detailContent = settlementDetail;
    expect(detailContent).not.toContain('customerPhone');
    expect(detailContent).not.toContain('customerEmail');
    expect(detailContent).not.toContain('iban');
    expect(detailContent).not.toContain('IBAN');
    expect(detailContent).not.toContain('actorUserId');
  });

  it('wallet page has link to settlement overview', () => {
    // IA W3: /wallet/settlements → /finance/settlements. App.tsx keeps
    // a redirect for the legacy path.
    expect(merchantWallet).toContain('/finance/settlements');
    expect(merchantWallet).toContain('viewSettlements');
  });

  it('merchant dashboard has route for settlement overview', () => {
    // The legacy /wallet/settlements path still exists as a redirect
    // in App.tsx (no breaking change for old tabs/bookmarks).
    expect(merchantApp).toContain('/wallet/settlements');
  });

  it('order numbers are clickable in settlement detail', () => {
    // IA W3: /orders/:id → /sales/orders/:id.
    expect(settlementDetail).toContain('to={`/sales/orders/${tx.orderId}`}');
  });

  it('merchant settlement detail shows loading state', () => {
    expect(settlementDetail).toContain('Skeleton');
  });

  it('merchant settlement detail shows error state', () => {
    expect(settlementDetail).toContain('loadError');
  });

  it('merchant settlement detail shows empty state for transactions', () => {
    expect(settlementDetail).toContain('noTransactions');
  });
});
