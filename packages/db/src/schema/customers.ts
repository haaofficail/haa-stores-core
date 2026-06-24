import { pgTable, serial, varchar, integer, timestamp, boolean, text, decimal, unique, index } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),
  notes: text('notes'),
  totalOrders: integer('total_orders').notNull().default(0),
  // موافقة تسويق واتساب (PDPL + سياسة WhatsApp) — افتراضي false: لا تسويق بلا موافقة صريحة (QA WA1/WA3)
  whatsappMarketingConsent: boolean('whatsapp_marketing_consent').notNull().default(false),
  whatsappConsentAt: timestamp('whatsapp_consent_at'),
  whatsappOptOut: boolean('whatsapp_opt_out').notNull().default(false),
  // PDPL Article 18 — Right to Withdraw Consent. NULL = subscribed.
  // Set by the public unsubscribe endpoint. Marketing + cart-recovery
  // emails MUST check this column before sending. Transactional emails
  // the customer triggered (order confirmation, password reset) are
  // NOT gated by this flag — they're consent-implicit.
  emailOptOutAt: timestamp('email_opt_out_at'),
  emailOptOutSource: varchar('email_opt_out_source', { length: 20 }),
  totalSpent: decimal('total_spent', { precision: 14, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueStorePhone: unique().on(table.storeId, table.phone),
  storeCreatedAtIdx: index('customers_store_created_at_idx').on(table.storeId, table.createdAt),
  storeEmailIdx: index('customers_store_email_idx').on(table.storeId, table.email),
}));

export const customerAddresses = pgTable('customer_addresses', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  label: varchar('label', { length: 50 }).default('Home'),
  street: varchar('street', { length: 255 }).notNull(),
  district: varchar('district', { length: 100 }),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 100 }).notNull().default('Saudi Arabia'),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  customerIdx: index('customer_addresses_customer_idx').on(table.customerId),
}));
