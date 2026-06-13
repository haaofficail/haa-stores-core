import { pgTable, serial, varchar, integer, timestamp, decimal, jsonb, uuid, text } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';
import { orders } from './orders.js';

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  orderId: integer('order_id').notNull().references(() => orders.id),
  provider: varchar('provider', { length: 50 }).notNull().default('fake'),
  providerPaymentId: varchar('provider_payment_id', { length: 255 }),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('SAR'),
  status: varchar('status', { length: 30 }).notNull().default('pending'),
  idempotencyKey: uuid('idempotency_key').unique(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const paymentAttempts = pgTable('payment_attempts', {
  id: serial('id').primaryKey(),
  paymentId: integer('payment_id').notNull().references(() => payments.id),
  method: varchar('method', { length: 50 }).notNull(),
  status: varchar('status', { length: 30 }).notNull(),
  responseCode: varchar('response_code', { length: 50 }),
  responseMessage: text('response_message'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const paymentTransactions = pgTable('payment_transactions', {
  id: serial('id').primaryKey(),
  paymentId: integer('payment_id').notNull().references(() => payments.id),
  type: varchar('type', { length: 30 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  status: varchar('status', { length: 30 }).notNull(),
  providerReference: varchar('provider_reference', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const paymentWebhookEvents = pgTable('payment_webhook_events', {
  id: serial('id').primaryKey(),
  paymentId: integer('payment_id').references(() => payments.id),
  provider: varchar('provider', { length: 50 }).notNull(),
  eventType: varchar('event_type', { length: 100 }),
  rawBody: text('raw_body'),
  idempotencyKey: varchar('idempotency_key', { length: 255 }).unique(),
  status: varchar('status', { length: 20 }).notNull().default('received'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
