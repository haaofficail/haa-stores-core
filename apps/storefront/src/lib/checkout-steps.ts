export type CheckoutStepKey = 'customer' | 'fulfillment' | 'shipping' | 'payment' | 'review';
export type FulfillmentType = 'shipping' | 'pickup';

/**
 * مفاتيح خطوات الـ checkout حسب طريقة التسليم.
 * shipping: customer → fulfillment → shipping → payment → review
 * pickup:   customer → fulfillment → payment → review   (لا خطوة شحن)
 * استخدام المفاتيح بدل الفهارس الثابتة يمنع كسر الخطوات عند pickup (QA CO3).
 */
export function buildCheckoutStepKeys(fulfillmentType: FulfillmentType): CheckoutStepKey[] {
  return [
    'customer',
    'fulfillment',
    ...(fulfillmentType === 'shipping' ? (['shipping'] as const) : []),
    'payment',
    'review',
  ];
}

/** يقصّ الفهرس ضمن النطاق الصالح عند تغيّر عدد الخطوات (clamp آمن). */
export function clampStepIndex(index: number, stepCount: number): number {
  if (stepCount <= 0) return 0;
  return Math.min(Math.max(0, index), stepCount - 1);
}
