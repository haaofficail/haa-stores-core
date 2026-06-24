// HAA-SUB-RENEWAL — Subscription renewal reminder email (7-day +
// 1-day before period end), fired by the API scheduler at 09:00
// Asia/Riyadh.
//
// Two layers of coverage:
//
//   1. Behavioural unit tests on `renderSubscriptionRenewalEmail` from
//      `@haa/notification-core/welcome-emails`. We call it with a
//      structured context and assert subject + HTML invariants
//      (subject tone per step, warning line on day-1 only, escapeHtml
//      on planName, fallback merchant name, billingCycle phrasing).
//
//   2. Source-grep guards on `subscription-renewal-notifier.ts` +
//      `worker.ts` so the wire points (active-status filter, dedupe
//      predicate, post-success UPDATE ordering, scheduler entry at
//      09:00 Riyadh, no-PII log lines) cannot regress silently.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  renderSubscriptionRenewalEmail,
  type SubscriptionRenewalContext,
} from '@haa/notification-core';

const root = resolve(new URL('..', import.meta.url).pathname);
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

function baseCtx(over: Partial<SubscriptionRenewalContext> = {}): SubscriptionRenewalContext {
  return {
    merchantName: 'سارة الزهراني',
    planName: 'باقة الانطلاق',
    amountSar: '199.00',
    billingCycle: 'monthly',
    renewalDate: '2026-07-15',
    daysUntilRenewal: 7,
    dashboardUrl: 'https://merchant.haastores.com',
    supportEmail: 'support@haastores.com',
    ...over,
  };
}

describe('renderSubscriptionRenewalEmail', () => {
  it('returns non-empty subject + html', () => {
    const { subject, html } = renderSubscriptionRenewalEmail(baseCtx());
    expect(subject.length).toBeGreaterThan(0);
    expect(html.length).toBeGreaterThan(100);
  });

  it('day-7 and day-1 produce DIFFERENT subjects', () => {
    const d7 = renderSubscriptionRenewalEmail(baseCtx({ daysUntilRenewal: 7 }));
    const d1 = renderSubscriptionRenewalEmail(baseCtx({ daysUntilRenewal: 1 }));
    expect(d7.subject).not.toBe(d1.subject);
  });

  it('day-7 subject contains "7 أيام"', () => {
    const { subject } = renderSubscriptionRenewalEmail(baseCtx({ daysUntilRenewal: 7 }));
    expect(subject).toContain('7 أيام');
  });

  it('day-1 subject contains "⏰" and "غداً"', () => {
    const { subject } = renderSubscriptionRenewalEmail(baseCtx({ daysUntilRenewal: 1 }));
    expect(subject).toContain('⏰');
    expect(subject).toContain('غداً');
  });

  it('HTML contains planName, amountSar, renewalDate and dashboardUrl', () => {
    const { html } = renderSubscriptionRenewalEmail(baseCtx());
    expect(html).toContain('باقة الانطلاق');
    expect(html).toContain('199.00');
    expect(html).toContain('2026-07-15');
    expect(html).toContain('https://merchant.haastores.com');
  });

  it('day-1 HTML contains the payment-method warning line', () => {
    const { html } = renderSubscriptionRenewalEmail(baseCtx({ daysUntilRenewal: 1 }));
    expect(html).toContain('تأكد من أن وسيلة الدفع المسجلة لا تزال صالحة');
    expect(html).toContain('سيتم إيقاف المتجر تلقائياً');
  });

  it('day-7 HTML does NOT contain the warning line', () => {
    const { html } = renderSubscriptionRenewalEmail(baseCtx({ daysUntilRenewal: 7 }));
    expect(html).not.toContain('تأكد من أن وسيلة الدفع المسجلة لا تزال صالحة');
    expect(html).not.toContain('سيتم إيقاف المتجر تلقائياً');
  });

  it('escapeHtml is applied to planName (XSS payload neutralised)', () => {
    const { html, subject } = renderSubscriptionRenewalEmail(
      baseCtx({ planName: '<script>x</script>' }),
    );
    // Body must escape it.
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
    // Subject is plain text — interpolation is fine, but the unsafe
    // tag does NOT need to be HTML-escaped in subject context (mail
    // clients render subject as text). We still assert the subject is
    // a non-empty string so the renderer didn't crash on the payload.
    expect(subject.length).toBeGreaterThan(0);
  });

  it('billingCycle="monthly" renders "شهرياً"', () => {
    const { html } = renderSubscriptionRenewalEmail(baseCtx({ billingCycle: 'monthly' }));
    expect(html).toContain('شهرياً');
    expect(html).not.toContain('سنوياً');
  });

  it('billingCycle="annual" renders "سنوياً"', () => {
    const { html } = renderSubscriptionRenewalEmail(baseCtx({ billingCycle: 'annual' }));
    expect(html).toContain('سنوياً');
    expect(html).not.toContain('شهرياً');
  });

  it('fallback name "عزيزي التاجر" when merchantName is empty', () => {
    const { html } = renderSubscriptionRenewalEmail(baseCtx({ merchantName: '' }));
    expect(html).toContain('عزيزي التاجر');
  });

  it('CTA label "إدارة الاشتراك" points at dashboardUrl', () => {
    const { html } = renderSubscriptionRenewalEmail(baseCtx());
    expect(html).toContain('إدارة الاشتراك');
    expect(html).toContain('https://merchant.haastores.com');
  });

  it('subject carries the plan name on both steps', () => {
    const d7 = renderSubscriptionRenewalEmail(baseCtx({ daysUntilRenewal: 7 }));
    const d1 = renderSubscriptionRenewalEmail(baseCtx({ daysUntilRenewal: 1 }));
    expect(d7.subject).toContain('باقة الانطلاق');
    expect(d1.subject).toContain('باقة الانطلاق');
  });
});

describe('SubscriptionRenewalNotifier — source guards', () => {
  const SRC = read('packages/commerce-core/src/subscription-renewal-notifier.ts');

  it('imports renderSubscriptionRenewalEmail from @haa/notification-core', () => {
    expect(SRC).toMatch(
      /import\s*\{[^}]*renderSubscriptionRenewalEmail[^}]*\}\s*from\s*['"]@haa\/notification-core['"]/s,
    );
  });

  it('imports pickWelcomeEmailProvider from the shared helper', () => {
    expect(SRC).toMatch(
      /import\s*\{[^}]*pickWelcomeEmailProvider[^}]*\}\s*from\s*['"]\.\/email-provider(?:\.js)?['"]/s,
    );
  });

  it('runDailySweep filters by status === "active"', () => {
    // The notifier MUST exclude trialing/canceled/past_due rows.
    expect(SRC).toMatch(/eq\(\s*s\.merchantSubscriptions\.status\s*,\s*['"]active['"]\s*\)/);
  });

  it('skip-condition uses both last_renewal_reminder_step AND last_renewal_reminder_at >= currentPeriodStart', () => {
    // The dedupe predicate MUST reference both fields. Anchoring on
    // currentPeriodStart means a new period naturally re-arms both
    // ladder steps.
    expect(SRC).toMatch(/lastRenewalReminderStep\s*===\s*daysUntilRenewal/);
    expect(SRC).toMatch(/lastRenewalReminderAt\s*>=\s*row\.currentPeriodStart/);
  });

  it('UPDATE happens only AFTER successful send (string ordering)', () => {
    // The success path must `provider.send(...)` FIRST and only then
    // run the .update(merchantSubscriptions) statement. A failure
    // must not consume the dedupe slot.
    const sendIdx = SRC.indexOf('provider.send(');
    const updateIdx = SRC.indexOf('.update(s.merchantSubscriptions)');
    expect(sendIdx).toBeGreaterThan(-1);
    expect(updateIdx).toBeGreaterThan(-1);
    expect(updateIdx).toBeGreaterThan(sendIdx);
  });

  it('UPDATE sets both lastRenewalReminderAt + lastRenewalReminderStep', () => {
    expect(SRC).toMatch(/lastRenewalReminderAt:\s*new Date\(\)/);
    expect(SRC).toMatch(/lastRenewalReminderStep:\s*step/);
  });

  it('logs kind=renewal_reminder + store + step only (no PII)', () => {
    expect(SRC).toMatch(/kind=renewal_reminder/);
    // No PII: must not log merchant email, merchant name, plan name,
    // or amount in console output.
    expect(SRC).not.toMatch(/console\.[a-z]+\([^)]*merchantEmail/);
    expect(SRC).not.toMatch(/console\.[a-z]+\([^)]*merchantName/);
    expect(SRC).not.toMatch(/console\.[a-z]+\([^)]*planName/);
    expect(SRC).not.toMatch(/console\.[a-z]+\([^)]*amountSar/);
  });
});

describe('worker.ts — scheduler wire-up source guards', () => {
  const SRC = read('apps/api/src/worker.ts');

  it('declares JOB_NAMES.subscriptionRenewalReminder = "subscription.renewal-reminder"', () => {
    expect(SRC).toMatch(
      /subscriptionRenewalReminder:\s*['"]subscription\.renewal-reminder['"]/,
    );
  });

  it('scheduler entry exists with name JOB_NAMES.subscriptionRenewalReminder', () => {
    expect(SRC).toMatch(/name:\s*JOB_NAMES\.subscriptionRenewalReminder/);
  });

  it('scheduler entry gates at hourRiyadh !== 9 (only at 09:00 Asia/Riyadh)', () => {
    // Scope the search to the subscriptionRenewalReminder block.
    const block = SRC.split('JOB_NAMES.subscriptionRenewalReminder')[1] ?? '';
    // Take only up to the next scheduler entry boundary.
    const trimmed = block.split(/\n\s*\{\s*\n\s*name:/)[0];
    expect(trimmed).toMatch(/timeZone:\s*['"]Asia\/Riyadh['"]/);
    expect(trimmed).toMatch(/hourRiyadh\s*!==\s*9/);
  });

  it('scheduler entry lazy-imports SubscriptionRenewalNotifier', () => {
    const block = SRC.split('JOB_NAMES.subscriptionRenewalReminder')[1] ?? '';
    const trimmed = block.split(/\n\s*\{\s*\n\s*name:/)[0];
    expect(trimmed).toMatch(
      /const\s*\{\s*SubscriptionRenewalNotifier\s*\}\s*=\s*await\s+import\(\s*['"]@haa\/commerce-core['"]\s*\)/,
    );
    expect(trimmed).toMatch(/\.runDailySweep\(\)/);
  });
});
