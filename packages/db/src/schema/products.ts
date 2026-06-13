import { pgTable, serial, varchar, integer, timestamp, boolean, text, decimal, jsonb, unique, index } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';
import { brands } from './brands.js';

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  type: varchar('type', { length: 20 }).notNull().default('physical'),
  price: decimal('price', { precision: 12, scale: 2 }).notNull(),
  compareAtPrice: decimal('compare_at_price', { precision: 12, scale: 2 }),
  cost: decimal('cost', { precision: 12, scale: 2 }),
  sku: varchar('sku', { length: 100 }),
  barcode: varchar('barcode', { length: 100 }),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  trackInventory: boolean('track_inventory').notNull().default(true),
  weightGrams: integer('weight_grams'),
  lengthCm: decimal('length_cm', { precision: 8, scale: 2 }),
  widthCm: decimal('width_cm', { precision: 8, scale: 2 }),
  heightCm: decimal('height_cm', { precision: 8, scale: 2 }),
  requiresShipping: boolean('requires_shipping').notNull().default(true),
  isFragile: boolean('is_fragile').notNull().default(false),
  giftWrapAvailable: boolean('gift_wrap_available').notNull().default(false),
  giftWrapPriceOverride: decimal('gift_wrap_price_override', { precision: 12, scale: 2 }),
  brandId: integer('brand_id').references(() => brands.id, { onDelete: 'set null' }),
  marketplaceChannels: jsonb('marketplace_channels').$type<Record<string, { productId: string; url?: string; price?: string; status?: string }>>(),
  seoTitle: varchar('seo_title', { length: 60 }),
  seoDescription: varchar('seo_description', { length: 160 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueStoreSlug: unique().on(table.storeId, table.slug),
  uniqueStoreSku: unique().on(table.storeId, table.sku),
  storeStatusCreatedAtIdx: index('products_store_status_created_at_idx').on(table.storeId, table.status, table.createdAt),
  storeBrandIdx: index('products_store_brand_idx').on(table.storeId, table.brandId),
  storeUpdatedAtIdx: index('products_store_updated_at_idx').on(table.storeId, table.updatedAt),
}));

export const productImages = pgTable('product_images', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  url: varchar('url', { length: 500 }).notNull(),
  key: varchar('key', { length: 500 }),
  thumbUrl: varchar('thumb_url', { length: 500 }),
  thumbKey: varchar('thumb_key', { length: 500 }),
  sizeBytes: integer('size_bytes'),
  alt: varchar('alt', { length: 255 }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  productSortIdx: index('product_images_product_sort_idx').on(table.productId, table.sortOrder),
}));

export const productVariants = pgTable('product_variants', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }),
  price: decimal('price', { precision: 12, scale: 2 }),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  options: jsonb('options').$type<Record<string, string>>().notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  productSortIdx: index('product_variants_product_sort_idx').on(table.productId, table.sortOrder),
}));

export const productOptions = pgTable('product_options', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  name: varchar('name', { length: 100 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  productSortIdx: index('product_options_product_sort_idx').on(table.productId, table.sortOrder),
}));

export const productOptionValues = pgTable('product_option_values', {
  id: serial('id').primaryKey(),
  productOptionId: integer('product_option_id').notNull().references(() => productOptions.id),
  value: varchar('value', { length: 100 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  optionSortIdx: index('product_option_values_option_sort_idx').on(table.productOptionId, table.sortOrder),
}));
