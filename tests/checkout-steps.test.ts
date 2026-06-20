import { describe, it, expect } from 'vitest';
import { buildCheckoutStepKeys, clampStepIndex } from '../apps/storefront/src/lib/checkout-steps';

describe('Checkout dynamic steps (QA CO3)', () => {
  it('shipping path has 5 ordered steps including shipping', () => {
    expect(buildCheckoutStepKeys('shipping')).toEqual([
      'customer', 'fulfillment', 'shipping', 'payment', 'review',
    ]);
  });

  it('pickup path has 4 steps and omits shipping', () => {
    const keys = buildCheckoutStepKeys('pickup');
    expect(keys).toEqual(['customer', 'fulfillment', 'payment', 'review']);
    expect(keys).not.toContain('shipping');
  });

  it('payment/review land at correct indices for pickup (no blank/misaligned step)', () => {
    const keys = buildCheckoutStepKeys('pickup');
    // كان العيب: الفهرس 2 فارغ والفهرس 3 يعرض الدفع بينما المؤشر "مراجعة"
    expect(keys[2]).toBe('payment');
    expect(keys[3]).toBe('review');
  });

  it('review is always the last step in both paths', () => {
    expect(buildCheckoutStepKeys('shipping').at(-1)).toBe('review');
    expect(buildCheckoutStepKeys('pickup').at(-1)).toBe('review');
  });

  it('switching shipping→pickup clamps an out-of-range step safely', () => {
    const shipping = buildCheckoutStepKeys('shipping'); // length 5, max index 4 (review)
    const pickup = buildCheckoutStepKeys('pickup');     // length 4, max index 3
    // كان المستخدم على "review" (index 4) في shipping ثم بدّل لـ pickup
    const clamped = clampStepIndex(4, pickup.length);
    expect(clamped).toBe(3);
    expect(pickup[clamped]).toBe('review'); // يبقى على المراجعة، لا شاشة فارغة
    expect(shipping[4]).toBe('review');
  });

  it('clampStepIndex keeps valid indices unchanged and floors negatives', () => {
    expect(clampStepIndex(2, 5)).toBe(2);
    expect(clampStepIndex(-1, 5)).toBe(0);
    expect(clampStepIndex(0, 0)).toBe(0);
  });
});
