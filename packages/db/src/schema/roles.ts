import { pgTable, serial, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';
import { users } from './users.js';

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  name: varchar('name', { length: 50 }).notNull(),
  description: varchar('description', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  label: varchar('label', { length: 100 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const rolePermissions = pgTable('role_permissions', {
  id: serial('id').primaryKey(),
  roleId: integer('role_id').notNull().references(() => roles.id),
  permissionId: integer('permission_id').notNull().references(() => permissions.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const userStoreRoles = pgTable('user_store_roles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  storeId: integer('store_id').notNull().references(() => stores.id),
  roleId: integer('role_id').notNull().references(() => roles.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
