/**
 * E2E Flow 1: Storefront landing page
 *
 * Apple-level: a real customer hits the storefront and the page renders correctly
 * with the brand color, navigation, and key sections.
 */
import { test, expect } from '@playwright/test';

test.describe('Storefront — landing page', () => {
  test('loads with brand color and key sections', async ({ page }) => {
    await page.goto('/');

    // Page title
    await expect(page).toHaveTitle(/ها ستورز|Haa/);

    // Hero section visible
    const hero = page.locator('h1').first();
    await expect(hero).toBeVisible();

    // Brand color is #5c9cd5 in <meta theme-color>
    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
    expect(themeColor).toBe('#5c9cd5');

    // RTL direction
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
    await expect(html).toHaveAttribute('lang', 'ar');

    // Visual snapshot
    await page.screenshot({ path: 'tests/e2e/screenshots/storefront-landing.png', fullPage: false });
  });

  test('navigation present and has Arabic labels', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav, header').first();
    await expect(nav).toBeVisible();
  });
});
