/* eslint-disable @typescript-eslint/no-explicit-any */

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const raw = String(value);
  const formulaSafe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${formulaSafe.replace(/"/g, '""')}"`;
}

export function toCsv(columns: string[], rows: Array<Record<string, unknown>>): string {
  const body = rows.map((row) => columns.map((column) => csvCell(row[column])).join(','));
  return `\ufeff${[columns.join(','), ...body].join('\n')}`;
}

export function csvResponse(c: any, csv: string, filename: string) {
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="${filename}"`);
  return c.body(csv);
}
