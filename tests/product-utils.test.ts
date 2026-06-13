import { describe, it, expect } from 'vitest';
import { generateSlug, isValidSlug } from '../apps/merchant-dashboard/src/lib/slug';
import { validateProduct, getWarnings, type ProductFormData } from '../apps/merchant-dashboard/src/lib/product-validation';

const baseForm: ProductFormData = {
  name: 'Test Product',
  slug: 'test-product',
  description: '',
  status: 'draft',
  type: 'physical',
  price: '100',
  compareAtPrice: '',
  cost: '',
  sku: '',
  barcode: '',
  stockQuantity: 10,
  trackInventory: true,
  weightGrams: '',
  lengthCm: '',
  widthCm: '',
  heightCm: '',
  requiresShipping: true,
  isFragile: false,
  seoTitle: '',
  seoDescription: '',
  categoryIds: [],
};

describe('LC2A — Product Utils', () => {
  describe('generateSlug', () => {
    it('converts simple name to slug', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
    });

    it('removes special characters', () => {
      expect(generateSlug('Product #1 (new!)')).toBe('product-1-new');
    });

    it('collapses multiple hyphens', () => {
      expect(generateSlug('a  b   c')).toBe('a-b-c');
    });

    it('trims leading/trailing hyphens', () => {
      expect(generateSlug('--hello--')).toBe('hello');
    });

    it('handles empty string', () => {
      expect(generateSlug('')).toBe('');
    });

    it('handles numbers', () => {
      expect(generateSlug('Product 123')).toBe('product-123');
    });

    it('strips non-latin characters', () => {
      const slug = generateSlug('منتج test');
      expect(slug).toBe('test');
      expect(isValidSlug(slug)).toBe(true);
    });

    it('lowercases everything', () => {
      expect(generateSlug('UPPER CASE')).toBe('upper-case');
    });
  });

  describe('isValidSlug', () => {
    it('accepts valid slugs', () => {
      expect(isValidSlug('hello-world')).toBe(true);
      expect(isValidSlug('product-123')).toBe(true);
      expect(isValidSlug('a')).toBe(true);
    });

    it('rejects invalid slugs', () => {
      expect(isValidSlug('')).toBe(false);
      expect(isValidSlug('Hello')).toBe(false);
      expect(isValidSlug('has space')).toBe(false);
      expect(isValidSlug('has_underscore')).toBe(false);
      expect(isValidSlug('has.dot')).toBe(false);
    });
  });

  describe('validateProduct', () => {
    it('returns no errors for valid form', () => {
      expect(validateProduct(baseForm)).toEqual([]);
    });

    it('requires name', () => {
      const form = { ...baseForm, name: '' };
      const errors = validateProduct(form);
      expect(errors.some(e => e.field === 'name')).toBe(true);
    });

    it('requires slug', () => {
      const form = { ...baseForm, slug: '' };
      const errors = validateProduct(form);
      expect(errors.some(e => e.field === 'slug')).toBe(true);
    });

    it('rejects invalid slug format', () => {
      const form = { ...baseForm, slug: 'Invalid Slug!' };
      const errors = validateProduct(form);
      expect(errors.some(e => e.field === 'slug' && e.message === 'slug_invalid')).toBe(true);
    });

    it('requires price', () => {
      const form = { ...baseForm, price: '' };
      const errors = validateProduct(form);
      expect(errors.some(e => e.field === 'price')).toBe(true);
    });

    it('blocks negative price', () => {
      const form = { ...baseForm, price: '-10' };
      const errors = validateProduct(form);
      expect(errors.some(e => e.field === 'price' && e.message === 'price_negative')).toBe(true);
    });

    it('blocks negative compareAtPrice', () => {
      const form = { ...baseForm, compareAtPrice: '-5' };
      const errors = validateProduct(form);
      expect(errors.some(e => e.field === 'compareAtPrice')).toBe(true);
    });

    it('blocks compareAtPrice less than price', () => {
      const form = { ...baseForm, price: '100', compareAtPrice: '50' };
      const errors = validateProduct(form);
      expect(errors.some(e => e.field === 'compareAtPrice' && e.message === 'compare_less_than_price')).toBe(true);
    });

    it('allows compareAtPrice equal to price', () => {
      const form = { ...baseForm, price: '100', compareAtPrice: '100' };
      const errors = validateProduct(form);
      expect(errors.filter(e => e.field === 'compareAtPrice')).toEqual([]);
    });

    it('blocks negative cost', () => {
      const form = { ...baseForm, cost: '-10' };
      const errors = validateProduct(form);
      expect(errors.some(e => e.field === 'cost')).toBe(true);
    });

    it('blocks negative stock', () => {
      const form = { ...baseForm, stockQuantity: -1 };
      const errors = validateProduct(form);
      expect(errors.some(e => e.field === 'stockQuantity')).toBe(true);
    });

    it('blocks negative weight', () => {
      const form = { ...baseForm, weightGrams: '-100' };
      const errors = validateProduct(form);
      expect(errors.some(e => e.field === 'weightGrams')).toBe(true);
    });

    it('blocks SEO title > 60 chars', () => {
      const form = { ...baseForm, seoTitle: 'a'.repeat(61) };
      const errors = validateProduct(form);
      expect(errors.some(e => e.field === 'seoTitle')).toBe(true);
    });

    it('blocks SEO description > 160 chars', () => {
      const form = { ...baseForm, seoDescription: 'a'.repeat(161) };
      const errors = validateProduct(form);
      expect(errors.some(e => e.field === 'seoDescription')).toBe(true);
    });
  });

  describe('getWarnings', () => {
    it('warns when shipping required but no weight', () => {
      const form = { ...baseForm, requiresShipping: true, weightGrams: '' };
      expect(getWarnings(form)).toContain('shipping_no_weight');
    });

    it('warns when tracking inventory but zero stock', () => {
      const form = { ...baseForm, trackInventory: true, stockQuantity: 0 };
      expect(getWarnings(form)).toContain('zero_stock');
    });

    it('no warnings when everything fine', () => {
      const form = { ...baseForm, weightGrams: '500', stockQuantity: 10 };
      expect(getWarnings(form)).toEqual([]);
    });
  });
});
