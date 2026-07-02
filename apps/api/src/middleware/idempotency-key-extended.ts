// Extended idempotency for webhook endpoints — prevents duplicate processing.
//
// Provides webhook-specific deduplication for providers that don't send
// standard Idempotency-Key headers (Moyasar, OTO, SMSA, etc.).
//
// Strategy: Use (provider + signature + body_hash) as dedup key with 24h TTL.
// This prevents re-processing of webhook deliveries within 24 hours.

import type { MiddlewareHandler, Context, Next } from 'hono';
import { createHash } from 'node:crypto';

const WEBHOOK_DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const dedupCache = new Map<string, number>(); // dedupKey -> timestamp

/**
 * Extended idempotency for webhooks without standard Idempotency-Key.
 *
 * For providers like Moyasar, OTO, etc., generates dedup key from:
 * - Provider name (from URL param or header)
 * - Webhook signature (provider-specific auth header)
 * - Body hash (SHA256 of raw body)
 *
 * Checks for duplicate delivery in last 24 hours. If found,
 * returns 200 OK with isDuplicate flag to prevent reprocessing.
 *
 * Non-blocking: if dedup check fails, webhook still processes
 * (graceful degradation prevents provider timeouts).
 *
 * Usage:
 *   webhookRouter.post('/payments/:provider', webhookIdempotencyExtended(), handler)
 */
export function webhookIdempotencyExtended(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const provider = c.req.param('provider') || 'unknown';
    const signature = c.req.header('x-moyasar-signature')
      || c.req.header('x-signature')
      || c.req.header('x-notification-token')
      || '';

    // Fallback: if no signature, can't deduplicate securely
    if (!signature) {
      await next();
      return;
    }

    try {
      const rawBody = await c.req.text();
      const bodyHash = createHash('sha256').update(rawBody).digest('hex');
      const dedupKey = `${provider}:${signature.slice(0, 20)}:${bodyHash.slice(0, 16)}`;

      const now = Date.now();
      const cached = dedupCache.get(dedupKey);

      // Check if duplicate (seen within 24h window)
      if (cached && now - cached < WEBHOOK_DEDUP_WINDOW_MS) {
        return c.json({
          success: true,
          data: { message: 'Webhook already processed', isDuplicate: true },
        });
      }

      // Record this webhook in cache
      dedupCache.set(dedupKey, now);

      // Cleanup old entries (every 100th request, prune cache older than 24h)
      if (Math.random() < 0.01) {
        for (const [key, timestamp] of dedupCache.entries()) {
          if (now - timestamp > WEBHOOK_DEDUP_WINDOW_MS) {
            dedupCache.delete(key);
          }
        }
      }

      // Store raw body for handler access
      c.env.rawBody = rawBody;

      await next();
    } catch {
      // Non-blocking: if dedup check fails, still process webhook
      await next();
    }
  };
}
