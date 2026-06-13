import { eq, and } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';

export class SeoService {
  constructor(private db: DbClient = createDbClient()) {}

  async getStoreSeo(storeId: number) {
    const [store] = await this.db.select()
      .from(s.stores)
      .where(eq(s.stores.id, storeId))
      .limit(1);

    if (!store) return null;

    return {
      title: store.seoTitle ?? store.name,
      description: store.seoDescription ?? store.description ?? '',
      defaultTitle: store.name,
      titleSuffix: ` - ${store.name}`,
    };
  }

  async getProductSeo(storeId: number, productSlug: string) {
    const [store, product] = await Promise.all([
      this.db.select().from(s.stores).where(eq(s.stores.id, storeId)).limit(1).then(r => r[0] ?? null),
      this.db.select().from(s.products)
        .where(and(eq(s.products.storeId, storeId), eq(s.products.slug, productSlug)))
        .limit(1).then(r => r[0] ?? null),
    ]);

    if (!product) return null;

    const storeName = store?.name ?? '';
    return {
      title: product.seoTitle ?? product.name,
      description: product.seoDescription ?? product.description ?? '',
      storeName,
      titleSuffix: ` - ${storeName}`,
    };
  }

  async getPageSeo(storeId: number, page: string) {
    const [store] = await this.db.select()
      .from(s.stores)
      .where(eq(s.stores.id, storeId))
      .limit(1);

    if (!store) return null;

    const pageTitles: Record<string, string> = {
      home: store.seoTitle ?? store.name,
      products: `Products${store.name ? ` - ${store.name}` : ''}`,
      cart: `Cart${store.name ? ` - ${store.name}` : ''}`,
      checkout: `Checkout${store.name ? ` - ${store.name}` : ''}`,
      about: `About Us${store.name ? ` - ${store.name}` : ''}`,
      contact: `Contact Us${store.name ? ` - ${store.name}` : ''}`,
      faq: `FAQ${store.name ? ` - ${store.name}` : ''}`,
    };

    const storeName = store.name ?? '';
    return {
      title: pageTitles[page] ?? `${page} - ${storeName}`,
      description: store.seoDescription ?? store.description ?? '',
      storeName,
      titleSuffix: ` - ${storeName}`,
    };
  }
}
