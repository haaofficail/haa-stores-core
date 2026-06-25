// CSV injection escape contract — server-side sales report.
//
// Cells starting with `=`, `+`, `-`, `@`, tab, or CR are interpreted
// as formulas by Excel, Calc, and Numbers. A malicious product name
// like `=cmd|'/C calc'!A1` opened by the merchant becomes RCE.
//
// This PR hardens the server-side CSV path that powers
// GET /merchant/:storeId/reports/export (the sales-report CSV
// download). The client-side `downloadCsv` in Reports.tsx is tracked
// separately and lands once the merchant-dashboard `any`-type debt
// has been cleared from that file.
//
// Audit reference: P0 #35 (2026-06-25).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPORTS_SVC = readFileSync(
  resolve(__dirname, '../packages/commerce-core/src/reports.ts'),
  'utf-8',
);

describe('CSV injection defang — server-side toCsv', () => {
  it('defines an escapeCsvCell helper', () => {
    expect(REPORTS_SVC).toMatch(/function escapeCsvCell/);
  });

  it('the regex covers `=`, `+`, `-`, `@`, tab, CR', () => {
    expect(REPORTS_SVC).toMatch(/\^\[=\+\\-@\\t\\r\]/);
  });

  it('headers and rows BOTH run through escapeCsvCell', () => {
    // Header row used to be `headers.join(',')` (raw). A malicious
    // table column name (rare but possible if columns ever come from
    // user data) would slip through.
    expect(REPORTS_SVC).toMatch(/headers\.map\(escapeCsvCell\)/);
    // Body cells go through too.
    expect(REPORTS_SVC).toMatch(/escapeCsvCell\(row\[h\]\)/);
  });

  it('RFC-4180 escape for commas/quotes/newlines preserved', () => {
    expect(REPORTS_SVC).toMatch(/replace\(\/"\/g,\s*['"]""['"]\)/);
    expect(REPORTS_SVC).toMatch(/includes\(',['"]\)/);
    expect(REPORTS_SVC).toMatch(/includes\(['"]\\n['"]\)/);
  });
});
