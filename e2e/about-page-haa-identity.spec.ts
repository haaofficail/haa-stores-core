import { test, expect } from '@playwright/test';

/**
 * About page — Haa identity assertions.
 * Frontend-only; no backend writes. Verifies copy, legal-entity card,
 * and the primary CTA's brand styling (white text on brand-blue).
 */
test.describe('about page — Haa identity', () => {
  test('renders title, legal entity, removed sections, and brand CTA', async ({
    page,
  }) => {
    await page.goto('/about');

    // Page title (Arabic).
    await expect(
      page.getByRole('heading', { name: /من نحن/ }).first(),
    ).toBeVisible();

    // Primary CTA: copy + computed brand styling.
    const cta = page
      .getByRole('link', { name: /ابدأ متجرك مجاناً/ })
      .or(page.getByRole('button', { name: /ابدأ متجرك مجاناً/ }))
      .first();
    await expect(cta).toBeVisible();

    const ctaStyle = await cta.evaluate((el) => {
      const cs = window.getComputedStyle(el as HTMLElement);
      return { color: cs.color, bg: cs.backgroundColor };
    });

    // Helper: parse rgb()/rgba() string into [r,g,b].
    const parseRgb = (s: string): [number, number, number] => {
      const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
    };
    const [r, g, b] = parseRgb(ctaStyle.color);
    const [br, bg, bb] = parseRgb(ctaStyle.bg);

    // CTA text should be (near-)white.
    expect(r).toBeGreaterThanOrEqual(240);
    expect(g).toBeGreaterThanOrEqual(240);
    expect(b).toBeGreaterThanOrEqual(240);

    // Background must be blue-dominant (B channel highest, not light/grey).
    expect(bb).toBeGreaterThan(br);
    expect(bb).toBeGreaterThan(bg);
    expect(bb - Math.max(br, bg)).toBeGreaterThan(30);

    // Legal entity card with CR number.
    const legalCard = page.getByText(/السجل التجاري/).first();
    await expect(legalCard).toBeVisible();
    await expect(page.getByText(/\d{6,}/).first()).toBeVisible();

    // Sections that must be removed.
    await expect(page.getByText(/تاريخ الإصدار/)).toHaveCount(0);
    await expect(page.getByText(/ما الذي نقدّمه/)).toHaveCount(0);
  });
});
