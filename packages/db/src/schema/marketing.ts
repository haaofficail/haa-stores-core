import { pgTable, serial, varchar, integer, timestamp, decimal, text, uuid, jsonb, date, unique, index } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';
import { customers } from './customers.js';
import { products } from './products.js';
import { orders } from './orders.js';

export const marketingEvents = pgTable('marketing_events', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  customerId: integer('customer_id').references(() => customers.id),
  productId: integer('product_id').references(() => products.id),
  cartId: uuid('cart_id'),
  orderId: integer('order_id').references(() => orders.id),
  path: text('path'),
  referrer: text('referrer'),
  deviceType: varchar('device_type', { length: 50 }),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  utmSource: varchar('utm_source', { length: 255 }),
  utmMedium: varchar('utm_medium', { length: 255 }),
  utmCampaign: varchar('utm_campaign', { length: 255 }),
  utmContent: varchar('utm_content', { length: 255 }),
  utmTerm: varchar('utm_term', { length: 255 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  storeEventTypeIdx: index('marketing_events_store_event_type_idx').on(table.storeId, table.eventType, table.createdAt),
  storeSessionIdx: index('marketing_events_store_session_idx').on(table.storeId, table.sessionId),
  storeCreatedAtIdx: index('marketing_events_store_created_at_idx').on(table.storeId, table.createdAt),
  sessionIdx: index('marketing_events_session_idx').on(table.sessionId),
  customerIdx: index('marketing_events_customer_idx').on(table.customerId),
}));

export const marketingSessions = pgTable('marketing_sessions', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  customerId: integer('customer_id').references(() => customers.id),
  cartId: uuid('cart_id'),
  orderId: integer('order_id').references(() => orders.id),
  utmSource: varchar('utm_source', { length: 255 }),
  utmMedium: varchar('utm_medium', { length: 255 }),
  utmCampaign: varchar('utm_campaign', { length: 255 }),
  utmContent: varchar('utm_content', { length: 255 }),
  utmTerm: varchar('utm_term', { length: 255 }),
  landingPage: text('landing_page'),
  referrer: text('referrer'),
  firstEventAt: timestamp('first_event_at').notNull().defaultNow(),
  lastEventAt: timestamp('last_event_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  storeSessionUnique: unique('marketing_sessions_store_session_unique').on(table.storeId, table.sessionId),
  storeCustomerIdx: index('marketing_sessions_store_customer_idx').on(table.storeId, table.customerId),
  storeCartIdx: index('marketing_sessions_store_cart_idx').on(table.storeId, table.cartId),
  storeOrderIdx: index('marketing_sessions_store_order_idx').on(table.storeId, table.orderId),
}));

export const productPerformanceDaily = pgTable('product_performance_daily', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  productId: integer('product_id').notNull().references(() => products.id),
  date: date('date').notNull(),
  views: integer('views').notNull().default(0),
  addToCarts: integer('add_to_carts').notNull().default(0),
  purchases: integer('purchases').notNull().default(0),
  revenue: decimal('revenue', { precision: 12, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  storeProductDateUnique: unique('product_performance_daily_store_product_date_unique').on(table.storeId, table.productId, table.date),
  storeDateIdx: index('product_performance_daily_store_date_idx').on(table.storeId, table.date),
  productDateIdx: index('product_performance_daily_product_date_idx').on(table.productId, table.date),
}));
