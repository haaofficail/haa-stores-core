import { pgTable, serial, varchar, integer, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';
import { products } from './products.js';

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 50 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  color: varchar('color', { length: 7 }).notNull().default('#6366f1'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueSlugPerStore: unique().on(table.storeId, table.slug),
  storeSortIdx: index('tags_store_sort_idx').on(table.storeId, table.sortOrder),
}));

export const productTags = pgTable('product_tags', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  productIdx: index('product_tags_product_idx').on(table.productId),
  tagIdx: index('product_tags_tag_idx').on(table.tagId),
}));
