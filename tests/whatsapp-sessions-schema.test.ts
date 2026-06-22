// WhatsApp sessions schema guard — WA-PR-1.
//
// This is a source-grep guard that locks the invariants of the
// `whatsapp_sessions` table and its Drizzle schema before any code path
// can rely on them. The actual migration execution is owner-gated
// (per AGENTS.md §14.7) so this test does NOT touch a live DB.
//
// What this guard locks:
//   - The schema file exists and exports `whatsappSessions`.
//   - The SQL migration creates the table + the two supporting indexes.
//   - `store_id` is UNIQUE (one session per store — load-bearing for the
//     in-process Baileys client registry that WA-PR-2 will key by storeId).
//   - `creds_encrypted` is a nullable `text` column (NEVER `bytea`,
//     NEVER `jsonb`) — the wrapper format is the `iv:authTag:ciphertext`
//     string emitted by commerce-core/encryption. A `jsonb` column would
//     tempt callers to store the auth state as plaintext JSON.
//   - The schema is re-exported from packages/db/src/schema/index.js so
//     consumers can import it from `@haa/db/schema`.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);

const SCHEMA = readFileSync(
  resolve(ROOT, 'packages/db/src/schema/whatsapp_sessions.ts'),
  'utf-8',
);
const MIGRATION = readFileSync(
  resolve(ROOT, 'packages/db/src/migrations/0074_whatsapp_sessions.sql'),
  'utf-8',
);
const SCHEMA_INDEX = readFileSync(
  resolve(ROOT, 'packages/db/src/schema/index.ts'),
  'utf-8',
);

describe('WhatsApp sessions — schema invariants (WA-PR-1)', () => {
  it('exports `whatsappSessions` from the schema file', () => {
    expect(SCHEMA).toMatch(/export const whatsappSessions\s*=\s*pgTable\(/);
  });

  it('declares the table as `whatsapp_sessions` (snake_case for SQL parity)', () => {
    expect(SCHEMA).toMatch(/pgTable\(\s*['"]whatsapp_sessions['"]/);
  });

  it('marks store_id as UNIQUE and CASCADE-deletes with the store', () => {
    expect(SCHEMA).toMatch(/storeId.*\.unique\(\)/s);
    expect(SCHEMA).toMatch(/onDelete:\s*['"]cascade['"]/);
    expect(MIGRATION).toMatch(/"store_id"[^,]*UNIQUE[^,]*REFERENCES "stores"/i);
    expect(MIGRATION).toMatch(/ON DELETE cascade/i);
  });

  it('uses `text` for encrypted creds — never bytea, never jsonb', () => {
    // The schema must declare a `text` column.
    expect(SCHEMA).toMatch(/credsEncrypted:\s*text\(['"]creds_encrypted['"]\)/);
    // Must NOT use bytea or jsonb (both would silently accept plaintext
    // and corrupt the encryption contract).
    expect(SCHEMA).not.toMatch(/credsEncrypted.*bytea/);
    expect(SCHEMA).not.toMatch(/credsEncrypted.*jsonb/);
    expect(MIGRATION).toMatch(/"creds_encrypted"\s+text/i);
    expect(MIGRATION).not.toMatch(/"creds_encrypted"\s+bytea/i);
    expect(MIGRATION).not.toMatch(/"creds_encrypted"\s+jsonb/i);
  });

  it('declares the status lifecycle defaulting to `disconnected`', () => {
    expect(SCHEMA).toMatch(/status.*\.default\(['"]disconnected['"]\)/s);
    expect(MIGRATION).toMatch(/"status".*DEFAULT 'disconnected' NOT NULL/i);
  });

  it('creates the two supporting indexes (status + last_seen_at)', () => {
    expect(MIGRATION).toMatch(/CREATE INDEX[^;]*"whatsapp_sessions_status_idx"[^;]*\("status"\)/i);
    expect(MIGRATION).toMatch(/CREATE INDEX[^;]*"whatsapp_sessions_last_seen_idx"[^;]*\("last_seen_at"\)/i);
    expect(SCHEMA).toMatch(/index\(['"]whatsapp_sessions_status_idx['"]\)/);
    expect(SCHEMA).toMatch(/index\(['"]whatsapp_sessions_last_seen_idx['"]\)/);
  });

  it('is re-exported from packages/db/src/schema/index.ts', () => {
    expect(SCHEMA_INDEX).toMatch(/export \* from ['"]\.\/whatsapp_sessions\.js['"]/);
  });

  it('exports the inferred row/insert types for downstream consumers', () => {
    expect(SCHEMA).toMatch(/export type WhatsappSession\s*=\s*typeof whatsappSessions\.\$inferSelect/);
    expect(SCHEMA).toMatch(/export type NewWhatsappSession\s*=\s*typeof whatsappSessions\.\$inferInsert/);
  });

  it('the migration uses CREATE TABLE IF NOT EXISTS (idempotent replay)', () => {
    // The repo's migration tooling allows safe re-runs; without IF NOT EXISTS
    // a partial migration breaks fresh-DB bootstrap. Matches the existing
    // pattern in 0071_loyalty.sql and 0066_whatsapp_campaigns.sql.
    expect(MIGRATION).toMatch(/CREATE TABLE IF NOT EXISTS "whatsapp_sessions"/);
  });

  it('does NOT introduce a plaintext column for credentials', () => {
    // Catch the regression where a future edit adds a "convenience"
    // plaintext column alongside the encrypted one.
    const FORBIDDEN_NAMES = ['creds_plaintext', 'creds_json', 'auth_state', 'session_blob'];
    for (const name of FORBIDDEN_NAMES) {
      expect(SCHEMA, `forbidden plaintext column name "${name}" found in schema`).not.toContain(name);
      expect(MIGRATION, `forbidden plaintext column name "${name}" found in migration`).not.toContain(name);
    }
  });
});
