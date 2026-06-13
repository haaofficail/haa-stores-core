import { pgTable, serial, varchar, integer, timestamp, boolean, text, jsonb, index } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';

export const notificationTemplates = pgTable('notification_templates', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  channel: varchar('channel', { length: 20 }).notNull().default('email'),
  subjectTemplate: varchar('subject_template', { length: 500 }),
  bodyTemplate: text('body_template'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const notificationLogs = pgTable('notification_logs', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').references(() => stores.id),
  channel: varchar('channel', { length: 20 }).notNull(),
  recipient: varchar('recipient', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }),
  body: text('body'),
  status: varchar('status', { length: 20 }).notNull().default('sent'),
  templateCode: varchar('template_code', { length: 50 }),
  metadata: jsonb('metadata'),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at').notNull().defaultNow(),
}, (table) => ({
  storeSentAtIdx: index('notification_logs_store_sent_at_idx').on(table.storeId, table.sentAt),
  storeStatusSentAtIdx: index('notification_logs_store_status_sent_at_idx').on(table.storeId, table.status, table.sentAt),
}));

export const notificationPreferences = pgTable('notification_preferences', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id).unique(),
  emailEnabled: boolean('email_enabled').notNull().default(true),
  emailAddress: varchar('email_address', { length: 255 }),
  smsEnabled: boolean('sms_enabled').notNull().default(false),
  smsPhone: varchar('sms_phone', { length: 20 }),
  whatsappEnabled: boolean('whatsapp_enabled').notNull().default(false),
  whatsappPhone: varchar('whatsapp_phone', { length: 20 }),
  orderCreated: boolean('order_created').notNull().default(true),
  paymentSuccess: boolean('payment_success').notNull().default(true),
  paymentFailed: boolean('payment_failed').notNull().default(true),
  shippingUpdate: boolean('shipping_update').notNull().default(true),
  lowStock: boolean('low_stock').notNull().default(true),
  abandonedCart: boolean('abandoned_cart').notNull().default(false),
  orderReadyForPickup: boolean('order_ready_for_pickup').notNull().default(true),
  orderPickedUp: boolean('order_picked_up').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
