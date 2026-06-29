import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '..');
const cartPage = readFileSync(resolve(projectRoot, 'apps/storefront/src/pages/Cart.tsx'), 'utf-8');
const storefrontApi = readFileSync(resolve(projectRoot, 'apps/storefront/src/lib/api.ts'), 'utf-8');
const checkoutRoute = readFileSync(resolve(projectRoot, 'apps/api/src/routes/storefront/checkout.ts'), 'utf-8');

describe('Storefront cart shipping estimate', () => {
  it('uses the existing storefront shipping-rates API before checkout', () => {
    expect(storefrontApi).toContain('getShippingRates: (slug: string, cartId: string, city: string)');
    expect(checkoutRoute).toContain("checkoutRouter.post('/:slug/checkout/shipping-rates'");
    expect(checkoutRoute).toContain('const provider = new ManualShippingProvider()');
    expect(cartPage).toContain('checkoutApi.getShippingRates(slug, cart.id, city)');
  });

  it('adds a city-based estimate form in the cart summary', () => {
    expect(cartPage).toContain("t('cart.shippingEstimateTitle', 'تقدير الشحن')");
    expect(cartPage).toContain("t('cart.shippingEstimateDesc', 'أدخل المدينة لعرض خيارات شحن تقديرية قبل إتمام الطلب.')");
    expect(cartPage).toContain("placeholder={t('cart.shippingCityPlaceholder', 'مثال: الرياض')}");
    expect(cartPage).toContain("t('cart.estimateShipping', 'تقدير')");
    expect(cartPage).toContain('disabled={shippingEstimateLoading || !shippingCity.trim()}');
  });

  it('shows rate options and keeps final-price caveat visible', () => {
    expect(cartPage).toContain('shippingEstimateRates.map((rate)');
    expect(cartPage).toContain('rate.methodName');
    expect(cartPage).toContain('rate.estimatedDaysMin');
    expect(cartPage).toContain('rate.freeAboveAmount');
    expect(cartPage).toContain("t('cart.shippingEstimateCaveat', 'السعر النهائي يتأكد عند إتمام الطلب بعد اختيار العنوان وطريقة الشحن.')");
  });

  it('handles empty/error estimate states as persistent alerts', () => {
    expect(cartPage).toContain("t('cart.shippingEstimateCityRequired', 'أدخل المدينة لعرض تقدير الشحن')");
    expect(cartPage).toContain("t('cart.shippingEstimateEmpty', 'لا توجد طرق شحن متاحة لهذه المدينة حالياً')");
    expect(cartPage).toContain("t('cart.shippingEstimateError', 'تعذر جلب تقدير الشحن حالياً. حاول مرة أخرى.')");
    expect(cartPage).toContain('role="alert"');
  });
});
