import { pgTable, serial, varchar, integer, timestamp, boolean, decimal, uuid, index } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';
import { products, productVariants } from './products.js';
import { customers } from './customers.js';

export const carts = pgTable('carts', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  customerId: integer('customer_id').references(() => customers.id),
  sessionToken: varchar('session_token', { length: 255 }),
  isAbandoned: boolean('is_abandoned').notNull().default(false),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  storeSessionIdx: index('carts_store_session_idx').on(table.storeId, table.sessionToken),
  storeCustomerIdx: index('carts_store_customer_idx').on(table.storeId, table.customerId),
  abandonedUpdatedAtIdx: index('carts_abandoned_updated_at_idx').on(table.isAbandoned, table.updatedAt),
  expiresAtIdx: index('carts_expires_at_idx').on(table.expiresAt),
}));

export const cartItems = pgTable('cart_items', {
  id: serial('id').primaryKey(),
  cartId: uuid('cart_id').notNull().references(() => carts.id),
  productId: integer('product_id').notNull().references(() => products.id),
  variantId: integer('variant_id').references(() => productVariants.id),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 12, scale: 2 }).notNull(),
  notes: varchar('notes', { length: 500 }),
  giftWrapSelected: boolean('gift_wrap_selected').notNull().default(false),
  giftWrapPrice: decimal('gift_wrap_price', { precision: 12, scale: 2 }),
  sendAsGift: boolean('send_as_gift').notNull().default(false),
  giftMessage: varchar('gift_message', { length: 1000 }),
  source: varchar('source', { length: 30 }).notNull().default('storefront'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  cartIdx: index('cart_items_cart_idx').on(table.cartId),
  productIdx: index('cart_items_product_idx').on(table.productId),
}));
