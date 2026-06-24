/**
 * Saudi phone number normalization.
 *
 * Canonical format: +9665XXXXXXXX (12 digits after the +).
 *
 * Accepts these input shapes (all common in the Saudi market) and
 * returns the same canonical string:
 *   05XXXXXXXX        ← local mobile
 *   00 9665XXXXXXXX   ← intl dialing prefix
 *   9665XXXXXXXX      ← raw E.164 without the +
 *   +9665XXXXXXXX     ← already canonical
 *   Plus any internal whitespace, hyphens, parens, NBSP, or Arabic-Indic digits.
 *
 * Rejects (returns null):
 *   - empty/whitespace-only
 *   - non-Saudi country codes
 *   - landline numbers (Saudi mobiles always start with 5 after 966)
 *   - too short / too long
 *
 * This is the SINGLE source of truth for Saudi phone parsing.
 * The DB UNIQUE index assumes canonical input — anything that
 * bypasses this helper risks dupe rows.
 */

/**
 * Convert Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) to ASCII (0123456789).
 *
 * Exported because several upstream callers receive user input that
 * may mix Arabic-Indic and ASCII digits (e.g. Arabic IME pasted into
 * an English form). Centralising the conversion here keeps the rule
 * consistent with `normalizeSaudiPhone`.
 *
 * Also handles Eastern Arabic-Indic (Persian) digits (۰۱۲۳۴۵۶۷۸۹)
 * which some Arabic keyboards produce on iOS / Android.
 */
export function toAsciiDigits(s: string): string {
  // U+0660..U+0669 = Arabic-Indic digits
  // U+06F0..U+06F9 = Extended Arabic-Indic (Persian) digits
  return s.replace(/[٠-٩۰-۹]/g, (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    return String(code - 0x06f0);
  });
}

/**
 * Normalize a Saudi mobile phone to canonical E.164 (+9665XXXXXXXX).
 *
 * Returns `null` for any input that is not a parseable Saudi mobile.
 * The algorithm intentionally rejects non-Saudi country codes and
 * landlines so the DB UNIQUE index can rely on a single canonical
 * representation per real-world phone.
 */
export function normalizeSaudiPhone(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;

  // Step 1: trim, reject empty.
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  // Step 2: convert Arabic-Indic digits → ASCII.
  const ascii = toAsciiDigits(trimmed);

  // Step 3: strip everything that isn't 0-9 or '+'.
  // This drops spaces, hyphens, parens, NBSP, U+200E (LRM), etc.
  // We do this BEFORE the country-code checks so '+966 51 234 5678'
  // and '(966) 51-234-5678' both collapse to the same shape.
  let cleaned = ascii.replace(/[^0-9+]/g, '');
  if (cleaned.length === 0) return null;

  // Step 4: '00' international dialing prefix → '+'.
  // Some Saudi carriers / older devices use the IDD prefix instead
  // of '+'. We only collapse a leading '00'; an interior '00' (e.g.
  // a malformed +966005…) is left alone and will fail length checks.
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // Reject any input containing a '+' that's not at position 0 (we
  // would have stripped non-numeric chars in step 3, so a '+' at
  // position > 0 means malformed input like '966+5...').
  if (cleaned.indexOf('+') > 0) return null;

  // Step 5: already canonical → return as-is.
  if (cleaned.startsWith('+9665') && cleaned.length === 13) {
    return cleaned;
  }

  // Step 6: raw E.164 without the '+' → prepend it.
  if (cleaned.startsWith('9665') && cleaned.length === 12) {
    return '+' + cleaned;
  }

  // Step 7: local mobile (05XXXXXXXX) → '+9665XXXXXXXX'.
  if (cleaned.startsWith('05') && cleaned.length === 10) {
    return '+966' + cleaned.slice(1);
  }

  // Step 8: bare mobile without leading '0' (5XXXXXXXX) → '+9665XXXXXXXX'.
  if (cleaned.startsWith('5') && cleaned.length === 9) {
    return '+966' + cleaned;
  }

  // Step 9: anything else → reject.
  return null;
}

/** True if `normalizeSaudiPhone(input) !== null`. */
export function isValidSaudiPhone(input: string | null | undefined): boolean {
  return normalizeSaudiPhone(input) !== null;
}
