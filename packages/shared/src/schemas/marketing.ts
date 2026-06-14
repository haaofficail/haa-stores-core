import { z } from 'zod';
import { MARKETING_EVENT_TYPES } from '../types/marketing.js';

export const EVENT_PAYLOAD_MAX_BYTES = 10_000;

export const eventPayloadSchema = z.object({
  eventType: z.enum(MARKETING_EVENT_TYPES),
  sessionId: z.string().min(1).max(255),
  customerId: z.coerce.number().int().positive().optional(),
  productId: z.coerce.number().int().positive().optional(),
  cartId: z.string().uuid().optional(),
  orderId: z.coerce.number().int().positive().optional(),
  path: z.string().max(2000).optional(),
  referrer: z.string().max(2000).optional(),
  deviceType: z.string().max(50).optional(),
  utmSource: z.string().max(255).optional(),
  utmMedium: z.string().max(255).optional(),
  utmCampaign: z.string().max(255).optional(),
  utmContent: z.string().max(255).optional(),
  utmTerm: z.string().max(255).optional(),
  metadata: z.record(z.unknown()).optional(),
}).refine(
  (data) => JSON.stringify(data).length <= EVENT_PAYLOAD_MAX_BYTES,
  { message: 'Event payload exceeds maximum size' },
);

const PAGE_TYPES = ['home', 'product', 'category', 'cart', 'checkout', 'search', 'static', 'order_confirmation', 'unknown'] as const;

export const HEARTBEAT_PAYLOAD_MAX_BYTES = 5_000;

export const heartbeatPayloadSchema = z.object({
  sessionId: z.string().min(1).max(255),
  currentPath: z.string().max(2000),
  currentPageType: z.enum(PAGE_TYPES),
  currentProductId: z.coerce.number().int().positive().optional(),
  cartId: z.string().uuid().optional(),
  currentCartValue: z.coerce.number().optional(),
  isInCheckout: z.boolean(),
  deviceType: z.string().max(50).optional(),
  os: z.string().max(20).optional(),
  browser: z.string().max(30).optional(),
  screenSize: z.string().max(10).optional(),
  utmSource: z.string().max(255).optional(),
  utmMedium: z.string().max(255).optional(),
  utmCampaign: z.string().max(255).optional(),
}).strict().refine(
  (data) => JSON.stringify(data).length <= HEARTBEAT_PAYLOAD_MAX_BYTES,
  { message: 'Heartbeat payload exceeds maximum size' },
);
