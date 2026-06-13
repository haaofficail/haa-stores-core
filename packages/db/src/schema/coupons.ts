import { pgTable, serial, varchar, integer, timestamp, boolean, decimal, text, unique } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';

export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 20 }).notNull().default('fixed'),
  value: decimal('value', { precision: 12, scale: 2 }).notNull(),
  maxDiscountAmount: decimal('max_discount_amount', { precision: 12, scale: 2 }),
  minOrderAmount: decimal('min_order_amount', { precision: 12, scale: 2 }),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').notNull().default(0),
  startsAt: timestamp('starts_at'),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueStoreCode: unique().on(table.storeId, table.code),
}));
