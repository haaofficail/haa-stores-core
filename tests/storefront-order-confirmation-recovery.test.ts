import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '..');
const orderSuccessPage = readFileSync(
  resolve(projectRoot, 'apps/storefront/src/pages/OrderSuccess.tsx'),
  'utf-8',
);
const trackOrderPage = readFileSync(
  resolve(projectRoot, 'apps/storefront/src/pages/TrackOrder.tsx'),
  'utf-8',
);
const trackPhoneStorage = readFileSync(
  resolve(projectRoot, 'apps/storefront/src/lib/order-track-storage.ts'),
  'utf-8',
);

describe('Storefront order confirmation recovery', () => {
  it('offers a clear support fallback when the confirmation page needs the buyer phone again', () => {
    expect(orderSuccessPage).toContain("t('order.confirmationHelpTitle', 'لم يصلك تأكيد الطلب؟')");
    expect(orderSuccessPage).toContain('افتح تذكرة دعم واذكر رقم الطلب');
    expect(orderSuccessPage).toContain("t('order.requestConfirmationResend', 'طلب مساعدة لإعادة إرسال التأكيد')");
    expect(orderSuccessPage).toContain("to={slug ? `/s/${slug}/support` : '/'}");
    expect(orderSuccessPage).toContain('<span className="font-mono font-semibold" dir="ltr">{orderNumber}</span>');
  });

  it('uses the shared guest tracking phone storage helper from the manual tracking form', () => {
    expect(trackOrderPage).toContain("import { saveTrackPhone } from '@/lib/order-track-storage'");
    expect(trackOrderPage).toContain('const normalizedOrderNumber = orderNumber.trim();');
    expect(trackOrderPage).toContain('const normalizedPhone = phone.trim();');
    expect(trackOrderPage).toContain('saveTrackPhone(normalizedOrderNumber, normalizedPhone);');
    expect(trackOrderPage).not.toContain('sessionStorage.setItem(`track_phone_${slug}_${orderNumber.trim()}`');
  });

  it('keeps the canonical tracking phone key independent of slug', () => {
    expect(trackPhoneStorage).toContain('return `track_phone_${orderNumber}`;');
  });
});
