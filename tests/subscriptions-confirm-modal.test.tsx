// Audit Part 5 P0 #1 — Subscriptions confirm Dialog.
//
// Before this fix, clicking "ترقية" or "تخفيض" on a plan card called
// `subscriptionApi.upgrade` / `subscriptionApi.downgrade` synchronously
// inside the Button's `onClick`. A merchant misclick became a real
// billing change with no second-chance UI.
//
// These tests lock the new behaviour at the source level (same pattern
// as `merchant-dashboard-apple-grade-fixes.test.ts`):
//   1. The action button no longer calls `subscriptionApi.upgrade` or
//      `subscriptionApi.downgrade` directly from `onClick`.
//   2. A Dialog is rendered with a confirm button that fires
//      `confirmPlanChange`.
//   3. The Dialog shows the new plan name, the new price, and the
//      billing cycle before the merchant confirms.
//   3b. The Dialog shows financial impact details: current price,
//       price delta, proration estimate, remaining days, effective timing,
//       and the next/current period date before the merchant confirms.
//   4. Error toasts go through `messageFromError` (no naked `err.message`
//      fall-through that swallows API codes).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

const SUBSCRIPTIONS = read('apps/merchant-dashboard/src/pages/Subscriptions.tsx');

describe('Subscriptions confirm modal (audit Part 5 P0 #1)', () => {
  it('imports Dialog primitives from the local ui/dialog module', () => {
    expect(SUBSCRIPTIONS).toMatch(/from '@\/components\/ui\/dialog'/);
    expect(SUBSCRIPTIONS).toMatch(/\bDialog\b/);
    expect(SUBSCRIPTIONS).toMatch(/\bDialogContent\b/);
    expect(SUBSCRIPTIONS).toMatch(/\bDialogTitle\b/);
    expect(SUBSCRIPTIONS).toMatch(/\bDialogFooter\b/);
  });

  it('uses messageFromError on toasts (no raw err.message fall-through)', () => {
    expect(SUBSCRIPTIONS).toMatch(
      /from '@\/lib\/error-mapper'/,
    );
    expect(SUBSCRIPTIONS).toMatch(/messageFromError\(\s*err\s*,\s*t\s*\)/);
    // The old pattern that swallowed the ApiClientError.code is gone.
    expect(SUBSCRIPTIONS).not.toMatch(/toast\.error\(\s*err\.message\s*\|\|/);
  });

  it('stages the plan change instead of firing the API on click', () => {
    // requestPlanChange + pendingChange state replace the old direct
    // upgrade/downgrade calls inside onClick.
    expect(SUBSCRIPTIONS).toMatch(/function requestPlanChange\(/);
    expect(SUBSCRIPTIONS).toMatch(/setPendingChange\(/);
    expect(SUBSCRIPTIONS).toMatch(/onClick=\{\(\)\s*=>\s*\n?\s*requestPlanChange\(/);
    // The old onClick path that fired upgrade/downgrade directly is gone.
    expect(SUBSCRIPTIONS).not.toMatch(
      /onClick=\{\(\)\s*=>\s*plan\.sortOrder\s*>\s*\(currentPlan\?\.sortOrder\s*\?\?\s*0\)\s*\?\s*handleUpgrade/,
    );
  });

  it('confirmPlanChange is the only path that calls upgrade/downgrade', () => {
    expect(SUBSCRIPTIONS).toMatch(/async function confirmPlanChange\(/);
    expect(SUBSCRIPTIONS).toMatch(/subscriptionApi\.upgrade\(/);
    expect(SUBSCRIPTIONS).toMatch(/subscriptionApi\.downgrade\(/);
    // The API calls live inside confirmPlanChange now — not in any
    // standalone handleUpgrade / handleDowngrade function.
    expect(SUBSCRIPTIONS).not.toMatch(/async function handleUpgrade\(/);
    expect(SUBSCRIPTIONS).not.toMatch(/async function handleDowngrade\(/);
  });

  it('renders the Dialog with the new plan name, price, and cycle', () => {
    // Dialog open binds to pendingChange.
    expect(SUBSCRIPTIONS).toMatch(/open=\{pendingChange\s*!==\s*null\}/);
    // The three pieces of information the merchant must see before
    // confirming a billing change.
    expect(SUBSCRIPTIONS).toMatch(/data-testid="plan-change-new-plan"/);
    expect(SUBSCRIPTIONS).toMatch(/data-testid="plan-change-new-price"/);
    expect(SUBSCRIPTIONS).toMatch(/data-testid="plan-change-confirm-button"/);
    expect(SUBSCRIPTIONS).toMatch(/data-testid="plan-change-confirm-dialog"/);
    // The new plan name + price come from pendingChange.plan, not the
    // current subscription, so the merchant sees what they will be
    // billed.
    expect(SUBSCRIPTIONS).toMatch(/pendingChange\.plan\.name/);
    expect(SUBSCRIPTIONS).toMatch(/pendingChange\.plan\.priceMonthly/);
    expect(SUBSCRIPTIONS).toMatch(/pendingChange\.plan\.priceAnnual/);
    // The confirm button copy is "تأكيد التغيير" per the audit ask.
    expect(SUBSCRIPTIONS).toMatch(/تأكيد التغيير/);
  });

  it('renders financial impact, proration, and effective-date details before confirm', () => {
    expect(SUBSCRIPTIONS).toMatch(/function getPlanChangeImpact\(/);
    expect(SUBSCRIPTIONS).toMatch(/getRemainingCycleDays/);
    expect(SUBSCRIPTIONS).toMatch(/priceDelta/);
    expect(SUBSCRIPTIONS).toMatch(/estimatedProration/);
    expect(SUBSCRIPTIONS).toMatch(/remainingDays/);
    expect(SUBSCRIPTIONS).toMatch(/cycleDays/);
    expect(SUBSCRIPTIONS).toMatch(/getEstimatedNextPeriodEnd/);

    expect(SUBSCRIPTIONS).toMatch(/data-testid="plan-change-current-price"/);
    expect(SUBSCRIPTIONS).toMatch(/data-testid="plan-change-price-delta"/);
    expect(SUBSCRIPTIONS).toMatch(/data-testid="plan-change-proration-estimate"/);
    expect(SUBSCRIPTIONS).toMatch(/data-testid="plan-change-remaining-days"/);
    expect(SUBSCRIPTIONS).toMatch(/data-testid="plan-change-effective-date"/);
    expect(SUBSCRIPTIONS).toMatch(/data-testid="plan-change-next-period"/);
    expect(SUBSCRIPTIONS).toMatch(/data-testid="plan-change-proration-note"/);

    expect(SUBSCRIPTIONS).toContain('هذا تقدير مبني على فرق السعر والأيام المتبقية');
    expect(SUBSCRIPTIONS).toContain('الفاتورة النهائية تُحسب من النظام بعد التأكيد');
    expect(SUBSCRIPTIONS).toContain('فور تأكيد التغيير');
    expect(SUBSCRIPTIONS).toContain('لا تُنشأ فاتورة تناسب تلقائية عند التخفيض');
  });

  it('disables the confirm button while the API call is in flight', () => {
    expect(SUBSCRIPTIONS).toMatch(/submittingChange/);
    expect(SUBSCRIPTIONS).toMatch(/disabled=\{submittingChange\}/);
  });

  it('does not close the dialog while a change is submitting', () => {
    // onOpenChange guards against dismissing during the API call.
    expect(SUBSCRIPTIONS).toMatch(
      /onOpenChange=\{[^}]*!open\s*&&\s*!submittingChange[^}]*setPendingChange\(null\)/s,
    );
  });
});
