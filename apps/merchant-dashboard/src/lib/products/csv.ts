function csvCell(value: unknown): string {
  const raw = value == null ? '' : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export function buildProductsCsv(products: any[], selectedIds: Set<number>): Blob {
  const csv: string[][] = [['المنتج', 'SKU', 'السعر', 'سعر التخفيض', 'المخزون', 'الحالة', 'التصنيف', 'تاريخ الإنشاء']];
  selectedIds.forEach(id => {
    const p = products.find(p => p.id === id);
    if (p) {
      const catName = p.categories?.[0]?.name ?? '';
      csv.push([p.name, p.sku || '', p.price?.toString() || '', p.compareAtPrice?.toString() || '', String(p.stockQuantity ?? 0), p.status, catName, new Date(p.createdAt).toLocaleDateString('ar-SA')]);
    }
  });
  return new Blob(['\uFEFF' + csv.map(r => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
