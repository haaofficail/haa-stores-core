// SettlementOverview payout — confirm modal + double-click guard.
//
// MD_PAGES_AUDIT_PART_3_COMMERCE finding #1: the payout POST in
// apps/merchant-dashboard/src/pages/SettlementOverview.tsx historically
// fired on a single button click with no confirm step, so a fast
// double-click could create two payout requests before the first
// network round-trip completed. PR #82 added `Idempotency-Key` on every
// POST/PUT/PATCH/DELETE in `lib/api.ts`, which protects against the
// server creating duplicate ledger rows. This file locks the UI-layer
// protections that PR #82 cannot provide:
//
//   1. A confirm-modal stage exists so the merchant has to acknowledge
//      the amount + destination before the POST fires.
//   2. The trigger button is `disabled` while the modal is open or while
//      a request is in flight (state-guarded double-click protection).
//   3. The POST is only fired from the confirm stage, never directly
//      from the trigger or the amount-input stage.
//   4. Failures surface the actual API error via `messageFromError(e, t)`
//      from `@/lib/error-mapper`, not a generic toast.
//
// The repo root vitest config (`include: ['tests/**/*.test.ts']`) and
// the absence of @testing-library at the workspace root mean we can't
// mount the React tree from here without taking a new devDependency. We
// instead lock the contract via source-text assertions — the same pattern
// `tests/admin-brand-tokens.test.ts` uses to guard cross-cutting UI
// invariants. If any of these assertions fail, the audit fix has
// regressed and the audit finding must be re-opened.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const PAGE = resolve(ROOT, 'apps/merchant-dashboard/src/pages/SettlementOverview.tsx');

function readPage(): string {
  return readFileSync(PAGE, 'utf-8');
}

describe('SettlementOverview payout — confirm modal + double-click guard (audit Part 3 #1)', () => {
  it('imports the shared Dialog primitive (not an ad-hoc fixed overlay)', () => {
    const src = readPage();
    // The dialog must come from the shared primitive so it inherits
    // focus-trap, ESC handling, and overlay click semantics — the
    // ad-hoc `<div className="fixed inset-0 ...">` was rejected.
    expect(src).toMatch(/from\s+['"]@\/components\/ui\/dialog['"]/);
    expect(src).toMatch(/<Dialog\s/);
    expect(src).toMatch(/<DialogContent\b/);
    expect(src).toMatch(/<DialogTitle\b/);
  });

  it('imports messageFromError from the central error-mapper', () => {
    const src = readPage();
    // Audit Part 4 cross-cutting fix: payout failures must surface the
    // ApiClientError.code via `messageFromError`, not a generic toast.
    expect(src).toMatch(/from\s+['"]@\/lib\/error-mapper['"]/);
    expect(src).toMatch(/\bmessageFromError\s*\(/);
  });

  it('never throws away the API error message with a generic fallback', () => {
    const src = readPage();
    // The previous code used `e instanceof Error ? e.message : 'فشل...'`
    // which collapsed `ApiClientError.code` into a generic Arabic
    // string. Make sure no such collapse remains in the payout flow.
    expect(src).not.toMatch(/e instanceof Error\s*\?\s*e\.message\s*:\s*['"]فشل/);
  });

  it('has a two-stage confirm flow (input → confirm) with named stage state', () => {
    const src = readPage();
    // The stage state machine is what enforces "POST only fires from
    // the confirm stage" — a single boolean would let a stray click
    // bypass the review.
    expect(src).toMatch(/confirmStage/);
    expect(src).toMatch(/['"]input['"]/);
    expect(src).toMatch(/['"]confirm['"]/);
    // The visible confirm button must carry the explicit text from the
    // audit finding so designers and merchants can find it.
    expect(src).toMatch(/تأكيد طلب التحويل/);
  });

  it('only calls walletApi.requestPayout from inside submitPayout (single fire site)', () => {
    const src = readPage();
    // Grep all call sites of `walletApi.requestPayout` and verify
    // there is exactly one. Any second call site would re-introduce
    // the double-fire bug.
    const matches = src.match(/walletApi\.requestPayout\s*\(/g) ?? [];
    expect(matches.length).toBe(1);
    // And the single site must be inside a function named submitPayout
    // (the only stage-gated handler).
    const submitFnMatch = src.match(/const\s+submitPayout\s*=\s*async\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\n\s*\};/);
    expect(submitFnMatch).not.toBeNull();
    expect(submitFnMatch?.[0]).toMatch(/walletApi\.requestPayout\s*\(/);
  });

  it('submitPayout early-returns when `requesting` is already true (in-flight guard)', () => {
    const src = readPage();
    // The in-flight guard is what stops a double-click that lands
    // between `setRequesting(true)` and the actual await resolving.
    expect(src).toMatch(/if\s*\(\s*!storeId\s*\|\|\s*requesting\s*\)\s*return\s*;?/);
  });

  it('trigger button is disabled while modal is open or while a request is in flight', () => {
    const src = readPage();
    // The trigger button must be disabled when EITHER:
    //   - `requesting` is true (POST in flight), OR
    //   - `requestModalOpen` is true (modal already opened)
    // so a fast second click on the trigger can't open a second dialog
    // or bypass the confirm stage.
    const triggerBlockMatch = src.match(
      /data-testid="settlement-trigger"[\s\S]{0,400}/,
    );
    // The button has data-testid="settlement-trigger" so we anchor on it.
    const settlementTriggerExists = src.includes('data-testid="settlement-trigger"');
    expect(settlementTriggerExists).toBe(true);
    // Walk back from the testid to find the enclosing Button props.
    const buttonIdx = src.indexOf('data-testid="settlement-trigger"');
    const windowStart = Math.max(0, buttonIdx - 400);
    const windowEnd = Math.min(src.length, buttonIdx + 100);
    const windowSrc = src.slice(windowStart, windowEnd);
    expect(windowSrc).toMatch(/disabled\s*=\s*\{[^}]*requesting[^}]*\}/);
    expect(windowSrc).toMatch(/disabled\s*=\s*\{[^}]*requestModalOpen[^}]*\}/);
    // Suppress unused-var warnings for inspectional vars.
    expect(triggerBlockMatch).toBeDefined();
  });

  it('handleRequestPayout guards against re-opening an already-open modal', () => {
    const src = readPage();
    // The handler that opens the modal must itself short-circuit if the
    // modal is already open, so a fast double-click that lands before
    // React commits the first `setRequestModalOpen(true)` cannot fire
    // the open path twice with stale state. Named `handleRequestPayout`
    // to preserve the symbol contract asserted by
    // `tests/manual-settlement-dashboard-ux.test.ts` (already on main).
    const openFnMatch = src.match(/const\s+handleRequestPayout\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\n\s*\};/);
    expect(openFnMatch).not.toBeNull();
    expect(openFnMatch?.[0]).toMatch(/if\s*\(\s*requestModalOpen\s*\|\|\s*requesting\s*\)\s*return\s*;?/);
  });

  it('closeModal is blocked while a request is in flight (cannot orphan a payout)', () => {
    const src = readPage();
    // If the merchant could close the modal during an in-flight POST,
    // they would lose the success/failure feedback and could click the
    // trigger again. Block the close while `requesting` is true.
    const closeFnMatch = src.match(/const\s+closeModal\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\n\s*\};/);
    expect(closeFnMatch).not.toBeNull();
    expect(closeFnMatch?.[0]).toMatch(/if\s*\(\s*requesting\s*\)\s*return\s*;?/);
  });
});
