import { pgTable, serial, integer, varchar, boolean, decimal, timestamp, text, unique } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';

export const merchantPaymentProviderSettings = pgTable('merchant_payment_provider_settings', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  providerCode: varchar('provider_code', { length: 20 }).notNull(),
  enabled: boolean('enabled').notNull().default(false),
  mode: varchar('mode', { length: 10 }).notNull().default('test'),
  country: varchar('country', { length: 3 }).notNull().default('SA'),
  currency: varchar('currency', { length: 3 }).notNull().default('SAR'),
  displayNameAr: varchar('display_name_ar', { length: 100 }),
  displayNameEn: varchar('display_name_en', { length: 100 }),
  sortOrder: integer('sort_order').notNull().default(0),
  minOrderAmount: decimal('min_order_amount', { precision: 12, scale: 2 }),
  maxOrderAmount: decimal('max_order_amount', { precision: 12, scale: 2 }),
  supportedPaymentMethod: varchar('supported_payment_method', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('not_configured'),
  lastValidatedAt: timestamp('last_validated_at'),
  lastValidationError: text('last_validation_error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueStoreProvider: unique('uq_payment_settings_store_provider').on(table.storeId, table.providerCode),
}));

export const merchantPaymentProviderCredentials = pgTable('merchant_payment_provider_credentials', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  providerCode: varchar('provider_code', { length: 20 }).notNull(),
  encryptedPayload: text('encrypted_payload').notNull(),
  keyVersion: varchar('key_version', { length: 20 }).notNull().default('v1'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  rotatedAt: timestamp('rotated_at'),
}, (table) => ({
  uniqueStoreProviderCreds: unique('uq_payment_creds_store_provider').on(table.storeId, table.providerCode),
}));
