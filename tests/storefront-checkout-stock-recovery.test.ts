import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '..');
const checkoutPage = readFileSync(resolve(projectRoot, 'apps/storefront/src/pages/Checkout.tsx'), 'utf-8');
const storefrontCheckoutRoute = readFileSync(resolve(projectRoot, 'apps/api/src/routes/storefront/checkout.ts'), 'utf-8');
const sharedErrors = readFileSync(resolve(projectRoot, 'packages/shared/src/errors.ts'), 'utf-8');
const checkoutService = readFileSync(resolve(projectRoot, 'packages/commerce-core/src/checkout.ts'), 'utf-8');

describe('Storefront checkout stock recovery', () => {
  it('keeps checkout stock locking before payment creation', () => {
    const stockLockIndex = checkoutService.indexOf('await this.decrementStock(tx, cart.items);');
    const paymentIntentIndex = checkoutService.indexOf('this.paymentProvider.createPaymentIntent');

    expect(stockLockIndex).toBeGreaterThan(0);
    expect(paymentIntentIndex).toBeGreaterThan(stockLockIndex);
    expect(checkoutService).toContain('gte(s.products.stockQuantity, i.item.quantity)');
    expect(checkoutService).toContain('throw new Error(\'Insufficient stock for product\')');
  });

  it('maps checkout stock depletion to a typed 400 storefront API error', () => {
    expect(storefrontCheckoutRoute).toContain('PUBLIC_INSUFFICIENT_STOCK_MESSAGE');
    expect(storefrontCheckoutRoute).toContain('isInsufficientStockMessage');
    expect(storefrontCheckoutRoute).toContain("new AppError(400, 'INSUFFICIENT_STOCK', PUBLIC_INSUFFICIENT_STOCK_MESSAGE)");
    expect(storefrontCheckoutRoute).toContain("'CHECKOUT_ERROR'");
  });

  it('registers a production-safe shared message for the stock error code', () => {
    expect(sharedErrors).toContain("'INSUFFICIENT_STOCK'");
    expect(sharedErrors).toContain('أحد المنتجات في السلة لم يعد متوفرًا بالكمية المطلوبة');
  });

  it('shows stock-specific checkout recovery with a return-to-cart action', () => {
    expect(checkoutPage).toContain("kind: 'payment_failed' | 'checkout_failed' | 'stock_unavailable'");
    expect(checkoutPage).toContain('isStockUnavailableError');
    expect(checkoutPage).toContain("code === 'INSUFFICIENT_STOCK'");
    expect(checkoutPage).toContain("t('checkout.stockRecoveryTitle', 'تغير توفر المنتجات')");
    expect(checkoutPage).toContain("t('checkout.stockRecoveryHelp', 'ارجع إلى السلة لتحديث الكميات أو إزالة المنتج غير المتاح قبل إعادة إتمام الطلب.')");
    expect(checkoutPage).toContain("href={`/s/${slug}/cart`}");
    expect(checkoutPage).toContain("t('checkout.returnToCart', 'العودة للسلة')");
  });
});
