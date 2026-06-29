/**
 * Marketplace count ↔ feed consistency (broken-promise fix).
 *
 * Bug: سوق هاء advertised product counts that the feed could not back.
 *   - GET /api/marketplace/sellers/:slug  → productCount: 20
 *   - GET /api/marketplace/products?store=… → { total: 0 }
 * because the demo-store branch of the COUNT/facet/seller queries filtered
 * only by `status='active'` (+ demoProfile), while the product FEED also
 * requires `haaMarketplaceEnabled=true` (TASK-0038 moderation gate). A
 * shopper saw "20 منتج في السوق" / "إلكترونيات 5" and clicked into an empty
 * grid — a dead-end broken promise.
 *
 * Fix: a single source-of-truth visibility predicate
 * (`marketplaceVisibleProductCondition` + real/demo helpers) used by the
 * feed AND every count/facet/seller/detail query, so an advertised count can
 * never exceed what the feed returns. This test pins that contract.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HAAM = resolve(__dirname, '../apps/api/src/routes/haa-marketplace.ts');
const src = readFileSync(HAAM, 'utf-8');

// Strip comments so we assert on executable code, not docs.
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('haa-marketplace count/feed consistency', () => {
  it('defines the shared marketplace-visibility helpers', () => {
    expect(code).toMatch(/const\s+realStoreMarketplaceCondition\s*=/);
    expect(code).toMatch(/const\s+demoStoreMarketplaceCondition\s*=/);
    expect(code).toMatch(/const\s+marketplaceVisibleProductCondition\s*=/);
  });

  it('demo visibility REQUIRES haaMarketplaceEnabled=true (moderation gate, TASK-0038)', () => {
    const demoHelper = code.slice(
      code.indexOf('demoStoreMarketplaceCondition'),
      code.indexOf('marketplaceVisibleProductCondition'),
    );
    expect(demoHelper).toMatch(/eq\(s\.products\.haaMarketplaceEnabled,\s*true\)/);
    expect(demoHelper).toMatch(/demoProfile\}\s*IN\s*\('main',\s*'perfume'\)/);
  });

  it('has exactly ONE demo-store branch — inside the shared helper (no drift)', () => {
    // The only `isDemo, true)` predicate in the file must live in the helper.
    // Any other occurrence is a count/listing site that bypassed the gate.
    const occurrences = (code.match(/eq\(s\.stores\.isDemo,\s*true\)/g) || []).length;
    expect(occurrences).toBe(1);
  });

  it('no count/listing site inlines a demo branch without the enabled gate', () => {
    // The pre-fix anti-pattern: `and(eq(s.stores.isDemo, true), sql\`…demoProfile…\`)`
    // with NO haaMarketplaceEnabled next to it. Must not reappear.
    expect(code).not.toMatch(
      /and\(\s*eq\(s\.stores\.isDemo,\s*true\),\s*sql`\$\{s\.stores\.demoProfile\}/,
    );
  });

  it('the product feed and the seller/total/facet counts all use the shared predicate', () => {
    // At least: feed total, /products feed, product detail, seller-detail count,
    // realSellers, demoSellers, category facets → 6+ helper references.
    const refs = (code.match(/marketplaceVisibleProductCondition\(\)/g) || []).length
      + (code.match(/realStoreMarketplaceCondition\(\)/g) || []).length
      + (code.match(/demoStoreMarketplaceCondition\(\)/g) || []).length;
    // 3 are the helper definitions; usages must add several more.
    expect(refs).toBeGreaterThanOrEqual(8);
  });

  it('SFDA gating is enforced in SQL before totals and stats are counted', () => {
    expect(code).toMatch(/SFDA_GATED_CATEGORY_SLUGS/);
    expect(code).toMatch(/marketplaceSfdaCompliantProductCondition/);
    expect(code).toMatch(/sfdaVerifiedAt/);
    expect(code).toMatch(/sfdaExpiryDate/);

    const usages = code.match(/marketplaceSfdaCompliantProductCondition\(\)/g) ?? [];
    // stats + product total/feed + detail + seller detail + real sellers +
    // demo sellers + category facets all count from the same filtered set.
    expect(usages.length).toBeGreaterThanOrEqual(7);
  });
});
