import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaDir = resolve(__dirname, '../packages/db/src/schema');

describe('Quality Pass 1 — Schema Deduplication', () => {
  it('marketing-actions.ts (legacy) must NOT exist', () => {
    const legacyFile = resolve(schemaDir, 'marketing-actions.ts');
    expect(existsSync(legacyFile)).toBe(false);
  });

  it('marketing_actions.ts (canonical) must exist', () => {
    const canonicalFile = resolve(schemaDir, 'marketing_actions.ts');
    expect(existsSync(canonicalFile)).toBe(true);
  });
});

describe('Quality Pass 1 — Marketing Action Schema Completeness', () => {
  it('must export marketingActionSettings, marketingActionStates, marketingActionLogs', async () => {
    const mod = await import('@haa/db/schema');
    expect(mod.marketingActionSettings).toBeDefined();
    expect(mod.marketingActionStates).toBeDefined();
    expect(mod.marketingActionLogs).toBeDefined();
  });

  it('marketingActionSettings must have storeId, key, valueJson columns', async () => {
    const mod = await import('@haa/db/schema');
    const t = mod.marketingActionSettings;
    expect(t.storeId).toBeDefined();
    expect(t.key).toBeDefined();
    expect(t.valueJson).toBeDefined();
  });

  it('marketingActionStates must have storeId, actionFingerprint, actionType, status', async () => {
    const mod = await import('@haa/db/schema');
    const t = mod.marketingActionStates;
    expect(t.storeId).toBeDefined();
    expect(t.actionFingerprint).toBeDefined();
    expect(t.actionType).toBeDefined();
    expect(t.status).toBeDefined();
  });

  it('marketingActionLogs must have storeId, actionFingerprint, actionType, event, metadata', async () => {
    const mod = await import('@haa/db/schema');
    const t = mod.marketingActionLogs;
    expect(t.storeId).toBeDefined();
    expect(t.actionFingerprint).toBeDefined();
    expect(t.actionType).toBeDefined();
    expect(t.event).toBeDefined();
    expect(t.metadata).toBeDefined();
  });
});
