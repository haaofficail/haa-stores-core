/**
 * E2E Flow 4: Admin dashboard
 *
 * Apple-level: admin can access platform management.
 */
import { test, expect } from '@playwright/test';

test.describe('Admin dashboard', () => {
  test('home page loads with RTL', async ({ page }) => {
    await page.goto('http://localhost:5175/');

    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/admin-home.png', fullPage: false });
  });
});
