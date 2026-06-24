import { z } from 'zod';

/**
 * Phone-first registration: `phone` is required (Arabic message for the
 * dashboard form). Service-layer normalizes via `normalizeSaudiPhone`
 * and rejects with `INVALID_PHONE` (400) if the input is not a Saudi
 * mobile. `email` STAYS required at the API layer because OTP delivery
 * (email_otp_codes) needs an address.
 */
export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  phone: z.string().min(1, 'رقم الجوال مطلوب'),
  storeName: z.string().min(1).max(100),
  storeSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
});

/**
 * Phone-first login.
 *
 * Canonical: clients send `identifier` — either a Saudi mobile (any
 * accepted shape; see `normalizeSaudiPhone`) or an email. The service
 * sniffs the shape and looks up by phone OR email.
 *
 * Legacy aliases: `email` and `phone` are STILL accepted so existing
 * dashboard/storefront clients keep working without a coordinated
 * deploy. A follow-up cleanup PR can drop these aliases once all
 * frontends are on `identifier`. Until then the service falls back to
 * `email ?? phone` when `identifier` is absent.
 *
 * The zod schema is intentionally permissive (any of the three may be
 * provided). The "exactly one of identifier/email/phone is present and
 * non-empty" rule is enforced in the service layer where we can return
 * a uniform `INVALID_CREDENTIALS` instead of leaking validation paths.
 */
export const loginSchema = z.object({
  identifier: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  password: z.string().min(6),
});

export const idempotencyKeySchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export { createProductSchema, updateProductSchema, createCategorySchema } from './products.js';
export { createCheckoutSessionSchema, updateOrderStatusSchema, updateShipmentStatusSchema, ALLOWED_PAYMENT_METHODS } from './orders.js';
export { createShippingMethodSchema, createShippingZoneSchema, createShippingRateSchema } from './shipping.js';
export { createCouponSchema, updateCouponSchema, applyCouponSchema } from './coupons.js';
export { createPromotionSchema, updatePromotionSchema } from './promotions.js';
export { eventPayloadSchema, EVENT_PAYLOAD_MAX_BYTES, heartbeatPayloadSchema, HEARTBEAT_PAYLOAD_MAX_BYTES } from './marketing.js';
