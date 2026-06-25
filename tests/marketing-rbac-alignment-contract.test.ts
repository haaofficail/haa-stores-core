// Marketing routes — RBAC alignment contract.
//
// The audit (P0 #8, 2026-06-25) showed that three write-side marketing
// endpoints were guarded only by `reports:read` — meaning any user
// with read access to reports could mutate marketing actions and
// thresholds, including a one-click trigger for an expensive
// server-side generation pass.
//
// Fix: writes (PATCH /actions/:id, POST /actions/generate, PATCH
// /settings) now require `promotions:update`. Reads stay on
// `reports:read` so analytics-focused roles can still view the data.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(
  resolve(__dirname, '../apps/api/src/routes/marketing.ts'),
  'utf-8',
);

describe('Marketing — RBAC alignment', () => {
  it('PATCH /actions/:id requires promotions:update', () => {
    const idx = SRC.indexOf("marketingRouter.patch('/actions/:id'");
    expect(idx).toBeGreaterThan(0);
    const line = SRC.slice(idx, idx + 200);
    expect(line).toMatch(/requirePermission\(['"]promotions:update['"]\)/);
    expect(line).not.toMatch(/requirePermission\(['"]reports:read['"]\)/);
  });

  it('POST /actions/generate requires promotions:update', () => {
    const idx = SRC.indexOf("marketingRouter.post('/actions/generate'");
    expect(idx).toBeGreaterThan(0);
    const line = SRC.slice(idx, idx + 200);
    expect(line).toMatch(/requirePermission\(['"]promotions:update['"]\)/);
    expect(line).not.toMatch(/requirePermission\(['"]reports:read['"]\)/);
  });

  it('PATCH /settings requires promotions:update', () => {
    const idx = SRC.indexOf("marketingRouter.patch('/settings'");
    expect(idx).toBeGreaterThan(0);
    const line = SRC.slice(idx, idx + 200);
    expect(line).toMatch(/requirePermission\(['"]promotions:update['"]\)/);
    expect(line).not.toMatch(/requirePermission\(['"]reports:read['"]\)/);
  });

  it('READ endpoints stay on reports:read (no over-correction)', () => {
    // We did not block analytics-only viewers from SEEING the
    // actions/thresholds. Only the write side was tightened. The
    // GET /actions, GET /actions/:id, GET /settings, GET /segments
    // still use reports:read.
    const getActions = SRC.indexOf("marketingRouter.get('/actions'");
    expect(getActions).toBeGreaterThan(0);
    expect(SRC.slice(getActions, getActions + 200)).toMatch(/requirePermission\(['"]reports:read['"]\)/);

    const getSettings = SRC.indexOf("marketingRouter.get('/settings'");
    expect(getSettings).toBeGreaterThan(0);
    expect(SRC.slice(getSettings, getSettings + 200)).toMatch(/requirePermission\(['"]reports:read['"]\)/);
  });
});
