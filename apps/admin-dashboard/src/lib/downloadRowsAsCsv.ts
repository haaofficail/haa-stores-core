export function downloadRowsAsCsv(rows: Array<Record<string, unknown>>, filename: string) {
  if (!rows.length) return;

  const keys = Object.keys(rows[0]);
  const csv = [
    keys.join(','),
    ...rows.map(row => keys.map(key => JSON.stringify(row[key] ?? '')).join(',')),
  ].join('\n');

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
