// Customer-facing Arabic labels for order / payment / fulfillment status enums.
//
// Single source of truth so storefront pages NEVER render a raw English enum
// (e.g. `pending`, `unfulfilled`) to the shopper. Unknown values fall back to
// a safe Arabic placeholder instead of leaking the raw value.
//
// Display-only mapping — no order, payment, or shipping logic lives here.

const UNKNOWN_AR = 'غير معروف';

const ORDER_STATUS_AR: Record<string, string> = {
  draft: 'مسودة',
  checkout_started: 'بدأ الدفع',
  pending: 'قيد الانتظار',
  pending_payment: 'بانتظار الدفع',
  payment_failed: 'فشل الدفع',
  confirmed: 'مؤكد',
  processing: 'قيد التجهيز',
  ready_to_ship: 'جاهز للشحن',
  ready_for_pickup: 'جاهز للاستلام',
  shipped: 'تم الشحن',
  delivered: 'تم التوصيل',
  picked_up: 'تم الاستلام',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  returned: 'مرتجع',
  refunded: 'مسترد',
  partially_refunded: 'مسترد جزئيًا',
};

const PAYMENT_STATUS_AR: Record<string, string> = {
  pending: 'بانتظار الدفع',
  unpaid: 'غير مدفوع',
  paid: 'مدفوع',
  failed: 'فشل الدفع',
  refunded: 'مسترد',
  partially_refunded: 'مسترد جزئيًا',
};

const FULFILLMENT_STATUS_AR: Record<string, string> = {
  unfulfilled: 'بانتظار التجهيز',
  partially_fulfilled: 'مُجهّز جزئيًا',
  fulfilled: 'تم التجهيز',
  ready_to_ship: 'جاهز للشحن',
  shipped: 'تم الشحن',
  delivered: 'تم التوصيل',
  returned: 'مرتجع',
  cancelled: 'ملغي',
};

function toLabel(map: Record<string, string>, value: string | null | undefined): string {
  if (!value) return UNKNOWN_AR;
  return map[value] ?? UNKNOWN_AR;
}

export function formatOrderStatus(status: string | null | undefined): string {
  return toLabel(ORDER_STATUS_AR, status);
}

export function formatPaymentStatus(status: string | null | undefined): string {
  return toLabel(PAYMENT_STATUS_AR, status);
}

export function formatFulfillmentStatus(status: string | null | undefined): string {
  return toLabel(FULFILLMENT_STATUS_AR, status);
}
