import { pgTable, serial, integer, varchar, text, timestamp, jsonb, boolean, index, unique } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';

export const marketingActionSettings = pgTable('marketing_action_settings', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  key: varchar('key', { length: 100 }).notNull(),
  valueJson: jsonb('value_json').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  storeKeyUnique: unique('marketing_action_settings_store_key_unique').on(table.storeId, table.key),
  storeIdIdx: index('marketing_action_settings_store_id_idx').on(table.storeId),
}));

export const marketingActionStates = pgTable('marketing_action_states', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
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
  storeIdIdx: index('marketing_action_states_store_id_idx').on(table.storeId),
  statusIdx: index('marketing_action_states_status_idx').on(table.status),
  fingerprintIdx: index('marketing_action_states_fingerprint_idx').on(table.actionFingerprint),
}));

export const marketingActionLogs = pgTable('marketing_action_logs', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  actionId: integer('action_id').references(() => marketingActionStates.id, { onDelete: 'set null' }),
  actionFingerprint: varchar('action_fingerprint', { length: 255 }).notNull(),
  actionType: varchar('action_type', { length: 100 }).notNull(),
  event: varchar('event', { length: 50 }).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  storeIdIdx: index('marketing_action_logs_store_id_idx').on(table.storeId),
  actionIdIdx: index('marketing_action_logs_action_id_idx').on(table.actionId),
  fingerprintIdx: index('marketing_action_logs_fingerprint_idx').on(table.actionFingerprint),
  createdAtIdx: index('marketing_action_logs_created_at_idx').on(table.createdAt),
}));