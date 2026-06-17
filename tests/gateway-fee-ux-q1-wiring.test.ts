// Wiring test for TASK-0034 sub-item 6 (Gateway fee UX, Q1).
//
// The owner decision (2026-06-16) was "You receive X" with collapsible
// breakdown, matching Saudi BNPL UX conventions. This test asserts
// the structural pieces are in place so future refactors don't silently
// remove the feature.

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

describe('Gateway fee UX (Q1) — "You receive X" hero card', () => {
  it('Wallet.tsx contains a "You receive" hero card (Q1 owner decision)', () => {
    const wallet = read('apps/merchant-dashboard/src/pages/Wallet.tsx');
    expect(wallet).toMatch(/youWillReceive|ستحصل على/);
  });

  it('Wallet.tsx hero card shows the netBalance amount prominently', () => {
    const wallet = read('apps/merchant-dashboard/src/pages/Wallet.tsx');
    // The hero card should display netBalance as the "you receive" amount
    expect(wallet).toMatch(/summary\?\.netBalance/);
    // And label it with the i18n key
    expect(wallet).toMatch(/youWillReceive/);
  });

  it('Wallet.tsx has a collapsible breakdown (native <details>/<summary>)', () => {
    const wallet = read('apps/merchant-dashboard/src/pages/Wallet.tsx');
    // The breakdown should use the dependency-free native disclosure widget
    expect(wallet).toMatch(/<details/);
    expect(wallet).toMatch(/<summary/);
    // And the i18n key for the toggle
    expect(wallet).toMatch(/viewBreakdown/);
  });

  it('Wallet.tsx breakdown shows the components: totalSales, platformFees, paymentFees, netBalance', () => {
    const wallet = read('apps/merchant-dashboard/src/pages/Wallet.tsx');
    // Each component should be present in the inline breakdown rows
    expect(wallet).toMatch(/summary\?\.totalSales/);
    expect(wallet).toMatch(/summary\?\.platformFees/);
    expect(wallet).toMatch(/summary\?\.paymentFees/);
    expect(wallet).toMatch(/summary\?\.netBalance/);
  });

  it('ar.json has the Q1 i18n keys', () => {
    const ar = read('apps/merchant-dashboard/src/i18n/locales/ar.json');
    expect(ar).toMatch(/"youWillReceive":\s*"ستحصل على"/);
    expect(ar).toMatch(/"viewBreakdown":\s*"عرض التفاصيل"/);
    expect(ar).toMatch(/"youWillReceiveHint":/);
  });
});
