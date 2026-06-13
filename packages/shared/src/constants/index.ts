export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['checkout_started', 'pending_payment', 'cancelled'],
  checkout_started: ['pending_payment', 'cancelled'],
  pending_payment: ['confirmed', 'cancelled', 'refunded'],
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

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
