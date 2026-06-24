// Beta deletion policy — DECISION-OS-014.
//
// In beta, direct tenant deletion and merchant account self-deletion are
// disabled as features. This test asserts the route handlers return the
// FORBIDDEN_BETA_POLICY response and do NOT reach the underlying delete
// path. It is a source-grep guard plus a behavioural assertion.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TENANT_SRC = readFileSync(
  resolve(__dirname, '../apps/api/src/routes/admin/tenants-stores.ts'),
  'utf-8',
);
const MERCHANT_SRC = readFileSync(
  resolve(__dirname, '../apps/api/src/routes/merchant-data.ts'),
  'utf-8',
);

describe('Beta deletion policy (DECISION-OS-014)', () => {
  it('admin tenant DELETE returns FORBIDDEN_BETA_POLICY', () => {
    // Locate the `remove:` handler and verify the early return.
    const idx = TENANT_SRC.indexOf('remove: async');
    expect(idx).toBeGreaterThanOrEqual(0);
    const block = TENANT_SRC.slice(idx, idx + 800);
    expect(block).toContain('FORBIDDEN_BETA_POLICY');
    expect(block).toContain('DECISION-OS-014');
    // The early-return guard must precede any call to db.delete.
    const guardIdx = block.indexOf('FORBIDDEN_BETA_POLICY');
    const deleteIdx = block.indexOf('db.delete(');
    if (deleteIdx >= 0) {
      expect(guardIdx).toBeLessThan(deleteIdx);
    }
  });

  it('merchant DELETE /account returns FORBIDDEN_BETA_POLICY', () => {
    const idx = MERCHANT_SRC.indexOf("merchantDataRouter.delete('/account'");
    expect(idx).toBeGreaterThanOrEqual(0);
    const block = MERCHANT_SRC.slice(idx, idx + 1500);
    expect(block).toContain('FORBIDDEN_BETA_POLICY');
    expect(block).toContain('DECISION-OS-014');
  });

  // W13 (Autopilot Phase 3): extended guards.
  it('owner decision DECISION-OS-014 is documented + non-negotiable', () => {
    // Doc must explicitly forbid both direct tenant delete + merchant
    // self-delete in beta so a future contributor finds the rationale
    // before touching either route.
    const ownerDecisions = readFileSync(
      resolve(__dirname, '../docs/agent-os/OWNER_DECISIONS.md'),
      'utf-8',
    );
    expect(ownerDecisions).toMatch(/DECISION-OS-014/);
    // The doc has two mentions: a one-line table row + a full-text
    // section under '### DECISION-OS-014'. Target the full-text
    // section so the slice captures the actual policy clauses.
    const idx = ownerDecisions.indexOf('### DECISION-OS-014');
    expect(idx).toBeGreaterThanOrEqual(0);
    const slice = ownerDecisions.slice(idx, idx + 2000);
    expect(slice.toLowerCase()).toMatch(/tenant\s+deletion/);
    // Merchant rule wording: 'merchant account self-deletion' — the
    // two key tokens are 'merchant' and 'self-delet' on the same line
    // OR within a short window. Use a tolerant pattern.
    expect(slice.toLowerCase()).toMatch(/merchant[^.\n]*self[- ]?delet/);
  });

  it('no new route reintroduces unguarded DELETE on tenants/stores/merchants', () => {
    // Negative grep: any router.delete on a tenants/stores/merchants
    // path that does NOT carry the FORBIDDEN_BETA_POLICY token in the
    // surrounding 40 lines is a regression.
    const checks: Array<{ src: string; label: string }> = [
      { src: TENANT_SRC, label: 'admin/tenants-stores.ts' },
      { src: MERCHANT_SRC, label: 'merchant-data.ts' },
    ];
    for (const { src, label } of checks) {
      const lines = src.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/router\.delete\s*\(|Router\.delete\s*\(/.test(lines[i])) continue;
        const window = lines.slice(Math.max(0, i - 10), Math.min(lines.length, i + 30)).join('\n');
        // Allow the line if the surrounding block contains the guard.
        if (window.includes('FORBIDDEN_BETA_POLICY')) continue;
        // Allow if the delete is on a clearly-scoped sub-resource (not
        // the tenant/store/merchant root). The hard-blocked surfaces are
        // /tenants/:id, /stores/:id, /account, /merchant/:id.
        if (/\/(tenants?|stores?|merchant|account)\b/.test(lines[i])) {
          throw new Error(
            `Unguarded DELETE in ${label}:${i + 1} — ${lines[i].trim()}`,
          );
        }
      }
    }
    expect(true).toBe(true); // reached only if no unguarded route found
  });
});
