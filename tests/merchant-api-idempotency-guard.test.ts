// Idempotency guard — every mutating method on the merchant-dashboard
// API client MUST attach an `Idempotency-Key` header.
//
// Audit Part 3 (commerce, money-risk) flagged this as the highest-
// money-risk gap on the dashboard: SettlementOverview's "request payout"
// could double-fire on a double-click without a server-side de-dup key.
// We added the header centrally in `request()` so EVERY caller gets it
// for free. This test source-greps the request implementation so future
// edits can't silently remove the header.
//
// What this test DOES check:
//   - `request()` recognises POST / PUT / PATCH / DELETE as mutating
//   - the header is set only when the caller hasn't already provided one
//     (so deterministic-retry callers keep control)
//   - `crypto.randomUUID` is the first key source
//
// What this test does NOT check:
//   - that the server actually de-dups by `Idempotency-Key`. That's the
//     API's job and is enforced in `apps/api/src/middleware/idempotency.ts`
//     (separate test).
//   - that EVERY individual `someApi` helper uses `request()`. The 4
//     known multipart-upload sites (uploads, image upload) bypass it
//     intentionally — those endpoints are idempotent at the URL/file
//     level and don't need the header.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const API = readFileSync(
  resolve(ROOT, 'apps/merchant-dashboard/src/lib/api.ts'),
  'utf-8',
);

describe('Merchant API client — idempotency guard', () => {
  it('declares the set of mutating methods (POST/PUT/PATCH/DELETE)', () => {
    expect(API).toMatch(/MUTATING_METHODS\s*=\s*new\s+Set\(/);
    for (const m of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(API).toContain(`'${m}'`);
    }
  });

  it('uses crypto.randomUUID as the primary key source', () => {
    expect(API).toMatch(/crypto\.randomUUID\s*\(\s*\)/);
  });

  it('falls back to a non-throwing key when randomUUID is unavailable', () => {
    // The fallback path is the second arm of the if/return, so we
    // assert the structural pattern rather than the exact string.
    expect(API).toMatch(
      /typeof\s+crypto\s*!==\s*['"]undefined['"]/,
    );
    // Some kind of fallback expression is present.
    expect(API).toMatch(/return\s+`\${Date\.now\(\)/);
  });

  it("attaches Idempotency-Key only when the caller hasn't already provided one", () => {
    // Look for the guard `!headers['Idempotency-Key']` in the request()
    // body. This preserves deterministic-retry semantics where the
    // caller passes a stable key.
    expect(API).toMatch(/!\s*headers\[\s*['"]Idempotency-Key['"]\s*\]/);
  });

  it('attaches the Idempotency-Key header inside request() (not at each call site)', () => {
    // The body of request() should reference the header literal once,
    // close to the MUTATING_METHODS check. This catches the regression
    // where someone moves the assignment out of request() into one
    // caller, which would silently drop it for every other caller.
    const requestBody = API.slice(API.indexOf('export async function request'));
    expect(requestBody).toMatch(/MUTATING_METHODS\.has\(method\)/);
    expect(requestBody).toMatch(/headers\[\s*['"]Idempotency-Key['"]\s*\]\s*=/);
  });
});
