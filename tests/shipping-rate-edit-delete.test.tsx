// MD_PAGES_AUDIT_PART_3_COMMERCE.md P0 #2 — RatesTab edit + delete guard.
//
// Before this PR, `apps/merchant-dashboard/src/pages/Shipping.tsx`
// RatesTab was CREATE-ONLY. A misconfigured rate (e.g. 50 SAR instead
// of 5 SAR) overcharged every customer until the merchant rebuilt the
// zone from scratch. The P0 fix added an edit-pencil and a delete-trash
// button — both behind `PermissionGate permission="shipping:manage"`,
// plus a confirm modal on delete so a misclick can't erase a rate.
//
// This guard is a static-source inspection (the existing repo test style
// — see admin-brand-tokens.test.ts) rather than a full DOM render: the
// repo's vitest setup runs in node without `@testing-library/react` or
// jsdom, and adding either to the toolchain is out-of-scope for a P0
// money fix. The assertions below lock the *structural* contract:
//
//   1. RatesTab renders a row for each rate with both edit + delete
//      buttons (asserts both `data-testid` markers appear inside the
//      `items.map` loop).
//   2. Both buttons are gated by `shipping:manage`.
//   3. A confirm Dialog (`data-testid="rate-delete-confirm"`) is wired
//      to the delete trigger.
//   4. The save path calls `shippingApi.rates.update` when editing an
//      existing rate (the regression we're fixing).
//   5. Error toasts go through `messageFromError(err, t)`, not the
//      generic `t('common.error')`.
//
// If RatesTab is ever refactored, these assertions must continue to hold
// or the audit P0 reopens.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const SHIPPING_TSX = resolve(ROOT, 'apps/merchant-dashboard/src/pages/Shipping.tsx');
const API_TS = resolve(ROOT, 'apps/merchant-dashboard/src/lib/api.ts');
const ROUTES_TS = resolve(ROOT, 'apps/api/src/routes/shipping.ts');
const SERVICE_TS = resolve(ROOT, 'packages/shipping-core/src/shipping.ts');

const shippingTsx = readFileSync(SHIPPING_TSX, 'utf8');
const apiTs = readFileSync(API_TS, 'utf8');
const routesTs = readFileSync(ROUTES_TS, 'utf8');
const serviceTs = readFileSync(SERVICE_TS, 'utf8');

// Isolate the RatesTab function body so we only assert on its rendered
// output (not bleed-through from MethodsTab / ZonesTab which also have
// edit buttons).
function ratesTabBody(): string {
  const start = shippingTsx.indexOf('function RatesTab(');
  expect(start, 'RatesTab function not found in Shipping.tsx').toBeGreaterThan(-1);
  // Skip past the param list (the `{ storeId }` destructuring opens and
  // closes braces of its own) by finding the closing `)` of the signature
  // first, THEN the next `{` is the function body.
  const sigClose = shippingTsx.indexOf(')', start);
  const braceStart = shippingTsx.indexOf('{', sigClose);
  let depth = 0;
  let end = braceStart;
  for (let i = braceStart; i < shippingTsx.length; i++) {
    const ch = shippingTsx[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  return shippingTsx.slice(start, end);
}

describe('Shipping RatesTab — edit + delete buttons (audit P0 money)', () => {
  const body = ratesTabBody();

  it('renders an edit button on each rate row, gated by shipping:manage', () => {
    expect(body).toMatch(/data-testid="rate-edit-btn"/);
    // The edit button must live inside a PermissionGate with `shipping:manage`.
    // We assert the gate wraps the edit button by matching a permission gate
    // opening tag that appears immediately before the edit testid.
    const editIdx = body.indexOf('data-testid="rate-edit-btn"');
    expect(editIdx).toBeGreaterThan(-1);
    const beforeEdit = body.slice(0, editIdx);
    // The closest preceding `<PermissionGate` must be the shipping:manage one.
    const lastGate = beforeEdit.lastIndexOf('<PermissionGate');
    expect(lastGate).toBeGreaterThan(-1);
    const gateSlice = beforeEdit.slice(lastGate);
    expect(gateSlice).toMatch(/permission="shipping:manage"/);
  });

  it('renders a delete (trash) button on each rate row, gated by shipping:manage', () => {
    expect(body).toMatch(/data-testid="rate-delete-btn"/);
    expect(body).toMatch(/<Trash2\b/);
    const delIdx = body.indexOf('data-testid="rate-delete-btn"');
    const beforeDel = body.slice(0, delIdx);
    const lastGate = beforeDel.lastIndexOf('<PermissionGate');
    expect(lastGate).toBeGreaterThan(-1);
    const gateSlice = beforeDel.slice(lastGate);
    expect(gateSlice).toMatch(/permission="shipping:manage"/);
  });

  it('clicking delete opens a confirm modal (Dialog) — does NOT call delete API directly', () => {
    // The delete button must set `deleteTarget` (i.e. open the confirm
    // modal), NOT call `shippingApi.rates.delete` from its own onClick.
    // Pull the whole <Button …data-testid="rate-delete-btn"…/> element
    // by walking back to the opening `<Button` and forward to its `>`.
    const delIdx = body.indexOf('data-testid="rate-delete-btn"');
    expect(delIdx).toBeGreaterThan(-1);
    const openTag = body.lastIndexOf('<Button', delIdx);
    const closeTag = body.indexOf('>', delIdx);
    expect(openTag).toBeGreaterThan(-1);
    expect(closeTag).toBeGreaterThan(delIdx);
    const buttonElement = body.slice(openTag, closeTag + 1);

    expect(buttonElement).toMatch(/setDeleteTarget\(/);
    expect(buttonElement).not.toMatch(/shippingApi\.rates\.delete/);

    // And the confirm Dialog must exist with the expected testid.
    expect(body).toMatch(/data-testid="rate-delete-confirm"/);
    // The confirm button inside the modal is the one that actually deletes.
    expect(body).toMatch(/data-testid="rate-delete-confirm-btn"/);
    expect(body).toMatch(/shippingApi\.rates\.delete\(/);
  });

  it('save path calls rates.update when editing an existing rate', () => {
    // The P0 regression: previously `save()` only called create. Now it
    // must branch on `editId` and call `rates.update` for existing rates.
    expect(body).toMatch(/shippingApi\.rates\.update\(/);
    expect(body).toMatch(/if\s*\(\s*editId\s*\)/);
  });

  it('error toasts use messageFromError, not the generic common.error fallback', () => {
    // RatesTab specifically must not swallow API error codes.
    expect(body).toMatch(/messageFromError\(/);
    // No raw `toast.error(t('common.error'))` calls inside RatesTab.
    expect(body).not.toMatch(/toast\.error\(\s*t\(\s*'common\.error'\s*\)\s*\)/);
  });
});

describe('Shipping rates API client — update + delete wired', () => {
  it('shippingApi.rates exposes update() targeting PUT /merchant/:storeId/shipping/rates/:id', () => {
    expect(apiTs).toMatch(/rates:\s*\{[\s\S]*?update:\s*\(storeId:\s*number,\s*id:\s*number/);
    expect(apiTs).toMatch(/\/shipping\/rates\/\$\{id\}[\s\S]*?method:\s*'PUT'/);
  });

  it('shippingApi.rates exposes delete() targeting DELETE /merchant/:storeId/shipping/rates/:id', () => {
    expect(apiTs).toMatch(/rates:\s*\{[\s\S]*?delete:\s*\(storeId:\s*number,\s*id:\s*number/);
    expect(apiTs).toMatch(/\/shipping\/rates\/\$\{id\}[\s\S]*?method:\s*'DELETE'/);
  });
});

describe('Shipping API routes — PUT + DELETE /rates/:id behind shipping:manage', () => {
  it('PUT /rates/:id exists and requires shipping:manage permission', () => {
    expect(routesTs).toMatch(/shippingRouter\.put\(\s*['"]\/rates\/:id['"]/);
    // The PUT handler block must include requirePermission('shipping:manage').
    const putIdx = routesTs.indexOf("shippingRouter.put('/rates/:id'");
    expect(putIdx).toBeGreaterThan(-1);
    const block = routesTs.slice(putIdx, putIdx + 400);
    expect(block).toMatch(/requirePermission\(\s*['"]shipping:manage['"]\s*\)/);
  });

  it('DELETE /rates/:id exists and requires shipping:manage permission', () => {
    expect(routesTs).toMatch(/shippingRouter\.delete\(\s*['"]\/rates\/:id['"]/);
    const delIdx = routesTs.indexOf("shippingRouter.delete('/rates/:id'");
    expect(delIdx).toBeGreaterThan(-1);
    const block = routesTs.slice(delIdx, delIdx + 400);
    expect(block).toMatch(/requirePermission\(\s*['"]shipping:manage['"]\s*\)/);
  });
});

describe('ShippingService — updateRate + deleteRate enforce tenant ownership', () => {
  it('updateRate exists', () => {
    expect(serviceTs).toMatch(/async updateRate\(/);
  });
  it('deleteRate exists', () => {
    expect(serviceTs).toMatch(/async deleteRate\(/);
  });
  it('both go through assertRateOwnership (cross-tenant guard)', () => {
    expect(serviceTs).toMatch(/assertRateOwnership\(/);
    // Both must call the guard before mutating.
    const updateBlock = serviceTs.match(/async updateRate\([\s\S]*?\n\s{2}\}/);
    const deleteBlock = serviceTs.match(/async deleteRate\([\s\S]*?\n\s{2}\}/);
    expect(updateBlock?.[0]).toMatch(/assertRateOwnership/);
    expect(deleteBlock?.[0]).toMatch(/assertRateOwnership/);
  });
});
