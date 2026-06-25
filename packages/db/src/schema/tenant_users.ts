import { pgTable, serial, integer, varchar, timestamp, boolean, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { users } from './users.js';
import { stores } from './stores.js';

// `storeId` scopes the membership to a single store inside the tenant.
//
// Before migration 0087 there was no store-level scoping — a tenant
// could hold multiple stores and every member of the tenant could
// see/edit every other member regardless of which store they
// "owned". This was a tenant-isolation leak: store A's owner could
// view + edit store B's owner if they shared the same tenant
// (PDPL Article 10/22 violation + privilege escalation).
//
// `storeId` is nullable to preserve the existing notion of a
// "tenant-wide" role (a super-admin who can legitimately see across
// stores). New per-store invitations MUST set storeId. Store-scoped
// queries filter as:
//
//   WHERE tenant_id = :ctx_tenant
//     AND (store_id IS NULL OR store_id = :ctx_store)
//
// so a tenant-wide member appears in every store's employee list,
// but a store-scoped member only appears in their own.
export const tenantUsers = pgTable('tenant_users', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  storeId: integer('store_id').references(() => stores.id),
  userId: integer('user_id').notNull().references(() => users.id),
  role: varchar('role', { length: 50 }).notNull().default('owner'),
  // Per-membership active flag. Replaces the global `users.is_active`
  // for the purpose of "remove this employee from THIS store" — the
  // global flag would have logged them out of every other tenant they
  // belong to too.
  isActive: boolean('is_active').notNull().default(true),
  revokedAt: timestamp('revoked_at'),
  revokedByUserId: integer('revoked_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  // The unique key now includes storeId — the same user can hold
  // memberships in two different stores of the same tenant (a
  // multi-store franchise pattern), but not duplicate memberships
  // in the same (tenant, store) pair.
  uniqueTenantStoreUser: unique().on(table.tenantId, table.storeId, table.userId),
}));
