// Wave B — fake-feature cleanup contract.
//
// The audit identified four UI surfaces that lied to the merchant:
//   - AbandonedCarts "Send reminder" button: disabled forever, no
//     backing endpoint. Merchants interpreted it as "feature exists,
//     just disabled for me", which is wrong.
//   - OrderDetailDialog `resend_tracking`: action that showed a
//     success toast but did not call any API.
//   - Notifications SMS row: badge said "not configured" and linked
//     to an integration page where SMS could not be configured.
//   - Shipping mock mode: rendered in success/green styling, making
//     the merchant think the (fake) rates were real.
//
// Audit reference: P0 #9–#12 in the dashboard-quality audit
// (2026-06-25).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CARTS_SRC = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/pages/AbandonedCarts.tsx'),
  'utf-8',
);
const ORDER_ACTIONS_SRC = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/lib/order-actions.ts'),
  'utf-8',
);
const ORDER_DIALOG_SRC = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/pages/orders/OrderDetailDialog.tsx'),
  'utf-8',
);
const NOTIFICATIONS_SRC = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/pages/Notifications.tsx'),
  'utf-8',
);
const SHIPPING_SRC = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/pages/Shipping.tsx'),
  'utf-8',
);

describe('Fake-feature cleanup', () => {
  it('AbandonedCarts no longer renders the disabled "send reminder" button', () => {
    // The Send icon import and the fake "coming soon" reminder button must be
    // gone. (We no longer blanket-ban `cursor-not-allowed`: the page now has a
    // legitimate paginator whose prev/next buttons use `disabled:cursor-not-allowed`
    // for their real disabled state. The two assertions below pin the fake
    // feature precisely.)
    expect(CARTS_SRC).not.toMatch(/\bSend\b\s*[},]/);
    expect(CARTS_SRC).not.toMatch(/إرسال تذكير — قيد التطوير/);
  });

  it('order-actions.ts no longer registers resend_tracking', () => {
    // The action entry MUST be gone — otherwise it shows in the
    // dialog and clicking does nothing useful (or shows a fake toast).
    expect(ORDER_ACTIONS_SRC).not.toMatch(/key:\s*['"]resend_tracking['"]/);
  });

  it('OrderDetailDialog no longer carries the fake resend_tracking branch', () => {
    expect(ORDER_DIALOG_SRC).not.toMatch(/action\.key\s*===\s*['"]resend_tracking['"]/);
    expect(ORDER_DIALOG_SRC).not.toMatch(/toast\.success\([^)]*trackingResent/);
  });

  it('Notifications SMS row is labelled "coming soon" with no misleading link', () => {
    // Scope to the SMS block only — the WhatsApp block keeps its
    // "configure provider" link because WhatsApp IS a real
    // configurable integration today (just unrelated to SMS).
    const smsStart = NOTIFICATIONS_SRC.indexOf('sms-channel-row');
    expect(smsStart).toBeGreaterThan(0);
    const whatsappStart = NOTIFICATIONS_SRC.indexOf('whatsapp-channel', smsStart);
    const smsBlock = NOTIFICATIONS_SRC.slice(smsStart, whatsappStart > 0 ? whatsappStart : smsStart + 2000);

    expect(smsBlock).not.toMatch(/sms-configure-link/);
    expect(smsBlock).not.toMatch(/notifications\.configureProvider/);
    expect(smsBlock).toMatch(/notifications\.providerComingSoonBadge/);
    expect(smsBlock).toMatch(/notifications\.smsComingSoon/);
  });

  it('Shipping mock badge uses amber/warning styling and explicit warning copy', () => {
    // Previously: bg-emerald-50 + "mockStatus" — looked like success.
    // Now: bg-amber-50 + "mockStatusBadge" with the word "تجريبي" and
    // a description warning not to ship real orders.
    const mockBlock = SHIPPING_SRC.slice(
      SHIPPING_SRC.indexOf('isMock ? ('),
      SHIPPING_SRC.indexOf('isMock ? (') + 1500,
    );
    expect(mockBlock).toMatch(/bg-amber-50/);
    expect(mockBlock).toMatch(/shipping\.mockStatusBadge/);
    expect(mockBlock).toMatch(/shipping\.mockDescWarning/);
    expect(mockBlock).not.toMatch(/bg-emerald-50/);
  });
});
