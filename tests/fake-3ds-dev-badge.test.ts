import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '..');
const fake3dsPage = readFileSync(resolve(projectRoot, 'apps/storefront/src/pages/Fake3DSChallenge.tsx'), 'utf-8');
const appRoutes = readFileSync(resolve(projectRoot, 'apps/storefront/src/App.tsx'), 'utf-8');

describe('Fake 3DS dev badge', () => {
  it('renders a stable visible DEV/test badge on the fake challenge page', () => {
    expect(fake3dsPage).toContain('data-testid="fake-3ds-dev-badge"');
    expect(fake3dsPage).toContain('<output');
    expect(fake3dsPage).toContain('aria-label="DEV only fake 3DS challenge"');
    expect(fake3dsPage).toContain('DEV TEST');
    expect(fake3dsPage).toContain('محاكاة محلية فقط');
    expect(fake3dsPage).toContain('ليست تحدي بنك أو دفع حقيقي');
  });

  it('keeps the fake challenge route DEV-gated', () => {
    expect(appRoutes).toContain('{import.meta.env.DEV && (');
    expect(appRoutes).toContain('path="/fake-3ds-challenge"');
    expect(appRoutes).toContain('element={<Fake3DSChallenge />}');
  });
});
