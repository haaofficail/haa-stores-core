import { pgTable, serial, varchar, integer, timestamp, jsonb, text } from 'drizzle-orm/pg-core';

export const merchantAcknowledgements = pgTable('merchant_acknowledgements', {
  id: serial('id').primaryKey(),
  merchantUserId: integer('merchant_user_id').notNull(),
  storeId: integer('store_id').notNull(),
  termsVersion: varchar('terms_version', { length: 20 }).notNull(),
  privacyVersion: varchar('privacy_version', { length: 20 }).notNull(),
  dataProcessingVersion: varchar('data_processing_version', { length: 20 }).notNull(),
  prohibitedProductsVersion: varchar('prohibited_products_version', { length: 20 }).notNull(),
  takedownPolicyVersion: varchar('takedown_policy_version', { length: 20 }).notNull(),
  acknowledgedItems: jsonb('acknowledged_items').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  acceptedAt: timestamp('accepted_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
