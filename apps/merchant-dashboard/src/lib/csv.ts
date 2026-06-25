// CSV cell escape helper — single source of truth for safe CSV
// generation across the dashboard.
//
// Two threats to neutralize:
//
// 1. CSV injection (CWE-1236). Excel/Calc/Numbers execute formulas in
//    cells that start with `=`, `+`, `-`, `@`, or a tab. A malicious
//    customer name like `=cmd|'/C calc'!A1` opened by a merchant turns
//    into a remote-code-execution vector. We prepend a single quote
//    (`'`) to defang any such cell. The quote is invisible inside the
//    spreadsheet cell but breaks the formula parse.
//
// 2. CSV field delimiters. Commas, double quotes, newlines, and
//    carriage returns inside a cell must be escaped per RFC 4180 —
//    wrap the cell in double quotes and double any internal quote.
//
// Both apply in order: defang first, then RFC-4180-escape the result.

const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: unknown): string {
  // Numbers, booleans, null/undefined → stringify cleanly without
  // triggering the formula defang (a leading `-` on a number is a
  // legitimate negative, not a formula).
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  let s = String(value);

  // Step 1: defang formula triggers. Prepend a single quote.
  if (FORMULA_TRIGGERS.test(s)) {
    s = `'${s}`;
  }

  // Step 2: RFC-4180 escape if needed.
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    s = `"${s.replace(/"/g, '""')}"`;
  }

  return s;
}
