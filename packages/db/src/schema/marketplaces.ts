import { pgTable, serial, integer, varchar, boolean, timestamp, text, jsonb, decimal, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';
import { products } from './products.js';

export const marketplaceProviders = pgTable('marketplace_providers', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  logo: varchar('logo', { length: 255 }),
  authType: varchar('auth_type', { length: 20 }).notNull().default('oauth'),
  configSchema: jsonb('config_schema'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const marketplaceConnections = pgTable('marketplace_connections', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  providerId: integer('provider_id').notNull().references(() => marketplaceProviders.id),
  isConnected: boolean('is_connected').notNull().default(false),
  credentials: jsonb('credentials'),
  storeName: varchar('store_name', { length: 255 }),
  storeEmail: varchar('store_email', { length: 255 }),
  externalStoreId: varchar('external_store_id', { length: 100 }),
  status: varchar('status', { length: 20 }).notNull().default('disconnected'),
  lastSyncAt: timestamp('last_sync_at'),
  connectedAt: timestamp('connected_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  storeProviderIdx: uniqueIndex('store_provider_idx').on(table.storeId, table.providerId),
  statusLastSyncIdx: index('marketplace_connections_status_last_sync_idx').on(table.status, table.lastSyncAt),
}));

export const channelListings = pgTable('channel_listings', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  connectionId: integer('connection_id').notNull().references(() => marketplaceConnections.id),
  productId: integer('product_id').notNull().references(() => products.id),
  marketplaceProductId: varchar('marketplace_product_id', { length: 255 }),
  marketplaceSku: varchar('marketplace_sku', { length: 100 }),
  price: decimal('price', { precision: 14, scale: 2 }),
  salePrice: decimal('sale_price', { precision: 14, scale: 2 }),
  quantity: integer('quantity'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  marketplaceUrl: varchar('marketplace_url', { length: 500 }),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  storeStatusIdx: index('channel_listings_store_status_idx').on(table.storeId, table.status),
  connectionProductIdx: index('channel_listings_connection_product_idx').on(table.connectionId, table.productId),
  productIdx: index('channel_listings_product_idx').on(table.productId),
}));

export const channelOrders = pgTable('channel_orders', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  connectionId: integer('connection_id').notNull().references(() => marketplaceConnections.id),
  marketplaceOrderId: varchar('marketplace_order_id', { length: 255 }).notNull(),
  localOrderId: integer('local_order_id'),
  orderData: jsonb('order_data'),
  status: varchar('status', { length: 50 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 14, scale: 2 }),
  currency: varchar('currency', { length: 10 }).default('SAR'),
  customerName: varchar('customer_name', { length: 255 }),
  orderedAt: timestamp('ordered_at'),
  importedAt: timestamp('imported_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  storeCreatedAtIdx: index('channel_orders_store_created_at_idx').on(table.storeId, table.createdAt),
  connectionMarketplaceOrderIdx: index('channel_orders_connection_marketplace_order_idx').on(table.connectionId, table.marketplaceOrderId),
  localOrderIdx: index('channel_orders_local_order_idx').on(table.localOrderId),
}));

export const syncLogs = pgTable('sync_logs', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  connectionId: integer('connection_id').notNull().references(() => marketplaceConnections.id),
  syncType: varchar('sync_type', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('running'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  itemsSynced: integer('items_synced').default(0),
  itemsFailed: integer('items_failed').default(0),
  errorMessage: text('error_message'),
  details: jsonb('details'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  storeCreatedAtIdx: index('sync_logs_store_created_at_idx').on(table.storeId, table.createdAt),
  connectionStartedAtIdx: index('sync_logs_connection_started_at_idx').on(table.connectionId, table.startedAt),
  statusStartedAtIdx: index('sync_logs_status_started_at_idx').on(table.status, table.startedAt),
}));
