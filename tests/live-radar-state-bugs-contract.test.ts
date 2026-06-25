// LiveRadar — state-bugs cleanup contract.
//
// Three bugs were repaired here:
//
// 1) `setLoading(false)` was the FIRST line of loadData, so the
//    initial-mount skeleton was hidden before any fetch started.
//    Merchants opening the page saw a blank/error UI for ~3s before
//    data arrived. Fix: distinguish initial vs auto-refresh via an
//    `isInitial` argument; only `setLoading(true/false)` on initial.
//
// 2) `HistoryCard` was defined INSIDE the LiveRadar function body, so
//    a fresh component type was created on every render. Every 12s
//    auto-refresh re-mounted every HistoryCard child. Memory thrash
//    and broken refs. Fix: hoist HistoryCard to module scope.
//
// 3) The auto-refresh interval kept polling at 40 req/min even when
//    the tab was hidden in the background. Fix: gate the interval
//    on `document.visibilityState` via a `visibilitychange` listener.
//
// Audit reference: P0 #27–#29 in the dashboard-quality audit
// (2026-06-25).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/pages/LiveRadar.tsx'),
  'utf-8',
);

describe('LiveRadar — initial vs refresh', () => {
  it('loadData takes an isInitial argument', () => {
    expect(SRC).toMatch(/const\s+loadData\s*=\s*useCallback\(\s*\(\s*isInitial\s*=\s*false\s*\)\s*=>/);
  });

  it('loadData sets loading only when isInitial', () => {
    // No more bare `setLoading(false)` as the FIRST line — that was
    // the original bug.
    const fnStart = SRC.indexOf('const loadData = useCallback(');
    const fnEnd = SRC.indexOf('}, [storeId, t, historyRange, historyInterval]);', fnStart);
    const block = SRC.slice(fnStart, fnEnd);
    expect(block).toMatch(/if\s*\(isInitial\)\s*setLoading\(true\)/);
    expect(block).toMatch(/if\s*\(isInitial\)\s*setLoading\(false\)/);
    // The historic bug — bare setLoading(false) BEFORE the fetch —
    // must be gone.
    expect(block).not.toMatch(/setLoading\(false\);\s*\n\s*setFetchError\(false\);\s*\n\s*Promise\.all/);
  });

  it('useEffect on mount calls loadData(true) to show the skeleton', () => {
    expect(SRC).toMatch(/useEffect\(\(\)\s*=>\s*\{\s*loadData\(true\);?\s*\},\s*\[loadData\]\)/);
  });
});

describe('LiveRadar — HistoryCard at module scope', () => {
  it('HistoryCard is declared before LiveRadar (module scope)', () => {
    const cardIdx = SRC.indexOf('function HistoryCard');
    const liveIdx = SRC.indexOf('export default function LiveRadar');
    expect(cardIdx).toBeGreaterThan(0);
    expect(liveIdx).toBeGreaterThan(0);
    expect(cardIdx).toBeLessThan(liveIdx);
  });

  it('HistoryCard is NOT redeclared inside LiveRadar', () => {
    const liveBody = SRC.slice(SRC.indexOf('export default function LiveRadar'));
    expect(liveBody).not.toMatch(/function\s+HistoryCard\s*\(/);
  });
});

describe('LiveRadar — visibility-throttled polling', () => {
  it('the auto-refresh effect checks document.visibilityState', () => {
    expect(SRC).toMatch(/document\.visibilityState/);
    expect(SRC).toMatch(/addEventListener\(['"]visibilitychange['"]/);
    expect(SRC).toMatch(/removeEventListener\(['"]visibilitychange['"]/);
  });

  it('the interval is cleared on cleanup', () => {
    // Defensive — without cleanup, switching off auto-refresh leaks
    // the interval.
    const block = SRC.slice(SRC.indexOf('if (!autoRefresh) return;'));
    expect(block).toMatch(/clearInterval/);
  });
});
