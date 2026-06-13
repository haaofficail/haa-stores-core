import { pgTable, serial, integer, varchar, timestamp, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { users } from './users.js';

export const tenantUsers = pgTable('tenant_users', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  userId: integer('user_id').notNull().references(() => users.id),
  role: varchar('role', { length: 50 }).notNull().default('owner'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  uniqueTenantUser: unique().on(table.tenantId, table.userId),
}));
