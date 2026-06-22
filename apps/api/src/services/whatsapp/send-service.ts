/**
 * Outbound WhatsApp send service.
 *
 * Routes call `sendMessage(storeId, to, body)`. The service:
 *   1. Enforces the per-store rate cap via `WhatsappRateLimiter`. If
 *      the bucket is empty, throws a typed `RATE_LIMITED` error so the
 *      caller can return 429 and the campaign worker can re-enqueue.
 *   2. Asks the `SessionManager` for the active client. If status is
 *      not `connected`, throws `SESSION_NOT_CONNECTED`.
 *   3. Calls `client.sendMessage(jid, body)` with retry + exponential
 *      backoff (3 attempts: 0s, 1s, 3s). Only transient errors retry;
 *      a "session_not_connected" failure bails immediately.
 *
 * This service does NOT persist `whatsapp_delivery` rows — that's the
 * campaign worker's job. The single-message route uses it directly for
 * the merchant's "send test" button without writing to the campaign
 * tables.
 */

import type { SessionManager } from './session-manager.js';
import { whatsappRateLimiter } from './rate-limiter.js';
import type { BaileysClient } from './baileys-client.js';

export type WhatsappSendError =
  | { code: 'RATE_LIMITED'; remaining: number }
  | { code: 'SESSION_NOT_CONNECTED' }
  | { code: 'INVALID_PHONE'; phone: string }
  | { code: 'SEND_FAILED'; attempts: number; cause: string };

export class WhatsappSendException extends Error {
  constructor(public readonly info: WhatsappSendError) {
    super(typeof info === 'object' && 'code' in info ? info.code : 'WHATSAPP_SEND_ERROR');
    this.name = 'WhatsappSendException';
  }
}

export interface SendOptions {
  /** Maximum retry attempts on transient failure. Default 3. */
  maxAttempts?: number;
  /** Backoff schedule (ms). Default [0, 1000, 3000]. */
  backoffsMs?: number[];
  /** Clock source (injectable for tests). */
  delay?: (ms: number) => Promise<void>;
}

const defaultDelay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isValidPhone(to: string): boolean {
  if (to.includes('@')) return /^[0-9]+@s\.whatsapp\.net$/i.test(to);
  const digits = to.replace(/\D/g, '');
  // Saudi numbers are 12 digits with country code, 10 without leading 0.
  return digits.length >= 9 && digits.length <= 15;
}

export async function sendWhatsappMessage(
  manager: SessionManager,
  storeId: number,
  to: string,
  body: string,
  opts: SendOptions = {},
): Promise<void> {
  if (!isValidPhone(to)) {
    throw new WhatsappSendException({ code: 'INVALID_PHONE', phone: to });
  }
  // 1. Rate cap.
  if (!whatsappRateLimiter.tryTake(storeId)) {
    throw new WhatsappSendException({
      code: 'RATE_LIMITED',
      remaining: whatsappRateLimiter.remaining(storeId),
    });
  }
  // 2. Session check.
  const status = await manager.status(storeId);
  if (status !== 'connected') {
    throw new WhatsappSendException({ code: 'SESSION_NOT_CONNECTED' });
  }

  // 3. Retry loop.
  const maxAttempts = opts.maxAttempts ?? 3;
  const backoffs = opts.backoffsMs ?? [0, 1000, 3000];
  const delay = opts.delay ?? defaultDelay;
  let lastCause = 'unknown';

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const wait = backoffs[attempt] ?? backoffs[backoffs.length - 1] ?? 0;
    if (wait > 0) await delay(wait);
    try {
      // The send is performed by the BaileysClient instance the manager
      // holds for this storeId. We reach into the manager's internal
      // client only via a dedicated test hook to keep the public API
      // stable. In production, the manager exposes the client to a
      // narrow set of trusted callers (this service).
      const client = (manager as unknown as { clients: Map<number, BaileysClient> }).clients.get(storeId);
      if (!client) throw new Error('client not found in registry');
      await client.sendMessage(to, body);
      return;
    } catch (err) {
      lastCause = err instanceof Error ? err.message : String(err);
      // If the session died mid-send, bail (don't retry into a closed socket).
      if (/not connected|logged out/i.test(lastCause)) {
        throw new WhatsappSendException({ code: 'SESSION_NOT_CONNECTED' });
      }
    }
  }
  throw new WhatsappSendException({
    code: 'SEND_FAILED',
    attempts: maxAttempts,
    cause: lastCause,
  });
}
