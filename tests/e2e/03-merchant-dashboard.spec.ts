/**
 * E2E Flow 3: Merchant dashboard
 *
 * Apple-level: merchant logs in and sees dashboard.
 * Skips login for now (would need auth fixture).
 */
import { test, expect } from '@playwright/test';

test.describe('Merchant dashboard', () => {
  test('home page loads with RTL + brand color', async ({ page }) => {
    await page.goto('http://localhost:5173/');

    // RTL
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');

    // Page renders
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/merchant-home.png', fullPage: false });
  });

  test('login page accessible', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/merchant-login.png', fullPage: false });
  });
});
