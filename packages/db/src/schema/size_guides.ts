import { pgTable, serial, varchar, integer, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';

export type SizeGuideRow = Record<string, string>;

export const sizeGuides = pgTable('size_guides', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  name: varchar('name', { length: 120 }).notNull(),
  type: varchar('type', { length: 40 }).notNull().default('clothing'),
  unit: varchar('unit', { length: 10 }).notNull().default('cm'),
  rows: jsonb('rows').$type<SizeGuideRow[]>().notNull().default([]),
  categoryIds: jsonb('category_ids').$type<number[]>().notNull().default([]),
  productIds: jsonb('product_ids').$type<number[]>().notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  storeActiveIdx: index('size_guides_store_active_idx').on(table.storeId, table.isActive),
}));
