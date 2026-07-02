// Webhook timestamp verification — prevents replay attacks on webhooks.
//
// Validates that webhook requests include a timestamp within an acceptable
// window (default 5 minutes). This prevents attackers from capturing old
// webhook payloads and replaying them later.

import type { MiddlewareHandler, Context, Next } from 'hono';

export const WEBHOOK_TIMESTAMP_WINDOW_SECONDS = 5 * 60; // 5 minutes

/**
 * Verify webhook timestamp to prevent replay attacks.
 *
 * Checks X-Webhook-Timestamp header and ensures it's within
 * WEBHOOK_TIMESTAMP_WINDOW_SECONDS of the current time.
 *
 * - Missing or invalid timestamp: 400 Bad Request
 * - Expired timestamp (> 5 min old): 400 Bad Request
 * - Valid timestamp: continues
 *
 * Usage:
 *   webhookRouter.post('/payments/:provider', webhookTimestampVerify(), handler)
 */
export function webhookTimestampVerify(windowSeconds = WEBHOOK_TIMESTAMP_WINDOW_SECONDS): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const timestampHeader = c.req.header('x-webhook-timestamp');

    if (!timestampHeader) {
      return c.json(
        { success: false, error: { code: 'MISSING_TIMESTAMP', message: 'Missing X-Webhook-Timestamp header' } },
        400,
      );
    }

    const timestamp = Number(timestampHeader);
    if (Number.isNaN(timestamp)) {
      return c.json(
        { success: false, error: { code: 'INVALID_TIMESTAMP', message: 'X-Webhook-Timestamp must be a valid number (unix ms)' } },
        400,
      );
    }

    const now = Date.now();
    const ageMs = now - timestamp;
    const windowMs = windowSeconds * 1000;

    if (ageMs < 0) {
      // Timestamp in future (clock skew tolerance: ±1 second)
      if (Math.abs(ageMs) > 1000) {
        return c.json(
          { success: false, error: { code: 'FUTURE_TIMESTAMP', message: 'Webhook timestamp is too far in the future' } },
          400,
        );
      }
    } else if (ageMs > windowMs) {
      // Timestamp too old — replay attack prevention
      return c.json(
        {
          success: false,
          error: {
            code: 'EXPIRED_TIMESTAMP',
            message: `Webhook timestamp is older than ${windowSeconds} seconds`,
          },
        },
        400,
      );
    }

    // Timestamp is valid — continue
    await next();
  };
}
