// Merchant adopts <SarIcon> on Reports + Orders — audit follow-up #2.
//
// Locks the rule that the merchant dashboard's Reports and Orders
// pages render SAR via the shared SarIcon component instead of plain
// Arabic text "ر.س". This follows the Wallet adoption (PR #64) which
// is guarded separately in merchant-sar-icon-usage.test.ts.
//
// We only count JSX occurrences here — string-prop concatenation
// (e.g. value={`${fmt(x)} ${t('common.sar')}`} passed to MetricCell)
// is out of scope and intentionally left alone.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

const REPORTS = read('apps/merchant-dashboard/src/pages/Reports.tsx');
const ORDERS = read('apps/merchant-dashboard/src/pages/Orders.tsx');

const IMPORT_RE = /import \{ SarIcon \} from ['"]@\/components\/ui\/SarIcon['"]/;

describe('Merchant SarIcon adoption on Reports + Orders', () => {
  it('Reports.tsx imports SarIcon', () => {
    expect(REPORTS).toMatch(IMPORT_RE);
  });

  it('Reports.tsx renders <SarIcon /> at least 3 times in JSX', () => {
    const occurrences = (REPORTS.match(/<SarIcon\b/g) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(3);
  });

  it('Orders.tsx imports SarIcon', () => {
    expect(ORDERS).toMatch(IMPORT_RE);
  });

  it('Orders.tsx renders <SarIcon /> at least 1 time in JSX', () => {
    const occurrences = (ORDERS.match(/<SarIcon\b/g) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(1);
  });
});
