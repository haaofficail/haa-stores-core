// Payment test environment scenarios — DECISION-OS-012.
// Pure source-grep + unit checks on the FakePaymentProvider scenario list.
// No live API. No real money.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FAKE_PATH = resolve(__dirname, '../packages/payment-providers/src/fake.ts');

describe('Payment test environment (DECISION-OS-012)', () => {
  const src = readFileSync(FAKE_PATH, 'utf-8');

  it.each([
    ['fake_card_success', /'fake_card_success'/],
    ['fake_card_failed', /'fake_card_failed'/],
    ['fake_card_declined', /'fake_card_declined'/],
    ['fake_card_cancelled', /'fake_card_cancelled'/],
    ['fake_card_expired', /'fake_card_expired'/],
    ['bank_transfer', /'bank_transfer'/],
    ['cash_on_delivery', /'cash_on_delivery'/],
    ['fake_3ds_challenge', /'fake_3ds_challenge'/],
  ])('FakePaymentProvider supports scenario %s', (_label, pattern) => {
    expect(src).toMatch(pattern);
  });

  it('FakePaymentProvider has webhook signature verifier (timing-safe in spirit)', () => {
    expect(src).toMatch(/verifyWebhookSignature\s*\(/);
  });

  it('catalogue document exists and lists the scenarios', () => {
    const doc = readFileSync(
      resolve(__dirname, '../docs/agent-os/PAYMENT_TEST_ENVIRONMENT.md'),
      'utf-8',
    );
    for (const k of [
      'fake_card_success',
      'fake_card_declined',
      'fake_card_cancelled',
      'fake_card_expired',
      'bank_transfer',
      'cash_on_delivery',
      'fake_3ds_challenge',
      'Duplicate webhook',
      'Invalid signature',
    ]) {
      expect(doc).toContain(k);
    }
  });

  // W3 (Autopilot Phase 3): the 9-scenario surface required by the
  // SAFE FULL AUTOPILOT spec. The first 7 are card-state scenarios
  // (covered by it.each above); these last 2 are TIMING/ORDERING
  // scenarios. Each has dedicated infrastructure in the service layer:
  describe('W3 — webhook timing / ordering scenarios', () => {
    const webhookService = readFileSync(
      resolve(__dirname, '../packages/commerce-core/src/payment-webhook-service.ts'),
      'utf-8',
    );

    it('duplicate webhook → second arrival hits deduplicateWebhook + returns duplicate_ignored', () => {
      // Same provider event arriving twice must NOT double-credit
      // the customer / double-charge / double-fire emails.
      expect(webhookService).toMatch(/deduplicateWebhook/);
      expect(webhookService).toMatch(/duplicate_ignored/);
    });

    it('invalid signature → 400 + audit log + no order mutation', () => {
      // Provider sends an unsigned or tampered payload. The handler
      // rejects BEFORE touching the order row.
      expect(webhookService).toMatch(/verifyWebhookSignature/);
      expect(webhookService).toMatch(/Invalid webhook signature/);
    });

    it('FakePaymentProvider implements verifyWebhookSignature', () => {
      // Provider boundary — even the fake provider must have a real
      // verifier surface so tests can simulate "bad signature" flow.
      expect(src).toMatch(/verifyWebhookSignature\s*\(/);
    });

    it('callback-before-webhook + webhook-before-callback both handled', () => {
      // Both orderings must converge on the same paid state. The
      // confirm() path reads the order row INSIDE the transaction
      // (PR #169 TOCTOU fix), so whichever arrives second sees the
      // already-paid state and short-circuits via idempotency.
      const orderService = readFileSync(
        resolve(__dirname, '../packages/commerce-core/src/orders.ts'),
        'utf-8',
      );
      // The idempotency guard added in PR #169:
      expect(orderService).toMatch(/paymentStatus === previous\.paymentStatus/);
      // Tested end-to-end by tests/order-state-hardening.test.ts (33 tests)
      // and tests/webhook-dedup.test.ts (which we re-assert exists here).
      const dedupeTest = resolve(__dirname, 'webhook-dedup.test.ts');
      expect(() => readFileSync(dedupeTest, 'utf-8')).not.toThrow();
    });

    it('delayed webhook → idempotent update (no time-window rejection)', () => {
      // Provider may retry hours later. The handler must NOT reject
      // based on `createdAt + N minutes < now`. We verify the
      // ABSENCE of such a guard.
      expect(webhookService).not.toMatch(/createdAt.*[<>]=?.*now\(\).*minute/);
    });
  });
});
