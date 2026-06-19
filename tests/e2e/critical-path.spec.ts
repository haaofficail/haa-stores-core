import { test, expect } from '@playwright/test';

test.describe('Critical Path: Storefront to Order', () => {
  const storeSlug = 'haa-demo';
  // TODO: use playwright.config.ts baseURL instead of hardcoding the port here
  const baseUrl = `http://localhost:5174/s/${storeSlug}`;

  test('should allow a user to complete a purchase successfully', async ({ page }) => {
    // 1. Visit Storefront
    await page.goto(baseUrl);
    await expect(page).toHaveURL(new RegExp(storeSlug));

    // 2. Add the first purchasable product.
    // Product detail order is not a stock guarantee; a visible enabled add
    // button is the user-facing signal that the item can enter checkout.
    const addToCartBtn = page
      .locator('button:visible:enabled')
      .filter({ hasText: /Add|أضف/i })
      .first();
    await expect(addToCartBtn).toBeVisible();
    await addToCartBtn.click();

    // 3. Go to Cart
    await page.goto(`${baseUrl}/cart`);
    
    // 4. Proceed to Checkout
    const checkoutLink = page.getByRole('link', {
      name: /Checkout|إتمام الطلب/i,
    });
    await expect(checkoutLink).toBeVisible();
    await checkoutLink.click();

    // 5. Complete the current multi-step checkout wizard.
    await page.getByPlaceholder(/الاسم الكامل|Full name/i).fill('E2E Test User');
    await page.getByPlaceholder('05xxxxxxxx').fill('0500000000');
    await page.getByPlaceholder(/email@example\.com/i).fill('e2e@test.com');
    await page.getByRole('button', { name: /Next|التالي/i }).click();

    await page.getByPlaceholder(/مثال: الرياض|Riyadh/i).fill('Riyadh');
    await page.getByRole('button', { name: /Next|التالي/i }).click();

    const shippingMethod = page.locator('input[name="shipping"]').first();
    await expect(shippingMethod).toBeVisible();
    await shippingMethod.check();
    await page.getByRole('button', { name: /Next|التالي/i }).click();

    const cashOnDelivery = page.locator(
      'input[name="payment"][value="cash_on_delivery"]',
    );
    await expect(cashOnDelivery).toBeVisible();
    await cashOnDelivery.check();
    await page.getByRole('button', { name: /Next|التالي/i }).click();

    // 6. Confirm Order
    const confirmBtn = page.getByRole('button', {
      name: /Confirm Order|تأكيد الطلب/i,
    });
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // 7. Verify Success
    await expect(page).toHaveURL(new RegExp('/order-success'));
    await expect(page.locator('h1, h2')).toContainText(/Success|نجح/i);
  });
});
