// Reports — Asia/Riyadh date-range adoption contract.
//
// Follow-up to PR #227 (the helper module). This locks in that every
// Reports.tsx API call that takes dateFrom/dateTo runs the value
// through `toRiyadhDayStart` / `toRiyadhDayEnd`, NOT the raw
// `dateFrom || undefined` form.
//
// A merchant in Riyadh selecting "2026-06-25" no longer asks the
// server for "2026-06-25T00:00:00Z" (which is 03:00 Riyadh — off by
// 3 hours, dropping early-morning orders).
//
// Audit reference: P0 #36 (2026-06-25).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/pages/Reports.tsx'),
  'utf-8',
);

describe('Reports — Riyadh TZ adoption', () => {
  it('imports the helper', () => {
    expect(SRC).toMatch(/import\s*\{[^}]*toRiyadhDayStart[^}]*\}\s*from\s*['"]@\/lib\/date-range['"]/);
    expect(SRC).toMatch(/import\s*\{[^}]*toRiyadhDayEnd[^}]*\}\s*from\s*['"]@\/lib\/date-range['"]/);
  });

  it('defines the riyadhFrom / riyadhTo bridge helpers', () => {
    // The two-line bridge pattern keeps the existing optional/string
    // contract (empty input → undefined) intact at every call site.
    expect(SRC).toMatch(/function riyadhFrom\(ymd: string\):\s*string \| undefined/);
    expect(SRC).toMatch(/function riyadhTo\(ymd: string\):\s*string \| undefined/);
  });

  it('no API call uses the raw `dateFrom || undefined` form anymore', () => {
    // Every API call MUST go through the bridge — leaving even one
    // raw call reopens the TZ bug for that report.
    expect(SRC).not.toMatch(/dateFrom\s*\|\|\s*undefined/);
    expect(SRC).not.toMatch(/dateTo\s*\|\|\s*undefined/);
  });

  it('reportsApi.salesSummary calls run through the bridge', () => {
    expect(SRC).toMatch(/reportsApi\.salesSummary\(storeId,\s*riyadhFrom\(dateFrom\),\s*riyadhTo\(dateTo\)\)/);
  });

  it('reportsApi.deep calls run through the bridge', () => {
    expect(SRC).toMatch(/reportsApi\.deep\(storeId,\s*riyadhFrom\(dateFrom\),\s*riyadhTo\(dateTo\)\)/);
  });

  it('reportsApi.exportCsv body uses riyadhFrom/riyadhTo', () => {
    // The exportCsv call takes an options object {dateFrom, dateTo}.
    // Both fields must run through the bridge. We assert by counting
    // total occurrences instead of slicing a window.
    expect(SRC).toMatch(/dateFrom:\s*riyadhFrom\(dateFrom\)/);
    expect(SRC).toMatch(/dateTo:\s*riyadhTo\(dateTo\)/);
  });
});
