import { eq } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { AuditLogService } from '@haa/integration-core';

interface PreviewRow {
  row: number;
  name: string;
  slug: string;
  price: string;
  sku: string | null;
  stockQuantity: number;
  errors: string[];
}

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    rows.push(row);
  }

  return rows;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export class ImportsService {
  constructor(
    private db: DbClient = createDbClient(),
    private audit: AuditLogService = new AuditLogService(),
  ) {}

  async previewProducts(storeId: number, csvContent: string) {
    const rows = parseCsv(csvContent);
    const preview = rows.slice(0, 5).map((r, i) => {
      const errors: string[] = [];
      if (!r.name) errors.push('Name is required');
      if (!r.price || isNaN(Number(r.price))) errors.push('Price must be a valid number');
      if (r.stockQuantity && isNaN(Number(r.stockQuantity))) errors.push('Stock quantity must be a number');
      return {
        row: i + 1,
        name: r.name ?? '',
        slug: r.slug ?? slugify(r.name ?? ''),
        price: r.price ?? '',
        sku: r.sku ?? null,
        stockQuantity: r.stockQuantity ? Number(r.stockQuantity) : 0,
        errors,
      } satisfies PreviewRow;
    });

    return {
      totalRows: rows.length,
      preview,
      hasErrors: preview.some(r => r.errors.length > 0),
    };
  }

  async importProducts(storeId: number, csvContent: string, userId: number) {
    const rows = parseCsv(csvContent);
    const errors: string[] = [];
    let imported = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 1;
      const name = r.name?.trim();
      const price = r.price?.trim();
      const stockQty = r.stockQuantity ? Number(r.stockQuantity) : 0;

      if (!name) { errors.push(`Row ${rowNum}: Name is required`); continue; }
      if (!price || isNaN(Number(price))) { errors.push(`Row ${rowNum}: Invalid price`); continue; }

      try {
        const slug = r.slug?.trim() || slugify(name);
        const status = (r.status?.trim() as any) || 'draft';

        await this.db.insert(s.products).values({
          storeId,
          name,
          slug,
          description: r.description?.trim() ?? null,
          status,
          type: (r.type?.trim() as any) ?? 'physical',
          price: Number(price).toString(),
          compareAtPrice: r.compareAtPrice ? Number(r.compareAtPrice).toString() : null,
          cost: r.cost ? Number(r.cost).toString() : null,
          sku: r.sku?.trim() ?? null,
          barcode: r.barcode?.trim() ?? null,
          stockQuantity: stockQty,
          trackInventory: r.trackInventory?.toLowerCase() === 'true',
          weightGrams: r.weightGrams ? Number(r.weightGrams) : null,
          requiresShipping: r.requiresShipping?.toLowerCase() !== 'false',
          isFragile: r.isFragile?.toLowerCase() === 'true',
          seoTitle: r.seoTitle?.trim() ?? null,
          seoDescription: r.seoDescription?.trim() ?? null,
        });

        imported++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        errors.push(`Row ${rowNum}: ${msg}`);
      }
    }

    await this.audit.record({
      actorUserId: userId,
      storeId,
      action: 'import_products' as any,
      entityType: 'import',
      newValue: { imported, errors: errors.length },
    });

    return { imported, errors };
  }

  async downloadTemplate(type: 'products'): Promise<string> {
    if (type === 'products') {
      return [
        'name,slug,description,status,type,price,compareAtPrice,cost,sku,barcode,stockQuantity,trackInventory,weightGrams,requiresShipping,isFragile,seoTitle,seoDescription',
        'Example Product,example-product,This is an example,draft,physical,99.99,,,EX-001,,10,true,,true,false,,',
      ].join('\n');
    }
    return '';
  }
}
