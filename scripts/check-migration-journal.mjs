#!/usr/bin/env node
/**
 * G5 — Migration journal-completeness gate (PR-E)
 *
 * Asserts that every *.sql file in packages/db/src/migrations/ is registered
 * in the Drizzle _journal.json. An unregistered file means `drizzle-kit migrate`
 * will never apply it — exactly what happened with 0068_brand_color_defaults.
 *
 * Run: node scripts/check-migration-journal.mjs
 * CI:  added to the Preflight job in .github/workflows/ci.yml
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const migrationsDir = resolve(root, 'packages/db/src/migrations');
const journalPath = resolve(migrationsDir, 'meta/_journal.json');

if (!existsSync(journalPath)) {
  console.error('::error::_journal.json not found at', journalPath);
  process.exit(1);
}

const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
const registeredTags = new Set(journal.entries.map((e) => e.tag));

// Collect all .sql files directly in the migrations dir (not in subdirs).
const sqlFiles = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const orphans = sqlFiles.filter((file) => {
  const tag = basename(file, '.sql');
  return !registeredTags.has(tag);
});

if (orphans.length > 0) {
  console.error('::error::Migration journal is incomplete. The following .sql files are NOT');
  console.error('registered in packages/db/src/migrations/meta/_journal.json:');
  orphans.forEach((f) => console.error(`  - ${f}`));
  console.error('');
  console.error('These migrations will never be applied by drizzle-kit.');
  console.error('Fix: run `pnpm db:generate` or manually add the entry to _journal.json.');
  process.exit(1);
}

console.log(`✓ Migration journal complete — all ${sqlFiles.length} .sql files are registered`);
