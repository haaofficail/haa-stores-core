// P2-#9: Sitemap generation for Haa storefront.
//
// Generates /sitemap.xml dynamically from live data:
//   - Landing page
//   - Marketplace landing
//   - All marketplace categories
//   - All active products in marketplace (sellers)
//
// Cached for 1 hour to reduce DB pressure. Storefront
// pages are excluded because each merchant has its own
// page and there are too many to include in one sitemap
// (they belong in their own per-store sitemap).
import { Hono } from 'hono';
import { eq, and, sql } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';

const sitemapRouter = new Hono();

const STOREFRONT_ORIGIN = process.env.STOREFRONT_ORIGIN || 'https://haastores.sa';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

let cached: { xml: string; expires: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

sitemapRouter.get('/sitemap.xml', async (c) => {
  if (cached && cached.expires > Date.now()) {
    c.header('Content-Type', 'application/xml; charset=utf-8');
    c.header('Cache-Control', 'public, max-age=3600');
    return c.body(cached.xml);
  }

  const db = createDbClient();
  const urls: SitemapUrl[] = [
    { loc: `${STOREFRONT_ORIGIN}/`, changefreq: 'daily', priority: 1.0 },
    { loc: `${STOREFRONT_ORIGIN}/marketplace`, changefreq: 'hourly', priority: 0.9 },
    { loc: `${STOREFRONT_ORIGIN}/marketplace/sellers`, changefreq: 'daily', priority: 0.8 },
  ];

  // Categories
  const categories = await db
    .select({ slug: s.categories.slug, name: s.categories.name })
    .from(s.categories)
    .where(eq(s.categories.isActive, true));
  for (const cat of categories) {
    urls.push({
      loc: `${STOREFRONT_ORIGIN}/marketplace?category=${encodeURIComponent(cat.slug)}`,
      changefreq: 'daily',
      priority: 0.7,
    });
  }

  // Active marketplace products (limit 1000 to keep sitemap reasonable)
  const products = await db
    .select({
      slug: s.products.slug,
      storeSlug: s.stores.slug,
      updatedAt: s.products.updatedAt,
    })
    .from(s.products)
    .innerJoin(s.stores, eq(s.products.storeId, s.stores.id))
    .where(and(
      eq(s.products.haaMarketplaceEnabled, true),
      eq(s.products.haaMarketplaceReviewStatus, 'approved'),
      eq(s.products.status, 'active'),
      eq(s.stores.isDemo, false),
    ))
    .orderBy(sql`${s.products.updatedAt} DESC`)
    .limit(1000);

  for (const p of products) {
    urls.push({
      loc: `${STOREFRONT_ORIGIN}/marketplace/products/${encodeURIComponent(p.storeSlug)}/${encodeURIComponent(p.slug)}`,
      lastmod: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : undefined,
      changefreq: 'weekly',
      priority: 0.6,
    });
  }

  const xml = renderSitemap(urls);
  cached = { xml, expires: Date.now() + CACHE_TTL_MS };

  c.header('Content-Type', 'application/xml; charset=utf-8');
  c.header('Cache-Control', 'public, max-age=3600');
  return c.body(xml);
});

function renderSitemap(urls: SitemapUrl[]): string {
  const header = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
  const body = urls.map((u) => {
    const parts = [`<loc>${escapeXml(u.loc)}</loc>`];
    if (u.lastmod) parts.push(`<lastmod>${u.lastmod}</lastmod>`);
    if (u.changefreq) parts.push(`<changefreq>${u.changefreq}</changefreq>`);
    if (u.priority !== undefined) parts.push(`<priority>${u.priority.toFixed(1)}</priority>`);
    return `  <url>${parts.join('')}</url>`;
  }).join('\n');
  const footer = '</urlset>';
  return `${header}\n${body}\n${footer}\n`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export { sitemapRouter };
