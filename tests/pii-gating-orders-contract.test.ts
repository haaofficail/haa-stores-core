// PII gating + CSV-injection escape contract.
//
// The dashboard previously leaked customer phone in the bulk-print and
// CSV-export flows even when the user lacked `orders:view_sensitive`
// (the column WAS masked in the table). And the CSV generator did not
// escape formula-trigger characters, so a malicious customer name
// could execute as a formula when the merchant opened the file in
// Excel.
//
// Audit reference: P0 #5 (PII) and P0 #35 (CSV injection) in the
// dashboard-quality audit (2026-06-25).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ORDERS_SRC = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/pages/Orders.tsx'),
  'utf-8',
);
const CARTS_SRC = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/pages/AbandonedCarts.tsx'),
  'utf-8',
);
const CUSTOMERS_SRC = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/pages/Customers.tsx'),
  'utf-8',
);
const CSV_HELPER_SRC = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/lib/csv.ts'),
  'utf-8',
);

describe('CSV cell escape helper', () => {
  it('exports escapeCsvCell', () => {
    expect(CSV_HELPER_SRC).toMatch(/export function escapeCsvCell/);
  });

  it('defangs formula triggers (= + - @ tab CR)', () => {
    // The regex MUST cover all five characters spreadsheets treat as
    // formula starters. Missing any one of them leaves the door open.
    expect(CSV_HELPER_SRC).toMatch(/\^\[=\+\\-@\\t\\r\]/);
  });

  it('RFC-4180 escapes commas, quotes, newlines', () => {
    expect(CSV_HELPER_SRC).toMatch(/includes\(',['"]\)/);
    expect(CSV_HELPER_SRC).toMatch(/includes\(['"]\\?['"]\\?['"]\)/);
    expect(CSV_HELPER_SRC).toMatch(/includes\(['"]\\n['"]\)/);
  });
});

describe('Orders bulk actions — PII gating + output escaping', () => {
  it('imports usePermissions and output escaping helpers', () => {
    expect(ORDERS_SRC).toMatch(/import\s*\{[^}]*usePermissions[^}]*\}\s*from\s*['"]@\/lib\/permissions['"]/);
    expect(ORDERS_SRC).toMatch(/import\s*\{\s*escapeCsvCell\s*\}\s*from\s*['"]@\/lib\/csv['"]/);
    expect(ORDERS_SRC).toMatch(/import\s*\{\s*escapeHtmlText\s*\}\s*from\s*['"]@\/lib\/html['"]/);
  });

  it('bulk print gates customerPhone behind orders:view_sensitive', () => {
    const printIdx = ORDERS_SRC.indexOf("orders.bulk_print");
    expect(printIdx).toBeGreaterThan(0);
    // Walk backward to the start of the onClick handler.
    const onClickIdx = ORDERS_SRC.lastIndexOf('onClick={() => {', printIdx);
    const block = ORDERS_SRC.slice(onClickIdx, printIdx);
    // The block must check the sensitive permission before echoing
    // the phone, and must HTML-escape data written into document.write.
    expect(block).toMatch(/canSeeSensitive\s*=\s*orderPerms\.can\(['"]orders:view_sensitive['"]\)/);
    expect(block).toMatch(/const\s+safeHtml\s*=\s*\(v:\s*unknown\)\s*=>\s*escapeHtmlText\(v\)/);
    expect(block).toMatch(/canSeeSensitive\s*\?\s*`?\s*-\s*\$\{safeHtml\(order\.customerPhone\)\}/);
  });

  it('bulk CSV gates customerPhone behind orders:view_sensitive', () => {
    const exportIdx = ORDERS_SRC.indexOf("orders.bulk_export");
    expect(exportIdx).toBeGreaterThan(0);
    const onClickIdx = ORDERS_SRC.lastIndexOf('onClick={() => {', exportIdx);
    const block = ORDERS_SRC.slice(onClickIdx, exportIdx);
    expect(block).toMatch(/canSeeSensitive\s*=\s*orderPerms\.can\(['"]orders:view_sensitive['"]\)/);
    expect(block).toMatch(/if\s*\(canSeeSensitive\)\s*row\.push\(o\.customerPhone\)/);
    // And the CSV must run every cell through escapeCsvCell.
    expect(block).toMatch(/\.map\(escapeCsvCell\)/);
  });
});

describe('AbandonedCarts — PII gating', () => {
  it('customerPhone is wrapped in PermissionGate', () => {
    expect(CARTS_SRC).toMatch(/import\s*\{\s*PermissionGate\s*\}\s*from\s*['"]@\/lib\/permissions['"]/);
    const phoneIdx = CARTS_SRC.indexOf('cart.customerPhone');
    expect(phoneIdx).toBeGreaterThan(0);
    // Look at the surrounding 300 chars to confirm the gate.
    const window = CARTS_SRC.slice(Math.max(0, phoneIdx - 300), phoneIdx + 50);
    expect(window).toMatch(/PermissionGate\s+permission=['"]orders:view_sensitive['"]/);
  });
});

describe('Customers — email column gating', () => {
  it('email TABLE CELL is wrapped in PermissionGate matching the phone column', () => {
    // The edit-form prefill (line ~124) uses `c.email` without a
    // gate — that's fine, the form is only opened for users who
    // already have edit rights. We're locking down the LIST CELL.
    const cellIdx = CUSTOMERS_SRC.indexOf("{c.email || '-'}");
    expect(cellIdx).toBeGreaterThan(0);
    const window = CUSTOMERS_SRC.slice(Math.max(0, cellIdx - 300), cellIdx + 50);
    expect(window).toMatch(/PermissionGate\s+permission=['"]customers:view_sensitive['"]/);
  });
});
