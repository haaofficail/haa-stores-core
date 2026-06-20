import { test, expect } from '@playwright/test';

test.describe('Critical Path: Storefront to Order', () => {
  const storeSlug = 'haa-demo';
  const baseUrl = `http://localhost:5174/s/${storeSlug}`;

  test('should allow a user to complete a purchase successfully', async ({ page }) => {
    await page.goto(baseUrl);
    await expect(page).toHaveURL(new RegExp(storeSlug));

    const productLink = page.locator('a[href*="/p/"]').first();
    await expect(productLink).toBeVisible();
    await productLink.click();
    await page.waitForURL(/\/p\//);

    const addToCartBtn = page.getByTestId('pdp-add-to-cart');
    await expect(addToCartBtn).toBeVisible({ timeout: 10_000 });
    await expect(addToCartBtn).toBeEnabled({ timeout: 10_000 });

    const cartResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/cart') && res.request().method() === 'POST' && res.status() < 400,
      { timeout: 15_000 },
    );
    await addToCartBtn.click();
    await cartResponsePromise;

    await page.goto(`${baseUrl}/cart`);
    const checkoutLink = page.getByTestId('cart-checkout-link');
    await expect(checkoutLink).toBeVisible({ timeout: 8_000 });
    await checkoutLink.click();
    await page.waitForURL(/\/checkout/, { timeout: 8_000 });

    await page.getByPlaceholder(/الاسم الكامل|Full name/i).fill('E2E Test User');
    await page.getByPlaceholder('05xxxxxxxx').fill('0500000000');
    await page.getByPlaceholder(/email@example\.com/i).fill('e2e@test.com');
    await page.getByRole('button', { name: /التالي|Next/i }).click();

    const shippingRatesPromise = page.waitForResponse(
      (res) => res.url().includes('shipping-rates') && res.status() < 400,
      { timeout: 15_000 },
    );
    await page.getByPlaceholder(/مثال: الرياض/i).fill('الرياض');
    await shippingRatesPromise;
    await page.getByRole('button', { name: /التالي|Next/i }).click();

    const shippingRadio = page.locator('input[name="shipping"]').first();
    await expect(shippingRadio).toBeVisible({ timeout: 8_000 });
    await expect(shippingRadio).toBeEnabled({ timeout: 8_000 });
    await shippingRadio.click();
    await page.getByRole('button', { name: /التالي|Next/i }).click();

    const cashOnDelivery = page.locator('input[name="payment"][value="cash_on_delivery"]');
    await expect(cashOnDelivery).toBeVisible({ timeout: 8_000 });
    await cashOnDelivery.click();
    await page.getByRole('button', { name: /التالي|Next/i }).click();

    const confirmBtn = page.getByRole('button', { name: /تأكيد الطلب|Confirm Order/i });
    await expect(confirmBtn).toBeVisible({ timeout: 8_000 });
    await expect(confirmBtn).toBeEnabled({ timeout: 8_000 });

    const confirmPromise = page.waitForResponse(
      (res) => res.url().includes('/confirm') && res.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await confirmBtn.click();
    await confirmPromise;

    await expect(page).toHaveURL(
      new RegExp(`/s/${storeSlug}/order/`),
      { timeout: 15_000 },
    );
  });
});
