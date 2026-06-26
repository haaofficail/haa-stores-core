// Storefront public pixels endpoint — route-ordering regression.
//
// Bug (B1): `GET /s/pixels?slug=:slug` returned 404 on staging. The
// public pixels route (`/pixels`, literal) is registered AFTER
// storeInfoRouter, whose catch-all `GET /:slug` matched `/pixels` first
// (treating "pixels" as a store slug → store-not-found → 404). The
// storefront calls this endpoint on every page (usePixels.ts), so it
// must never 404.
//
// This test mounts the REAL aggregated storefrontRouter and drives it
// with app.request(), so it fails if the literal `/pixels` route is ever
// shadowed by `/:slug` again. The DB client is mocked to a no-store
// result, which makes:
//   - the (buggy) /:slug path resolve to 404, and
//   - the (correct) /pixels path resolve to 200 with empty scripts.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DB client so no real database is required. Both resolveStore
// (store-info) and the pixels handler use the same
// select → from → where → limit chain. Returning [] = "store not found".
const limitMock = vi.fn().mockResolvedValue([]);
vi.mock('@haa/db', () => ({
  createDbClient: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: limitMock,
        })),
      })),
    })),
  })),
}));

// Drive the real aggregated router directly via its own `.request()`
// (Hono instances expose it). storefrontRouter mounts sub-routers at '/',
// so its routes are `/:slug` (store-info) and `/pixels` (pixels) — the
// exact ordering surface under test. Production mounts this at `/s`.
import { storefrontRouter } from '../apps/api/src/routes/storefront/index.js';

describe('Storefront public pixels endpoint (B1 route-ordering)', () => {
  beforeEach(() => {
    limitMock.mockResolvedValue([]); // default: no store
  });

  it('GET /pixels?slug=haa-demo does NOT return 404 (literal route wins over /:slug)', async () => {
    const res = await storefrontRouter.request('/pixels?slug=haa-demo');
    expect(res.status).not.toBe(404);
    expect(res.status).toBe(200);
  });

  it('returns a safe empty pixel payload when the store has no config', async () => {
    const res = await storefrontRouter.request('/pixels?slug=haa-demo');
    const body = await res.json();
    expect(body).toMatchObject({ success: true, data: { headScripts: '', bodyScripts: '' } });
  });

  it('missing slug returns 400 (reaches the pixels handler, not the /:slug 404)', async () => {
    const res = await storefrontRouter.request('/pixels');
    expect(res.status).toBe(400);
  });

  it('unknown slug does not 5xx the server', async () => {
    const res = await storefrontRouter.request('/pixels?slug=does-not-exist');
    expect(res.status).toBeLessThan(500);
  });

  it('response exposes no secret-like fields', async () => {
    const res = await storefrontRouter.request('/pixels?slug=haa-demo');
    const text = await res.text();
    expect(text).not.toMatch(/secret|api[_-]?key|password|token|sk-/i);
  });
});
