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
});
