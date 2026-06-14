import { pgTable, serial, integer, varchar, text, timestamp, jsonb, unique, index, boolean } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';

export const marketingActionSettings = pgTable('marketing_action_settings', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  key: varchar('key', { length: 100 }).notNull(),
  valueJson: jsonb('value_json').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  storeKeyUnique: unique('marketing_action_settings_store_key_unique').on(table.storeId, table.key),
  storeIdx: index('marketing_action_settings_store_idx').on(table.storeId),
}));

export const marketingActionStates = pgTable('marketing_action_states', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  actionFingerprint: varchar('action_fingerprint', { length: 255 }).notNull(),
  actionType: varchar('action_type', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  snoozedUntil: timestamp('snoozed_until'),
  dismissedAt: timestamp('dismissed_at'),
  doneAt: timestamp('done_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  storeFingerprintUnique: unique('marketing_action_states_store_fingerprint_unique').on(table.storeId, table.actionFingerprint),
  storeStatusIdx: index('marketing_action_states_store_status_idx').on(table.storeId, table.status),
  storeTypeIdx: index('marketing_action_states_store_type_idx').on(table.storeId, table.actionType),
}));

export type MarketingActionSetting = typeof marketingActionSettings.$inferSelect;
export type MarketingActionState = typeof marketingActionStates.$inferSelect;
export type NewMarketingActionSetting = typeof marketingActionSettings.$inferInsert;
export type NewMarketingActionState = typeof marketingActionStates.$inferInsert;