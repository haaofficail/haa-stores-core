export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['checkout_started', 'pending_payment', 'cancelled'],
  checkout_started: ['pending_payment', 'cancelled'],
  // pending_payment -> payment_failed: the online-payment "declined/error"
  // branch in CheckoutService.confirm() (checkout.ts) marks the order
  // payment_failed right after creating it as pending_payment. Found missing
  // via tests/checkout-financial-flows.integration.test.ts — every declined
  // card payment threw "Cannot transition from 'pending_payment' to
  // 'payment_failed'" instead of failing gracefully.
  pending_payment: ['confirmed', 'cancelled', 'refunded', 'payment_failed'],
  // awaiting_3ds: the SAMA-mandated 3DS challenge state (checkout.ts sets it
  // while the customer is at the issuer's challenge page). The async
  // confirmation webhook resolves it to confirmed (paid), cancelled, or
  // payment_failed — none of which were reachable before this fix because
  // awaiting_3ds had no entry here at all.
  awaiting_3ds: ['confirmed', 'cancelled', 'payment_failed'],
  // payment_failed: terminal for this order; the customer retries via a new
  // checkout session/order rather than mutating this one (matches the demo
  // seed's own payment_failed handling).
  payment_failed: ['cancelled'],
  confirmed: ['processing', 'cancelled', 'refunded'],
  processing: ['ready_to_ship', 'ready_for_pickup', 'cancelled'],
  ready_to_ship: ['shipped', 'cancelled'],
  ready_for_pickup: ['picked_up', 'cancelled'],
  shipped: ['delivered', 'returned_to_sender', 'cancelled'],
  picked_up: [],
  delivered: ['completed', 'returned'],
  completed: ['returned', 'refunded'],
  cancelled: [],
  returned: ['refunded'],
  refunded: [],
  partially_refunded: ['refunded', 'completed'],
};

/**
 * Valid forward-only transitions for preparationStatus.
 * Reverse transitions (e.g. packed → preparing) require admin role + reason
 * and must go through OrdersService.changePreparationStatus with forceReverse=true.
 */
export const PREPARATION_STATUS_TRANSITIONS: Record<string, string[]> = {
  not_started: ['preparing'],
  preparing: ['prepared'],
  prepared: ['packed'],
  packed: [], // terminal — reverse requires admin override
};

/**
 * Valid transitions for `orders.paymentStatus`. Enforced by
 * `OrdersService.updatePaymentStatus` — any disallowed transition
 * throws and the row is left untouched. Idempotent writes
 * (same → same) bypass this table.
 *
 * Values mirror the `PaymentStatus` union in
 * `packages/shared/src/types/orders.ts`. Union members that don't
 * fit the canonical graph (`pending`, `requires_3ds`, `expired`)
 * are kept as terminal `[]` entries so legacy rows stay readable
 * but the service refuses to write into them.
 */
export const PAYMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  // Canonical graph from the hardening spec, extended with the
  // two pre-capture states (`pending`, `requires_3ds`) that live
  // checkout + webhook flows already write into `unpaid`. Without
  // these forward edges, `checkout.confirmPayment` would throw on
  // every COD or 3DS order. See `packages/commerce-core/src/checkout.ts`
  // and `packages/commerce-core/src/payment-webhook-service.ts`.
  unpaid: ['pending', 'requires_3ds', 'authorized', 'paid', 'failed', 'cancelled'],
  pending: ['paid', 'failed', 'cancelled', 'expired'],
  requires_3ds: ['paid', 'failed', 'cancelled', 'expired'],
  authorized: ['paid', 'failed', 'cancelled'],
  paid: ['refunded', 'partially_refunded'],
  partially_refunded: ['refunded'],
  refunded: [],
  failed: ['unpaid', 'cancelled'],
  cancelled: [],
  // Union members not in the canonical graph — terminal by default.
  // See packages/shared/src/types/orders.ts for the full union.
  expired: [],
};

/**
 * Valid transitions for `orders.fulfillmentStatus`. Enforced by
 * `OrdersService.updateFulfillmentStatus`. Forward-only progression:
 * `unfulfilled → partially_fulfilled → fulfilled`. `fulfilled` is a
 * near-terminal — the only edge out is `returned` (re-using the
 * order-status `returned` semantics for fully-shipped-then-returned
 * orders). `returned` itself is terminal.
 */
export const FULFILLMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  unfulfilled: ['partially_fulfilled', 'fulfilled'],
  partially_fulfilled: ['fulfilled'],
  fulfilled: [],
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
