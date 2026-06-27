import { test, expect } from '@playwright/test';

/**
 * Merchant dashboard login — invalid credentials path.
 * Uses the local merchant dev server in CI, while keeping staging available
 * for manual runs through E2E_MERCHANT_URL.
 * Requires API to be reachable for authentication failure to surface.
 */
const MERCHANT_LOGIN_URL =
  process.env.E2E_MERCHANT_URL ||
  (process.env.CI
    ? 'http://localhost:5173/login'
    : 'https://merchant.staging.haastores.com/login');

test.describe('merchant login (invalid credentials)', () => {
  test('shows an inline error and stays on /login (never 500)', async ({
    page,
  }) => {
    const serverErrors: string[] = [];
    page.on('response', (resp) => {
      if (resp.status() >= 500) {
        serverErrors.push(`${resp.status()} ${resp.url()}`);
      }
    });

    await page.goto(MERCHANT_LOGIN_URL);

    // Logo + form are baseline expectations. The login page wraps the
    // brand mark in a plain <div> (no <header>/<nav> landmark), so we
    // look for the first image OR SVG anywhere in the document — the
    // mark uses an <img src="/haa-logo-192.png"> with a <Sparkles>
    // <svg> fallback if the image 404s.
    const logo = page.locator('img, svg').first();
    await expect(logo).toBeVisible();

    const emailInput = page
      .locator('input[type="email"], input[name="email"]')
      .first();
    const passwordInput = page
      .locator('input[type="password"], input[name="password"]')
      .first();
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    await emailInput.fill('invalid@test.com');
    await passwordInput.fill('wrongpass');

    const submit = page
      .getByRole('button', { name: /دخول|تسجيل الدخول/ })
      .or(page.locator('button[type="submit"]'))
      .first();
    await submit.click();

    // Error surface: either a toast or inline message mentioning the password
    // or "incorrect/invalid" copy used across the dashboard.
    const errorLocator = page
      .getByText(/كلمة المرور|غير صحيح|بيانات غير|خاطئ/i)
      .first();
    await expect(errorLocator).toBeVisible({ timeout: 8_000 });

    // We must remain on /login — no redirect on failed auth.
    await expect(page).toHaveURL(/\/login(\?.*)?$/);

    expect(
      serverErrors,
      `server returned 5xx responses: ${serverErrors.join(', ')}`,
    ).toEqual([]);
  });
});
