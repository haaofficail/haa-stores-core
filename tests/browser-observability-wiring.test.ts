// Contract: every browser app initializes Sentry through the same
// `initObservability()` helper, called BEFORE `ReactDOM.createRoot`.
//
// Why this test exists
// ────────────────────
//   If someone hand-rolls a second Sentry.init() call, or wires it after
//   the first React render, breadcrumbs from the initial paint are
//   lost — exactly the moments that matter when a user hits a white
//   screen. This source-grep keeps the three apps in lockstep without
//   spinning up a real DOM.
//
//   The API has its own parallel test at
//   `tests/observability-wiring.test.ts` (server-side @sentry/node).
//   This file covers the browser side (@sentry/react × 3 apps).
//
// What it enforces
// ────────────────
//   1) src/lib/observability.ts exists in each app and exports
//      `initObservability` + `isObservabilityEnabled`.
//   2) src/main.tsx imports the helper from './lib/observability'.
//   3) The `initObservability()` call appears BEFORE the first
//      `ReactDOM.createRoot(` call in main.tsx (string-index check).
//   4) The helper guards on `VITE_SENTRY_DSN` so an unset DSN means
//      zero init (no network, no overhead).
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

const APPS = [
  { name: 'storefront', dir: 'apps/storefront' },
  { name: 'merchant-dashboard', dir: 'apps/merchant-dashboard' },
  { name: 'admin-dashboard', dir: 'apps/admin-dashboard' },
] as const;

describe('Browser Sentry observability wiring contract', () => {
  for (const app of APPS) {
    describe(app.name, () => {
      const observabilityPath = resolve(ROOT, app.dir, 'src/lib/observability.ts');
      const mainPath = resolve(ROOT, app.dir, 'src/main.tsx');

      it('exposes initObservability + isObservabilityEnabled', () => {
        expect(existsSync(observabilityPath)).toBe(true);
        const src = readFileSync(observabilityPath, 'utf-8');
        expect(src).toMatch(/export function initObservability\(/);
        expect(src).toMatch(/export function isObservabilityEnabled\(/);
        expect(src).toMatch(/from '@sentry\/react'/);
      });

      it('main.tsx imports + invokes initObservability before createRoot', () => {
        const src = readFileSync(mainPath, 'utf-8');
        expect(src).toMatch(/import \{ initObservability \} from '\.\/lib\/observability'/);
        const callIdx = src.indexOf('initObservability()');
        const rootIdx = src.indexOf('ReactDOM.createRoot(');
        expect(callIdx).toBeGreaterThan(-1);
        expect(rootIdx).toBeGreaterThan(-1);
        expect(callIdx).toBeLessThan(rootIdx);
      });

      it('observability helper guards on VITE_SENTRY_DSN (no DSN → no init)', () => {
        const src = readFileSync(observabilityPath, 'utf-8');
        expect(src).toMatch(/VITE_SENTRY_DSN/);
        expect(src).toMatch(/if \(!dsn\) return false/);
      });
    });
  }
});
