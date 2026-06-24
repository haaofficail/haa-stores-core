// Customer email preferences — opt-out lookup + unsubscribe-token helpers.
//
// PDPL Article 18 (Right to Withdraw Consent). Every customer-facing
// non-transactional email (welcome, order-recovery, marketing) MUST
// check `isOptedOut()` before sending. Transactional emails the customer
// explicitly triggered (order confirmation after they paid, password
// reset OTP they requested) are NOT gated by this flag — consent-implicit.
//
// Token format: base64url(`${customerId}.${storeId}.${ts}.${sig}`)
//   - sig = first 16 hex of hmac-sha256(secret, `${customerId}.${storeId}.${ts}`)
//   - valid for UNSUBSCRIBE_TOKEN_TTL_MS (default 30 days)
//
// Secret: process.env.UNSUBSCRIBE_TOKEN_SECRET || process.env.JWT_SECRET.
// In production the operator may set a dedicated secret; falling back to
// JWT_SECRET keeps tokens valid across deploys without an extra env var.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { createDbClient, type DbOrTx } from '@haa/db';
import * as s from '@haa/db/schema';

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): string {
  const secret = process.env.UNSUBSCRIBE_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('UNSUBSCRIBE_TOKEN_SECRET (or JWT_SECRET) must be set + >=16 chars');
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex').slice(0, 32);
}

/**
 * Generate a signed unsubscribe token for `(customerId, storeId)`. Encode
 * with base64url so it round-trips cleanly in a URL.
 */
export function buildUnsubscribeToken(customerId: number, storeId: number, now: number = Date.now()): string {
  const payload = `${customerId}.${storeId}.${now}`;
  const sig = sign(payload);
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export type UnsubscribeTokenPayload = {
  customerId: number;
  storeId: number;
  issuedAt: number;
};

/**
 * Verify a token. Returns the payload when valid; null otherwise.
 * Constant-time signature compare to defeat timing oracles.
 */
export function verifyUnsubscribeToken(
  token: string,
  now: number = Date.now(),
): UnsubscribeTokenPayload | null {
  let decoded: string;
  try {
    decoded = Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const parts = decoded.split('.');
  if (parts.length !== 4) return null;
  const [cidStr, sidStr, tsStr, sig] = parts;
  const customerId = Number(cidStr);
  const storeId = Number(sidStr);
  const issuedAt = Number(tsStr);
  if (!Number.isInteger(customerId) || customerId <= 0) return null;
  if (!Number.isInteger(storeId) || storeId <= 0) return null;
  if (!Number.isInteger(issuedAt) || issuedAt <= 0) return null;
  if (now - issuedAt > TOKEN_TTL_MS) return null;
  const expected = sign(`${customerId}.${storeId}.${issuedAt}`);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return { customerId, storeId, issuedAt };
}

/**
 * Check whether the given (storeId, email) is opted out of marketing
 * emails. Always returns false (allowed) when the email is empty —
 * unknown recipients can't be opted out, the send path will short-
 * circuit on the missing-email check anyway.
 *
 * One DB query per call. Callers expecting to hit this many times in
 * a tight loop should batch the lookup themselves.
 */
export async function isCustomerOptedOut(
  storeId: number,
  email: string | null | undefined,
  db: DbOrTx = createDbClient(),
): Promise<boolean> {
  const normalized = (email ?? '').trim().toLowerCase();
  if (!normalized) return false;
  const [row] = await db
    .select({ optedOutAt: s.customers.emailOptOutAt })
    .from(s.customers)
    .where(and(eq(s.customers.storeId, storeId), eq(s.customers.email, normalized)))
    .limit(1);
  if (!row) return false;
  return row.optedOutAt !== null;
}

/**
 * Mark the customer as opted out. Idempotent — repeated calls with the
 * same source are a no-op (we don't overwrite an earlier opt-out
 * timestamp). Returns the row's id when found, null when the customer
 * doesn't exist (token-based callers should treat this as "OK, nothing
 * to update — the visible UI still says you're unsubscribed").
 */
export async function markCustomerOptedOut(
  customerId: number,
  storeId: number,
  source: 'footer_link' | 'admin' | 'support' | 'api',
  db: DbOrTx = createDbClient(),
): Promise<number | null> {
  const [updated] = await db
    .update(s.customers)
    .set({
      emailOptOutAt: new Date(),
      emailOptOutSource: source,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(s.customers.id, customerId),
        eq(s.customers.storeId, storeId),
        isNull(s.customers.emailOptOutAt), // do not overwrite earlier opt-out
      ),
    )
    .returning({ id: s.customers.id });
  return updated?.id ?? null;
}
