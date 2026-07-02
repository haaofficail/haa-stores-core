// P1-15 audit fix — the "متجر تجريبي" (demo store) sidebar badge used to
// render unconditionally for every merchant, real or demo. It now only
// shows when the active store's real `isDemo` flag (fetched via
// settingsApi.get, same flag CheckoutService uses to route to
// FakePaymentProvider) is true.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SIDEBAR = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/components/layout/Sidebar.tsx'),
  'utf-8',
);

describe('Sidebar — demo store badge', () => {
  it('gates the badge on a real isDemoStore state, not unconditional', () => {
    expect(SIDEBAR).toMatch(/\{isDemoStore\s*&&\s*\(/);
  });

  it('derives isDemoStore from the store settings API (isDemo field), not a hardcoded value', () => {
    expect(SIDEBAR).toMatch(/settingsApi\.get\(storeId\)/);
    expect(SIDEBAR).toMatch(/store\s*as\s*\{\s*isDemo\?:\s*boolean\s*\}\)\?\.\s*isDemo/);
  });
});
