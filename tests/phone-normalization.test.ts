// HAA-AUTH-PHONE-001 — pure unit test for the Saudi phone normalizer.
//
// No DB, no fixtures, no I/O. We test the helper directly through the
// `@haa/shared` alias (vitest.config.ts) so the suite stays under a
// few hundred ms.
//
// Coverage targets the four input shapes documented in
// `packages/shared/src/phone.ts` (local, IDD-prefixed, raw E.164,
// canonical) plus the rejection paths the DB UNIQUE index depends on
// (non-Saudi country codes, landlines, garbage, empty).

import { describe, expect, it } from 'vitest';
import {
  isValidSaudiPhone,
  normalizeSaudiPhone,
  toAsciiDigits,
} from '@haa/shared';

describe('HAA-AUTH-PHONE-001 — normalizeSaudiPhone', () => {
  // ---- ACCEPT cases ----
  // Each accepted input must map to the SAME canonical string. The DB
  // UNIQUE index relies on this property — if two shapes for the same
  // real-world phone produce different canonical strings, we get dupe
  // accounts.
  const CANONICAL = '+966512345678';

  it('canonical +9665XXXXXXXX passes through unchanged', () => {
    expect(normalizeSaudiPhone('+966512345678')).toBe(CANONICAL);
  });

  it("IDD '00' prefix is converted to '+'", () => {
    expect(normalizeSaudiPhone('00966512345678')).toBe(CANONICAL);
  });

  it("raw E.164 without '+' gets a '+' prepended", () => {
    expect(normalizeSaudiPhone('966512345678')).toBe(CANONICAL);
  });

  it("local 05XXXXXXXX is rewritten to +9665XXXXXXXX", () => {
    expect(normalizeSaudiPhone('0512345678')).toBe(CANONICAL);
  });

  it('internal whitespace is stripped (local shape)', () => {
    expect(normalizeSaudiPhone('05 1234 5678')).toBe(CANONICAL);
  });

  it("internal whitespace is stripped (canonical shape with '+')", () => {
    expect(normalizeSaudiPhone('+966 51 234 5678')).toBe(CANONICAL);
  });

  it('parens and hyphens are stripped', () => {
    expect(normalizeSaudiPhone('(966) 51-234-5678')).toBe(CANONICAL);
  });

  it('Arabic-Indic digits are converted to ASCII', () => {
    expect(normalizeSaudiPhone('٠٥١٢٣٤٥٦٧٨')).toBe(CANONICAL);
  });

  it('extra surrounding whitespace is trimmed', () => {
    expect(normalizeSaudiPhone(' 0512345678 ')).toBe(CANONICAL);
  });

  it("bare 9-digit '5XXXXXXXX' is accepted", () => {
    // Some merchants type the mobile starting at 5 (omitting both the
    // leading 0 AND the country code). We accept it because it's
    // unambiguous: 9 digits starting with 5 in a Saudi context.
    expect(normalizeSaudiPhone('512345678')).toBe(CANONICAL);
  });

  // ---- REJECT cases ----
  it('rejects numbers that are too short', () => {
    expect(normalizeSaudiPhone('5123456')).toBeNull();
  });

  it('rejects non-Saudi country codes', () => {
    expect(normalizeSaudiPhone('+1 415 555 1234')).toBeNull();
  });

  it('rejects empty / null / undefined / whitespace-only', () => {
    expect(normalizeSaudiPhone('')).toBeNull();
    expect(normalizeSaudiPhone(null)).toBeNull();
    expect(normalizeSaudiPhone(undefined)).toBeNull();
    expect(normalizeSaudiPhone('   ')).toBeNull();
  });

  it('rejects garbage with no digits', () => {
    expect(normalizeSaudiPhone('12345abc')).toBeNull();
  });

  it("rejects Saudi landlines (must start with 5 after 966)", () => {
    // Riyadh landline shape — starts with 1 after the country code.
    expect(normalizeSaudiPhone('+966 1 4 0 5 0 5')).toBeNull();
  });
});

describe('HAA-AUTH-PHONE-001 — isValidSaudiPhone', () => {
  it('returns true for accepted inputs', () => {
    expect(isValidSaudiPhone('+966512345678')).toBe(true);
    expect(isValidSaudiPhone('0512345678')).toBe(true);
  });

  it('returns false for rejected inputs', () => {
    expect(isValidSaudiPhone(null)).toBe(false);
    expect(isValidSaudiPhone('+1 415 555 1234')).toBe(false);
  });
});

describe('HAA-AUTH-PHONE-001 — toAsciiDigits', () => {
  it('converts Arabic-Indic digits', () => {
    expect(toAsciiDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });

  it('converts Extended Arabic-Indic (Persian) digits', () => {
    expect(toAsciiDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
  });

  it('leaves ASCII digits and surrounding text alone', () => {
    expect(toAsciiDigits('abc 123 ٤٥٦')).toBe('abc 123 456');
  });
});
