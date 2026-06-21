import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const dtoPath = resolve(projectRoot, 'packages/shared/src/dto/storefront-dto.ts');

const _splitFiles = [
  'apps/api/src/routes/storefront/cart.ts',
  'apps/api/src/routes/storefront/products.ts',
  'apps/api/src/routes/storefront/checkout.ts',
  'apps/api/src/routes/storefront/store-info.ts',
  'apps/api/src/routes/storefront/support.ts',
  'apps/api/src/routes/storefront/index.ts',
  'apps/api/src/routes/storefront/_shared.ts',
] as const;

function readSplit(name: string): string {
  return readFileSync(resolve(projectRoot, name), 'utf-8');
}

describe('Quality Pass 2 — Item 2.1: Extract toPublic* helpers to shared DTO module', () => {
  it('packages/shared/src/dto/storefront-dto.ts must exist', () => {
    expect(existsSync(dtoPath)).toBe(true);
  });

  it('storefront-dto.ts must export toPublicProduct', () => {
    const content = readFileSync(dtoPath, 'utf-8');
    expect(content).toMatch(/export\s+function\s+toPublicProduct/);
  });

  it('storefront-dto.ts must export toPublicOrder', () => {
    const content = readFileSync(dtoPath, 'utf-8');
    expect(content).toMatch(/export\s+function\s+toPublicOrder/);
  });

  it('storefront-dto.ts must export toPublicStore', () => {
    const content = readFileSync(dtoPath, 'utf-8');
    expect(content).toMatch(/export\s+function\s+toPublicStore/);
  });

  it('storefront-dto.ts must export toPublicCart', () => {
    const content = readFileSync(dtoPath, 'utf-8');
    expect(content).toMatch(/export\s+function\s+toPublicCart/);
  });

  it('storefront-dto.ts must export toPublicCategory', () => {
    const content = readFileSync(dtoPath, 'utf-8');
    expect(content).toMatch(/export\s+function\s+toPublicCategory/);
  });

  it('storefront-dto.ts must export toPublicShippingMethod', () => {
    const content = readFileSync(dtoPath, 'utf-8');
    expect(content).toMatch(/export\s+function\s+toPublicShippingMethod/);
  });

  it('storefront-dto.ts must export toPublicPolicy', () => {
    const content = readFileSync(dtoPath, 'utf-8');
    expect(content).toMatch(/export\s+function\s+toPublicPolicy/);
  });

  it('split files import toPublic* from shared DTO module (not define them locally)', () => {
    const fileUsingProduct = [
      'apps/api/src/routes/storefront/products.ts',
      'apps/api/src/routes/storefront/cart.ts',
    ];
    for (const f of fileUsingProduct) {
      const content = readSplit(f);
      // Should NOT have local definitions of these functions anymore
      expect(content).not.toMatch(/^function toPublicProduct/m);
      // Should import from shared
      expect(content).toMatch(/import.*from.*@haa\/shared\/dto\/storefront-dto/);
    }

    const checkoutFile = readSplit('apps/api/src/routes/storefront/checkout.ts');
    expect(checkoutFile).not.toMatch(/^function toPublicOrder/m);
    expect(checkoutFile).toMatch(/import.*from.*@haa\/shared\/dto\/storefront-dto/);

    const storeInfoFile = readSplit('apps/api/src/routes/storefront/store-info.ts');
    expect(storeInfoFile).not.toMatch(/^function toPublicStore/m);
    expect(storeInfoFile).toMatch(/import.*from.*@haa\/shared\/dto\/storefront-dto/);

    const supportFile = readSplit('apps/api/src/routes/storefront/support.ts');
    expect(supportFile).not.toMatch(/^function toPublicPolicy/m);
    expect(supportFile).toMatch(/import.*from.*@haa\/shared\/dto\/storefront-dto/);
  });

  it('public-api.ts must also import toPublic* from shared DTO module', () => {
    const content = readFileSync(
      resolve(projectRoot, 'apps/api/src/routes/public-api.ts'),
      'utf-8',
    );
    expect(content).not.toMatch(/^function toPublicProduct/m);
    expect(content).not.toMatch(/^function toPublicOrder/m);
    expect(content).toMatch(/import.*from.*@haa\/shared\/dto\/storefront-dto/);
  });
});
