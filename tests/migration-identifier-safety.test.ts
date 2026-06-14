import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, '../packages/db/src/migrations');

// Postgres identifier max length is 63 chars
const POSTGRES_IDENTIFIER_MAX = 63;

describe('Quality Pass 1 — Migration Identifier Safety', () => {
  it('0007 FK constraint name must fit within Postgres 63-char limit', () => {
    const migration = readFileSync(
      resolve(migrationsDir, '0007_tan_cassandra_nova.sql'),
      'utf-8',
    );
    // Match: ADD CONSTRAINT "<name>" FOREIGN KEY
    const fkMatches = migration.matchAll(/ADD CONSTRAINT\s+"([^"]+)"\s+FOREIGN KEY/gi);
    for (const match of fkMatches) {
      const name = match[1];
      expect(
        name.length,
        `FK constraint "${name}" is ${name.length} chars (max ${POSTGRES_IDENTIFIER_MAX})`,
      ).toBeLessThanOrEqual(POSTGRES_IDENTIFIER_MAX);
    }
  });

  it('all migration FK constraint names must fit within 63-char limit', () => {
    // Read every migration and validate FK names
    const { readdirSync } = require('node:fs') as typeof import('node:fs');
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));

    const violations: Array<{ file: string; name: string; length: number }> = [];

    for (const file of files) {
      const content = readFileSync(resolve(migrationsDir, file), 'utf-8');
      const fkMatches = content.matchAll(/ADD CONSTRAINT\s+"([^"]+)"\s+FOREIGN KEY/gi);
      for (const match of fkMatches) {
        const name = match[1];
        if (name.length > POSTGRES_IDENTIFIER_MAX) {
          violations.push({ file, name, length: name.length });
        }
      }
    }

    if (violations.length > 0) {
      const summary = violations
        .map((v) => `  - ${v.file}: "${v.name}" (${v.length} chars)`)
        .join('\n');
      throw new Error(
        `Found ${violations.length} FK constraint(s) exceeding 63-char Postgres limit:\n${summary}`,
      );
    }
    expect(violations).toHaveLength(0);
  });
});
