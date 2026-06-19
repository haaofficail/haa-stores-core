import { pgTable, serial, integer, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';

export const storePixels = pgTable('store_pixels', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }).unique(),
  metaPixelId: varchar('meta_pixel_id', { length: 50 }),
  metaAccessToken: text('meta_access_token'),
  tiktokPixelId: varchar('tiktok_pixel_id', { length: 50 }),
  snapchatPixelId: varchar('snapchat_pixel_id', { length: 50 }),
  twitterPixelId: varchar('twitter_pixel_id', { length: 50 }),
  ga4MeasurementId: varchar('ga4_measurement_id', { length: 50 }),
  gtmContainerId: varchar('gtm_container_id', { length: 50 }),
  pinterestTagId: varchar('pinterest_tag_id', { length: 50 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
