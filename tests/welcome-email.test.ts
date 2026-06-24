// HAA-MERCHANT-WELCOME — One-shot welcome email sent when a fresh
// merchant completes signup OTP verification.
//
// Two layers of coverage:
//
//   1. Behavioural unit tests on `renderMerchantWelcomeEmail` from
//      `@haa/notification-core/welcome-emails`. We call it with a
//      structured context and assert subject + HTML invariants
//      (merchant name, store URL, dashboard URL, 3-step checklist,
//      XSS-style escaping).
//
//   2. Source-grep guards on `AuthFlowService.verifySignup` so the
//      wire point (renderMerchantWelcomeEmail call, fire-and-forget
//      try/catch, recipient resolution) cannot regress silently.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  renderMerchantWelcomeEmail,
  type MerchantWelcomeContext,
} from '@haa/notification-core';

const root = resolve(new URL('..', import.meta.url).pathname);
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

function baseCtx(over: Partial<MerchantWelcomeContext> = {}): MerchantWelcomeContext {
  return {
    merchantName: 'أحمد الحربي',
    storeName: 'متجر العنبر',
    storeSlug: 'anbar',
    storeUrl: 'https://anbar.haastores.com',
    dashboardUrl: 'https://merchant.haastores.com',
    ...over,
  };
}

describe('renderMerchantWelcomeEmail', () => {
  it('returns non-empty subject containing storeName', () => {
    const { subject, html } = renderMerchantWelcomeEmail(baseCtx());
    expect(subject.length).toBeGreaterThan(0);
    expect(subject).toContain('متجر العنبر');
    expect(html.length).toBeGreaterThan(100);
  });

  it('subject carries the platform greeting copy', () => {
    const { subject } = renderMerchantWelcomeEmail(baseCtx());
    expect(subject).toContain('أهلاً بك في هاء متاجر');
    expect(subject).toContain('جاهز');
  });

  it('HTML contains the merchantName, storeUrl, dashboardUrl', () => {
    const { html } = renderMerchantWelcomeEmail(baseCtx());
    expect(html).toContain('أحمد الحربي');
    expect(html).toContain('https://anbar.haastores.com');
    expect(html).toContain('https://merchant.haastores.com');
  });

  it('HTML contains the 3 "next steps" links', () => {
    const { html } = renderMerchantWelcomeEmail(baseCtx());
    expect(html).toContain('https://merchant.haastores.com/products');
    expect(html).toContain('https://merchant.haastores.com/settings/payments');
    expect(html).toContain('https://merchant.haastores.com/store/publish');
    // Each step has its localized label.
    expect(html).toContain('أضف أول منتجاتك');
    expect(html).toContain('اربط وسيلة دفع');
    expect(html).toContain('انشر متجرك');
  });

  it('CTA button label + href point at the dashboard', () => {
    const { html } = renderMerchantWelcomeEmail(baseCtx());
    expect(html).toContain('افتح لوحة التحكم');
    // The CTA href appears at least once (renderHaaEmail puts it on the
    // anchor wrapping the button).
    expect(html).toContain('https://merchant.haastores.com');
  });

  it('includes the support email closing line', () => {
    const { html } = renderMerchantWelcomeEmail(baseCtx());
    expect(html).toContain('hello@haastores.com');
    expect(html).toContain('نحن معك في كل خطوة');
  });

  it('escapeHtml is applied to merchantName (XSS payload neutralised)', () => {
    const malicious = '<img src=x onerror=alert(1)>';
    const { html } = renderMerchantWelcomeEmail(baseCtx({ merchantName: malicious }));
    // The literal tag must NOT appear unescaped anywhere in the body.
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    // The escaped form MUST appear.
    expect(html).toContain('&lt;img');
    expect(html).toContain('onerror=alert(1)&gt;');
  });

  it('escapeHtml is applied to storeName too', () => {
    const { html } = renderMerchantWelcomeEmail(
      baseCtx({ storeName: 'متجر "تجريبي" & شركاؤه' }),
    );
    expect(html).toContain('&quot;تجريبي&quot;');
    expect(html).toContain('&amp;');
  });

  it('handles a trailing slash on dashboardUrl without producing //path', () => {
    const { html } = renderMerchantWelcomeEmail(
      baseCtx({ dashboardUrl: 'https://merchant.haastores.com/' }),
    );
    // No double-slash in the path portion.
    expect(html).not.toContain('haastores.com//products');
    expect(html).toContain('https://merchant.haastores.com/products');
  });
});

describe('AuthFlowService.verifySignup — source guards', () => {
  const SRC = read('packages/commerce-core/src/auth-flow.ts');

  it('imports renderMerchantWelcomeEmail from @haa/notification-core', () => {
    expect(SRC).toMatch(
      /import\s*\{[^}]*renderMerchantWelcomeEmail[^}]*\}\s*from\s*['"]@haa\/notification-core['"]/s,
    );
  });

  it('verifySignup calls renderMerchantWelcomeEmail', () => {
    const verifyBlock = SRC.split('async verifySignup(')[1] ?? '';
    // Scope to the block between `verifySignup(` and the next async
    // method (private buildWelcomeContext or async resendSignupOtp).
    const trimmed = verifyBlock.split(/\n\s{2}(?:private\s+|async\s+)/)[0];
    expect(trimmed).toMatch(/renderMerchantWelcomeEmail\(/);
  });

  it('the welcome-email call is wrapped in try/catch — fire-and-forget', () => {
    const verifyBlock = SRC.split('async verifySignup(')[1] ?? '';
    const trimmed = verifyBlock.split(/\n\s{2}(?:private\s+|async\s+)/)[0];
    // Must be inside a `try { ... } catch` block.
    expect(trimmed).toMatch(/try\s*\{/);
    expect(trimmed).toMatch(/\}\s*catch\s*\(/);
    // And the IIFE must be `void`-ed so the verify response never awaits it.
    expect(trimmed).toMatch(/\bvoid\s*\(/);
  });

  it('the email recipient is user.email (not a hardcoded address)', () => {
    const verifyBlock = SRC.split('async verifySignup(')[1] ?? '';
    const trimmed = verifyBlock.split(/\n\s{2}(?:private\s+|async\s+)/)[0];
    // The provider.send() call must use `user.email` as the recipient.
    expect(trimmed).toMatch(/recipient:\s*user\.email/);
  });

  it('reuses the existing SMTP → Resend provider precedence', () => {
    // The helper is at the top of the file.
    const block = SRC.split('function pickWelcomeEmailProvider')[1] ?? '';
    const smtpIdx = block.indexOf('SmtpEmailProvider');
    const resendIdx = block.indexOf('ResendEmailProvider');
    expect(smtpIdx).toBeGreaterThan(-1);
    expect(resendIdx).toBeGreaterThan(-1);
    expect(smtpIdx).toBeLessThan(resendIdx);
  });

  it('declares a private buildWelcomeContext helper', () => {
    expect(SRC).toMatch(/private\s+async\s+buildWelcomeContext\s*\(/);
  });

  it('the welcome-email failure log carries kind=merchant_welcome and user id (no PII)', () => {
    const verifyBlock = SRC.split('async verifySignup(')[1] ?? '';
    const trimmed = verifyBlock.split(/\n\s{2}(?:private\s+|async\s+)/)[0];
    expect(trimmed).toMatch(/kind=merchant_welcome/);
    // Must NOT log the email address.
    expect(trimmed).not.toMatch(/console\.[a-z]+\([^)]*user\.email/);
  });
});
