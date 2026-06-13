import { pgTable, serial, varchar, timestamp, boolean, text } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  logoUrl: varchar('logo_url', { length: 500 }),
  faviconUrl: varchar('favicon_url', { length: 500 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  taxNumber: varchar('tax_number', { length: 50 }),
  isTaxRegistered: boolean('is_tax_registered').default(false),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
