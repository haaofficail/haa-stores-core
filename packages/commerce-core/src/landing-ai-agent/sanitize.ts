/**
 * Landing AI Agent — Sanitize
 *
 * Strips PII (emails, phones, URLs) and normalizes user input before it ever
 * reaches the matcher or an external model. This is a defense-in-depth layer;
 * the API guard adds another layer at the request boundary.
 */

const MAX_LEN = 500;

/** Strips emails (RFC 5322 simplified), phones (KSA + intl), URLs, diacritics, collapses whitespace. */
export function sanitizeUserMessage(raw: unknown): string {
  if (raw == null) return '';
  const text = String(raw);
  // strip emails
  let out = text.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '');
  // strip phone numbers — 7-20 digits with optional separators/+ prefix
  out = out.replace(/\+?\d[\d\s\-().]{6,}\d/g, '');
  // strip URLs
  out = out.replace(/https?:\/\/\S+/g, '');
  // strip diacritics + tatweel
  out = out.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
  // collapse whitespace
  out = out.replace(/\s+/g, ' ').trim();
  // cap length
  if (out.length > MAX_LEN) out = out.slice(0, MAX_LEN);
  return out;
}
