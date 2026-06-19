import { test, expect } from '@playwright/test';

test.describe('Critical Path: Storefront to Order', () => {
  const storeSlug = 'haa-demo';
  // TODO: use playwright.config.ts baseURL instead of hardcoding the port here
  const baseUrl = `http://localhost:5174/s/${storeSlug}`;

  test('should allow a user to complete a purchase successfully', async ({ page }) => {
    // 1. Visit Storefront
    await page.goto(baseUrl);
    await expect(page).toHaveURL(new RegExp(storeSlug));

    // 2. Select a product
    // We search for the first product card and click it
    const productCard = page.locator('a[href*="/p/"]:visible').first();
    await expect(productCard).toBeVisible();
    await productCard.click();

    // 3. Add to Cart
    const addToCartBtn = page
      .locator('button:visible')
      .filter({ hasText: /Add|أضف|السلة/i })
      .first();
    await expect(addToCartBtn).toBeVisible();
    await addToCartBtn.click();

    // 4. Go to Cart
    await page.goto(`${baseUrl}/cart`);
    
    // 5. Proceed to Checkout
    const checkoutBtn = page.locator('button:has-text("Checkout"), button:has-text("إتمام الطلب")');
    await checkoutBtn.click();

    // 6. Fill Checkout Form
    await page.fill('input[name="customerName"]', 'E2E Test User');
    await page.fill('input[name="customerPhone"]', '0500000000');
    await page.fill('input[name="customerEmail"]', 'e2e@test.com');
    await page.fill('input[name="city"]', 'Riyadh');
    
    // Select a shipping method (first available)
    await page.locator('input[type="radio"]').first().click();
    
    // Select payment method (Cash on Delivery for simplicity in E2E)
    await page.locator('text=cash_on_delivery').click();
    
    // 7. Confirm Order
    const confirmBtn = page.locator('button:has-text("Confirm Order"), button:has-text("تأكيد الطلب")');
    await confirmBtn.click();

    // 8. Verify Success
    await expect(page).toHaveURL(new RegExp('/order-success'));
    await expect(page.locator('h1, h2')).toContainText(/Success|نجح/i);
  });
});
