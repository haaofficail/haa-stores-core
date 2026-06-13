import { pgTable, serial, varchar, integer, timestamp, boolean, jsonb, text } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';

export const pickupLocations = pgTable('pickup_locations', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  nameAr: varchar('name_ar', { length: 255 }).notNull(),
  nameEn: varchar('name_en', { length: 255 }),
  address: text('address'),
  mapsUrl: varchar('maps_url', { length: 500 }),
  phone: varchar('phone', { length: 20 }),
  hours: jsonb('hours').$type<Record<string, string>>(),
  instructions: text('instructions'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
