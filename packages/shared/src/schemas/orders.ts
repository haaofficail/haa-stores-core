import { z } from 'zod';

export const ALLOWED_PAYMENT_METHODS = [
  'fake_card_success', 'fake_card_failed', 'bank_transfer', 'cash_on_delivery',
  'moyasar_creditcard', 'moyasar_mada', 'moyasar_applepay', 'moyasar_stcpay',
  'tabby_installments', 'tamara_installments',
] as const;

export const createCheckoutSessionSchema = z.object({
  cartId: z.string().uuid(),
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().min(1).max(20),
  customerEmail: z.string().email().optional(),
  shippingAddressId: z.number().optional(),
  billingAddressId: z.number().optional(),
  shippingMethodId: z.number(),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(ALLOWED_PAYMENT_METHODS),
  notes: z.string().optional(),
  idempotencyKey: z.string().uuid(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'confirmed', 'processing', 'ready_to_ship', 'shipped',
    'delivered', 'completed', 'cancelled', 'refunded',
    'ready_for_pickup', 'picked_up',
  ]),
  reason: z.string().optional(),
});

export const updateShipmentStatusSchema = z.object({
  status: z.enum([
    'label_created', 'pickup_requested', 'picked_up',
    'in_transit', 'out_for_delivery', 'delivered',
    'delivery_failed', 'returned_to_sender', 'cancelled',
  ]),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().optional(),
  carrierName: z.string().optional(),
});
