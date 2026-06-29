import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '..');

function read(path: string): string {
  return readFileSync(resolve(projectRoot, path), 'utf-8');
}

describe('Merchant product form ARIA controls', () => {
  it('uses a named button for the product image upload drop zone', () => {
    const source = read('apps/merchant-dashboard/src/components/products/ProductImagesSection.tsx');
    const index = source.indexOf("aria-label={t('products.uploadImages')}");

    expect(index).toBeGreaterThanOrEqual(0);
    const block = source.slice(index - 350, index + 250);
    expect(block).toContain('<button');
    expect(block).toContain('type="button"');
    expect(block).toContain('onClick={() => fileRef.current?.click()}');
    expect(block).toContain("aria-label={t('products.uploadImages')}");
  });

  it('names product image removal controls for queued and saved images', () => {
    const source = read('apps/merchant-dashboard/src/components/products/ProductImagesSection.tsx');

    expect(source).toContain('aria-label="إزالة الصورة قبل الحفظ"');
    expect(source).toContain('title="إزالة الصورة قبل الحفظ"');
    expect(source).toContain('aria-label="حذف صورة المنتج"');
    expect(source).toContain('title="حذف صورة المنتج"');
  });

  it('names the variant option remove icon button', () => {
    const source = read('apps/merchant-dashboard/src/components/products/ProductVariantsSection.tsx');
    const index = source.indexOf("aria-label={`حذف خيار ${opt.name || oi + 1}`}");

    expect(index).toBeGreaterThanOrEqual(0);
    const block = source.slice(index - 350, index + 250);
    expect(block).toContain('type="button"');
    expect(block).toContain("aria-label={`حذف خيار ${opt.name || oi + 1}`}");
    expect(block).toContain("title={`حذف خيار ${opt.name || oi + 1}`}");
  });

  it('exposes pressed state for tag and category chips', () => {
    const source = read('apps/merchant-dashboard/src/components/products/ProductFormDialog.tsx');
    const tagIndex = source.indexOf("aria-label={`${selected ? 'إزالة تاج' : 'إضافة تاج'} ${tag.name}`}");
    const categoryIndex = source.indexOf("aria-label={`${selected ? 'إزالة تصنيف' : 'إضافة تصنيف'} ${cat.name}`}");

    expect(tagIndex).toBeGreaterThanOrEqual(0);
    expect(categoryIndex).toBeGreaterThanOrEqual(0);
    expect(source.slice(tagIndex - 200, tagIndex + 250)).toContain('aria-pressed={selected}');
    expect(source.slice(categoryIndex - 200, categoryIndex + 250)).toContain('aria-pressed={selected}');
  });
});
