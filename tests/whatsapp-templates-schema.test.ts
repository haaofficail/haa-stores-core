// WhatsApp templates schema guard (WA-PR-5).
//
// Source-grep that locks the table + migration + snapshot + journal
// invariants before any code path relies on them. Same pattern as the
// WA-PR-1 sessions schema guard.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const SCHEMA = readFileSync(resolve(ROOT, 'packages/db/src/schema/whatsapp_templates.ts'), 'utf-8');
const MIGRATION = readFileSync(resolve(ROOT, 'packages/db/src/migrations/0075_whatsapp_templates.sql'), 'utf-8');
const INDEX = readFileSync(resolve(ROOT, 'packages/db/src/schema/index.ts'), 'utf-8');
const SNAPSHOT = JSON.parse(readFileSync(resolve(ROOT, 'packages/db/src/migrations/meta/0075_snapshot.json'), 'utf-8'));
const JOURNAL = JSON.parse(readFileSync(resolve(ROOT, 'packages/db/src/migrations/meta/_journal.json'), 'utf-8'));

describe('WhatsApp templates schema (WA-PR-5)', () => {
  it('exports whatsappTemplates table', () => {
    expect(SCHEMA).toMatch(/export const whatsappTemplates\s*=\s*pgTable\(\s*['"]whatsapp_templates['"]/);
  });

  it('unique constraint on (store_id, name)', () => {
    expect(SCHEMA).toMatch(/unique\(['"]whatsapp_templates_store_name_unique['"]\)\.on\([^)]*storeId[^)]*name/);
    expect(MIGRATION).toMatch(/UNIQUE\("store_id","name"\)/);
  });

  it('CASCADE deletes with the store', () => {
    expect(SCHEMA).toMatch(/onDelete:\s*['"]cascade['"]/);
    expect(MIGRATION).toMatch(/ON DELETE cascade/i);
  });

  it('body is text + is_active defaults true', () => {
    expect(SCHEMA).toMatch(/body:\s*text\(['"]body['"]\)\.notNull\(\)/);
    expect(SCHEMA).toMatch(/isActive[\s\S]*?\.default\(true\)/);
    expect(MIGRATION).toMatch(/"is_active"\s+boolean\s+DEFAULT true\s+NOT NULL/i);
  });

  it('re-exported from packages/db/src/schema/index.ts', () => {
    expect(INDEX).toMatch(/export \* from ['"]\.\/whatsapp_templates\.js['"]/);
  });

  it('snapshot id chains from 0074 → 0075', () => {
    expect(SNAPSHOT.id).toBe('0075-whatsapp-templates');
    expect(SNAPSHOT.prevId).toBe('0074-whatsapp-sessions');
    expect(SNAPSHOT.tables['public.whatsapp_templates']).toBeDefined();
  });

  it('journal entry registered for 0075_whatsapp_templates', () => {
    const tags = JOURNAL.entries.map((e: { tag: string }) => e.tag);
    expect(tags).toContain('0075_whatsapp_templates');
  });

  it('inferred row + insert types are exported', () => {
    expect(SCHEMA).toMatch(/export type WhatsappTemplate\s*=/);
    expect(SCHEMA).toMatch(/export type NewWhatsappTemplate\s*=/);
  });
});
