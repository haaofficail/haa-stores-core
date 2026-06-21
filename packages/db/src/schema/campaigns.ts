import { pgTable, serial, integer, varchar, text, boolean, timestamp, decimal, jsonb, uuid, index } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';
import { checkoutSessions } from './checkout.js';
import { customers } from './customers.js';

export const abandonedCartCampaigns = pgTable('abandoned_cart_campaigns', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  steps: jsonb('steps').$type<CampaignStep[]>().notNull().default([]),
  discountType: varchar('discount_type', { length: 20 }).$type<'percentage' | 'fixed'>(),
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }),
  discountExpiresHours: integer('discount_expires_hours').default(24),
  minCartValue: decimal('min_cart_value', { precision: 10, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const campaignRecoveries = pgTable('campaign_recoveries', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  checkoutSessionId: uuid('checkout_session_id').notNull().references(() => checkoutSessions.id, { onDelete: 'cascade' }),
  campaignId: integer('campaign_id').references(() => abandonedCartCampaigns.id),
  recoveryToken: varchar('recovery_token', { length: 64 }).notNull().unique(),
  step: integer('step').notNull().default(1),
  channel: varchar('channel', { length: 20 }).notNull().$type<'email' | 'sms' | 'whatsapp'>(),
  status: varchar('status', { length: 20 }).notNull().default('sent').$type<'sent' | 'opened' | 'recovered' | 'expired'>(),
  recipient: varchar('recipient', { length: 255 }),
  discountCode: varchar('discount_code', { length: 50 }),
  recoveredOrderId: integer('recovered_order_id'),
  sentAt: timestamp('sent_at').notNull().defaultNow(),
  openedAt: timestamp('opened_at'),
  recoveredAt: timestamp('recovered_at'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  storeStatusIdx: index('campaign_recoveries_store_status_idx').on(t.storeId, t.status, t.createdAt),
  sessionIdx: index('campaign_recoveries_session_idx').on(t.checkoutSessionId),
}));

export const whatsappCampaigns = pgTable('whatsapp_campaigns', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  segmentType: varchar('segment_type', { length: 50 }),
  messageTemplate: text('message_template').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('draft').$type<'draft' | 'scheduled' | 'running' | 'completed' | 'failed'>(),
  totalRecipients: integer('total_recipients').default(0),
  sentCount: integer('sent_count').default(0),
  failedCount: integer('failed_count').default(0),
  deliveredCount: integer('delivered_count').default(0),
  readCount: integer('read_count').default(0),
  scheduledAt: timestamp('scheduled_at'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const whatsappCampaignSends = pgTable('whatsapp_campaign_sends', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id').notNull().references(() => whatsappCampaigns.id, { onDelete: 'cascade' }),
  customerId: integer('customer_id').references(() => customers.id),
  phone: varchar('phone', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending').$type<'pending' | 'sent' | 'delivered' | 'read' | 'failed'>(),
  messageId: varchar('message_id', { length: 100 }),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  campaignStatusIdx: index('wa_campaign_sends_campaign_status_idx').on(t.campaignId, t.status),
  messageIdIdx: index('wa_campaign_sends_message_id_idx').on(t.messageId),
}));

export interface CampaignStep {
  step: number;
  channel: 'email' | 'sms' | 'whatsapp';
  delayMinutes: number;
  templateCode: string;
  subject?: string;
  messageBody?: string;
}
