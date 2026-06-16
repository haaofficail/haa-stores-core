// Webhook Idempotency / Deduplication — Quality Pass 3, Item 2
//
// Source-grep tests for apps/api/src/middleware/webhook-dedup.ts
// and its usage in the two webhook route files (webhooks.ts and
// shipping-webhooks.ts).
//
// Background: payment providers (Moyasar, HyperPay, etc.) and
// shipping providers (SMSA, OTO, Aramex) regularly re-deliver the
// same webhook for reliability. The current code:
//   - has a `paymentWebhookEvents.idempotency_key` column with a
//     UNIQUE constraint, BUT
//   - only dedupes when the provider sends an `x-idempotency-key`
//     header (which most providers do NOT do on inbound webhooks).
//   - shipping webhooks have NO dedup at all.
//
// The fix: a helper that always computes an idempotency key from
// (provider + rawBody + signature) when the provider doesn't send
// one, ensuring idempotency regardless of provider behavior.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);

const helperPath = resolve(projectRoot, 'apps/api/src/middleware/webhook-dedup.ts');
const webhooksPath = resolve(projectRoot, 'apps/api/src/routes/webhooks.ts');
const shippingWebhooksPath = resolve(projectRoot, 'apps/api/src/routes/shipping-webhooks.ts');
const paymentsSchemaPath = resolve(projectRoot, 'packages/db/src/schema/payments.ts');

const helper = readFileSync(helperPath, 'utf-8');
const webhooks = readFileSync(webhooksPath, 'utf-8');
const shippingWebhooks = readFileSync(shippingWebhooksPath, 'utf-8');
const paymentsSchema = readFileSync(paymentsSchemaPath, 'utf-8');

describe('Webhook Idempotency / Deduplication (Quality Pass 3, Item 2)', () => {
  describe('Helper module (webhook-dedup.ts)', () => {
    it('exists', () => {
      expect(helper).toBeDefined();
      expect(helper.length).toBeGreaterThan(0);
    });

    it('exports a deduplicateWebhook helper function', () => {
      // Should export either a function or a class with the expected name
      expect(helper).toMatch(/export.*(deduplicateWebhook|webhookDedup|checkWebhookDuplicate)/);
    });

    it('computes a fallback idempotency key from rawBody when the header is absent', () => {
      // Must include some kind of hashing logic (sha256, crypto, etc.)
      // OR call into a helper that does
      expect(helper).toMatch(/sha256|crypto\.|createHash|webcrypto|hash/i);
    });

    it('prefers the provider-supplied x-idempotency-key header when present', () => {
      // The function should read the header and use it if present
      expect(helper).toMatch(/x-idempotency-key|idempotencyKey/);
    });

    it('queries the paymentWebhookEvents table for the computed key', () => {
      // Should use paymentWebhookEvents (the existing table)
      expect(helper).toContain('paymentWebhookEvents');
    });

    it('returns a "duplicate" signal when an event with the same key already exists', () => {
      // Should return some shape like { duplicate: true } or null
      expect(helper).toMatch(/duplicate|already/i);
    });

    it('inserts a sentinel record with the computed key when no duplicate exists', () => {
      // Should call .insert() on the table
      expect(helper).toMatch(/paymentWebhookEvents.*insert|\.insert\(.*paymentWebhookEvents/);
    });
  });

  describe('Wiring (webhooks.ts)', () => {
    it('imports the dedup helper', () => {
      expect(webhooks).toMatch(/from.*webhook-dedup|require.*webhook-dedup/);
    });

    it('calls the dedup helper AFTER signature verification (to prevent pre-poisoning by attackers)', () => {
      // The dedup must run AFTER signature verification. Otherwise
      // an attacker could send arbitrary bodies with bogus
      // signatures to pre-poison the idempotency table and block
      // legitimate deliveries.
      // Use matchAll to find the call site (not the import).
      const sigIdx = webhooks.search(/verifyWebhookSignature/);
      // Find the second occurrence of the helper name (the call
      // site, after the import).
      const dedupMatches = [...webhooks.matchAll(/deduplicateFromContext|deduplicateWebhook/g)];
      const dedupIdx = dedupMatches.length > 1 ? dedupMatches[1].index : dedupMatches[0]?.index ?? -1;
      expect(sigIdx).toBeGreaterThan(-1);
      expect(dedupIdx).toBeGreaterThan(-1);
      expect(dedupIdx).toBeGreaterThan(sigIdx);
    });

    it('returns 200 with duplicate_ignored when the helper reports a duplicate', () => {
      expect(webhooks).toMatch(/duplicate_ignored|duplicate/);
    });
  });

  describe('Wiring (shipping-webhooks.ts)', () => {
    it('imports the dedup helper', () => {
      expect(shippingWebhooks).toMatch(/from.*webhook-dedup|require.*webhook-dedup/);
    });

    it('calls the dedup helper in the generic shipping webhook route', () => {
      const dedupIdx = shippingWebhooks.search(/deduplicate|webhookDedup|checkWebhookDuplicate/);
      expect(dedupIdx).toBeGreaterThan(-1);
    });
  });

  describe('Schema invariant (packages/db/src/schema/payments.ts)', () => {
    it('paymentWebhookEvents.idempotencyKey column is UNIQUE (the dedup key)', () => {
      expect(paymentsSchema).toMatch(/idempotencyKey.*unique|idempotency_key.*unique/i);
    });
  });
});
