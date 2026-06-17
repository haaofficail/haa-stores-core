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
  haaMarketplaceEnabled: boolean('haa_marketplace_enabled').notNull().default(false),
  haaMarketplaceCommissionRate: decimal('haa_marketplace_commission_rate', { precision: 5, scale: 4 }).notNull().default('0.0500'),
  haaMarketplaceReviewStatus: varchar('haa_marketplace_review_status', { length: 30 }).notNull().default('pending'),
  haaMarketplaceReviewNote: text('haa_marketplace_review_note'),
  haaMarketplaceReviewedAt: timestamp('haa_marketplace_reviewed_at'),
  haaMarketplaceReviewedBy: integer('haa_marketplace_reviewed_by'),
  haaMarketplaceFeatured: boolean('haa_marketplace_featured').notNull().default(false),
  haaMarketplaceFeaturedUntil: timestamp('haa_marketplace_featured_until'),
  haaMarketplaceFeaturedSortOrder: integer('haa_marketplace_featured_sort_order').notNull().default(0),
  // TASK-0041 Phase 2 — Track 2.2 — P0-1 SFDA workflow.
  // Saudi Food & Drug Authority compliance for regulated product
  // categories (food, drug, medical_device, cosmetic, supplement).
  // Format validation only (regex). Live SFDA API integration deferred
  // to Phase 7+ (post-MVP, requires Saudi CR + government credentials).
  // See migration 0060_product_sfda.sql for full contract.
  requiresSfdaNumber: boolean('requires_sfda_number').notNull().default(false),
  sfdaNumber: varchar('sfda_number', { length: 100 }),
  sfdaLicenseType: varchar('sfda_license_type', { length: 30 }),
  sfdaExpiryDate: timestamp('sfda_expiry_date'),
  sfdaVerifiedAt: timestamp('sfda_verified_at'),
  sfdaVerifiedBy: integer('sfda_verified_by'),
  brandId: integer('brand_id').references(() => brands.id, { onDelete: 'set null' }),
  marketplaceChannels: jsonb('marketplace_channels').$type<Record<string, { productId: string; url?: string; price?: string; status?: string }>>(),
  rating: integer('rating'),
  reviewCount: integer('review_count').notNull().default(0),
  salesCount: integer('sales_count').notNull().default(0),
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
  haaMarketplaceIdx: index('products_haa_marketplace_idx').on(table.haaMarketplaceEnabled, table.haaMarketplaceReviewStatus, table.status, table.createdAt),
  // SFDA verification lookup index (TASK-0041 Track 2.2).
  sfdaVerificationIdx: index('products_sfda_verification_idx').on(table.requiresSfdaNumber, table.sfdaVerifiedAt),
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
