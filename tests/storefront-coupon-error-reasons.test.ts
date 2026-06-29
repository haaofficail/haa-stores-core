import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '..');
const cartPage = readFileSync(resolve(projectRoot, 'apps/storefront/src/pages/Cart.tsx'), 'utf-8');
const couponService = readFileSync(resolve(projectRoot, 'packages/commerce-core/src/coupons.ts'), 'utf-8');
const checkoutRoute = readFileSync(resolve(projectRoot, 'apps/api/src/routes/storefront/checkout.ts'), 'utf-8');

describe('Storefront coupon error reasons', () => {
  it('keeps coupon rejection reasons from the commerce service and storefront route', () => {
    expect(couponService).toContain("reason: 'كود الخصم غير صالح'");
    expect(couponService).toContain("reason: 'كود الخصم غير نشط'");
    expect(couponService).toContain("reason: 'كود الخصم منتهي الصلاحية'");
    expect(couponService).toContain('الحد الأدنى للطلب');
    expect(checkoutRoute).toContain('data: { valid: false, reason: validation.reason }');
    expect(cartPage).toContain("setCouponError(result.reason || t('cart.couponInvalid', 'كود الخصم غير صالح'))");
  });

  it('surfaces API error messages instead of collapsing every coupon failure to a generic error', () => {
    expect(cartPage).toContain('function getCouponErrorMessage(error: unknown, fallback: string): string');
    expect(cartPage).toContain('error instanceof Error && error.message.trim()');
    expect(cartPage).toContain('setCouponError(getCouponErrorMessage(');
    expect(cartPage).toContain("t('cart.couponApplyError', 'تعذر التحقق من كود الخصم. حاول مرة أخرى أو تأكد من شروط الكود.')");
    expect(cartPage).not.toContain("catch {\\n      setCouponError(t('common.error'))");
  });

  it('renders coupon errors as a persistent actionable alert', () => {
    expect(cartPage).toContain('role="alert"');
    expect(cartPage).toContain("t('cart.couponHelp', 'تأكد من كتابة الكود كما هو ومن استيفاء الحد الأدنى أو مدة الصلاحية.')");
    expect(cartPage).toContain('bg-danger-soft');
  });
});
