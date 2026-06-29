import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '..');
const trackOrderResult = readFileSync(
  resolve(projectRoot, 'apps/storefront/src/pages/TrackOrderResult.tsx'),
  'utf-8',
);
const supportTicketPage = readFileSync(
  resolve(projectRoot, 'apps/storefront/src/pages/SupportTicket.tsx'),
  'utf-8',
);

describe('Storefront return/refund request intake', () => {
  it('exposes the intake only for fulfilled customer-visible order states', () => {
    expect(trackOrderResult).toContain("RETURN_REQUEST_ELIGIBLE_STATUSES = new Set(['delivered', 'picked_up', 'completed'])");
    expect(trackOrderResult).toContain("RETURN_REQUEST_BLOCKED_STATUSES = new Set(['cancelled', 'returned', 'refunded', 'partially_refunded'])");
    expect(trackOrderResult).toMatch(/function canStartReturnRequest\(order: PublicOrder\)/);
    expect(trackOrderResult).toContain('{canStartReturnRequest(order) && (');
  });

  it('creates a structured support ticket with order and product context', () => {
    expect(trackOrderResult).toContain('supportApi.createTicket(slug');
    expect(trackOrderResult).toContain('subject: `[طلب إرجاع] ${order.orderNumber}`');
    expect(trackOrderResult).toContain('message: buildReturnRequestMessage(order, reasonLabel, returnDetails.trim(), phoneInput.trim())');
    expect(trackOrderResult).toContain('طلب إرجاع/استرداد من صفحة تتبع الطلب');
    expect(trackOrderResult).toContain('`رقم الطلب: ${order.orderNumber}`');
    expect(trackOrderResult).toContain('`حالة الدفع: ${order.paymentStatus}`');
    expect(trackOrderResult).toContain('`إجمالي الطلب: ${formatAmount(order.total)} ر.س`');
    expect(trackOrderResult).toContain("'المنتجات:'");
  });

  it('persists the support access token locally and keeps it out of follow-up URLs', () => {
    expect(trackOrderResult).toContain('localStorage.setItem(`support-ticket-token:${slug}:${result.id}`, result.accessToken)');
    expect(supportTicketPage).toContain('`support-ticket-token:${slug}:${ticketId}`');
    expect(trackOrderResult).toContain('href={`/s/${slug}/support/tickets/${returnTicket.id}`}');

    const returnSection = trackOrderResult.slice(
      trackOrderResult.indexOf('{canStartReturnRequest(order) && ('),
      trackOrderResult.indexOf('{order.statusHistory && order.statusHistory.length > 0 && ('),
    );
    expect(returnSection).not.toContain('accessToken=');
    expect(returnSection).not.toContain('returnTicket.accessToken');
  });
});
