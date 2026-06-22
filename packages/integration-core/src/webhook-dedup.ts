// Webhook deduplication helper — Quality Pass 3, Item 2
// (extracted to @haa/integration-core as part of
// Quality Pass 5, Route Migration 18/24 so it can be reused
// by the new PaymentWebhookService in @haa/commerce-core).
//
// Defense against duplicate webhook deliveries from payment and
// shipping providers. The providers re-deliver the same webhook
// for reliability, and re-processing the business logic causes
// double wallet entries, duplicate notifications, and double
// outbox events.
//
// The existing paymentWebhookEvents table has a UNIQUE constraint
// on idempotencyKey. Moyasar's provider already uses this for
// dedup when the provider sends an x-idempotency-key header —
// but most providers do NOT send that header, so the dedup never
// fires in practice. Shipping webhooks have NO dedup at all.
//
// This helper:
//   1. Computes an idempotency key: prefer the provider-supplied
//      header; fall back to sha256(provider + rawBody + signature)
//      when the header is missing. The fallback guarantees the
//      same physical delivery always produces the same key.
//   2. Checks paymentWebhookEvents for an existing record with
//      that key. If found → returns { duplicate: true }.
//   3. Otherwise inserts a sentinel record (status='received')
//      to claim the key, and returns { duplicate: false }.
//
// Callers must call this BEFORE running business logic, and bail
// out with a 200 { success: true, data: { eventType:
// 'duplicate_ignored' } } when the helper reports a duplicate.

import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';

export type DedupeResult =
  | { duplicate: true; existingId: number }
  | { duplicate: false };

const IDEMPOTENCY_HEADER = 'x-idempotency-key';

// Per-process counters. Used by the diagnostics endpoint to answer
// "is the dedup actually firing?" without a DB query. Counters reset
// on process restart; they answer the operational question, not the
// historical one (use the paymentWebhookEvents table for that).
interface DedupeMetrics {
  total: number;
  duplicates: number;
  fresh: number;
  errors: number;
  byProvider: Record<string, { total: number; duplicates: number }>;
}

const _metrics: DedupeMetrics = {
  total: 0,
  duplicates: 0,
  fresh: 0,
  errors: 0,
  byProvider: {},
};

function bumpProvider(provider: string, duplicate: boolean): void {
  let bucket = _metrics.byProvider[provider];
  if (!bucket) {
    bucket = { total: 0, duplicates: 0 };
    _metrics.byProvider[provider] = bucket;
  }
  bucket.total += 1;
  if (duplicate) bucket.duplicates += 1;
}

export interface WebhookDedupStats {
  total: number;
  duplicates: number;
  fresh: number;
  errors: number;
  duplicateRate: number;
  byProvider: Record<string, { total: number; duplicates: number; duplicateRate: number }>;
}

export function getWebhookDedupStats(): WebhookDedupStats {
  const byProvider: WebhookDedupStats['byProvider'] = {};
  for (const [provider, bucket] of Object.entries(_metrics.byProvider)) {
    byProvider[provider] = {
      total: bucket.total,
      duplicates: bucket.duplicates,
      duplicateRate: bucket.total === 0 ? 0 : bucket.duplicates / bucket.total,
    };
  }
  return {
    total: _metrics.total,
    duplicates: _metrics.duplicates,
    fresh: _metrics.fresh,
    errors: _metrics.errors,
    duplicateRate: _metrics.total === 0 ? 0 : _metrics.duplicates / _metrics.total,
    byProvider,
  };
}

/** Test-only. Resets all counters. */
export function resetWebhookDedupMetrics(): void {
  _metrics.total = 0;
  _metrics.duplicates = 0;
  _metrics.fresh = 0;
  _metrics.errors = 0;
  _metrics.byProvider = {};
}

/**
 * The header name exposed for callers that want to read it
 * from a Hono context themselves (kept here so the Hono
 * wrapper in apps/api/src/middleware/webhook-dedup.ts does
 * not have to re-declare the string).
 */
export const IDEMPOTENCY_KEY_HEADER = IDEMPOTENCY_HEADER;

function computeFallbackKey(
  provider: string,
  rawBody: string,
  signature: string,
): string {
  const h = createHash('sha256');
  h.update(provider);
  h.update('\n');
  h.update(rawBody);
  h.update('\n');
  h.update(signature);
  return `sha256:${h.digest('hex')}`;
}

export function resolveIdempotencyKey(
  provider: string,
  rawBody: string,
  signature: string,
  headerValue: string | undefined,
): string {
  // Prefer the provider-supplied header. Trim and only accept
  // non-empty values; treat empty as missing.
  const fromHeader = headerValue?.trim();
  if (fromHeader && fromHeader.length > 0) return fromHeader;
  return computeFallbackKey(provider, rawBody, signature);
}

/**
 * Check if a webhook with this idempotency key has already been
 * processed. If not, claim the key by inserting a sentinel record
 * (status='received') and return `{ duplicate: false }`.
 *
 * Race condition note: two concurrent deliveries of the same
 * webhook could both pass the SELECT, but the UNIQUE constraint
 * on idempotencyKey ensures only one INSERT succeeds. Callers
 * should catch the unique-violation error as a backstop — the
 * helper does NOT swallow it (so the second caller gets a clear
 * error and can decide how to react).
 */
export async function deduplicateWebhook(
  provider: string,
  rawBody: string,
  signature: string,
  headerIdempotencyKey: string | undefined,
): Promise<DedupeResult> {
  _metrics.total += 1;
  try {
    const key = resolveIdempotencyKey(
      provider,
      rawBody,
      signature,
      headerIdempotencyKey,
    );
    const db = createDbClient();
    const [existing] = await db
      .select({ id: s.paymentWebhookEvents.id })
      .from(s.paymentWebhookEvents)
      .where(eq(s.paymentWebhookEvents.idempotencyKey, key))
      .limit(1);
    if (existing) {
      _metrics.duplicates += 1;
      bumpProvider(provider, true);
      return { duplicate: true, existingId: existing.id };
    }
    // Sentinel: claim the key with a minimal record. The route's
    // business logic may overwrite fields like eventType, rawBody,
    // status later when it has more context.
    await db.insert(s.paymentWebhookEvents).values({
      provider,
      eventType: 'pending',
      rawBody: rawBody.slice(0, 65535),
      idempotencyKey: key,
      status: 'received',
    });
    _metrics.fresh += 1;
    bumpProvider(provider, false);
    return { duplicate: false };
  } catch (err) {
    _metrics.errors += 1;
    throw err;
  }
}
