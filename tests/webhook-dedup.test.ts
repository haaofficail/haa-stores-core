// Webhook Idempotency / Deduplication — Quality Pass 3, Item 2
// (updated for Quality Pass 5, Route Migration 18/24)
//
// Source-grep tests for the webhook dedup helper, the
// PaymentWebhookService that uses it, and the webhooks
// route that delegates to the service.
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
//
// As of QP5 Route Migration 18/24, the pure helper lives in
// @haa/integration-core (packages/integration-core/src/
// webhook-dedup.ts) so it can be reused by both the Hono
// middleware in apps/api and the new PaymentWebhookService in
// @haa/commerce-core. The Hono wrapper
// (deduplicateFromContext) re-exports from there.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);

const integrationDedupPath = resolve(projectRoot, 'packages/integration-core/src/webhook-dedup.ts');
const integrationIndexPath = resolve(projectRoot, 'packages/integration-core/src/index.ts');
const honoWrapperPath = resolve(projectRoot, 'apps/api/src/middleware/webhook-dedup.ts');
const webhooksPath = resolve(projectRoot, 'apps/api/src/routes/webhooks.ts');
const servicePath = resolve(projectRoot, 'packages/commerce-core/src/payment-webhook-service.ts');
const shippingWebhooksPath = resolve(projectRoot, 'apps/api/src/routes/shipping-webhooks.ts');
const paymentsSchemaPath = resolve(projectRoot, 'packages/db/src/schema/payments.ts');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

const integrationDedup = read(integrationDedupPath);
const integrationIndex = read(integrationIndexPath);
const honoWrapper = read(honoWrapperPath);
const webhooks = read(webhooksPath);
const service = read(servicePath);
const shippingWebhooks = read(shippingWebhooksPath);
const paymentsSchema = read(paymentsSchemaPath);

describe('Webhook Idempotency / Deduplication (Quality Pass 3, Item 2)', () => {
  describe('Helper module (integration-core/webhook-dedup.ts)', () => {
    it('exists at the new location', () => {
      expect(integrationDedup).toBeDefined();
      expect(integrationDedup.length).toBeGreaterThan(0);
    });

    it('exports a deduplicateWebhook helper function', () => {
      expect(integrationDedup).toMatch(/export.*(deduplicateWebhook|webhookDedup|checkWebhookDuplicate)/);
    });

    it('computes a fallback idempotency key from rawBody when the header is absent', () => {
      expect(integrationDedup).toMatch(/sha256|crypto\.|createHash|webcrypto|hash/i);
    });

    it('prefers the provider-supplied x-idempotency-key header when present', () => {
      expect(integrationDedup).toMatch(/x-idempotency-key|idempotencyKey/);
    });

    it('queries the paymentWebhookEvents table for the computed key', () => {
      expect(integrationDedup).toContain('paymentWebhookEvents');
    });

    it('returns a "duplicate" signal when an event with the same key already exists', () => {
      expect(integrationDedup).toMatch(/duplicate|already/i);
    });

    it('inserts a sentinel record with the computed key when no duplicate exists', () => {
      expect(integrationDedup).toMatch(/paymentWebhookEvents.*insert|\.insert\(.*paymentWebhookEvents/);
    });

    it('is exported from @haa/integration-core', () => {
      expect(integrationIndex).toMatch(/deduplicateWebhook/);
    });
  });

  describe('Hono wrapper (apps/api/src/middleware/webhook-dedup.ts)', () => {
    it('still exists as a thin re-export of the pure helper', () => {
      expect(honoWrapper).toBeDefined();
      // The Hono wrapper re-exports the pure helpers from
      // @haa/integration-core (no longer re-implements them).
      expect(honoWrapper).toMatch(/from\s+['"]@haa\/integration-core['"]/);
    });

    it('preserves the deduplicateFromContext helper for Hono routes', () => {
      // Other Hono routes (e.g., shipping-webhooks.ts) still
      // call deduplicateFromContext for the Hono-aware wrapper.
      expect(honoWrapper).toMatch(/export\s+async\s+function\s+deduplicateFromContext/);
    });
  });

  describe('Wiring — payment webhooks (webhooks.ts → PaymentWebhookService)', () => {
    it('webhooks.ts does NOT call the dedup helper directly (it delegates to the service)', () => {
      // After the migration, the route is a pure transport
      // shell. The dedup is a business concern that lives
      // in the service.
      expect(webhooks).not.toMatch(/deduplicateFromContext\s*\(/);
      expect(webhooks).not.toMatch(/deduplicateWebhook\s*\(/);
    });

    it('webhooks.ts does NOT call verifyWebhookSignature directly (it delegates to the service)', () => {
      // The service owns the signature-verify-then-dedup
      // ordering to keep them atomic at the business layer.
      expect(webhooks).not.toMatch(/verifyWebhookSignature/);
    });

    it('webhooks.ts delegates to PaymentWebhookService.process(...)', () => {
      expect(webhooks).toMatch(/PaymentWebhookService/);
      expect(webhooks).toMatch(/\.process\s*\(/);
    });

    it('PaymentWebhookService uses the integration-core dedup helper (not a local copy)', () => {
      expect(service).toMatch(/from\s+['"]@haa\/integration-core['"]/);
      expect(service).toMatch(/deduplicateWebhook/);
    });

    it('PaymentWebhookService calls dedup AFTER signature verification (to prevent pre-poisoning by attackers)', () => {
      // Order matters: signature verify must happen first
      // so an attacker can't pre-poison the idempotency
      // table with arbitrary bodies.
      //
      // We need to find the CALL site, not the import.
      // Use matchAll to find all occurrences and pick the
      // first call (not the import statement).
      const sigMatches = [...service.matchAll(/verifyWebhookSignature/g)];
      const dedupMatches = [...service.matchAll(/deduplicateWebhook/g)];
      // The first occurrence of each is the import; the
      // call site is the second occurrence (or later).
      const sigCall = sigMatches.length > 1 ? sigMatches[1].index : sigMatches[0]?.index ?? -1;
      const dedupCall = dedupMatches.length > 1 ? dedupMatches[1].index : dedupMatches[0]?.index ?? -1;
      expect(sigCall).toBeGreaterThan(-1);
      expect(dedupCall).toBeGreaterThan(-1);
      expect(dedupCall).toBeGreaterThan(sigCall);
    });

    it('PaymentWebhookService returns duplicate_ignored when the helper reports a duplicate', () => {
      expect(service).toMatch(/duplicate_ignored/);
    });
  });

  describe('Wiring (shipping-webhooks.ts)', () => {
    it('imports the dedup helper', () => {
      expect(shippingWebhooks).toMatch(/from.*webhook-dedup|require.*webhook-dedup|deduplicateFromContext/);
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
