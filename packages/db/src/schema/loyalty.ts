import { pgTable, serial, integer, varchar, boolean, timestamp, decimal, text, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';
import { customers } from './customers.js';

/**
 * نقاط الولاء (QA Loyalty) — إعدادات لكل متجر + حساب لكل عميل + ledger.
 * النقاط أعداد صحيحة. الحسابات النقدية للقيمة تُشتق عبر @haa/loyalty-core.
 */

export const loyaltySettings = pgTable('loyalty_settings', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }).unique(),
  enabled: boolean('enabled').notNull().default(false),
  earnRatePerCurrency: decimal('earn_rate_per_currency', { precision: 10, scale: 4 }).notNull().default('1'),
  redeemValuePerPoint: decimal('redeem_value_per_point', { precision: 10, scale: 4 }).notNull().default('0.01'),
  minRedeemPoints: integer('min_redeem_points').notNull().default(100),
  maxRedeemPercent: decimal('max_redeem_percent', { precision: 5, scale: 4 }).notNull().default('0.5'),
  pointsExpiryMonths: integer('points_expiry_months').notNull().default(12),
  earnOnTax: boolean('earn_on_tax').notNull().default(false),
  earnOnShipping: boolean('earn_on_shipping').notNull().default(false),
  minOrderForEarn: decimal('min_order_for_earn', { precision: 12, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const loyaltyAccounts = pgTable('loyalty_accounts', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  customerId: integer('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  lifetimeEarned: integer('lifetime_earned').notNull().default(0),
  lifetimeRedeemed: integer('lifetime_redeemed').notNull().default(0),
  lifetimeExpired: integer('lifetime_expired').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  storeCustomerUniq: uniqueIndex('loyalty_accounts_store_customer_uniq').on(t.storeId, t.customerId),
}));

export const loyaltyTransactions = pgTable('loyalty_transactions', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  accountId: integer('account_id').notNull().references(() => loyaltyAccounts.id, { onDelete: 'cascade' }),
  customerId: integer('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull().$type<'earn' | 'redeem' | 'expire' | 'adjust' | 'revoke'>(),
  direction: varchar('direction', { length: 10 }).notNull().$type<'credit' | 'debit'>(),
  points: integer('points').notNull(),
  balanceBefore: integer('balance_before').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  referenceType: varchar('reference_type', { length: 50 }),
  referenceId: integer('reference_id'),
  orderNumber: varchar('order_number', { length: 50 }),
  description: text('description'),
  /** للـ earn فقط: متى تنتهي هذه الدفعة (لحساب FIFO عند الانتهاء/الاستبدال) */
  expiresAt: timestamp('expires_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  accountCreatedIdx: index('loyalty_tx_account_created_idx').on(t.accountId, t.createdAt),
  storeCreatedIdx: index('loyalty_tx_store_created_idx').on(t.storeId, t.createdAt),
  referenceIdx: index('loyalty_tx_reference_idx').on(t.referenceType, t.referenceId),
}));
