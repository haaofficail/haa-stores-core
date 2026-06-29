import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '..');

function read(path: string): string {
  return readFileSync(resolve(projectRoot, path), 'utf-8');
}

describe('Storefront buyer controls — ARIA polish', () => {
  it('names homepage carousel dots and exposes the active slide', () => {
    const source = read('apps/storefront/src/themes/base-elegant/HomePage.tsx');
    const marker = "aria-label={`عرض الشريحة ${i + 1} من ${banners.length}`}";
    const index = source.indexOf(marker);

    expect(index).toBeGreaterThanOrEqual(0);
    const block = source.slice(index - 600, index + 400);
    expect(block).toContain('type="button"');
    expect(block).toContain('min-h-[44px] min-w-[44px]');
    expect(block).toContain(marker);
    expect(block).toContain("aria-current={i === current ? 'true' : undefined}");
    expect(block).toContain('aria-hidden="true"');
  });

  it('exposes homepage FAQ disclosure state and controlled panel id', () => {
    const source = read('apps/storefront/src/themes/base-elegant/HomePage.tsx');
    const index = source.indexOf('const panelId = `home-faq-answer-${i}`;');

    expect(index).toBeGreaterThanOrEqual(0);
    const block = source.slice(index, index + 900);
    expect(block).toContain('type="button"');
    expect(block).toContain('aria-expanded={isOpen}');
    expect(block).toContain('aria-controls={panelId}');
    expect(block).toContain('id={panelId}');
  });

  it('marks base-elegant product option buttons as pressed selections', () => {
    const source = read('apps/storefront/src/themes/base-elegant/ProductPage.tsx');
    const index = source.indexOf('aria-pressed={isSelected}');

    expect(index).toBeGreaterThanOrEqual(0);
    const block = source.slice(index - 300, index + 300);
    expect(block).toContain('type="button"');
    expect(block).toContain('aria-pressed={isSelected}');
    expect(block).toContain('aria-label={`${opt.name}: ${v.value}`}');
  });

  it('marks luxury product option buttons as pressed selections', () => {
    const source = read('apps/storefront/src/themes/luxury-showcase/components/LuxuryProductInfoPanel.tsx');
    const index = source.indexOf('aria-pressed={active}');

    expect(index).toBeGreaterThanOrEqual(0);
    const block = source.slice(index - 400, index + 350);
    expect(block).toContain('const valueLabelText = String(valueLabel ?? valueKey ?? \'\');');
    expect(block).toContain('type="button"');
    expect(block).toContain('aria-pressed={active}');
    expect(block).toContain('aria-label={`${optionName}: ${valueLabelText}`}');
  });

  it('keeps the luxury product-card add-to-cart button named while loading', () => {
    const source = read('apps/storefront/src/themes/luxury-showcase/components/LuxuryProductCard.tsx');
    const index = source.indexOf("aria-label={adding ? t('product.adding'");

    expect(index).toBeGreaterThanOrEqual(0);
    const block = source.slice(index - 250, index + 800);
    expect(block).toContain("aria-label={adding ? t('product.adding', 'جارٍ الإضافة...') : t('product.addToCart', 'أضف للسلة')}");
    expect(block).toContain('aria-busy={adding}');
    expect(block).toContain('aria-hidden="true"');
    expect(block).toContain('animate-spin');
  });
});
