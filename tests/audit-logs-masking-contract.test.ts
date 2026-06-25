// AuditLogs sensitive-field masking contract.
//
// Audit logs record full diffs (old/new value) for every settings
// mutation — including bank IBAN, VAT number, CR number, phone, etc.
// Anyone with `compliance:read` can open the page and see all those
// values in cleartext. That violates the principle of least exposure:
// the diff record is needed for audit, but the rendered UI does not
// need to display the full numbers to be useful.
//
// Fix: a `SENSITIVE_DIFF_KEY_PATTERN` regex covering common PII /
// financial field names. When DiffView renders a row for any matched
// key, it calls `maskSensitiveValue()` which shows only the last 4
// characters with leading bullets.
//
// Audit reference: P0 #7 in the dashboard-quality audit (2026-06-25).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/pages/AuditLogs.tsx'),
  'utf-8',
);

describe('AuditLogs — sensitive value masking', () => {
  it('defines the SENSITIVE_DIFF_KEY_PATTERN regex', () => {
    expect(SRC).toMatch(/const\s+SENSITIVE_DIFF_KEY_PATTERN\s*=\s*\/.+\/i?/);
  });

  it('pattern covers IBAN, bank account, VAT, CR, national ID, phone, email, secrets', () => {
    // These are the fields the audit identified as actually appearing
    // in the codebase's audit log diffs today. Missing any one of them
    // reopens the leak.
    const pattern = SRC.slice(
      SRC.indexOf('const SENSITIVE_DIFF_KEY_PATTERN'),
      SRC.indexOf('export function isSensitiveDiffKey'),
    );
    for (const key of [
      'iban', 'bankAccount', 'bank_account', 'accountNumber', 'account_number',
      'vat', 'commercialRegistration', 'commercial_registration',
      'nationalId', 'national_id', 'phone', 'email',
      'apiKey', 'api_key', 'secret', 'password', 'token',
      'cardNumber', 'card_number',
    ]) {
      expect(pattern, `pattern should cover "${key}"`).toContain(key);
    }
  });

  it('exports isSensitiveDiffKey + maskSensitiveValue helpers', () => {
    expect(SRC).toMatch(/export function isSensitiveDiffKey\s*\(\s*key:\s*string\s*\)\s*:\s*boolean/);
    expect(SRC).toMatch(/export function maskSensitiveValue\s*\(\s*raw:\s*unknown\s*\)\s*:\s*string/);
  });

  it('maskSensitiveValue handles empty, short, and long values', () => {
    // Empty → empty (no length-leak via bullets).
    // Short (≤4) → all bullets (no last-4 cheat).
    // Long → last 4 chars + leading bullets.
    expect(SRC).toMatch(/if\s*\(s\.length\s*===?\s*0\)\s*return\s*''/);
    expect(SRC).toMatch(/if\s*\(s\.length\s*<=\s*4\)/);
    expect(SRC).toMatch(/s\.slice\(-4\)/);
  });

  it('DiffView uses the masking branch for sensitive keys', () => {
    // The renderOld / renderNew variables must consult sensitive +
    // call maskSensitiveValue. Without this wiring the helpers are
    // dead code.
    const diffView = SRC.slice(SRC.indexOf('function DiffView'));
    expect(diffView).toMatch(/const\s+sensitive\s*=\s*isSensitiveDiffKey\(key\)/);
    expect(diffView).toMatch(/sensitive\s*\?\s*maskSensitiveValue\(oldVal\)/);
    expect(diffView).toMatch(/sensitive\s*\?\s*maskSensitiveValue\(newVal\)/);
  });

  it('sensitive values render LTR so the last-4 reads correctly under RTL', () => {
    // Bullets + digits inside an RTL paragraph would reverse the
    // visual order ("4321" displayed as last-4 should actually be the
    // last 4, not the first 4 read backwards). LTR scoping fixes it.
    const diffView = SRC.slice(SRC.indexOf('function DiffView'));
    expect(diffView).toMatch(/dir=\{sensitive\s*\?\s*['"]ltr['"]\s*:\s*undefined\}/);
  });
});
