import { pgTable, serial, integer, varchar, text, boolean, decimal, uuid, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';
import { products } from './products.js';

export const livePresence = pgTable('live_presence', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  currentPath: text('current_path'),
  currentPageType: varchar('current_page_type', { length: 50 }),
  currentProductId: integer('current_product_id').references(() => products.id, { onDelete: 'set null' }),
  currentCartId: uuid('current_cart_id'),
  currentCartValue: decimal('current_cart_value', { precision: 12, scale: 2 }),
  isInCheckout: boolean('is_in_checkout').notNull().default(false),
  deviceType: varchar('device_type', { length: 20 }),
  os: varchar('os', { length: 20 }),
  browser: varchar('browser', { length: 30 }),
  screenSize: varchar('screen_size', { length: 10 }),
  utmSource: varchar('utm_source', { length: 255 }),
  utmMedium: varchar('utm_medium', { length: 255 }),
  utmCampaign: varchar('utm_campaign', { length: 255 }),
  referrer: text('referrer'),
  countryCode: varchar('country_code', { length: 2 }),
  countryName: varchar('country_name', { length: 100 }),
  regionName: varchar('region_name', { length: 100 }),
  cityName: varchar('city_name', { length: 100 }),
  geoAccuracy: varchar('geo_accuracy', { length: 20 }),
  lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  storeSessionUnique: unique('live_presence_store_session_unique').on(table.storeId, table.sessionId),
  storeLastSeenIdx: index('live_presence_store_last_seen_idx').on(table.storeId, table.lastSeenAt),
  storePageTypeIdx: index('live_presence_store_page_type_idx').on(table.storeId, table.currentPageType),
  storeCountryIdx: index('live_presence_store_country_idx').on(table.storeId, table.countryCode),
}));
