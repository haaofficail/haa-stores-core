// Audit PART 4 P0 #2 — `handleSyncAll` toast must reflect actual outcome.
//
// Before this fix, `Marketplaces.tsx:handleSyncAll` called
// `toast.success(...)` unconditionally — even when the API returned
// `totalFailed > 0`. A partial failure looked exactly like a full
// success, so merchants did not realize items were left un-imported.
//
// The fix branches on `(totalSynced, totalFailed)`:
//   - `totalFailed > 0 && totalSucceeded === 0` → toast.error
//   - `totalFailed > 0 && totalSucceeded  > 0` → toast.warning
//   - `totalFailed === 0 && totalSucceeded > 0` → toast.success
//   - both zero                                 → toast.success (empty)
//
// We assert the policy in two ways:
//   1. Pure-logic test of the `classifySyncOutcome` decision (mirrors
//      the branching in the page).
//   2. Source-shape assertions on `Marketplaces.tsx` so a regression
//      that drops the branching (e.g. someone re-introducing a single
//      `toast.success`) fails this test in CI even if no one re-mounts
//      the React tree.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─────────────────────────────────────────────────────────────────────
// 1) Pure decision logic — mirrors the branching in handleSyncAll
// ─────────────────────────────────────────────────────────────────────

type SyncOutcome = 'success' | 'warning' | 'error' | 'empty';

function classifySyncOutcome(totalSucceeded: number, totalFailed: number): SyncOutcome {
  if (totalFailed > 0 && totalSucceeded === 0) return 'error';
  if (totalFailed > 0 && totalSucceeded > 0) return 'warning';
  if (totalSucceeded > 0) return 'success';
  return 'empty';
}

describe('marketplaces syncAll toast classification (audit PART 4 P0 #2)', () => {
  it('total failure → error toast (totalFailed=3, totalSucceeded=0)', () => {
    expect(classifySyncOutcome(0, 3)).toBe('error');
  });

  it('partial failure → warning toast (totalFailed=2, totalSucceeded=5)', () => {
    // The pre-fix bug: this case showed `toast.success` with description
    // "5 عنصر مستورد، 2 فشل" — merchant misses the 2 failures.
    expect(classifySyncOutcome(5, 2)).toBe('warning');
  });

  it('clean success → success toast (totalFailed=0, totalSucceeded=10)', () => {
    expect(classifySyncOutcome(10, 0)).toBe('success');
  });

  it('nothing to sync → empty/info toast (totalFailed=0, totalSucceeded=0)', () => {
    // Treat as benign empty result, not error.
    expect(classifySyncOutcome(0, 0)).toBe('empty');
  });

  it('boundary: single failure with zero success → error (not success)', () => {
    expect(classifySyncOutcome(0, 1)).toBe('error');
  });

  it('boundary: single failure with single success → warning (not success)', () => {
    expect(classifySyncOutcome(1, 1)).toBe('warning');
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2) Source-shape regression — make sure the page is wired to the policy
// ─────────────────────────────────────────────────────────────────────

const MARKETPLACES_PATH = resolve(
  __dirname,
  '..',
  'apps',
  'merchant-dashboard',
  'src',
  'pages',
  'Marketplaces.tsx',
);

function readMarketplacesSource(): string {
  return readFileSync(MARKETPLACES_PATH, 'utf8');
}

describe('Marketplaces.tsx handleSyncAll wiring (audit PART 4 P0 #2)', () => {
  const src = readMarketplacesSource();

  it('handleSyncAll exists and reads totalFailed from the API result', () => {
    expect(src).toMatch(/handleSyncAll/);
    expect(src).toMatch(/totalFailed/);
  });

  it('handleSyncAll inspects totalSynced (api succeeded count)', () => {
    expect(src).toMatch(/totalSynced/);
  });

  it('handleSyncAll calls toast.error for total-failure case', () => {
    // Regression guard: someone removing the error branch will trip
    // this. We do not check exact wording — only the call shape.
    expect(src).toMatch(/toast\.error\(/);
  });

  it('handleSyncAll calls toast.warning for partial-failure case', () => {
    // Critical: the pre-fix code never used toast.warning here.
    // Keeping this assertion narrow to the file ensures the warning
    // branch stays wired.
    expect(src).toMatch(/toast\.warning\(/);
  });

  it('handleSyncAll calls toast.success only behind a guard (not unconditional)', () => {
    // Pre-fix shape: `await marketplaceApi.syncAll(...); toast.success(...);`
    // with no branching in between. We assert there's at least one
    // conditional between the API call and a toast.success.
    const after = src.split(/marketplaceApi\.syncAll/)[1] ?? '';
    expect(after).toMatch(/totalFailed/);
    // A guard `if (...totalFailed... ) {` MUST appear before any
    // success toast in the handler. We extract a window starting at
    // the handler declaration AND strip line comments first so the
    // assertion doesn't match `toast.success` text inside a `//` doc
    // comment.
    const handlerStart = src.indexOf('const handleSyncAll');
    expect(handlerStart).toBeGreaterThanOrEqual(0);
    const handlerEnd = src.indexOf('}, [storeId, syncing, load, t]);', handlerStart);
    expect(handlerEnd).toBeGreaterThan(handlerStart);
    const rawSlice = src.slice(handlerStart, handlerEnd);
    // Strip `//` line comments — without this, the comment that
    // explains the bug we are fixing ("...showed `toast.success`...")
    // matches as a real call site.
    const handlerSlice = rawSlice
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n');
    expect(handlerSlice.length).toBeGreaterThan(0);
    const guardIdx = handlerSlice.search(/if\s*\(\s*[^)]*totalFailed/);
    const successIdx = handlerSlice.indexOf('toast.success');
    expect(guardIdx).toBeGreaterThanOrEqual(0);
    expect(successIdx).toBeGreaterThan(guardIdx);
  });

  it('uses messageFromError(...) in the catch path', () => {
    // Replaces the old generic `toast.error(t("...فشلت المزامنة الكلية"))`
    // with the central error mapper so API-emitted codes (e.g.
    // RATE_LIMITED, UNAUTHORIZED) surface a useful Arabic message.
    expect(src).toMatch(/messageFromError\(/);
  });
});
