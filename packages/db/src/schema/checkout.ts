import { pgTable, varchar, integer, timestamp, decimal, uuid, jsonb, text } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';
import { carts } from './cart.js';

export const checkoutSessions = pgTable('checkout_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  cartId: uuid('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  idempotencyKey: uuid('idempotency_key').notNull().unique(),
  status: varchar('status', { length: 30 }).notNull().default('pending'),
  customerName: varchar('customer_name', { length: 100 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 20 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }),
  shippingAddress: jsonb('shipping_address').$type<{
    street: string; district?: string; city: string; state?: string;
    postalCode?: string; country: string;
  }>(),
  billingAddress: jsonb('billing_address').$type<{
    street: string; district?: string; city: string; state?: string;
    postalCode?: string; country: string;
  }>(),
  shippingMethodId: integer('shipping_method_id'),
  shippingCost: decimal('shipping_cost', { precision: 12, scale: 2 }),
  couponCode: varchar('coupon_code', { length: 50 }),
  couponDiscount: decimal('coupon_discount', { precision: 12, scale: 2 }),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).default('0'),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }),
  paymentStatus: varchar('payment_status', { length: 20 }).default('unpaid'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  expiresAt: timestamp('expires_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
