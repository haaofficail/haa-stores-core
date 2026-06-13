import { pgTable, serial, varchar, integer, timestamp, boolean, text, unique, AnyPgColumn, index } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';
import { products } from './products.js';

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  parentId: integer('parent_id').references((): AnyPgColumn => categories.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 500 }),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  showInHome: boolean('show_in_home').notNull().default(false),
  showInMenu: boolean('show_in_menu').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueSlugPerStore: unique().on(table.storeId, table.slug),
  storeActiveSortIdx: index('categories_store_active_sort_idx').on(table.storeId, table.isActive, table.sortOrder),
  storeParentIdx: index('categories_store_parent_idx').on(table.storeId, table.parentId),
}));

export const productCategories = pgTable('product_categories', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  productIdx: index('product_categories_product_idx').on(table.productId),
  categoryIdx: index('product_categories_category_idx').on(table.categoryId),
}));
