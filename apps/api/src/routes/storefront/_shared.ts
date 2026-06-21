// Shared helpers for the storefront route split.
// Extracted from apps/api/src/routes/storefront.ts in Quality Pass 2 (Item 2.2).

import { eq, and } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { normalizeDomain, isPlatformHost, extractSubdomainSlug } from '@haa/shared';

type AnyRecord = Record<string, unknown>;

export async function resolveStore(slug: string | undefined) {
  if (!slug) return null;
  const db = createDbClient();
  const [store] = await db.select().from(s.stores).where(eq(s.stores.slug, slug)).limit(1);
  return store ?? null;
}

/**
 * حلّ المتجر من Host header (QA Custom Domain):
 *   1. دومين مخصّص نشط مطابق → ذلك المتجر
 *   2. نطاق فرعي للمنصّة (<slug>.haastores.com) → resolveStore(slug)
 *   3. غير ذلك (نطاق المنصّة العاري أو غير معروف) → null
 */
export async function resolveStoreByHost(host: string | undefined | null) {
  const norm = normalizeDomain(host);
  if (!norm) return null;

  if (!isPlatformHost(norm)) {
    const db = createDbClient();
    const [store] = await db.select().from(s.stores)
      .where(and(eq(s.stores.customDomain, norm), eq(s.stores.customDomainStatus, 'active')))
      .limit(1);
    return store ?? null;
  }

  const slug = extractSubdomainSlug(norm);
  return slug ? resolveStore(slug) : null;
}

export async function resolveActiveStore(c: any): Promise<{ store: any; error: any }> {
  const slug = c.req.param('slug') as string | undefined;
  const store = await resolveStore(slug);
  if (!store) return { store: null, error: c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } }, 404) };
  if (store.status !== 'active' || !store.isActive) {
    return { store: null, error: c.json({ success: false, error: { code: 'NOT_FOUND', message: 'لم يتم العثور على المتجر.' } }, 404) };
  }
  if (store.publishStatus !== 'published') {
    return { store: null, error: c.json({ success: false, error: { code: 'STORE_NOT_PUBLISHED', message: 'المتجر غير متاح حالياً.' } }, 404) };
  }
  return { store, error: null };
}

export function getOfferEndDate(activePromotions: AnyRecord[], product: AnyRecord): string | null {
  const matching = activePromotions.filter((p: AnyRecord) => {
    if (p.appliesTo === 'all') return true;
    if (p.appliesTo === 'product' && Number(p.appliesToId) === Number(product.id)) return true;
    if (p.appliesTo === 'category' && Number(p.appliesToId) === Number(product.categoryId)) return true;
    return false;
  });
  if (matching.length === 0) return null;
  const earliest = matching.reduce((a: AnyRecord, b: AnyRecord) =>
    new Date(a.endsAt as string) < new Date(b.endsAt as string) ? a : b
  );
  return new Date(earliest.endsAt as string).toISOString();
}
