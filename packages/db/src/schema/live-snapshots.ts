import { pgTable, serial, integer, decimal, timestamp, jsonb, unique, index } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';

export const liveRadarSnapshots = pgTable('live_radar_snapshots', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  onlineVisitors: integer('online_visitors').notNull().default(0),
  activeProductViewers: integer('active_product_viewers').notNull().default(0),
  activeCarts: integer('active_carts').notNull().default(0),
  activeCheckouts: integer('active_checkouts').notNull().default(0),
  currentCartValueTotal: decimal('current_cart_value_total', { precision: 12, scale: 2 }).notNull().default('0'),
  ordersLast30Min: integer('orders_last_30_min').notNull().default(0),
  paidOrdersLast30Min: integer('paid_orders_last_30_min').notNull().default(0),
  revenueLast30Min: decimal('revenue_last_30_min', { precision: 12, scale: 2 }).notNull().default('0'),
  paymentFailuresLast30Min: integer('payment_failures_last_30_min').notNull().default(0),
  topPages: jsonb('top_pages').$type<{ path: string; pageType: string; visitorCount: number }[]>(),
  topProducts: jsonb('top_products').$type<{ productId: number; productName: string; viewers: number }[]>(),
  topSources: jsonb('top_sources').$type<{ label: string; count: number }[]>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  storeCreatedAtUnique: unique('live_radar_snapshots_store_created_at_unique').on(table.storeId, table.createdAt),
  storeCreatedAtIdx: index('live_radar_snapshots_store_created_at_idx').on(table.storeId, table.createdAt),
}));