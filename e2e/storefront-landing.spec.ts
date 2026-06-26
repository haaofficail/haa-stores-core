import { test, expect } from '@playwright/test';

/**
 * Smoke: storefront landing page renders the hero, nav logo, and footer.
 * Backend NOT required — purely a frontend render check.
 */
test.describe('storefront landing (smoke)', () => {
  test('renders title, hero CTA, footer, and nav logo', async ({ page }) => {
    await page.goto('/');

    // Title contains either Arabic brand or English brand.
    await expect(page).toHaveTitle(/متاجر هاء|Haa/i);

    // Hero CTA — Arabic copy variants used across the site.
    const heroCta = page
      .getByRole('link', { name: /ابدأ|سجّل|سجل/ })
      .or(page.getByRole('button', { name: /ابدأ|سجّل|سجل/ }))
      .first();
    await expect(heroCta).toBeVisible();

    // Footer is rendered.
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();

    // Logo lives inside the top navigation.
    const navLogo = page
      .locator('nav, header')
      .first()
      .locator('img, svg')
      .first();
    await expect(navLogo).toBeVisible();
  });
});
