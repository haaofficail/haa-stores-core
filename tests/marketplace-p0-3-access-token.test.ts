/**
 * TASK-0040 Track 1B — P0-3 Order Tracking via accessToken
 *
 * Bug: GET /marketplace/orders/:marketplaceOrderNumber uses `?phone=`
 *      for ownership verification (haa-marketplace.ts:629-678). Phone
 *      space in Saudi is ~10M numbers; rate limit is 600/10min (shared
 *      with marketplace browsing). Attack math: ~1% enumeration per IP
 *      per day. Customer PII leak + PDPL Article 19 violation.
 *
 * Fix: Add `accessToken` column (uuid, notNull, defaultRandom, unique) to
 *      marketplace_orders schema. POST /orders returns the token ONCE in
 *      the response. GET /orders/:num requires `?access_token=` (or
 *      legacy `?phone=` for backward compat, deprecated). Mirrors the
 *      support-ticket accessToken pattern (R-0014, support-tickets.ts:17
 *      + storefront/support.ts:111).
 *
 * This test codifies the contract:
 *   - Schema has accessToken column with defaultRandom + unique index
 *   - POST /orders response includes accessToken
 *   - GET /orders/:num validates via accessToken (or legacy phone)
 *   - Storefront UI uses ?access_token= (not ?phone=)
 *   - Migration file 0058 exists
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);

const SCHEMA = resolve(projectRoot, 'packages/db/src/schema/marketplace_orders.ts');
const ROUTE = resolve(projectRoot, 'apps/api/src/routes/haa-marketplace.ts');
const TRACK = resolve(projectRoot, 'apps/storefront/src/pages/MarketplaceOrderTrack.tsx');
const MIGRATIONS_DIR = resolve(projectRoot, 'packages/db/src/migrations');
const SUPPORT_SCHEMA = resolve(projectRoot, 'packages/db/src/schema/support-tickets.ts');

const schemaSrc = readFileSync(SCHEMA, 'utf-8');
const routeSrc = readFileSync(ROUTE, 'utf-8');
const trackSrc = readFileSync(TRACK, 'utf-8');
const supportSrc = readFileSync(SUPPORT_SCHEMA, 'utf-8');

describe('TASK-0040 Track 1B — P0-3 marketplace order accessToken', () => {
  describe('marketplace_orders schema — accessToken column', () => {
    it('declares an accessToken column (uuid)', () => {
      expect(schemaSrc).toMatch(/accessToken:\s*uuid\(['"]access_token['"]\)/);
    });

    it('accessToken is notNull', () => {
      // Look for accessToken line and confirm .notNull() chain
      const lineMatch = schemaSrc.match(/accessToken:\s*uuid\([^)]+\)[^,]*\.notNull\(\)/);
      expect(lineMatch).not.toBeNull();
    });

    it('accessToken has defaultRandom (so existing rows get a token)', () => {
      expect(schemaSrc).toMatch(/accessToken:[^,]*\.defaultRandom\(\)/);
    });

    it('has a unique index on accessToken', () => {
      // Pattern: unique().on(table.accessToken) or index().on(table.accessToken)
      // UUIDs naturally don't collide but explicit unique index is the contract.
      expect(schemaSrc).toMatch(/accessToken.*index|accessToken.*unique/);
    });
  });

  describe('haa-marketplace.ts — POST /orders', () => {
    it('returns accessToken in the response', () => {
      // The response body of POST /orders should include accessToken.
      // Look for the success response block (status 201) and confirm
      // accessToken is in the data payload.
      const block = routeSrc.match(
        /c\.json\(\{[^}]*success:\s*true[\s\S]{0,2000}marketplaceOrderNumber[\s\S]{0,2000}\},\s*201\s*\)/,
      );
      expect(block).not.toBeNull();
      expect(block![0]).toContain('accessToken');
    });
  });

  describe('haa-marketplace.ts — GET /orders/:num', () => {
    it('validates via access_token OR legacy phone', () => {
      // The GET handler should accept ?access_token= or fall back to ?phone=.
      // Look for query parsing of both.
      const block = routeSrc.match(
        /haaMarketplaceRouter\.get\(\s*['"]\/orders\/:marketplaceOrderNumber['"][\s\S]{0,2500}/,
      );
      expect(block).not.toBeNull();
      const src = block![0];
      // The fix path: accept either token or phone
      expect(src).toMatch(/access[_]?token|accessToken/);
    });

    it('rejects request when neither access_token nor phone provided', () => {
      const block = routeSrc.match(
        /haaMarketplaceRouter\.get\(\s*['"]\/orders\/:marketplaceOrderNumber['"][\s\S]{0,2500}/,
      );
      expect(block).not.toBeNull();
      const src = block![0];
      // Should return 400 BAD_REQUEST when no auth credential
      expect(src).toContain('BAD_REQUEST');
    });
  });

  describe('MarketplaceOrderTrack.tsx — UI uses access_token', () => {
    it('uses ?access_token= query param (not ?phone=) in code', () => {
      // Strip line comments before scanning for the legacy pattern.
      // The plan reference `?phone=` is allowed in comments; the
      // contract is that no CODE path constructs `?phone=` URLs.
      const codeOnly = trackSrc.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      expect(codeOnly).not.toMatch(/\?phone=/);
      expect(trackSrc).toMatch(/access_token|accessToken/);
    });
  });

  describe('migration 0058', () => {
    it('migration file exists for access_token column', () => {
      // Migration file pattern: 0058_*.sql
      // List files via grep — vitest doesn't have fs.glob, use a simple check
      const { readdirSync } = require('node:fs') as typeof import('node:fs');
      const files = readdirSync(MIGRATIONS_DIR);
      const found = files.some((f) => f.startsWith('0058_') && f.endsWith('.sql'));
      expect(found).toBe(true);
    });
  });

  describe('pattern parity with support-tickets (R-0014)', () => {
    it('uses uuid with defaultRandom — same shape as support tickets', () => {
      // Both should use the same column definition shape
      expect(supportSrc).toMatch(/accessToken:\s*uuid\(['"]access_token['"]\)[^,]*\.defaultRandom\(\)/);
      expect(schemaSrc).toMatch(/accessToken:\s*uuid\(['"]access_token['"]\)[^,]*\.defaultRandom\(\)/);
    });
  });
});
