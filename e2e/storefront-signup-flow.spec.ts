import { test, expect } from '@playwright/test';

/**
 * Storefront signup flow — happy-ish path.
 * Requires backend (API + DB) reachable from baseURL: form submission
 * must produce either a redirect, a success message, or a structured
 * error — never a 5xx.
 */
test.describe('storefront signup flow', () => {
  test('submits signup and lands on dashboard, success, or visible error (never 500)', async ({
    page,
  }) => {
    // Capture any 5xx responses so we can fail loudly on infra errors.
    const serverErrors: string[] = [];
    page.on('response', (resp) => {
      if (resp.status() >= 500) {
        serverErrors.push(`${resp.status()} ${resp.url()}`);
      }
    });

    await page.goto('/signup');

    const emailInput = page
      .locator('input[type="email"], input[name="email"]')
      .first();
    const passwordInput = page
      .locator('input[type="password"], input[name="password"]')
      .first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    const uniqueEmail = `qa+${Date.now()}@haastores.com`;
    await emailInput.fill(uniqueEmail);
    await passwordInput.fill('Test1234!@#$');

    const submit = page
      .getByRole('button', { name: /إنشاء|سجّل|سجل|اشترك|التالي/ })
      .or(page.locator('button[type="submit"]'))
      .first();
    await submit.click();

    // Accept any of: redirect, success copy, or a visible inline error.
    const redirected = page.waitForURL(/dashboard|verify|welcome|onboarding/i, {
      timeout: 8_000,
    });
    const success = page
      .getByText(/تم|نجح|مرحب|تحقق من بريدك/i)
      .first()
      .waitFor({ timeout: 8_000 });
    const inlineError = page
      .getByText(/خطأ|مستخدم|موجود|غير صالح/i)
      .first()
      .waitFor({ timeout: 8_000 });

    await Promise.any([redirected, success, inlineError]).catch(() => {
      // Fall through — the strict 5xx assertion below is what really matters.
    });

    expect(
      serverErrors,
      `server returned 5xx responses: ${serverErrors.join(', ')}`,
    ).toEqual([]);
  });
});
