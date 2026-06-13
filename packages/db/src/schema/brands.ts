import { pgTable, serial, varchar, integer, timestamp, boolean, text, unique, index } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';

export const brands = pgTable('brands', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  logo: varchar('logo', { length: 500 }),
  description: text('description'),
  website: varchar('website', { length: 500 }),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueSlugPerStore: unique().on(table.storeId, table.slug),
  storeActiveSortIdx: index('brands_store_active_sort_idx').on(table.storeId, table.isActive, table.sortOrder),
}));
