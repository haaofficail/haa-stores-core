import { pgTable, serial, integer, varchar, timestamp } from 'drizzle-orm/pg-core';
import { tenantUsers } from './tenant_users.js';

export const membershipPermissions = pgTable('membership_permissions', {
  id: serial('id').primaryKey(),
  membershipId: integer('membership_id').notNull().references(() => tenantUsers.id),
  permissionKey: varchar('permission_key', { length: 100 }).notNull(),
  scopeType: varchar('scope_type', { length: 20 }).notNull().default('store'),
  scopeId: integer('scope_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdByUserId: integer('created_by_user_id'),
});
