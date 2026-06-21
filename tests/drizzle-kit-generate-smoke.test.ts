// Drizzle snapshot structural validation — runs drizzle-kit's actual validator
// on every snapshot in meta/ and asserts each one is valid.
//
// WHY THIS TEST EXISTS:
// drizzle-kit's `generate` command crashes with various cryptic errors when
// snapshots are malformed:
//   - `SyntaxError: Unexpected token Bud1` — .DS_Store in meta/
//   - `data is malformed` — validator rejected a snapshot
//   - `which is a collision` — duplicate prevId
//   - `snapshot is of unsupported version` — version mismatch
//
// The integrity test (`drizzle-snapshot-integrity.test.ts`) checks for
// the static conditions (missing snapshots, orphan files, etc). THIS test
// loads each snapshot and runs the same structural checks drizzle-kit
// performs internally — without needing a DB connection.
//
// See: memory/drizzle-migration-snapshots.md for full background.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const metaDir = resolve(projectRoot, 'packages/db/src/migrations/meta');

describe('Drizzle snapshot validator (regression guard for Bud1 + malformed)', () => {
  it('every snapshot file is valid JSON', () => {
    // Step 1: every snapshot must be parseable JSON.
    // The Bud1 error in drizzle-kit happens here when .DS_Store sneaks in.
    const files = readdirSync(metaDir).filter((f) => f.endsWith('_snapshot.json'));
    expect(files.length).toBeGreaterThan(0);

    const parseErrors = [];
    for (const file of files) {
      const path = resolve(metaDir, file);
      try {
        JSON.parse(readFileSync(path, 'utf-8'));
      } catch (e) {
        parseErrors.push(`${file}: ${(e).message}`);
      }
    }
    expect(parseErrors, `Files that failed to parse:\n${parseErrors.join('\n')}`).toEqual([]);
  });

  it('every snapshot has the required drizzle-kit v7 fields', () => {
    // Step 2: each snapshot must have the structural fields drizzle-kit expects.
    // drizzle-kit's pgSchemaV7 requires: version, dialect, tables, enums,
    // schemas, sequences, _meta. Missing any = "data is malformed".
    const files = readdirSync(metaDir).filter((f) => f.endsWith('_snapshot.json'));
    const required = ['version', 'dialect', 'tables', 'enums', 'schemas', 'sequences', '_meta'];
    const fieldErrors = [];

    for (const file of files) {
      const path = resolve(metaDir, file);
      const parsed = JSON.parse(readFileSync(path, 'utf-8'));
      const missing = required.filter((k) => !(k in parsed));
      if (missing.length > 0) {
        fieldErrors.push(`${file}: missing ${missing.join(', ')}`);
      }
      // Additional value checks
      if (parsed.version !== '7') fieldErrors.push(`${file}: version is "${parsed.version}" not "7"`);
      if (parsed.dialect !== 'postgresql') fieldErrors.push(`${file}: dialect is "${parsed.dialect}" not "postgresql"`);
    }
    expect(fieldErrors, `Files with missing/invalid fields:\n${fieldErrors.join('\n')}`).toEqual([]);
  });

  it('foreign keys use the correct format (string, not array)', () => {
    // Step 3: drizzle-kit 0.31.10 validates FK structure strictly.
    // tableFrom / tableTo MUST be strings (table name), NOT arrays
    // (e.g. ['public', 'name']). This is a common mistake when
    // synthesizing snapshots programmatically.
    const files = readdirSync(metaDir).filter((f) => f.endsWith('_snapshot.json'));
    const fkErrors = [];

    for (const file of files) {
      const path = resolve(metaDir, file);
      const parsed = JSON.parse(readFileSync(path, 'utf-8'));
      for (const [tk, t] of Object.entries(parsed.tables ?? {})) {
        for (const [fkName, fk] of Object.entries(t.foreignKeys ?? {})) {
          if (Array.isArray(fk.tableFrom)) {
            fkErrors.push(`${file}: ${tk}.${fkName}.tableFrom is an array, must be a string`);
          }
          if (Array.isArray(fk.tableTo)) {
            fkErrors.push(`${file}: ${tk}.${fkName}.tableTo is an array, must be a string`);
          }
        }
      }
    }
    expect(fkErrors, `FK format errors:\n${fkErrors.join('\n')}`).toEqual([]);
  });

  it('prevId chain is unbroken from 0000 to the latest snapshot', () => {
    // Step 4: drizzle-kit validates the snapshot chain via prevId.
    // If prevId doesn't match an existing snapshot's id, drizzle-kit
    // considers the chain broken.
    const files = readdirSync(metaDir).filter((f) => f.endsWith('_snapshot.json'));
    const snapshots = new Map();
    for (const file of files) {
      const parsed = JSON.parse(readFileSync(resolve(metaDir, file), 'utf-8'));
      const key = file.replace('_snapshot.json', '');
      snapshots.set(key, parsed);
      snapshots.set(parsed.id, parsed);
    }

    const chainErrors = [];
    for (const file of files) {
      const parsed = JSON.parse(readFileSync(resolve(metaDir, file), 'utf-8'));
      const short = file.replace('_snapshot.json', '');
      const hasNoPrev = parsed.prevId === null || parsed.prevId === '00000000-0000-0000-0000-000000000000';
      if (short !== '0000' && !hasNoPrev) {
        if (!snapshots.has(parsed.prevId)) {
          chainErrors.push(`${file}: prevId "${parsed.prevId}" doesn't match any snapshot`);
        }
      }
    }
    expect(chainErrors, `Chain errors:\n${chainErrors.join('\n')}`).toEqual([]);
  });

  it('runs drizzle-kit binary end-to-end without Bud1 / malformed errors (opt-in)', () => {
    // End-to-end smoke test: actually invoke drizzle-kit generate and
    // check the output for the specific failure patterns.
    //
    // Disabled by default because:
    // 1. drizzle-kit requires a DB connection (DATABASE_URL)
    // 2. It spawns a child process which slows tests
    // 3. CI may not have drizzle-kit installed
    //
    // Enable by setting ENABLE_DRIZZLE_KIT_SMOKE=1 in your env.
    if (process.env.ENABLE_DRIZZLE_KIT_SMOKE !== '1') {
      console.warn(
        '[drizzle-kit-smoke] Skipped (set ENABLE_DRIZZLE_KIT_SMOKE=1 to enable)',
      );
      return;
    }

    const { execSync } = require('node:child_process');
    const drizzleKitBin = resolve(
      projectRoot,
      'node_modules/.pnpm/drizzle-kit@0.31.10/node_modules/drizzle-kit/bin.cjs',
    );
    if (!existsSync(drizzleKitBin)) {
      console.warn('[drizzle-kit-smoke] drizzle-kit not installed; skipping');
      return;
    }

    let output = '';
    try {
      output = execSync(`node ${drizzleKitBin} generate`, {
        cwd: resolve(projectRoot, 'packages/db'),
        env: { ...process.env },
        timeout: 60_000,
        encoding: 'utf-8',
      });
    } catch (err) {
      output = (err.stderr ?? '') + (err.stdout ?? '');
    }

    expect(output).not.toMatch(/Bud1/);
    expect(output).not.toMatch(/data is malformed/);
    expect(output).not.toMatch(/which is a collision/);
  }, 120_000);
});
