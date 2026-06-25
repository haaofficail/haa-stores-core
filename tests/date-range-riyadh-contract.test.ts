// Date-range Riyadh helper contract.
//
// Every analytics filter on the dashboard MUST normalise its date
// boundaries to Asia/Riyadh (UTC+3). The audit (P0 #36, 2026-06-25)
// found that the previous flow sent raw `YYYY-MM-DD` strings from a
// browser date input straight to the API, which the server treated
// as UTC. A merchant in Riyadh selecting "today" at 02:00 AM local
// missed all the orders placed earlier that day.
//
// This contract locks in the public helper surface; the per-page
// adoption (Reports, GrowthInsights, etc.) lands in follow-up PRs.

import { describe, it, expect } from 'vitest';
import {
  STORE_TIMEZONE,
  STORE_TZ_OFFSET,
  toRiyadhDayStart,
  toRiyadhDayEnd,
  todayRiyadhYmd,
  daysAgoRiyadhYmd,
} from '../apps/merchant-dashboard/src/lib/date-range';

describe('Date-range Riyadh helpers', () => {
  it('STORE_TIMEZONE and STORE_TZ_OFFSET are KSA', () => {
    expect(STORE_TIMEZONE).toBe('Asia/Riyadh');
    expect(STORE_TZ_OFFSET).toBe('+03:00');
  });

  it('toRiyadhDayStart marks the start of the local day', () => {
    expect(toRiyadhDayStart('2026-06-25')).toBe('2026-06-25T00:00:00+03:00');
  });

  it('toRiyadhDayEnd marks the inclusive end of the local day', () => {
    expect(toRiyadhDayEnd('2026-06-25')).toBe('2026-06-25T23:59:59.999+03:00');
  });

  it('throws on a malformed YYYY-MM-DD input', () => {
    expect(() => toRiyadhDayStart('06/25/2026')).toThrow();
    expect(() => toRiyadhDayStart('2026-6-5')).toThrow();
    expect(() => toRiyadhDayEnd('')).toThrow();
  });

  it('todayRiyadhYmd returns a valid YYYY-MM-DD string', () => {
    const today = todayRiyadhYmd();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('daysAgoRiyadhYmd returns N days back from today', () => {
    const today = todayRiyadhYmd();
    const sevenAgo = daysAgoRiyadhYmd(7);
    expect(sevenAgo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // sevenAgo should be lexicographically less than today (modulo
    // year/month boundaries, which still hold for YYYY-MM-DD strings).
    expect(sevenAgo < today).toBe(true);
  });

  it('two roundtrips with the same YMD produce the same boundary', () => {
    // Determinism check — no implicit Date.now().
    expect(toRiyadhDayStart('2026-12-31')).toBe(toRiyadhDayStart('2026-12-31'));
    expect(toRiyadhDayEnd('2026-12-31')).toBe(toRiyadhDayEnd('2026-12-31'));
  });

  it('parses back into the correct absolute instant', () => {
    // 2026-06-25 midnight Riyadh = 2026-06-24 21:00:00 UTC
    const startMs = new Date(toRiyadhDayStart('2026-06-25')).getTime();
    const expectedUtc = Date.UTC(2026, 5, 24, 21, 0, 0); // months are 0-indexed
    expect(startMs).toBe(expectedUtc);
  });
});
