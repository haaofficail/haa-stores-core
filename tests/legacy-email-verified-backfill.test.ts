import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const migrationFile = resolve(
  projectRoot,
  'packages/db/src/migrations/0083_backfill_legacy_email_verified_at.sql',
);
const snapshotFile = resolve(
  projectRoot,
  'packages/db/src/migrations/meta/0083_snapshot.json',
);
const journalFile = resolve(
  projectRoot,
  'packages/db/src/migrations/meta/_journal.json',
);
const envWorkflowFile = resolve(
  projectRoot,
  '.github/workflows/ops-staging-env.yml',
);

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

describe('Phase-1 close-out — legacy email_verified_at backfill', () => {
  it('migration 0083 exists', () => {
    expect(existsSync(migrationFile)).toBe(true);
  });

  it('migration 0083 backfills NULL rows from created_at', () => {
    const sql = read(migrationFile);
    expect(sql).toMatch(/UPDATE\s+"?users"?/i);
    expect(sql).toMatch(/SET[^;]*"?email_verified_at"?\s*=\s*"?created_at"?/i);
    expect(sql).toMatch(/WHERE\s+"?email_verified_at"?\s+IS\s+NULL/i);
  });

  it('migration 0083 is idempotent and additive — no DROP / RENAME / ALTER in executable SQL', () => {
    // Strip `-- ...` comments so banned keywords in the file header
    // (e.g. "no DROP, no RENAME") don't trigger a false positive.
    const sql = read(migrationFile)
      .split('\n')
      .map((line) => line.replace(/--.*$/, ''))
      .join('\n');
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/\bRENAME\b/i);
    expect(sql).not.toMatch(/\bALTER\s+TABLE\b/i);
  });

  it('migration 0083 has a matching snapshot file', () => {
    expect(existsSync(snapshotFile)).toBe(true);
    const snap = JSON.parse(read(snapshotFile));
    expect(snap.version).toBe('7');
    expect(snap.dialect).toBe('postgresql');
    expect(typeof snap.id).toBe('string');
    expect(typeof snap.prevId).toBe('string');
  });

  it('journal includes the 0083 entry', () => {
    const journal = JSON.parse(read(journalFile));
    const tags = journal.entries.map((e: { tag: string }) => e.tag);
    expect(tags).toContain('0083_backfill_legacy_email_verified_at');
  });

  it('ops-staging-env workflow allows AUTH_LEGACY_VERIFIED', () => {
    const yml = read(envWorkflowFile);
    expect(yml).toMatch(/^\s*- AUTH_LEGACY_VERIFIED\s*$/m);
    expect(yml).toMatch(
      /FEATURE_WHATSAPP_LIVE\|FEATURE_LOYALTY_LIVE\|SENTRY_DSN\|AUTH_LEGACY_VERIFIED\|ADMIN_TOTP_ENCRYPTION_KEY\)/,
    );
  });
});
