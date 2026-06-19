import { pgTable, serial, varchar, integer, timestamp, jsonb, text, boolean, index } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';

export const webhookEvents = pgTable('webhook_events', {
  id: serial('id').primaryKey(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  storeId: integer('store_id').references(() => stores.id),
  tenantId: integer('tenant_id'),
  payload: jsonb('payload').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  lastError: text('last_error'),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  statusCreatedAtIdx: index('webhook_events_status_created_at_idx').on(table.status, table.createdAt),
  storeCreatedAtIdx: index('webhook_events_store_created_at_idx').on(table.storeId, table.createdAt),
  eventTypeCreatedAtIdx: index('webhook_events_type_created_at_idx').on(table.eventType, table.createdAt),
}));

export const webhookEndpoints = pgTable('webhook_endpoints', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  url: varchar('url', { length: 500 }).notNull(),
  secret: varchar('secret', { length: 255 }),
  events: jsonb('events').$type<string[]>().notNull(),
  isActive: boolean('is_active').notNull().default(true),
  // Circuit-breaker fields (added in migration 0066)
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  pausedUntil: timestamp('paused_until'),
  lastFailureAt: timestamp('last_failure_at'),
  totalDeliveries: integer('total_deliveries').notNull().default(0),
  totalFailures: integer('total_failures').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  storeActiveIdx: index('webhook_endpoints_store_active_idx').on(table.storeId, table.isActive),
}));

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: serial('id').primaryKey(),
  webhookEventId: integer('webhook_event_id').notNull().references(() => webhookEvents.id),
  endpointId: integer('endpoint_id').notNull().references(() => webhookEndpoints.id),
  status: varchar('status', { length: 20 }).notNull(),
  statusCode: integer('status_code'),
  responseBody: text('response_body'),
  durationMs: integer('duration_ms'),
  attempt: integer('attempt').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  eventCreatedAtIdx: index('webhook_deliveries_event_created_at_idx').on(table.webhookEventId, table.createdAt),
  endpointCreatedAtIdx: index('webhook_deliveries_endpoint_created_at_idx').on(table.endpointId, table.createdAt),
  statusCreatedAtIdx: index('webhook_deliveries_status_created_at_idx').on(table.status, table.createdAt),
}));
