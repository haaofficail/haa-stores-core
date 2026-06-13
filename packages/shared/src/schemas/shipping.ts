import { z } from 'zod';

export const createShippingMethodSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['fixed', 'city_based', 'free_above', 'local_pickup', 'local_delivery']),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
  estimatedDeliveryDays: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

export const createShippingZoneSchema = z.object({
  name: z.string().min(1).max(100),
  cities: z.array(z.string()).min(1),
  isActive: z.boolean().default(true),
});

export const createShippingRateSchema = z.object({
  shippingMethodId: z.coerce.number(),
  shippingZoneId: z.coerce.number(),
  baseRate: z.coerce.number().nonnegative(),
  perKgRate: z.coerce.number().nonnegative().default(0),
  freeAboveAmount: z.coerce.number().positive().optional(),
  estimatedDaysMin: z.coerce.number().int().positive().optional(),
  estimatedDaysMax: z.coerce.number().int().positive().optional(),
});
