// Customer email opt-out — PDPL Article 18 (Right to Withdraw Consent).
//
// Covers:
//   - migration 0086 columns exist on the customers schema
//   - buildUnsubscribeToken / verifyUnsubscribeToken round-trip + TTL
//   - abandoned-cart send path checks isCustomerOptedOut + counts
//     under skippedOptOut
//   - footer unsubscribe link reaches the rendered email body
//   - public /unsubscribe/:token endpoint exists + does no enumeration
//   - rbac coverage exempts the unsubscribe route (public by design)

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildUnsubscribeToken,
  verifyUnsubscribeToken,
} from '../packages/commerce-core/src/customer-email-preferences';
import { renderAbandonedCartEmail } from '../packages/notification-core/src/welcome-emails';

const ROOT = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');

// HMAC secret must be set for the token helpers.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-at-least-16-chars';

describe('Unsubscribe token round-trip', () => {
  it('round-trips a valid (customerId, storeId, ts) tuple', () => {
    const now = 1_730_000_000_000;
    const token = buildUnsubscribeToken(42, 7, now);
    const payload = verifyUnsubscribeToken(token, now);
    expect(payload).toEqual({ customerId: 42, storeId: 7, issuedAt: now });
  });

  it('rejects a token older than 30 days', () => {
    const ts = 1_730_000_000_000;
    const token = buildUnsubscribeToken(42, 7, ts);
    const later = ts + 31 * 24 * 60 * 60 * 1000;
    expect(verifyUnsubscribeToken(token, later)).toBeNull();
  });

  it('rejects a tampered signature (constant-time compare)', () => {
    const token = buildUnsubscribeToken(42, 7, 1_730_000_000_000);
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [c, s, t, sig] = decoded.split('.');
    // Flip one hex char of the signature.
    const tampered = `${c}.${s}.${t}.${sig.slice(0, -1)}${sig.endsWith('0') ? '1' : '0'}`;
    const reTok = Buffer.from(tampered).toString('base64url');
    expect(verifyUnsubscribeToken(reTok)).toBeNull();
  });

  it('rejects garbage input', () => {
    expect(verifyUnsubscribeToken('')).toBeNull();
    expect(verifyUnsubscribeToken('not-a-real-token')).toBeNull();
    expect(verifyUnsubscribeToken('a.b.c.d')).toBeNull(); // not base64
  });

  it('rejects negative or zero ids', () => {
    // Manually craft a token with negative id — must fail.
    const payload = `-1.7.${Date.now()}`;
    const sig = require('node:crypto')
      .createHmac('sha256', process.env.JWT_SECRET!)
      .update(payload)
      .digest('hex')
      .slice(0, 32);
    const t = Buffer.from(`${payload}.${sig}`).toString('base64url');
    expect(verifyUnsubscribeToken(t)).toBeNull();
  });
});

describe('Migration 0086 + schema', () => {
  it('migration file exists and is additive', () => {
    const sql = read('packages/db/src/migrations/0086_customers_email_opt_out.sql');
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "email_opt_out_at"/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "email_opt_out_source"/);
    const execLines = sql.split('\n').map((l) => l.replace(/--.*$/, '')).join('\n');
    expect(execLines).not.toMatch(/\bDROP\b/i);
    expect(execLines).not.toMatch(/\bRENAME\b/i);
  });

  it('snapshot 0086 has the two new columns on customers', () => {
    const path = resolve(ROOT, 'packages/db/src/migrations/meta/0086_snapshot.json');
    expect(existsSync(path)).toBe(true);
    const snap = JSON.parse(readFileSync(path, 'utf-8'));
    const cols = snap.tables['public.customers'].columns;
    expect(cols.email_opt_out_at).toBeDefined();
    expect(cols.email_opt_out_source).toBeDefined();
  });

  it('drizzle schema declares the new columns', () => {
    const src = read('packages/db/src/schema/customers.ts');
    expect(src).toMatch(/emailOptOutAt:\s*timestamp\(['"]email_opt_out_at['"]\)/);
    expect(src).toMatch(/emailOptOutSource:\s*varchar\(['"]email_opt_out_source['"]/);
  });
});

describe('Abandoned-cart send respects opt-out', () => {
  const src = read('packages/commerce-core/src/abandoned-cart-campaigns.ts');

  it('imports isCustomerOptedOut + skips opted-out customers', () => {
    expect(src).toMatch(/isCustomerOptedOut/);
    // The check must run BEFORE the dedup-row insert, otherwise we'd
    // still consume the dedup slot for an opt-out customer.
    const checkIdx = src.indexOf('isCustomerOptedOut(storeId, email');
    const insertIdx = src.indexOf("channel: 'email',");
    expect(checkIdx).toBeGreaterThan(0);
    expect(insertIdx).toBeGreaterThan(checkIdx);
  });

  it('counts opted-out skips under skippedOptOut', () => {
    // Same counter used by the WhatsApp path so dashboards see total
    // opt-out volume in one number.
    expect(src).toMatch(/skippedOptOut \+=/);
  });

  it('builds a per-customer unsubscribe URL when a customer matches', () => {
    expect(src).toMatch(/buildUnsubscribeToken\(customer\.id, storeId\)/);
    expect(src).toMatch(/\/unsubscribe\/\$\{token\}/);
  });
});

describe('Email template footer renders unsubscribe link', () => {
  it('omits the link when unsubscribeUrl is missing', () => {
    const { html } = renderAbandonedCartEmail({
      customerName: 'علي',
      storeName: 'متجر تجريبي',
      cartTotalSar: '100.00',
      itemCount: 1,
      recoveryLink: 'https://example.com/recover?token=x',
      storeUrl: 'https://example.com',
      supportEmail: 'help@example.com',
      step: 1,
    });
    expect(html).not.toMatch(/إلغاء الاشتراك/);
  });

  it('renders the link when unsubscribeUrl is provided', () => {
    const { html } = renderAbandonedCartEmail({
      customerName: 'علي',
      storeName: 'متجر تجريبي',
      cartTotalSar: '100.00',
      itemCount: 1,
      recoveryLink: 'https://example.com/recover?token=x',
      storeUrl: 'https://example.com',
      supportEmail: 'help@example.com',
      step: 1,
      unsubscribeUrl: 'https://example.com/s/test/unsubscribe/TOKEN',
    });
    expect(html).toMatch(/إلغاء الاشتراك/);
    expect(html).toContain('https://example.com/s/test/unsubscribe/TOKEN');
  });

  it('escapes the unsubscribe URL', () => {
    const evil = 'https://example.com/u/"><script>alert(1)</script>';
    const { html } = renderAbandonedCartEmail({
      customerName: 'علي',
      storeName: 'متجر',
      cartTotalSar: '1.00',
      itemCount: 1,
      recoveryLink: 'https://x.com',
      storeUrl: 'https://x.com',
      supportEmail: 'a@b.com',
      step: 1,
      unsubscribeUrl: evil,
    });
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});

describe('Public unsubscribe endpoint', () => {
  const src = read('apps/api/src/routes/storefront/unsubscribe.ts');

  it('GET /:slug/unsubscribe/:token is registered', () => {
    expect(src).toMatch(/unsubscribeRouter\.get\(['"]\/:slug\/unsubscribe\/:token['"]/);
  });

  it('verifies token + matches storeId before marking', () => {
    expect(src).toMatch(/verifyUnsubscribeToken/);
    expect(src).toMatch(/verified\.storeId !== store\.id/);
    expect(src).toMatch(/markCustomerOptedOut/);
  });

  it('returns the SAME generic confirmation on invalid + tampered (no enumeration)', () => {
    // Both branches (verify fails, storeId mismatch) flow through the
    // single `if (!verified || ...)` block — so the failure page is
    // identical regardless of which check failed.
    expect(src).toMatch(/if \(!verified \|\| verified\.storeId !== store\.id\)/);
  });

  it('sends noindex/nofollow to deter search-engine indexing of unsubscribe pages', () => {
    expect(src).toMatch(/noindex,nofollow/);
  });

  it('is mounted under storefrontRouter', () => {
    const indexSrc = read('apps/api/src/routes/storefront/index.ts');
    expect(indexSrc).toMatch(/unsubscribeRouter/);
  });
});

describe('RBAC coverage exempts the public unsubscribe route', () => {
  it('rbac-coverage deny-list includes unsubscribe.ts (no auth by design)', () => {
    const src = read('tests/rbac-coverage.test.ts');
    expect(src).toMatch(/unsubscribe\.ts/);
  });
});
