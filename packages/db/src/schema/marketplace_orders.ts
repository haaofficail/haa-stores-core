import { pgTable, serial, varchar, integer, timestamp, decimal, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { orders } from './orders.js';

export const marketplaceOrders = pgTable('marketplace_orders', {
  id: serial('id').primaryKey(),
  marketplaceOrderNumber: varchar('marketplace_order_number', { length: 50 }).notNull().unique(),
  status: varchar('status', { length: 30 }).notNull().default('created'),
  paymentStatus: varchar('payment_status', { length: 30 }).notNull().default('unpaid'),
  fulfillmentStatus: varchar('fulfillment_status', { length: 30 }).notNull().default('unfulfilled'),
  customerName: varchar('customer_name', { length: 100 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 20 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }),
  shippingAddress: jsonb('shipping_address'),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  shippingTotal: decimal('shipping_total', { precision: 12, scale: 2 }).notNull().default('0'),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
  platformCommission: decimal('platform_commission', { precision: 12, scale: 2 }).notNull().default('0'),
  paymentMethod: varchar('payment_method', { length: 50 }),
  notes: varchar('notes', { length: 1000 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  createdAtIdx: index('marketplace_orders_created_at_idx').on(table.createdAt),
  customerPhoneIdx: index('marketplace_orders_customer_phone_idx').on(table.customerPhone),
}));

export const marketplaceOrderLinks = pgTable('marketplace_order_links', {
  id: serial('id').primaryKey(),
  marketplaceOrderId: integer('marketplace_order_id').notNull().references(() => marketplaceOrders.id),
  orderId: integer('order_id').notNull().references(() => orders.id),
  storeId: integer('store_id').notNull(),
  storeName: varchar('store_name', { length: 255 }).notNull(),
  storeSlug: varchar('store_slug', { length: 255 }).notNull(),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  shippingCost: decimal('shipping_cost', { precision: 12, scale: 2 }).notNull().default('0'),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
  platformCommission: decimal('platform_commission', { precision: 12, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  marketplaceOrderIdx: index('marketplace_order_links_marketplace_order_idx').on(table.marketplaceOrderId),
  orderIdx: unique().on(table.orderId),
  storeIdx: index('marketplace_order_links_store_idx').on(table.storeId),
}));
