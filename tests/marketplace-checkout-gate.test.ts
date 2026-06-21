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

  it('the disabled gate is a RENDER-level early return (after submit, before the form)', () => {
    const submitEnd = src.lastIndexOf('setSubmitting(false)'); // inside submit's finally
    const disabledNotice = src.indexOf('غير متاح حالياً');
    const formReturn = src.lastIndexOf('return ('); // the main form render
    expect(submitEnd).toBeGreaterThan(0);
    expect(disabledNotice).toBeGreaterThan(submitEnd); // gate lives in render scope, not submit
    expect(disabledNotice).toBeLessThan(formReturn);   // gate precedes (blocks) the form
  });

  it('does not return JSX from inside the submit handler (the old broken gate)', () => {
    const submitStart = src.indexOf('const submit = async () =>');
    const submitEnd = src.indexOf('setSubmitting(false)');
    const submitBody = src.slice(submitStart, submitEnd);
    expect(submitBody).not.toContain('غير متاح'); // no unreachable JSX gate inside submit
  });
});
