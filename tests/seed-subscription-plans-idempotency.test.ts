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

  it('creates carts before checkout sessions instead of using random foreign keys', () => {
    expect(seedSource).toMatch(/const \[checkoutCart\] = await db[\s\S]*insert\(s\.carts\)/);
    expect(seedSource).toMatch(/cartId: checkoutCart\.id/);
    expect(seedSource).toMatch(
      /const \[abandonedCart\] = await db[\s\S]*insert\(s\.carts\)/,
    );
    expect(seedSource).toMatch(/cartId: abandonedCart\.id/);
    expect(seedSource).not.toMatch(/cartId: crypto\.randomUUID\(\)/);
  });
});
