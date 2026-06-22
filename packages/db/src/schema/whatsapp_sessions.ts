import { pgTable, serial, integer, varchar, timestamp, text, index } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';

/**
 * WhatsApp paired-device sessions (Multi-Device via Baileys).
 *
 * Per-store at-most-one active session (`store_id UNIQUE`). The Baileys
 * session blob (full auth state) is serialized to JSON then wrapped with
 * AES-256-GCM via `commerce-core/encryption` using the same
 * `PAYMENT_CREDENTIALS_ENCRYPTION_KEY` that already protects vendor
 * credentials. Plaintext credentials NEVER hit the DB, the logs, or any
 * API response.
 *
 * `status` lifecycle:
 *   `disconnected` — initial row, no credentials yet (or recovered after
 *                     phone logged out / went offline for too long)
 *   `pairing`      — QR is being shown to the merchant; awaiting scan
 *   `connected`    — Baileys handshake complete; ready to send
 *
 * Cross-tenant safety: every API call MUST validate that the resolved
 * session's `storeId` matches the request's `storeId`. The unique
 * constraint guarantees one session per store; the in-process Baileys
 * client registry is keyed by `storeId` with an explicit ACL check
 * before every send. This isolation is locked by an integration test
 * in WA-PR-2.
 *
 * Indexes:
 *   - `store_id` is already UNIQUE (implicit btree index).
 *   - `status` index supports the worker query that wakes paired sessions
 *     after a process restart.
 *   - `last_seen_at` supports the reconnect-watchdog query.
 */
export const whatsappSessions = pgTable(
  'whatsapp_sessions',
  {
    id: serial('id').primaryKey(),
    storeId: integer('store_id')
      .notNull()
      .unique()
      .references(() => stores.id, { onDelete: 'cascade' }),
    phone: varchar('phone', { length: 20 }),
    deviceJid: varchar('device_jid', { length: 100 }),
    displayName: varchar('display_name', { length: 100 }),
    /**
     * Session state machine. Default `disconnected` matches the initial
     * row state before the merchant taps "اقتران الجوال".
     */
    status: varchar('status', { length: 20 }).notNull().default('disconnected'),
    /**
     * AES-256-GCM-wrapped JSON of the Baileys auth state. Nullable
     * because a row may exist in `pairing` state before creds finalize.
     * Format: `iv:authTag:ciphertext` (matches commerce-core/encryption).
     */
    credsEncrypted: text('creds_encrypted'),
    /**
     * Wall-clock of the most recent successful socket event (presence,
     * delivery receipt, or send). The reconnect watchdog uses this to
     * detect zombies.
     */
    lastSeenAt: timestamp('last_seen_at'),
    pairedAt: timestamp('paired_at'),
    disconnectedAt: timestamp('disconnected_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index('whatsapp_sessions_status_idx').on(table.status),
    lastSeenIdx: index('whatsapp_sessions_last_seen_idx').on(table.lastSeenAt),
  }),
);

export type WhatsappSession = typeof whatsappSessions.$inferSelect;
export type NewWhatsappSession = typeof whatsappSessions.$inferInsert;
