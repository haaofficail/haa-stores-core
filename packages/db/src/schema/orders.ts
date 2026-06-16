import { pgTable, serial, varchar, integer, timestamp, boolean, decimal, jsonb, text, uuid, unique, index } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';
import { customers } from './customers.js';
import { products, productVariants } from './products.js';
import { checkoutSessions } from './checkout.js';

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  customerId: integer('customer_id').references(() => customers.id),
  orderNumber: varchar('order_number', { length: 50 }).notNull(),
  checkoutSessionId: uuid('checkout_session_id').references(() => checkoutSessions.id),
  idempotencyKey: uuid('idempotency_key').unique(),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  paymentStatus: varchar('payment_status', { length: 30 }).notNull().default('unpaid'),
  fulfillmentStatus: varchar('fulfillment_status', { length: 30 }).notNull().default('unfulfilled'),
  customerName: varchar('customer_name', { length: 100 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 20 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }),
  shippingAddress: jsonb('shipping_address'),
  billingAddress: jsonb('billing_address'),
  shippingMethodId: integer('shipping_method_id'),
  shippingCost: decimal('shipping_cost', { precision: 12, scale: 2 }),
  couponCode: varchar('coupon_code', { length: 50 }),
  couponDiscount: decimal('coupon_discount', { precision: 12, scale: 2 }),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).default('0'),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }),
  paymentMethod: varchar('payment_method', { length: 50 }),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  fulfillmentType: varchar('fulfillment_type', { length: 20 }).default('shipping'),
  pickupLocationId: integer('pickup_location_id'),
  giftOptions: jsonb('gift_options').$type<{
    sendAsGift?: boolean;
    message?: string;
  }>(),
  cancelledAt: timestamp('cancelled_at'),
  cancelledReason: text('cancelled_reason'),
  source: varchar('source', { length: 30 }).notNull().default('storefront'),
  externalId: varchar('external_id', { length: 255 }),
  platformCommission: decimal('platform_commission', { precision: 12, scale: 2 }),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueStoreOrderNumber: unique().on(table.storeId, table.orderNumber),
  storeCreatedAtIdx: index('orders_store_created_at_idx').on(table.storeId, table.createdAt),
  storeStatusCreatedAtIdx: index('orders_store_status_created_at_idx').on(table.storeId, table.status, table.createdAt),
  storePaymentCreatedAtIdx: index('orders_store_payment_created_at_idx').on(table.storeId, table.paymentStatus, table.createdAt),
  storeFulfillmentCreatedAtIdx: index('orders_store_fulfillment_created_at_idx').on(table.storeId, table.fulfillmentStatus, table.createdAt),
  customerCreatedAtIdx: index('orders_customer_created_at_idx').on(table.customerId, table.createdAt),
  storeExternalIdx: index('orders_store_external_idx').on(table.storeId, table.externalId),
}));

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id),
  productId: integer('product_id').notNull().references(() => products.id),
  variantId: integer('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 12, scale: 2 }).notNull(),
  notes: text('notes'),
  giftWrapSelected: boolean('gift_wrap_selected').default(false),
  giftWrapPrice: decimal('gift_wrap_price', { precision: 12, scale: 2 }),
  sendAsGift: boolean('send_as_gift').default(false),
  giftMessage: text('gift_message'),
  source: varchar('source', { length: 30 }).notNull().default('storefront'),
  platformCommissionRate: decimal('platform_commission_rate', { precision: 5, scale: 4 }),
  platformCommission: decimal('platform_commission', { precision: 12, scale: 2 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  orderIdx: index('order_items_order_idx').on(table.orderId),
  productIdx: index('order_items_product_idx').on(table.productId),
}));

export const orderStatusHistory = pgTable('order_status_history', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id),
  fromStatus: varchar('from_status', { length: 30 }),
  toStatus: varchar('to_status', { length: 30 }).notNull(),
  changedByUserId: integer('changed_by_user_id'),
  reason: text('reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  orderCreatedAtIdx: index('order_status_history_order_created_at_idx').on(table.orderId, table.createdAt),
}));
