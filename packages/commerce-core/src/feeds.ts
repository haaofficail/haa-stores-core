import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { eq, and } from 'drizzle-orm';

export class ProductFeedService {
  constructor(private db: DbClient = createDbClient()) {}

  async generateGoogleMerchantFeed(storeId: number) {
    const store = await this.db.select().from(s.stores).where(eq(s.stores.id, storeId)).limit(1);
    const products = await this.db.select().from(s.products)
      .where(and(eq(s.products.storeId, storeId), eq(s.products.status, 'active')));

    const lines: string[] = [];
    lines.push('id\ttitle\tdescription\tlink\timage_link\tprice\tavailability\tcondition');
    for (const p of products) {
      const title = (p.name || '').replace(/\t/g, ' ');
      const desc = ((p.description || '') as string).substring(0, 5000).replace(/\t/g, ' ');
      const price = `${p.price} SAR`;
      const availability = (p.stockQuantity || 0) > 0 ? 'in_stock' : 'out_of_stock';
      lines.push(`${p.id}\t${title}\t${desc}\t/store/product\t\t${price}\t${availability}\tnew`);
    }
    return lines.join('\n');
  }

  async generateMetaCatalogFeed(storeId: number) {
    const store = await this.db.select().from(s.stores).where(eq(s.stores.id, storeId)).limit(1);
    const products = await this.db.select().from(s.products)
      .where(and(eq(s.products.storeId, storeId), eq(s.products.status, 'active')));

    const items: any[] = [];
    for (const p of products) {
      items.push({
        id: p.id.toString(),
        title: p.name,
        description: ((p.description || '') as string).substring(0, 500),
        availability: (p.stockQuantity || 0) > 0 ? 'in stock' : 'out of stock',
        price: `${p.price} SAR`,
        condition: 'new',
        link: `/products/${p.id}`,
        image_link: '',
      });
    }
    return JSON.stringify(items, null, 2);
  }

  async getMigrationTemplates() {
    return [
      {
        source: 'salla',
        name: 'سلة',
        description: 'هجرة المنتجات والتصنيفات والعملاء من سلة',
        steps: ['تصدير منتجاتك من سلة إلى CSV', 'تحميل ملف CSV هنا', 'مطابقة الأعمدة', 'معاينة البيانات', 'تنفيذ الهجرة'],
        templateColumns: ['name', 'description', 'price', 'stock', 'category', 'sku', 'image_url'],
      },
      {
        source: 'zid',
        name: 'زد',
        description: 'هجرة المنتجات والتصنيفات من زد',
        steps: ['تصدير منتجاتك من زد إلى CSV', 'تحميل ملف CSV هنا', 'مطابقة الأعمدة', 'معاينة البيانات', 'تنفيذ الهجرة'],
        templateColumns: ['title', 'description', 'regular_price', 'quantity', 'category', 'barcode'],
      },
      {
        source: 'shopify',
        name: 'Shopify',
        description: 'هجرة المنتجات والعملاء والطلبات من Shopify',
        steps: ['تصدير بياناتك من Shopify إلى CSV', 'تحميل الملفات هنا', 'مطابقة الأعمدة', 'معاينة البيانات', 'تنفيذ الهجرة'],
        templateColumns: ['Title', 'Body (HTML)', 'Variant Price', 'Variant Inventory Qty', 'Type', 'Variant SKU', 'Image Src'],
      },
      {
        source: 'csv',
        name: 'CSV/Excel عام',
        description: 'استيراد عام من أي ملف CSV أو Excel',
        steps: ['تجهيز ملف CSV حسب القالب', 'تحميل الملف', 'مطابقة الأعمدة', 'معاينة البيانات', 'تنفيذ الهجرة'],
        templateColumns: ['name', 'description', 'price', 'stock', 'category', 'sku'],
      },
    ];
  }
}
