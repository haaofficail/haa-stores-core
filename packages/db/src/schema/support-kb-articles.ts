import { pgTable, serial, varchar, integer, timestamp, boolean, text, index } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';

export const knowledgeBaseArticles = pgTable('knowledge_base_articles', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  title: varchar('title', { length: 500 }).notNull(),
  slug: varchar('slug', { length: 500 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 100 }),
  isPublished: boolean('is_published').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  storePublishedIdx: index('kb_articles_store_published_idx').on(table.storeId, table.isPublished),
  storeCategoryIdx: index('kb_articles_store_category_idx').on(table.storeId, table.category),
  storeSlugIdx: index('kb_articles_store_slug_idx').on(table.storeId, table.slug),
}));
