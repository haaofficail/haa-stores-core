// Store billing configuration.
//
// Each store has exactly one row in `storeBillingSettings` that owns its
// platform-fee policy and audit fields. The policy is read at order creation
// time, snapshotted into the `platform_fee` wallet entry, and is the only
// authoritative source for new order fee calculation.
//
// Changing a setting does NOT recalculate historical order fees — those
// remain locked to the snapshot stored on each `platform_fee` wallet entry.

import { pgTable, serial, integer, varchar, numeric, boolean, timestamp, text, unique } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';
import { users } from './users.js';

export const storeBillingSettings = pgTable('store_billing_settings', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),

  // Platform fee policy (snapshot at order time)
  platformFeeMode: varchar('platform_fee_mode', { length: 30 }).notNull().default('percentage'),
  // 'none' | 'percentage' | 'fixed' | 'percentage_plus_fixed'

  platformFeePct: numeric('platform_fee_pct', { precision: 8, scale: 6 }),
  // decimal 0..1 (e.g. 0.02 = 2%)

  platformFeeFixed: numeric('platform_fee_fixed', { precision: 12, scale: 2 }),
  // absolute amount in store currency (e.g. 1.50)

  isPlatformFeeEnabled: boolean('is_platform_fee_enabled').notNull().default(true),

  // COD (Cash on Delivery) fee policy (snapshot at order collection time)
  // — TASK-0032 (Phase 9 of the Financial Wallet Accuracy remediation).
  // Decoupled from platform-fee: a merchant may set a 1% platform fee on
  // cards and a 3% COD fee, because COD carries different cost (cash
  // handling, manual reconciliation, return risk).
  codFeeMode: varchar('cod_fee_mode', { length: 30 }).notNull().default('percentage'),
  // 'none' | 'percentage' | 'fixed' | 'percentage_plus_fixed'

  codFeePct: numeric('cod_fee_pct', { precision: 8, scale: 6 }),
  // decimal 0..1 (e.g. 0.02 = 2%)

  codFeeFixed: numeric('cod_fee_fixed', { precision: 12, scale: 2 }),
  // absolute amount in store currency (e.g. 1.50)

  isCodFeeEnabled: boolean('is_cod_fee_enabled').notNull().default(true),

  effectiveFrom: timestamp('effective_from'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),

  updatedBy: integer('updated_by').references(() => users.id),
  changeReason: text('change_reason'),
}, (table) => ({
  uniqueStore: unique().on(table.storeId),
}));
