import { pgTable, serial, integer, varchar, timestamp, text, boolean, index, unique } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';

/**
 * WhatsApp message templates per store (WA-PR-5).
 *
 * The merchant writes a body with placeholders like `{customer.name}`,
 * `{order.number}`, `{order.total}` and a campaign run substitutes them
 * before sending. The substitution is allow-listed (no eval, no arbitrary
 * keys) — defined in the template renderer service in commerce-core.
 *
 * Uniqueness: `(store_id, name)` — one template per name within a store.
 * Cross-tenant isolation matches the existing whatsapp_campaigns +
 * loyalty_settings patterns: every API call filters by store_id and the
 * router middleware enforces the storeId in the URL.
 *
 * Categories let the UI group templates (e.g. abandoned_cart, order_status,
 * loyalty, marketing). Free text — no enum on the DB layer — so future
 * categories don't require a migration.
 */
export const whatsappTemplates = pgTable(
  'whatsapp_templates',
  {
    id: serial('id').primaryKey(),
    storeId: integer('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    body: text('body').notNull(),
    category: varchar('category', { length: 50 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    storeNameUnique: unique('whatsapp_templates_store_name_unique').on(table.storeId, table.name),
    storeIdx: index('whatsapp_templates_store_idx').on(table.storeId),
    activeIdx: index('whatsapp_templates_active_idx').on(table.isActive),
  }),
);

export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;
export type NewWhatsappTemplate = typeof whatsappTemplates.$inferInsert;
