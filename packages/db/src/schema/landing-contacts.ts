import { pgTable, serial, varchar, text, integer, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * Landing-page contact submissions. Captured from the public
 * `<section id="contact">` form on `/`. Public POST endpoint is
 * unauthenticated + rate-limited + honeypot-guarded.
 *
 * Lifecycle status:
 *   - `new`      — fresh submission, not yet acknowledged
 *   - `in_progress` — admin opened it / started replying
 *   - `replied`  — admin sent a response (manual mark, no inbound thread)
 *   - `closed`   — resolved, no further action
 *   - `spam`     — admin flagged as abuse / bot
 */
export const landingContacts = pgTable('landing_contacts', {
  id: serial('id').primaryKey(),
  // Submitter-provided fields. Trimmed at the service layer.
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 30 }),
  message: text('message').notNull(),

  // Audit context. Captured server-side from request headers.
  sourceIp: varchar('source_ip', { length: 45 }),
  userAgent: text('user_agent'),

  // Admin workflow
  status: varchar('status', { length: 20 }).notNull().default('new'),
  adminUserId: integer('admin_user_id'),
  adminNotes: text('admin_notes'),
  repliedAt: timestamp('replied_at'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  statusCreatedAtIdx: index('landing_contacts_status_created_at_idx').on(t.status, t.createdAt),
  createdAtIdx: index('landing_contacts_created_at_idx').on(t.createdAt),
}));

export const LANDING_CONTACT_STATUSES = ['new', 'in_progress', 'replied', 'closed', 'spam'] as const;
export type LandingContactStatus = (typeof LANDING_CONTACT_STATUSES)[number];
