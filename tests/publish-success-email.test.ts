// HAA-PUBLISH-SUCCESS-EMAIL — One-shot publish-success email sent when
// `PublishGateService.publish` flips `stores.publish_status` to
// 'published'.
//
// Two layers of coverage:
//
//   1. Behavioural unit tests on `renderStorePublishedEmail` from
//      `@haa/notification-core/welcome-emails`. We call it with a
//      structured context and assert subject + HTML invariants
//      (merchant name, store URL, dashboard URL, 3-step next-steps
//      block, CTA → storeUrl, XSS-style escaping).
//
//   2. Source-grep guards on `PublishGateService.publish` so the wire
//      point (renderStorePublishedEmail call, fire-and-forget try/catch
//      IIFE, recipient resolution from ctx) cannot regress silently.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  renderStorePublishedEmail,
  type StorePublishedContext,
} from '@haa/notification-core';

const root = resolve(new URL('..', import.meta.url).pathname);
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

function baseCtx(over: Partial<StorePublishedContext> = {}): StorePublishedContext {
  return {
    merchantName: 'سارة الزهراني',
    storeName: 'متجر الياسمين',
    storeUrl: 'https://yasmin.haastores.com',
    dashboardUrl: 'https://merchant.haastores.com',
    ...over,
  };
}

describe('renderStorePublishedEmail', () => {
  it('returns non-empty subject containing storeName', () => {
    const { subject, html } = renderStorePublishedEmail(baseCtx());
    expect(subject.length).toBeGreaterThan(0);
    expect(subject).toContain('متجر الياسمين');
    expect(html.length).toBeGreaterThan(100);
  });

  it('subject carries the celebration cue', () => {
    const { subject } = renderStorePublishedEmail(baseCtx());
    expect(subject).toContain('🎉');
    expect(subject).toContain('مُتاح الآن للعملاء');
  });

  it('HTML contains the merchantName, storeUrl, dashboardUrl', () => {
    const { html } = renderStorePublishedEmail(baseCtx());
    expect(html).toContain('سارة الزهراني');
    expect(html).toContain('https://yasmin.haastores.com');
    expect(html).toContain('https://merchant.haastores.com');
  });

  it('HTML surfaces the storeUrl prominently for sharing', () => {
    const { html } = renderStorePublishedEmail(baseCtx());
    // storeUrl is referenced as plain text AND as an href so the
    // merchant can copy it easily from the body.
    const occurrences = html.match(/https:\/\/yasmin\.haastores\.com/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(2);
  });

  it('HTML contains all three next-step links', () => {
    const { html } = renderStorePublishedEmail(baseCtx());
    // Step 1: share link on social media — copy line.
    expect(html).toContain('شارك رابط متجرك');
    // Step 2: promotions link.
    expect(html).toContain('https://merchant.haastores.com/promotions');
    expect(html).toContain('أضف منتجاتك بالعروض الترويجية');
    // Step 3: orders link.
    expect(html).toContain('https://merchant.haastores.com/orders');
    expect(html).toContain('راقب أول الطلبات');
  });

  it('CTA button label + href point at the public storefront', () => {
    const { html } = renderStorePublishedEmail(baseCtx());
    expect(html).toContain('افتح متجري');
    expect(html).toContain('https://yasmin.haastores.com');
  });

  it('includes the closing wishes line', () => {
    const { html } = renderStorePublishedEmail(baseCtx());
    expect(html).toContain('نتمنى لك بداية موفقة');
  });

  it('escapeHtml is applied to merchantName (XSS payload neutralised)', () => {
    const malicious = '<img src=x>';
    const { html } = renderStorePublishedEmail(baseCtx({ merchantName: malicious }));
    // The literal tag must NOT appear unescaped anywhere in the body.
    expect(html).not.toContain('<img src=x>');
    // The escaped form MUST appear.
    expect(html).toContain('&lt;img');
  });

  it('escapeHtml is applied to storeName too', () => {
    const { html } = renderStorePublishedEmail(
      baseCtx({ storeName: 'متجر "تجريبي" & شركاؤه' }),
    );
    expect(html).toContain('&quot;تجريبي&quot;');
    expect(html).toContain('&amp;');
  });

  it('handles a trailing slash on dashboardUrl without producing //path', () => {
    const { html } = renderStorePublishedEmail(
      baseCtx({ dashboardUrl: 'https://merchant.haastores.com/' }),
    );
    expect(html).not.toContain('haastores.com//promotions');
    expect(html).not.toContain('haastores.com//orders');
    expect(html).toContain('https://merchant.haastores.com/promotions');
    expect(html).toContain('https://merchant.haastores.com/orders');
  });

  it('preheader carries the share-your-link copy', () => {
    const { html } = renderStorePublishedEmail(baseCtx());
    expect(html).toContain('شارك رابط متجرك مع عملائك الآن');
  });
});

describe('PublishGateService.publish — source guards', () => {
  const SRC = read('packages/commerce-core/src/publish-gate.ts');

  it('imports renderStorePublishedEmail from @haa/notification-core', () => {
    expect(SRC).toMatch(
      /import\s*\{[^}]*renderStorePublishedEmail[^}]*\}\s*from\s*['"]@haa\/notification-core['"]/s,
    );
  });

  it('imports pickWelcomeEmailProvider from the shared helper', () => {
    expect(SRC).toMatch(
      /import\s*\{[^}]*pickWelcomeEmailProvider[^}]*\}\s*from\s*['"]\.\/email-provider(?:\.js)?['"]/s,
    );
  });

  it('publish() calls renderStorePublishedEmail', () => {
    const publishBlock = SRC.split('async publish(')[1] ?? '';
    // Scope to the publish() method body — bounded by the next method
    // declaration on the class (next `async unpublish(` or `private`).
    const trimmed = publishBlock.split(/\n\s{2}(?:private\s+|async\s+unpublish)/)[0];
    expect(trimmed).toMatch(/renderStorePublishedEmail\(/);
  });

  it('the publish-email call is wrapped in a void IIFE — fire-and-forget', () => {
    const publishBlock = SRC.split('async publish(')[1] ?? '';
    const trimmed = publishBlock.split(/\n\s{2}(?:private\s+|async\s+unpublish)/)[0];
    expect(trimmed).toMatch(/void\s*\(\s*async\s*\(\s*\)\s*=>\s*\{/);
    // Inside a try/catch so a provider error never bubbles.
    expect(trimmed).toMatch(/try\s*\{/);
    expect(trimmed).toMatch(/\}\s*catch\s*\(/);
  });

  it('the email recipient is the resolved ctx.merchantEmail (not hardcoded)', () => {
    const publishBlock = SRC.split('async publish(')[1] ?? '';
    const trimmed = publishBlock.split(/\n\s{2}(?:private\s+|async\s+unpublish)/)[0];
    // The provider.send() call uses emailCtx.merchantEmail as the recipient.
    expect(trimmed).toMatch(/recipient:\s*emailCtx\.merchantEmail/);
    // Must NOT hardcode an email address.
    expect(trimmed).not.toMatch(/recipient:\s*['"][^'"]+@[^'"]+['"]/);
  });

  it('the publish-email IIFE body does NOT contain a throw — failures stay swallowed', () => {
    const publishBlock = SRC.split('async publish(')[1] ?? '';
    const trimmed = publishBlock.split(/\n\s{2}(?:private\s+|async\s+unpublish)/)[0];
    // Isolate the void IIFE block specifically.
    const iifeMatch = trimmed.match(/void\s*\(\s*async\s*\(\s*\)\s*=>\s*\{([\s\S]*?)\}\)\(\);?/);
    expect(iifeMatch).not.toBeNull();
    const iifeBody = iifeMatch?.[1] ?? '';
    // No throw inside — fire-and-forget must never bubble.
    expect(iifeBody).not.toMatch(/\bthrow\b/);
  });

  it('the publish-email failure log carries kind=store_published and store id (no PII)', () => {
    const publishBlock = SRC.split('async publish(')[1] ?? '';
    const trimmed = publishBlock.split(/\n\s{2}(?:private\s+|async\s+unpublish)/)[0];
    expect(trimmed).toMatch(/kind=store_published/);
    // Must NOT log the merchant email or name.
    expect(trimmed).not.toMatch(/console\.[a-z]+\([^)]*merchantEmail/);
    expect(trimmed).not.toMatch(/console\.[a-z]+\([^)]*merchantName/);
  });

  it('declares a private buildPublishedContext helper', () => {
    expect(SRC).toMatch(/private\s+async\s+buildPublishedContext\s*\(/);
  });
});
