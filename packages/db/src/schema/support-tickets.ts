import { pgTable, serial, varchar, integer, timestamp, boolean, text, jsonb, uuid, index } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';
import { customers } from './customers.js';

export const supportTickets = pgTable('support_tickets', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  customerId: integer('customer_id').references(() => customers.id),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  subject: varchar('subject', { length: 500 }).notNull(),
  message: text('message').notNull(),
  status: varchar('status', { length: 30 }).notNull().default('open'),
  priority: varchar('priority', { length: 20 }).notNull().default('medium'),
  assignedTo: integer('assigned_to'),
  accessToken: uuid('access_token').notNull().defaultRandom(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  storeStatusIdx: index('support_tickets_store_status_idx').on(table.storeId, table.status),
  storeCreatedIdx: index('support_tickets_store_created_idx').on(table.storeId, table.createdAt),
  customerIdx: index('support_tickets_customer_idx').on(table.customerId),
}));

export const ticketMessages = pgTable('ticket_messages', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').notNull().references(() => supportTickets.id),
  authorType: varchar('author_type', { length: 20 }).notNull(),
  authorId: integer('author_id'),
  message: text('message').notNull(),
  attachments: jsonb('attachments').$type<Array<{ url: string; name: string }>>(),
  isStaffReply: boolean('is_staff_reply').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  ticketIdx: index('ticket_messages_ticket_idx').on(table.ticketId),
}));
