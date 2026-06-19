import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedSource = readFileSync(
  resolve(__dirname, '../packages/db/src/seed/index.ts'),
  'utf-8',
);

describe('subscription plan seed idempotency', () => {
  it('reuses an existing plan before inserting by unique code', () => {
    expect(seedSource).toMatch(
      /where\(eq\(s\.subscriptionPlans\.code, plan\.code\)\)/,
    );
    expect(seedSource).toMatch(/existingPlan \?\?/);
  });
});
