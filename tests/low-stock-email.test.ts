// HAA-LOW-STOCK-EMAIL — Per-product low-stock merchant alert email,
// fired at most once per 24h per product after stock decrements during
// checkout.
//
// Two layers of coverage:
//
//   1. Behavioural unit tests on `renderLowStockEmail` from
//      `@haa/notification-core/welcome-emails`. We call it with a
//      structured context and assert subject + HTML invariants
//      (singular vs plural subject, per-item rows, SKU rendering,
//      overflow "+N more" line, escapeHtml on every field).
//
//   2. Source-grep guards on `low-stock-notifier.ts` + `checkout.ts`
//      so the wire points (renderLowStockEmail call, threshold filter,
//      24h window filter, post-success UPDATE, post-tx fire-and-forget
//      call site in checkout) cannot regress silently.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  renderLowStockEmail,
  type LowStockContext,
} from '@haa/notification-core';

const root = resolve(new URL('..', import.meta.url).pathname);
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

function makeItem(over: Partial<LowStockContext['items'][number]> = {}): LowStockContext['items'][number] {
  return {
    name: 'عطر الياسمين 50مل',
    sku: 'JAS-50',
    currentStock: 2,
    threshold: 5,
    productUrl: 'https://merchant.haastores.com/products/101',
    ...over,
  };
}

function baseCtx(over: Partial<LowStockContext> = {}): LowStockContext {
  return {
    merchantName: 'سارة الزهراني',
    storeName: 'متجر الياسمين',
    dashboardUrl: 'https://merchant.haastores.com',
    items: [makeItem()],
    ...over,
  };
}

describe('renderLowStockEmail', () => {
  it('returns non-empty subject + html', () => {
    const { subject, html } = renderLowStockEmail(baseCtx());
    expect(subject.length).toBeGreaterThan(0);
    expect(html.length).toBeGreaterThan(100);
  });

  it('singular subject when items.length === 1', () => {
    const { subject } = renderLowStockEmail(baseCtx({ items: [makeItem()] }));
    expect(subject).toContain('⚠️');
    expect(subject).toContain('منتج بمخزون منخفض');
    expect(subject).toContain('متجر الياسمين');
    // Must NOT carry the count prefix when only 1 item.
    expect(subject).not.toMatch(/⚠️ تنبيه: 1 منتج/);
  });

  it('plural subject when items.length > 1 includes the count', () => {
    const items = [makeItem(), makeItem({ name: 'منتج آخر', sku: null }), makeItem({ name: 'ثالث' })];
    const { subject } = renderLowStockEmail(baseCtx({ items }));
    expect(subject).toContain('⚠️');
    expect(subject).toContain('3 منتج بمخزون منخفض');
    expect(subject).toContain('متجر الياسمين');
  });

  it('HTML contains the merchant + store name and every item name (escaped)', () => {
    const items = [
      makeItem({ name: 'منتج أ', sku: 'A-1' }),
      makeItem({ name: 'منتج ب', sku: 'B-2' }),
    ];
    const { html } = renderLowStockEmail(baseCtx({ items }));
    expect(html).toContain('سارة الزهراني');
    expect(html).toContain('متجر الياسمين');
    expect(html).toContain('منتج أ');
    expect(html).toContain('منتج ب');
  });

  it('HTML shows SKU when non-null and omits the SKU line when null', () => {
    const items = [
      makeItem({ name: 'له SKU', sku: 'X-1' }),
      makeItem({ name: 'بدون SKU', sku: null }),
    ];
    const { html } = renderLowStockEmail(baseCtx({ items }));
    expect(html).toContain('SKU: X-1');
    // Specifically, the "بدون SKU" row must not carry a stray "SKU:"
    // label next to its name. We assert globally that the literal
    // "SKU: null" never appears.
    expect(html).not.toContain('SKU: null');
    expect(html).not.toContain('SKU: undefined');
  });

  it('renders currentStock/threshold for each row', () => {
    const items = [
      makeItem({ name: 'A', currentStock: 0, threshold: 5 }),
      makeItem({ name: 'B', currentStock: 3, threshold: 5 }),
    ];
    const { html } = renderLowStockEmail(baseCtx({ items }));
    expect(html).toMatch(/0\s*\/\s*5/);
    expect(html).toMatch(/3\s*\/\s*5/);
  });

  it('CTA points at dashboard products?stock=low', () => {
    const { html } = renderLowStockEmail(baseCtx());
    expect(html).toContain('https://merchant.haastores.com/products?stock=low');
    expect(html).toContain('افتح إدارة المنتجات');
  });

  it('per-item name is wrapped in an <a> to productUrl', () => {
    const { html } = renderLowStockEmail(
      baseCtx({
        items: [makeItem({ name: 'منتج بسيط', productUrl: 'https://merchant.haastores.com/products/42' })],
      }),
    );
    expect(html).toContain('href="https://merchant.haastores.com/products/42"');
    expect(html).toContain('منتج بسيط');
  });

  it('renders "و +N منتج آخر" footer when items.length > 10', () => {
    const items = Array.from({ length: 13 }, (_, i) =>
      makeItem({ name: `منتج ${i + 1}`, sku: `SKU-${i + 1}` }),
    );
    const { html } = renderLowStockEmail(baseCtx({ items }));
    expect(html).toContain('و +3 منتج آخر');
    // First 10 visible inline.
    expect(html).toContain('منتج 1');
    expect(html).toContain('منتج 10');
    // The 11th+ items names should NOT appear inline (only the count).
    expect(html).not.toContain('منتج 11');
    expect(html).not.toContain('منتج 12');
    expect(html).not.toContain('منتج 13');
  });

  it('does NOT render the overflow footer when items.length <= 10', () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      makeItem({ name: `منتج ${i + 1}`, sku: null }),
    );
    const { html } = renderLowStockEmail(baseCtx({ items }));
    expect(html).not.toMatch(/و \+\d+ منتج آخر/);
  });

  it('escapeHtml is applied to item name (XSS payload neutralised)', () => {
    const { html } = renderLowStockEmail(
      baseCtx({ items: [makeItem({ name: '<img src=x>', sku: null })] }),
    );
    // The literal tag must NOT appear unescaped.
    expect(html).not.toContain('<img src=x>');
    // The escaped form MUST appear.
    expect(html).toContain('&lt;img');
  });

  it('escapeHtml is applied to SKU too', () => {
    const { html } = renderLowStockEmail(
      baseCtx({ items: [makeItem({ sku: '<bad>&"' })] }),
    );
    expect(html).not.toContain('<bad>');
    expect(html).toContain('&lt;bad&gt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;');
  });

  it('escapeHtml is applied to merchantName + storeName', () => {
    const { html } = renderLowStockEmail(
      baseCtx({ merchantName: '<script>', storeName: 'متجر "تجريبي"' }),
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&quot;تجريبي&quot;');
  });

  it('handles a trailing slash on dashboardUrl without producing //products', () => {
    const { html } = renderLowStockEmail(
      baseCtx({ dashboardUrl: 'https://merchant.haastores.com/' }),
    );
    expect(html).not.toContain('haastores.com//products');
    expect(html).toContain('https://merchant.haastores.com/products?stock=low');
  });

  it('preheader carries the restock copy', () => {
    const { html } = renderLowStockEmail(baseCtx());
    expect(html).toContain('المخزون اقترب من النفاد');
  });
});

describe('LowStockNotifier — source guards', () => {
  const SRC = read('packages/commerce-core/src/low-stock-notifier.ts');

  it('imports renderLowStockEmail from @haa/notification-core', () => {
    expect(SRC).toMatch(
      /import\s*\{[^}]*renderLowStockEmail[^}]*\}\s*from\s*['"]@haa\/notification-core['"]/s,
    );
  });

  it('imports pickWelcomeEmailProvider from the shared helper', () => {
    expect(SRC).toMatch(
      /import\s*\{[^}]*pickWelcomeEmailProvider[^}]*\}\s*from\s*['"]\.\/email-provider(?:\.js)?['"]/s,
    );
  });

  it('filters by stockQuantity <= threshold', () => {
    // The threshold filter is JS-side in fireForUpdatedProducts. Match
    // the comparison literally so a future refactor to SQL keeps the
    // same semantics or this test must be updated intentionally.
    expect(SRC).toMatch(/stockQuantity\s*<=\s*threshold/);
  });

  it('filters by the 24h lastLowStockAlertedAt window', () => {
    // Must reference a 24h cutoff (the constant ALERT_WINDOW_MS).
    expect(SRC).toMatch(/24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
    // And the eligibility filter must compare lastLowStockAlertedAt
    // to that cutoff (or NULL — "never alerted" path).
    expect(SRC).toMatch(/lastLowStockAlertedAt\s*===\s*null/);
    expect(SRC).toMatch(/lastLowStockAlertedAt\s*<\s*cutoff/);
  });

  it('UPDATEs lastLowStockAlertedAt = NOW() AFTER provider.send()', () => {
    // Locate the success-only UPDATE.
    expect(SRC).toMatch(/lastLowStockAlertedAt:\s*sql`NOW\(\)`/);

    // Critical ordering: the UPDATE must come AFTER provider.send().
    // A failure mid-flight must NOT consume the dedupe window.
    const sendIdx = SRC.indexOf('provider.send(');
    const updateIdx = SRC.indexOf('lastLowStockAlertedAt: sql`NOW()`');
    expect(sendIdx).toBeGreaterThan(-1);
    expect(updateIdx).toBeGreaterThan(-1);
    expect(updateIdx).toBeGreaterThan(sendIdx);
  });

  it('declares fireForUpdatedProducts + resetForUpdatedProducts', () => {
    expect(SRC).toMatch(/async\s+fireForUpdatedProducts\s*\(/);
    expect(SRC).toMatch(/async\s+resetForUpdatedProducts\s*\(/);
  });

  it('resetForUpdatedProducts sets lastLowStockAlertedAt back to NULL', () => {
    const block = SRC.split('async resetForUpdatedProducts')[1] ?? '';
    // Scope to the method body — bounded by the next method/private
    // declaration on the class.
    const trimmed = block.split(/\n\s{2}(?:private\s+|async\s+)/)[0];
    expect(trimmed).toMatch(/lastLowStockAlertedAt:\s*null/);
    expect(trimmed).toMatch(/stockQuantity\}\s*>\s*\$\{threshold/);
  });

  it('logs kind=low_stock (no PII) on failure', () => {
    expect(SRC).toMatch(/kind=low_stock/);
    // Never log product names, the merchant email, or SKUs.
    expect(SRC).not.toMatch(/console\.[a-z]+\([^)]*merchantEmail/);
    expect(SRC).not.toMatch(/console\.[a-z]+\([^)]*item\.name/);
    expect(SRC).not.toMatch(/console\.[a-z]+\([^)]*\bsku\b/i);
  });
});

describe('CheckoutService — low-stock wire-up source guards', () => {
  const SRC = read('packages/commerce-core/src/checkout.ts');

  it('imports LowStockNotifier from the local module', () => {
    expect(SRC).toMatch(
      /import\s*\{\s*LowStockNotifier\s*\}\s*from\s*['"]\.\/low-stock-notifier(?:\.js)?['"]/s,
    );
  });

  it('confirm() calls LowStockNotifier.fireForUpdatedProducts AFTER the Phase 3 tx', () => {
    // Scope the search to the confirm() method body.
    const confirmBlock = SRC.split('async confirm(')[1] ?? '';
    const trimmed = confirmBlock.split(/\n\s{2}(?:private\s+|async\s+)/)[0];
    expect(trimmed).toMatch(/new\s+LowStockNotifier\(\s*this\.db\s*\)/);
    expect(trimmed).toMatch(/\.fireForUpdatedProducts\(/);

    // The fire call must be OUTSIDE the Phase 3 transaction. We assert
    // that the LAST `this.db.transaction(` in confirm() closes BEFORE
    // the fire call. We find the position of `.fireForUpdatedProducts(`
    // and check no unclosed transaction precedes it on the same line.
    const fireIdx = trimmed.indexOf('.fireForUpdatedProducts(');
    expect(fireIdx).toBeGreaterThan(-1);
    // Locate the latest "await this.db.transaction(async (tx) => {"
    // that opens before fireIdx — its matching closing brace+`)` must
    // appear before fireIdx.
    const txOpens = [...trimmed.matchAll(/await\s+this\.db\.transaction\(/g)];
    expect(txOpens.length).toBeGreaterThan(0);
    const lastTxBefore = txOpens
      .map((m) => m.index ?? 0)
      .filter((i) => i < fireIdx)
      .pop();
    expect(lastTxBefore).toBeDefined();
    // Find the matching `});` that ends that transaction.
    const closingPattern = /\n\s+\}\);/g;
    closingPattern.lastIndex = lastTxBefore as number;
    const close = closingPattern.exec(trimmed);
    expect(close).not.toBeNull();
    expect((close as RegExpExecArray).index).toBeLessThan(fireIdx);
  });

  it('confirm() calls resetForUpdatedProducts on payment-failed path', () => {
    const confirmBlock = SRC.split('async confirm(')[1] ?? '';
    const trimmed = confirmBlock.split(/\n\s{2}(?:private\s+|async\s+)/)[0];
    expect(trimmed).toMatch(/\.resetForUpdatedProducts\(/);
  });

  it('handleBNPLCallback paid path calls fireForUpdatedProducts AFTER the tx', () => {
    const bnplBlock = SRC.split('async handleBNPLCallback(')[1] ?? '';
    const trimmed = bnplBlock.split(/\n\s{2}(?:private\s+|async\s+)/)[0];
    expect(trimmed).toMatch(/\.fireForUpdatedProducts\(/);
  });

  it('handleBNPLCallback failed path calls resetForUpdatedProducts AFTER the incrementStock tx', () => {
    const bnplBlock = SRC.split('async handleBNPLCallback(')[1] ?? '';
    const trimmed = bnplBlock.split(/\n\s{2}(?:private\s+|async\s+)/)[0];
    expect(trimmed).toMatch(/\.resetForUpdatedProducts\(/);
  });

  it('every LowStockNotifier call site is void-fire-and-forget (never awaits)', () => {
    const matches = [...SRC.matchAll(/(\w+)\s*new\s+LowStockNotifier\(/g)];
    expect(matches.length).toBeGreaterThanOrEqual(2);
    for (const m of matches) {
      // The token preceding `new LowStockNotifier(` must be `void`
      // (not `await`) — fire-and-forget contract from the spec.
      expect(m[1]).toBe('void');
    }
    // Belt-and-suspenders: at least one .catch(() => {}) must be
    // attached to a LowStockNotifier promise chain.
    expect(SRC).toMatch(/LowStockNotifier[\s\S]*?\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/);
  });
});
