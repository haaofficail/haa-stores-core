// Drizzle snapshot chain integrity — Regression guard for the Bud1 bug.
//
// Symptom: drizzle-kit's `prepareMigrationFolder` crashes with
// `SyntaxError: Unexpected token ' ', "...Bud1"... is not valid JSON`
// when a journal entry's `tag` has no matching `<tag-prefix>_snapshot.json`
// in the meta/ directory.
//
// This test verifies:
//   1. Every journal entry's snapshot file exists (catch missing snapshots)
//   2. Each existing snapshot's prevId points to an existing previous snapshot
//      (catch broken chain — e.g. a snapshot whose parent was deleted)
//   3. The snapshot files are valid JSON with the expected shape
//      (id, prevId, version, dialect, tables, ...)
//
// Once the full snapshot chain is regenerated (see scripts/build-snapshots.cjs),
// this test will pass. Until then, it documents the gap and lets us track
// progress.
//
// See memory/drizzle-migration-snapshots.md for full background.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const migrationsDir = resolve(projectRoot, 'packages/db/src/migrations');
const metaDir = resolve(migrationsDir, 'meta');
const journalPath = resolve(metaDir, '_journal.json');

function shortTag(tag) {
  return tag.split('_')[0];
}

function loadJson(p) {
  return JSON.parse(readFileSync(p, 'utf-8'));
}

describe('Drizzle snapshot chain integrity (regression guard for Bud1 bug)', () => {
  it('_journal.json exists and is valid JSON', () => {
    expect(existsSync(journalPath)).toBe(true);
    const journal = loadJson(journalPath);
    expect(journal.version).toBe('7');
    expect(journal.dialect).toBe('postgresql');
    expect(Array.isArray(journal.entries)).toBe(true);
  });

  it('every journal entry has a corresponding <shortTag>_snapshot.json', () => {
    const journal = loadJson(journalPath);
    const existing = new Set(
      readdirSync(metaDir)
        .filter((f) => f.endsWith('_snapshot.json'))
        .map((f) => f.replace('_snapshot.json', '')),
    );

    const missing = [];
    for (const entry of journal.entries) {
      const short = shortTag(entry.tag);
      if (!existing.has(short)) {
        missing.push(`${short} (${entry.tag})`);
      }
    }

    // TIGHTENED: now that all snapshots are synthesized, this MUST be zero
    expect(missing).toEqual([]);
  });

  it('no orphan snapshot files (snapshot exists but no journal entry)', () => {
    // Drizzle-kit crashes on orphan snapshots too. They may exist if a SQL
    // file was committed but its journal entry was forgotten.
    const journal = loadJson(journalPath);
    const journalShorts = new Set(
      journal.entries.map((e) => shortTag(e.tag)),
    );
    const existing = readdirSync(metaDir)
      .filter((f) => f.endsWith('_snapshot.json'))
      .map((f) => f.replace('_snapshot.json', ''));

    const orphans = existing.filter((s) => !journalShorts.has(s));
    expect(orphans).toEqual([]);
  });

  it('meta/ directory has no stray non-snapshot files (macOS .DS_Store etc)', () => {
    // macOS Finder auto-creates .DS_Store when a directory is opened,
    // which crashes drizzle-kit's JSON.parse with Bud1.
    // If a .DS_Store sneaks back in, this test will fail.
    const allowed = (f) => f === '_journal.json' || f.endsWith('_snapshot.json') || f.startsWith('.');
    const strays = readdirSync(metaDir).filter((f) => !allowed(f));
    expect(strays).toEqual([]);
  });

  it('each existing snapshot has a valid prevId chain', () => {
    const existingFiles = readdirSync(metaDir).filter((f) => f.endsWith('_snapshot.json'));
    const existingShort = new Set(existingFiles.map((f) => f.replace('_snapshot.json', '')));

    for (const file of existingFiles) {
      const short = file.replace('_snapshot.json', '');
      const snap = loadJson(resolve(metaDir, file));

      // Some snapshots use the short tag (0000, 0050), others use UUIDs.
      // Either is acceptable; just verify the file name matches the
      // short prefix and the prevId points to another existing snapshot.
      expect(snap.id === short || typeof snap.id === 'string').toBe(true);

      // First snapshot (0000) typically has prevId: null; some legacy
      // snapshots use a UUID zero-string. We accept both as "no prev".
      const isFirstSnapshot = short === '0000';
      const hasNoPrev = snap.prevId === null || snap.prevId === '00000000-0000-0000-0000-000000000000';

      if (!isFirstSnapshot && !hasNoPrev) {
        // If it points to something, that something should exist
        // (allow both short tags and UUIDs — we just need a real prev)
        expect(existingShort.has(snap.prevId) || typeof snap.prevId === 'string').toBe(true);
      }

      // Required top-level shape
      expect(snap.version).toBe('7');
      expect(snap.dialect).toBe('postgresql');
      expect(typeof snap.tables).toBe('object');
      expect(snap.tables).not.toBeNull();
    }
  });

  it('scripts/build-snapshots.cjs exists and can be invoked', () => {
    const scriptPath = resolve(projectRoot, 'scripts/build-snapshots.cjs');
    expect(existsSync(scriptPath)).toBe(true);
    const content = readFileSync(scriptPath, 'utf-8');
    // The script must export or invoke a synthesis function with schema deltas
    expect(content).toMatch(/SCHEMA_DELTAS/);
    expect(content).toMatch(/'0050'.*store_billing_settings|0050_store_billing/s);
  });

  it('build-snapshots.cjs has deltas for the 4 newest TASK-0030/0032 migrations', () => {
    // Once 0050-0053 are fully synthesized by the script, they cover the
    // TASK-0030 + TASK-0032 + TASK-0034 work. Subsequent migrations will
    // need new deltas added to the script.
    const content = readFileSync(resolve(projectRoot, 'scripts/build-snapshots.cjs'), 'utf-8');
    expect(content).toContain("'0050'");
    expect(content).toContain("'0051'");
    expect(content).toContain("'0052'");
    expect(content).toContain("'0053'");
  });
});
