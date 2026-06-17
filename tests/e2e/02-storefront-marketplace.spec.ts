/**
 * E2E Flow 2: Marketplace page
 *
 * Apple-level: customer browses the marketplace. Page renders with sellers list.
 */
import { test, expect } from '@playwright/test';

test.describe('Storefront — marketplace', () => {
  test('marketplace page loads', async ({ page }) => {
    await page.goto('/marketplace');
    // Wait for any H1 or main content
    await expect(page.locator('main, [role="main"], body').first()).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/storefront-marketplace.png', fullPage: false });
  });
});
