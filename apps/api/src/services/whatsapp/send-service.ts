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
import {
  type BaileysClient,
  type SendMediaOptions,
  type WhatsappMediaType,
  WA_MEDIA_MAX_BYTES,
  WA_MEDIA_MIME_ALLOWLIST,
  isAllowedWhatsappMime,
  inferMediaTypeFromMime,
} from './baileys-client.js';

export { WA_MEDIA_MAX_BYTES, WA_MEDIA_MIME_ALLOWLIST, isAllowedWhatsappMime };

export type WhatsappSendError =
  | { code: 'RATE_LIMITED'; remaining: number }
  | { code: 'SESSION_NOT_CONNECTED' }
  | { code: 'INVALID_PHONE'; phone: string }
  | { code: 'INVALID_MEDIA_URL'; reason: string }
  | { code: 'MEDIA_MIME_NOT_ALLOWED'; mime: string }
  | { code: 'MEDIA_TOO_LARGE'; bytes: number; maxBytes: number }
  | { code: 'MEDIA_TYPE_MISMATCH'; mime: string; declaredType: string }
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

export interface SendMediaInput {
  /** Recipient phone or JID (Saudi-normalised by the underlying client). */
  to: string;
  /** Publicly fetchable URL Baileys will pull and re-upload. Same accept
   *  rule as the merchant upload pipeline — a signed `/storage/...` URL
   *  or an S3/MinIO public URL. */
  mediaUrl: string;
  /** image | video | document — must agree with `mimeType` (we
   *  cross-check; see `MEDIA_TYPE_MISMATCH`). */
  type: WhatsappMediaType;
  /** MIME type. Required for documents. Validated against
   *  `WA_MEDIA_MIME_ALLOWLIST` and rejected with
   *  `MEDIA_MIME_NOT_ALLOWED` otherwise. */
  mimeType: string;
  /** Optional caption. */
  caption?: string;
  /** Optional file name (shown in WhatsApp UI for documents). */
  fileName?: string;
  /** Optional pre-known byte size — when set, enforces the
   *  `WA_MEDIA_MAX_BYTES` cap before Baileys ever fetches the URL.
   *  Callers SHOULD pass this from the upload result so the cap is
   *  enforced cheaply on the request path. */
  sizeBytes?: number;
}

/**
 * Validate the media URL shape. We accept https URLs (S3 / MinIO
 * public) and our own signed local-storage URLs (path starts with
 * `/storage/`). Anything else is rejected — we do NOT want to follow
 * an `http://` or a `file://` from the merchant's panel into the
 * Baileys runtime.
 */
function validateMediaUrl(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return 'Media URL is required';
  if (raw.length > 2048) return 'Media URL exceeds 2048 chars';
  if (raw.startsWith('/storage/')) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return 'Media URL must use HTTPS or be a signed /storage/ path';
    return null;
  } catch {
    return 'Media URL is not a valid URL';
  }
}

/**
 * Outbound WhatsApp media send. Pipes media through the existing
 * MinIO/S3 upload flow (merchant uploads → gets URL → posts here).
 *
 * Validation order (all fail-closed):
 *   1. Phone number well-formed.
 *   2. Media URL shape (https or /storage signed path).
 *   3. MIME on the allow-list (`WA_MEDIA_MIME_ALLOWLIST`).
 *   4. `type` agrees with `mimeType` (no smuggling a PDF as an image).
 *   5. Size <= `WA_MEDIA_MAX_BYTES` (when caller passed `sizeBytes`).
 *   6. Rate limiter token available.
 *   7. Session connected.
 *
 * Same retry/backoff schedule as `sendWhatsappMessage`. Throws
 * `WhatsappSendException` with a typed error code on every failure
 * path so the route can map cleanly to HTTP status codes.
 */
export async function sendWhatsappMedia(
  manager: SessionManager,
  storeId: number,
  input: SendMediaInput,
  opts: SendOptions = {},
): Promise<void> {
  // 1. Phone.
  if (!isValidPhone(input.to)) {
    throw new WhatsappSendException({ code: 'INVALID_PHONE', phone: input.to });
  }
  // 2. URL shape.
  const urlError = validateMediaUrl(input.mediaUrl);
  if (urlError) {
    throw new WhatsappSendException({ code: 'INVALID_MEDIA_URL', reason: urlError });
  }
  // 3. MIME allow-list.
  if (!isAllowedWhatsappMime(input.mimeType)) {
    throw new WhatsappSendException({
      code: 'MEDIA_MIME_NOT_ALLOWED',
      mime: input.mimeType ?? '',
    });
  }
  // 4. type vs mime cross-check.
  const inferred = inferMediaTypeFromMime(input.mimeType);
  if (inferred !== input.type) {
    throw new WhatsappSendException({
      code: 'MEDIA_TYPE_MISMATCH',
      mime: input.mimeType,
      declaredType: input.type,
    });
  }
  // 5. Size cap (only when caller passes it — best-effort; route MUST
  //    pass it from the upload result).
  if (typeof input.sizeBytes === 'number' && input.sizeBytes > WA_MEDIA_MAX_BYTES) {
    throw new WhatsappSendException({
      code: 'MEDIA_TOO_LARGE',
      bytes: input.sizeBytes,
      maxBytes: WA_MEDIA_MAX_BYTES,
    });
  }
  // 6. Rate cap (same budget as text — media counts as one message).
  if (!whatsappRateLimiter.tryTake(storeId)) {
    throw new WhatsappSendException({
      code: 'RATE_LIMITED',
      remaining: whatsappRateLimiter.remaining(storeId),
    });
  }
  // 7. Session check.
  const status = await manager.status(storeId);
  if (status !== 'connected') {
    throw new WhatsappSendException({ code: 'SESSION_NOT_CONNECTED' });
  }

  const maxAttempts = opts.maxAttempts ?? 3;
  const backoffs = opts.backoffsMs ?? [0, 1000, 3000];
  const delay = opts.delay ?? defaultDelay;
  let lastCause = 'unknown';

  const sendOpts: SendMediaOptions = {
    mediaUrl: input.mediaUrl,
    type: input.type,
    mimeType: input.mimeType,
    caption: input.caption,
    fileName: input.fileName,
  };

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const wait = backoffs[attempt] ?? backoffs[backoffs.length - 1] ?? 0;
    if (wait > 0) await delay(wait);
    try {
      const client = (manager as unknown as { clients: Map<number, BaileysClient> }).clients.get(storeId);
      if (!client) throw new Error('client not found in registry');
      await client.sendMediaMessage(input.to, sendOpts);
      return;
    } catch (err) {
      lastCause = err instanceof Error ? err.message : String(err);
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
