// Products — race-guard + post-create flow contract.
//
// Two fixes from the audit:
//
//   1) Race condition (P0 #25): loadProducts() fires Promise.all over
//      categories/brands/tags AND a parallel productsApi.list. With
//      no token guard, fast filter changes could resolve in reverse
//      order and the merchant would see the OLDER response's data
//      sitting in state.
//
//   2) Post-create flow (P0 #26): after creating a product, the old
//      code closed the dialog and IMMEDIATELY re-opened it via
//      openEdit(created.id). The visible result was a flicker and a
//      half-rendered form. The dialog stays closed now and the new
//      product appears in the refreshed list.
//
// Audit reference: P0 #25, #26 (2026-06-25).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/pages/Products.tsx'),
  'utf-8',
);

describe('Products — race-guarded loadProducts', () => {
  it('declares a monotonic loadIdRef', () => {
    expect(SRC).toMatch(/loadIdRef\s*=\s*useRef\(0\)/);
  });

  it('every call to loadProducts captures a local id from ++loadIdRef.current', () => {
    expect(SRC).toMatch(/const\s+myLoadId\s*=\s*\+\+loadIdRef\.current/);
  });

  it('all 4 response paths (categories.then, categories.catch, products.then, products.catch) drop on stale id', () => {
    // The stale-drop pattern: `if (myLoadId !== loadIdRef.current) return;`
    const occurrences = SRC.match(/myLoadId\s*!==\s*loadIdRef\.current/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(5); // 4 callbacks + finally
  });

  it('setLoading(false) only fires for the latest in-flight call', () => {
    // The previous code unconditionally set loading=false in
    // `.finally`, so an older stale response would clear the
    // loading state while the newer one was still fetching.
    const finallyIdx = SRC.indexOf('.finally(() => {');
    expect(finallyIdx).toBeGreaterThan(0);
    const block = SRC.slice(finallyIdx, finallyIdx + 200);
    expect(block).toMatch(/myLoadId\s*!==\s*loadIdRef\.current/);
  });
});

describe('Products — post-create flow', () => {
  it('does NOT close-then-reopen the dialog via openEdit', () => {
    // The historic bug: after `await productsApi.create`, the code
    // ran `setDialogOpen(false); if (created?.id) await openEdit(created.id);`
    // which immediately reopened the dialog → flicker + lost form
    // state. The fix removes the openEdit chain entirely.
    expect(SRC).not.toMatch(/setDialogOpen\(false\);[\s\n]*if\s*\(created\?\.id\)\s*\{?[\s\n]*await\s+openEdit\(created\.id\)/);
  });

  it('the create branch refreshes the list and closes the dialog', () => {
    // The Successful create path must call loadProducts() (refresh
    // the table) and setDialogOpen(false) (close the dialog) — and
    // return out of the function so we don't fall through to the
    // edit fallback.
    const createBlock = SRC.slice(SRC.indexOf('productsApi.create'), SRC.indexOf('productsApi.create') + 2200);
    expect(createBlock).toMatch(/loadProducts\(\)/);
    expect(createBlock).toMatch(/setDialogOpen\(false\)/);
  });
});
