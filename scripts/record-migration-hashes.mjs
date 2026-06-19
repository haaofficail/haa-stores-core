// scripts/record-migration-hashes.mjs
//
// Walks the migration journal and inserts a record for every tag into
// drizzle.__drizzle_migrations, with the SHA-256 hash of the SQL file
// body. This lets a freshly-bootstrapped DB (via
// scripts/bootstrap-fresh-db.sh) become compatible with subsequent
// `pnpm db:migrate` calls — drizzle-orm's migrator will then skip
// already-applied migrations and only run anything new.
//
// This is the merge-ready bootstrap complement to DECISION-0007.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is required'); process.exit(1); }

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const migrationsDir = resolve(projectRoot, 'packages/db/src/migrations');
const journalPath = resolve(migrationsDir, 'meta/_journal.json');
const journal = JSON.parse(readFileSync(journalPath, 'utf-8'));

const client = postgres(url, { max: 1 });
try {
  // Ensure the migrations table exists (drizzle's migrator does this
  // automatically when it runs, but we may be running this BEFORE the
  // first drizzle-orm migrate).
  await client.unsafe(`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  let recorded = 0;
  for (const entry of journal.entries) {
    const sqlPath = `${migrationsDir}/${entry.tag}.sql`;
    let query;
    try {
      query = readFileSync(sqlPath, 'utf-8');
    } catch (e) {
      console.error(`  ✗ ${entry.tag}: file missing`);
      continue;
    }
    const hash = createHash('sha256').update(query).digest('hex');
    try {
      await client.unsafe(
        `INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at") VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [hash, entry.when]
      );
      recorded += 1;
      console.log(`  ✓ ${entry.tag} (created_at=${entry.when})`);
    } catch (e) {
      console.error(`  ✗ ${entry.tag}: ${e.message}`);
    }
  }
  console.log(`\nRecorded ${recorded} migration(s).`);
} finally {
  await client.end();
}
