import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, '../packages/db/src/migrations');

describe('Quality Pass 1 — Migration Deduplication', () => {
  it('0046_smiling_phil_sheldon.sql must NOT exist (split into 0047 + 0048)', () => {
    const legacyFile = resolve(migrationsDir, '0046_smiling_phil_sheldon.sql');
    expect(existsSync(legacyFile)).toBe(false);
  });

  it('0047_store_demo_flags.sql must exist (unique content extracted)', () => {
    const newFile = resolve(migrationsDir, '0047_store_demo_flags.sql');
    expect(existsSync(newFile)).toBe(true);
  });

  it('0048_repair_marketing_action_tables.sql must exist (idempotent repair)', () => {
    const newFile = resolve(migrationsDir, '0048_repair_marketing_action_tables.sql');
    expect(existsSync(newFile)).toBe(true);
  });
});
