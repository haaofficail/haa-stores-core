// TASK-0038 P0-#6 — SFDA / restricted-categories tests
import { describe, it, expect } from 'vitest';
import {
  validateProductForMarketplace,
  SFDA_GATED_CATEGORY_SLUGS,
  PROHIBITED_CATEGORY_SLUGS,
} from '../packages/shared/src/restricted-categories';

describe('restricted-categories — hard block', () => {
  it.each([
    'weapons', 'firearms', 'drugs', 'alcohol', 'pork-products',
    'gambling', 'adult-content', 'tobacco', 'vape',
  ])('blocks %s unconditionally', (slug) => {
    const result = validateProductForMarketplace({
      categorySlugs: [slug],
      sfdaNumber: 'SFDA-12345',
      sfdaExpiryDate: new Date(Date.now() + 86400000),
      sfdaVerifiedAt: new Date(),
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed && result.reason === 'prohibited_category') {
      expect(result.categorySlug).toBe(slug);
    } else {
      throw new Error('expected prohibited_category reason');
    }
  });

  it('blocks a product that has BOTH a prohibited and a safe category', () => {
    // Even if one category is fine, the prohibited one wins.
    const result = validateProductForMarketplace({
      categorySlugs: ['electronics', 'weapons'],
    });
    expect(result.allowed).toBe(false);
  });
});

describe('restricted-categories — SFDA gate', () => {
  it('allows non-SFDA categories freely', () => {
    const result = validateProductForMarketplace({
      categorySlugs: ['electronics', 'fashion'],
    });
    expect(result.allowed).toBe(true);
  });

  it('blocks SFDA-gated category without sfdaNumber', () => {
    const result = validateProductForMarketplace({
      categorySlugs: ['cosmetics'],
      sfdaNumber: null,
      sfdaExpiryDate: null,
      sfdaVerifiedAt: null,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('sfda_missing');
    }
  });

  it('blocks SFDA-gated category without sfdaVerifiedAt', () => {
    const result = validateProductForMarketplace({
      categorySlugs: ['food-supplements'],
      sfdaNumber: 'SFDA-99999',
      sfdaExpiryDate: new Date(Date.now() + 86400000),
      sfdaVerifiedAt: null,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('sfda_unverified');
    }
  });

  it('blocks SFDA-gated category with expired sfdaExpiryDate', () => {
    const result = validateProductForMarketplace({
      categorySlugs: ['cosmetics'],
      sfdaNumber: 'SFDA-12345',
      sfdaExpiryDate: new Date(Date.now() - 86400000), // yesterday
      sfdaVerifiedAt: new Date(Date.now() - 86400000 * 30),
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('sfda_expired');
    }
  });

  it('allows SFDA-gated category with valid + verified + non-expired', () => {
    const result = validateProductForMarketplace({
      categorySlugs: ['cosmetics'],
      sfdaNumber: 'SFDA-12345',
      sfdaExpiryDate: new Date(Date.now() + 30 * 86400000),
      sfdaVerifiedAt: new Date(),
    });
    expect(result.allowed).toBe(true);
  });

  it('handles a product in multiple SFDA-gated categories (one valid is enough)', () => {
    const result = validateProductForMarketplace({
      categorySlugs: ['cosmetics', 'skincare'],
      sfdaNumber: 'SFDA-12345',
      sfdaExpiryDate: new Date(Date.now() + 30 * 86400000),
      sfdaVerifiedAt: new Date(),
    });
    expect(result.allowed).toBe(true);
  });
});

describe('restricted-categories — sets are well-formed', () => {
  it('SFDA-gated categories do not overlap with prohibited', () => {
    for (const slug of SFDA_GATED_CATEGORY_SLUGS) {
      expect(PROHIBITED_CATEGORY_SLUGS.has(slug)).toBe(false);
    }
  });

  it('SFDA set contains at least cosmetics + supplements + medical', () => {
    expect(SFDA_GATED_CATEGORY_SLUGS.has('cosmetics')).toBe(true);
    expect(SFDA_GATED_CATEGORY_SLUGS.has('food-supplements')).toBe(true);
    expect(SFDA_GATED_CATEGORY_SLUGS.has('medical-devices')).toBe(true);
  });

  it('prohibited set contains KSA-blocked categories', () => {
    expect(PROHIBITED_CATEGORY_SLUGS.has('weapons')).toBe(true);
    expect(PROHIBITED_CATEGORY_SLUGS.has('alcohol')).toBe(true);
    expect(PROHIBITED_CATEGORY_SLUGS.has('pork-products')).toBe(true);
    expect(PROHIBITED_CATEGORY_SLUGS.has('gambling')).toBe(true);
  });
});

describe('restricted-categories — edge cases', () => {
  it('handles empty category list', () => {
    const result = validateProductForMarketplace({ categorySlugs: [] });
    expect(result.allowed).toBe(true);
  });

  it('handles invalid date string for sfdaExpiryDate', () => {
    const result = validateProductForMarketplace({
      categorySlugs: ['cosmetics'],
      sfdaNumber: 'SFDA-12345',
      sfdaExpiryDate: 'not a date',
      sfdaVerifiedAt: new Date(),
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('sfda_missing');
    }
  });
});
