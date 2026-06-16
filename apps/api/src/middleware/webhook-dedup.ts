// Webhook deduplication middleware — Hono wrapper.
//
// The pure dedup logic (key resolution, sentinel insertion)
// lives in @haa/integration-core (packages/integration-core/
// src/webhook-dedup.ts) and is re-exported from there. This
// file is now a thin Hono-aware wrapper that pulls the
// `x-idempotency-key` header off the request context and
// forwards to the pure helper.
//
// Original home: apps/api/src/middleware/webhook-dedup.ts.
// The pure functions were extracted as part of Quality Pass
// 5, Route Migration 18/24 (webhooks.ts) so the new
// PaymentWebhookService in @haa/commerce-core can reuse
// them without a circular dependency on apps/api.

import type { Context } from 'hono';
import { deduplicateWebhook, IDEMPOTENCY_KEY_HEADER, type DedupeResult } from '@haa/integration-core';

export type { DedupeResult } from '@haa/integration-core';
export { resolveIdempotencyKey, IDEMPOTENCY_KEY_HEADER, deduplicateWebhook } from '@haa/integration-core';

/**
 * Convenience wrapper for Hono route handlers: pulls the
 * `x-idempotency-key` header off the request and forwards to
 * deduplicateWebhook. Useful when the route wants to keep the
 * call site short.
 */
export async function deduplicateFromContext(
  c: Context,
  provider: string,
  rawBody: string,
  signature: string,
): Promise<DedupeResult> {
  const header = c.req.header(IDEMPOTENCY_KEY_HEADER);
  return deduplicateWebhook(provider, rawBody, signature, header);
}
