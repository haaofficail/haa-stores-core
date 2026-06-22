// Audit PART 4 P0 #1 — vendor API secrets must not render as plain text.
//
// Before this fix, `MarketplaceDetail.tsx` rendered the Noon
// `privateKey` and Amazon `clientSecret` as bare `<textarea>` elements
// with `value={creds[field]}` — anyone with DevTools, a screen-recorder,
// or an over-the-shoulder view could read live RSA private keys and
// SP-API client secrets straight out of the DOM.
//
// The fix replaces those fields with a `SecretInput` component that
// renders `<input type="password">` by default, exposes a mask-on-blur
// eye-toggle for verification, and is never pre-populated with the
// server's existing secret value (an `••••••••` placeholder is shown
// instead, and the merchant must re-type to update).
//
// This test asserts the source-shape guarantees so a regression that
// reverts to a bare textarea or removes `type="password"` fails CI.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const PAGE_PATH = resolve(
  __dirname,
  '..',
  'apps',
  'merchant-dashboard',
  'src',
  'pages',
  'MarketplaceDetail.tsx',
);

function readSource(): string {
  return readFileSync(PAGE_PATH, 'utf8');
}

// The full list of credential fields the page accepts. The four
// sensitive ones MUST flow through SecretInput; the public ones may
// keep using a plain Input.
const SENSITIVE_FIELDS = [
  'privateKey',     // Noon RSA private key
  'clientSecret',   // Amazon SP-API client secret
  'refreshToken',   // Amazon SP-API refresh token (long-lived bearer)
  'awsAccessKey',   // AWS access key id (still a secret in practice)
  'awsSecretKey',   // AWS secret access key
] as const;

const PUBLIC_FIELDS = ['clientId', 'sellerName', 'partnerId', 'warehouseCode'] as const;

describe('MarketplaceDetail.tsx secret masking (audit PART 4 P0 #1)', () => {
  const src = readSource();

  it('defines a SecretInput component', () => {
    // The dedicated component centralises mask-on-blur + write-only
    // semantics so the page never has a chance to render a secret as
    // plain text inline.
    expect(src).toMatch(/function\s+SecretInput\s*\(/);
  });

  it('SecretInput renders the field as type="password" by default', () => {
    // Critical: even when DevTools is open, the input must serialise
    // its value as `•` glyphs, not the underlying text.
    const block = src.match(/function\s+SecretInput[\s\S]*?\n\}\s*\n/)?.[0] ?? '';
    expect(block).toContain("type={revealed ? 'text' : 'password'}");
  });

  it('SecretInput auto-masks on blur (input AND toggle button)', () => {
    const block = src.match(/function\s+SecretInput[\s\S]*?\n\}\s*\n/)?.[0] ?? '';
    // Both the input itself AND the eye-toggle must reset the reveal
    // flag on blur — otherwise focus moving from the input to the
    // toggle would keep the secret visible.
    const blurResets = block.match(/onBlur=\{\s*\(\)\s*=>\s*setRevealed\(false\)\s*\}/g) ?? [];
    expect(blurResets.length).toBeGreaterThanOrEqual(2);
  });

  it('SecretInput toggle button is keyboard-focusable with an aria-label', () => {
    const block = src.match(/function\s+SecretInput[\s\S]*?\n\}\s*\n/)?.[0] ?? '';
    expect(block).toMatch(/aria-label=\{revealed[\s\S]*?\}/);
    expect(block).toMatch(/aria-pressed=\{revealed\}/);
    // Visible focus ring is required for keyboard-only users (WCAG 2.4.7).
    expect(block).toMatch(/focus-visible:ring/);
  });

  it('SecretInput disables autoComplete + spellCheck + autoCorrect', () => {
    const block = src.match(/function\s+SecretInput[\s\S]*?\n\}\s*\n/)?.[0] ?? '';
    // Browsers and OS-level autofill/spellcheck must NOT see secret
    // values — they get logged to OS dictionaries otherwise.
    expect(block).toMatch(/autoComplete="off"/);
    expect(block).toMatch(/spellCheck=\{false\}/);
    expect(block).toMatch(/autoCorrect="off"/);
  });

  it('renders MASKED_PLACEHOLDER for stored secrets, never the value', () => {
    // The page must never `value={existingSecretFromServer}`. The
    // placeholder is the visible redaction; the merchant retypes to
    // update.
    expect(src).toMatch(/MASKED_PLACEHOLDER/);
    expect(src).toMatch(/•/); // the literal bullet glyph for the redaction
  });

  it('isSensitiveField recognises all five vendor secret fields', () => {
    // Mirror the regex from the page and assert each known sensitive
    // field matches it. If anyone weakens the regex, this test fires.
    const reMatch = src.match(/const\s+SENSITIVE_FIELD_RE\s*=\s*\/([^/]+)\/([a-z]*)/);
    expect(reMatch).not.toBeNull();
    const re = new RegExp(reMatch![1], reMatch![2]);
    for (const field of SENSITIVE_FIELDS) {
      expect(re.test(field)).toBe(true);
    }
    // Public fields must NOT match (no false positives).
    for (const field of PUBLIC_FIELDS) {
      expect(re.test(field)).toBe(false);
    }
  });

  it('no bare <textarea value={creds...}> renders a sensitive field', () => {
    // Regression guard for the pre-fix shape — `<textarea ... value={noonCreds[field]} ... />`
    // where `field === 'privateKey'` etc. We grep for the old pattern.
    expect(src).not.toMatch(/<textarea[^>]*value=\{noonCreds\[/);
    expect(src).not.toMatch(/<textarea[^>]*value=\{amazonCreds\[/);
  });

  it('sensitive Noon field (privateKey) routes through SecretInput', () => {
    // Anchor on the JSX render branch — the `usesManualCreds && provider === 'noon'`
    // string only appears once, in the form JSX, so it isolates the
    // credential block from earlier `provider === 'noon'` matches.
    const start = src.indexOf("usesManualCreds && provider === 'noon'");
    const end = src.indexOf("usesManualCreds && provider === 'amazon'");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const noonBlock = src.slice(start, end);
    expect(noonBlock).toContain('SecretInput');
    expect(noonBlock).toContain('isSensitiveField');
    // Specifically the privateKey field must exist in this block.
    expect(noonBlock).toContain('privateKey');
  });

  it('sensitive Amazon fields route through SecretInput', () => {
    const start = src.indexOf("usesManualCreds && provider === 'amazon'");
    expect(start).toBeGreaterThan(-1);
    // Take a generous window — the Amazon block is around 1800 chars.
    const amazonBlock = src.slice(start, start + 4000);
    expect(amazonBlock).toContain('SecretInput');
    expect(amazonBlock).toContain('isSensitiveField');
    expect(amazonBlock).toContain('clientSecret');
    expect(amazonBlock).toContain('awsSecretKey');
  });

  it('clears credentials from React state after a successful connect', () => {
    // After the API accepts the secret, the page should drop it from
    // memory — there is no reason to keep it in the React tree where
    // a future bug might re-render it.
    expect(src).toMatch(/setNoonCreds\(\{[^}]*privateKey:\s*''/);
    expect(src).toMatch(/setAmazonCreds\(\{[^}]*clientSecret:\s*''/);
  });

  it('does not contain any literal placeholder that looks like a real key', () => {
    // Belt-and-braces: no test/example value that resembles a real
    // credential is hardcoded. We allow the "-----BEGIN RSA..." marker
    // as a *placeholder string* but not a key body.
    // No base64-ish 32+ char alphanumeric strings should be hardcoded.
    const suspicious = src.match(/['"][A-Za-z0-9+/=]{32,}['"]/g) ?? [];
    expect(suspicious).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Pure logic — `isSensitiveField` policy mirror.
// ─────────────────────────────────────────────────────────────────────

const SENSITIVE_RE = /(secret|key|password|token)/i;
function isSensitiveField(name: string): boolean {
  return SENSITIVE_RE.test(name);
}

describe('isSensitiveField policy', () => {
  it.each(SENSITIVE_FIELDS)('flags %s as sensitive', (field) => {
    expect(isSensitiveField(field)).toBe(true);
  });

  it.each(PUBLIC_FIELDS)('does NOT flag %s as sensitive', (field) => {
    expect(isSensitiveField(field)).toBe(false);
  });

  it('flags arbitrary *Password*/*Token* names per spec', () => {
    expect(isSensitiveField('userPassword')).toBe(true);
    expect(isSensitiveField('apiToken')).toBe(true);
    expect(isSensitiveField('SECRET_VALUE')).toBe(true);
    // case-insensitive match is part of the contract
    expect(isSensitiveField('Key')).toBe(true);
  });
});
