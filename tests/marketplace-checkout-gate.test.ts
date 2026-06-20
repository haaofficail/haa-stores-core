import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync(new URL('../apps/storefront/src/pages/MarketplaceCheckout.tsx', import.meta.url), 'utf-8');

describe('Marketplace checkout production gate (QA B3/MC6)', () => {
  it('defines a feature gate defaulting OFF in production', () => {
    expect(src).toContain('MARKETPLACE_CHECKOUT_ENABLED');
    expect(src).toMatch(/import\.meta\.env\.DEV\s*\|\|\s*import\.meta\.env\.VITE_ENABLE_MARKETPLACE_CHECKOUT === 'true'/);
  });
  it('guards the submit orchestration behind the gate', () => {
    const submitIdx = src.indexOf('const submit = async () =>');
    const guardIdx = src.indexOf('if (!MARKETPLACE_CHECKOUT_ENABLED) return;');
    expect(guardIdx).toBeGreaterThan(submitIdx);
  });
  it('renders an unavailable state instead of the orchestration form when gated', () => {
    expect(src).toContain('if (!MARKETPLACE_CHECKOUT_ENABLED) {');
    expect(src).toContain('غير متاح حالياً');
  });
});
