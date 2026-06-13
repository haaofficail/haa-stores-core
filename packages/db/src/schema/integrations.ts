import { sql } from 'drizzle-orm';
import { pgTable, serial, varchar, integer, timestamp, boolean, text, jsonb } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';

export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  name: varchar('name', { length: 100 }).notNull(),
  keyPrefix: varchar('key_prefix', { length: 12 }).notNull(),
  keyHash: varchar('key_hash', { length: 128 }).notNull(),
  scopes: text('scopes').array().notNull().default(sql`'{}'`),
  isActive: boolean('is_active').notNull().default(true),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  revokedAt: timestamp('revoked_at'),
});

export const apiKeyScopes = pgTable('api_key_scopes', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 500 }),
});

export const integrationLogs = pgTable('integration_logs', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').references(() => stores.id),
  apiKeyId: integer('api_key_id').references(() => apiKeys.id),
  method: varchar('method', { length: 10 }).notNull(),
  path: varchar('path', { length: 500 }).notNull(),
  statusCode: integer('status_code'),
  ipAddress: varchar('ip_address', { length: 50 }),
  durationMs: integer('duration_ms'),
  requestBody: jsonb('request_body'),
  responseSummary: text('response_summary'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const providerConnections = pgTable('provider_connections', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  providerType: varchar('provider_type', { length: 50 }).notNull(),
  providerName: varchar('provider_name', { length: 50 }).notNull(),
  integrationModel: varchar('integration_model', { length: 50 }).notNull().default('not_configured'),
  mode: varchar('mode', { length: 20 }).notNull().default('sandbox'),
  status: varchar('status', { length: 50 }).notNull().default('not_configured'),
  externalVendorId: varchar('external_vendor_id', { length: 255 }),
  credentialsEncrypted: text('credentials_encrypted'),
  lastVerifiedAt: timestamp('last_verified_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
