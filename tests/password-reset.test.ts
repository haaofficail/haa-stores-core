// HAA-AUTH-PASSWORD-RESET — source-grep guards for the password-reset
// flow (matches the pattern used by tests/signup-otp-verify.test.ts).
// Behavioural integration coverage lands once the service is wired up
// against a real database; these tests keep the suite fast and lock in
// the no-enumeration / token-rotation invariants.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

describe('HAA-AUTH-PASSWORD-RESET — AuthFlowService (requestPasswordReset)', () => {
  const PATH = 'packages/commerce-core/src/auth-flow.ts';

  it('requestPasswordReset() method exists', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/async\s+requestPasswordReset\s*\(/);
  });

  it("requestPasswordReset() calls EmailOtpService.generateAndSend with purpose 'password_reset'", () => {
    const SRC = read(PATH);
    const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const idx = codeOnly.indexOf('async requestPasswordReset');
    expect(idx).toBeGreaterThan(-1);
    const body = codeOnly.slice(idx);
    expect(body).toMatch(/generateAndSend\(\s*\{[\s\S]*?purpose:\s*['"]password_reset['"]/);
  });

  it('requestPasswordReset() uses normalizeSaudiPhone for phone-first resolution', () => {
    const SRC = read(PATH);
    const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const idx = codeOnly.indexOf('async requestPasswordReset');
    expect(idx).toBeGreaterThan(-1);
    // Slice to the next async method definition so we only scan this body.
    // Find the NEXT method-level `async <name>(` — skipping inline
    // `async (tx) =>` transaction callbacks. We approximate by
    // searching for `\n  async ` (2-space class-method indent).
    const nextIdx = codeOnly.slice(idx + 1).search(/\n {2}async\s+[a-zA-Z_]\w*\s*\(/);
    const sliceEnd = nextIdx > -1 ? idx + 1 + nextIdx : undefined;
    const body = codeOnly.slice(idx, sliceEnd);
    expect(body).toMatch(/normalizeSaudiPhone\(/);
  });

  it('requestPasswordReset() returns uniform { ok: true } for missing users (no enumeration)', () => {
    const SRC = read(PATH);
    const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const idx = codeOnly.indexOf('async requestPasswordReset');
    expect(idx).toBeGreaterThan(-1);
    // Find the NEXT method-level `async <name>(` — skipping inline
    // `async (tx) =>` transaction callbacks. We approximate by
    // searching for `\n  async ` (2-space class-method indent).
    const nextIdx = codeOnly.slice(idx + 1).search(/\n {2}async\s+[a-zA-Z_]\w*\s*\(/);
    const sliceEnd = nextIdx > -1 ? idx + 1 + nextIdx : undefined;
    const body = codeOnly.slice(idx, sliceEnd);
    // The only failure surface allowed in this method is RATE_LIMITED.
    // NOT_FOUND must NOT appear in this method body.
    expect(body).not.toMatch(/reason:\s*['"]NOT_FOUND['"]/);
    // And a uniform { ok: true } return is present.
    expect(body).toMatch(/return\s*\{\s*ok:\s*true\s*\}/);
  });

  it('requestPasswordReset() only surfaces RATE_LIMITED as a failure reason', () => {
    const SRC = read(PATH);
    const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const idx = codeOnly.indexOf('async requestPasswordReset');
    // Find the NEXT method-level `async <name>(` — skipping inline
    // `async (tx) =>` transaction callbacks. We approximate by
    // searching for `\n  async ` (2-space class-method indent).
    const nextIdx = codeOnly.slice(idx + 1).search(/\n {2}async\s+[a-zA-Z_]\w*\s*\(/);
    const sliceEnd = nextIdx > -1 ? idx + 1 + nextIdx : undefined;
    const body = codeOnly.slice(idx, sliceEnd);
    expect(body).toMatch(/reason:\s*['"]RATE_LIMITED['"]/);
  });
});

describe('HAA-AUTH-PASSWORD-RESET — AuthFlowService (confirmPasswordReset)', () => {
  const PATH = 'packages/commerce-core/src/auth-flow.ts';

  it('confirmPasswordReset() method exists', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/async\s+confirmPasswordReset\s*\(/);
  });

  it("confirmPasswordReset() calls EmailOtpService.verify with purpose 'password_reset'", () => {
    const SRC = read(PATH);
    const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const idx = codeOnly.indexOf('async confirmPasswordReset');
    expect(idx).toBeGreaterThan(-1);
    // Find the NEXT method-level `async <name>(` — skipping inline
    // `async (tx) =>` transaction callbacks. We approximate by
    // searching for `\n  async ` (2-space class-method indent).
    const nextIdx = codeOnly.slice(idx + 1).search(/\n {2}async\s+[a-zA-Z_]\w*\s*\(/);
    const sliceEnd = nextIdx > -1 ? idx + 1 + nextIdx : undefined;
    const body = codeOnly.slice(idx, sliceEnd);
    expect(body).toMatch(/\.verify\(\s*\{[\s\S]*?purpose:\s*['"]password_reset['"]/);
  });

  it('confirmPasswordReset() calls hashPassword from @haa/auth-core', () => {
    const SRC = read(PATH);
    // The import must include hashPassword.
    expect(SRC).toMatch(/import\s*\{[^}]*hashPassword[^}]*\}\s*from\s*['"]@haa\/auth-core['"]/);
    const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const idx = codeOnly.indexOf('async confirmPasswordReset');
    // Find the NEXT method-level `async <name>(` — skipping inline
    // `async (tx) =>` transaction callbacks. We approximate by
    // searching for `\n  async ` (2-space class-method indent).
    const nextIdx = codeOnly.slice(idx + 1).search(/\n {2}async\s+[a-zA-Z_]\w*\s*\(/);
    const sliceEnd = nextIdx > -1 ? idx + 1 + nextIdx : undefined;
    const body = codeOnly.slice(idx, sliceEnd);
    expect(body).toMatch(/hashPassword\(/);
  });

  it('confirmPasswordReset() bumps token_version (invalidates existing JWTs)', () => {
    const SRC = read(PATH);
    const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const idx = codeOnly.indexOf('async confirmPasswordReset');
    // Find the NEXT method-level `async <name>(` — skipping inline
    // `async (tx) =>` transaction callbacks. We approximate by
    // searching for `\n  async ` (2-space class-method indent).
    const nextIdx = codeOnly.slice(idx + 1).search(/\n {2}async\s+[a-zA-Z_]\w*\s*\(/);
    const sliceEnd = nextIdx > -1 ? idx + 1 + nextIdx : undefined;
    const body = codeOnly.slice(idx, sliceEnd);
    // Either the raw SQL form (`token_version + 1`) or the drizzle
    // expression (`s.users.tokenVersion + 1`) is acceptable.
    expect(body).toMatch(/(token_version|tokenVersion)[\s\S]{0,40}\+\s*1/);
  });

  it('confirmPasswordReset() writes a password_reset_completed audit log', () => {
    const SRC = read(PATH);
    const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const idx = codeOnly.indexOf('async confirmPasswordReset');
    // Find the NEXT method-level `async <name>(` — skipping inline
    // `async (tx) =>` transaction callbacks. We approximate by
    // searching for `\n  async ` (2-space class-method indent).
    const nextIdx = codeOnly.slice(idx + 1).search(/\n {2}async\s+[a-zA-Z_]\w*\s*\(/);
    const sliceEnd = nextIdx > -1 ? idx + 1 + nextIdx : undefined;
    const body = codeOnly.slice(idx, sliceEnd);
    expect(body).toMatch(/action:\s*['"]password_reset_completed['"]/);
    expect(body).toMatch(/entityType:\s*['"]user['"]/);
  });

  it('confirmPasswordReset() exposes all six documented failure reasons', () => {
    const SRC = read(PATH);
    // The return-type union must include each of these — we grep the
    // whole file because TypeScript types appear in the signature.
    expect(SRC).toMatch(/['"]INVALID_CODE['"]/);
    expect(SRC).toMatch(/['"]EXPIRED['"]/);
    expect(SRC).toMatch(/['"]NOT_FOUND['"]/);
    expect(SRC).toMatch(/['"]TOO_MANY_ATTEMPTS['"]/);
    expect(SRC).toMatch(/['"]USED['"]/);
    expect(SRC).toMatch(/['"]WEAK_PASSWORD['"]/);
  });

  it('confirmPasswordReset() validates min password length (≥ 8)', () => {
    const SRC = read(PATH);
    const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const idx = codeOnly.indexOf('async confirmPasswordReset');
    // Find the NEXT method-level `async <name>(` — skipping inline
    // `async (tx) =>` transaction callbacks. We approximate by
    // searching for `\n  async ` (2-space class-method indent).
    const nextIdx = codeOnly.slice(idx + 1).search(/\n {2}async\s+[a-zA-Z_]\w*\s*\(/);
    const sliceEnd = nextIdx > -1 ? idx + 1 + nextIdx : undefined;
    const body = codeOnly.slice(idx, sliceEnd);
    // Defense-in-depth: the service itself rejects short passwords
    // independent of the route's zod schema.
    expect(body).toMatch(/length\s*<\s*8/);
    expect(body).toMatch(/reason:\s*['"]WEAK_PASSWORD['"]/);
  });
});

describe('HAA-AUTH-PASSWORD-RESET — auth route', () => {
  const PATH = 'apps/api/src/routes/auth.ts';

  it('defines POST /password-reset/request', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/authRouter\.post\(\s*['"]\/password-reset\/request['"]/);
  });

  it('defines POST /password-reset/confirm', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/authRouter\.post\(\s*['"]\/password-reset\/confirm['"]/);
  });

  it('both password-reset routes are guarded by rateLimiter middleware', () => {
    const SRC = read(PATH);
    const requestIdx = SRC.indexOf("'/password-reset/request'");
    const confirmIdx = SRC.indexOf("'/password-reset/confirm'");
    expect(requestIdx).toBeGreaterThan(-1);
    expect(confirmIdx).toBeGreaterThan(requestIdx);

    // Each route block must mount rateLimiter at least once.
    const reqBlock = SRC.slice(requestIdx, confirmIdx);
    expect(reqBlock).toMatch(/rateLimiter\(\s*\{/);

    // The confirm block runs until the next authRouter.post — cap at
    // 6000 chars to stay inside the one route.
    const confirmBlock = SRC.slice(confirmIdx, confirmIdx + 6000);
    expect(confirmBlock).toMatch(/rateLimiter\(\s*\{/);
  });

  it('/password-reset/request returns the uniform no-enumeration message', () => {
    const SRC = read(PATH);
    const idx = SRC.indexOf("'/password-reset/request'");
    expect(idx).toBeGreaterThan(-1);
    const block = SRC.slice(idx, idx + 6000);
    expect(block).toMatch(/إن\s+وُجد\s+حساب/);
  });

  it('/password-reset/request does NOT return 404 for unknown identifiers', () => {
    const SRC = read(PATH);
    const idx = SRC.indexOf("'/password-reset/request'");
    expect(idx).toBeGreaterThan(-1);
    const block = SRC.slice(idx, idx + 6000);
    // 404 must never appear — only 429 (rate limit) and uniform 200.
    expect(block).not.toMatch(/,\s*404\s*\)/);
  });

  it('/password-reset/confirm validates a 6-digit numeric code', () => {
    const SRC = read(PATH);
    const idx = SRC.indexOf("'/password-reset/confirm'");
    expect(idx).toBeGreaterThan(-1);
    const block = SRC.slice(idx, idx + 6000);
    expect(block).toMatch(/regex\(\s*\/\^\\d\{6\}\$\//);
  });

  it('/password-reset/confirm requires newPassword.min(8)', () => {
    const SRC = read(PATH);
    const idx = SRC.indexOf("'/password-reset/confirm'");
    expect(idx).toBeGreaterThan(-1);
    const block = SRC.slice(idx, idx + 6000);
    expect(block).toMatch(/newPassword:\s*z\.string\(\)[^,]*\.min\(\s*8\s*\)/);
  });

  it('/password-reset/confirm maps RATE_LIMITED → 429 only on request, validates on confirm', () => {
    const SRC = read(PATH);
    const reqIdx = SRC.indexOf("'/password-reset/request'");
    const confirmIdx = SRC.indexOf("'/password-reset/confirm'");
    const reqBlock = SRC.slice(reqIdx, confirmIdx);
    // Request route maps the only exposed failure (RATE_LIMITED) to 429.
    expect(reqBlock).toMatch(/RATE_LIMITED[\s\S]{0,200}429/);
  });
});

describe('HAA-AUTH-PASSWORD-RESET — AuditAction', () => {
  it('shared types include password_reset_completed', () => {
    const SRC = read('packages/shared/src/types/orders.ts');
    expect(SRC).toMatch(/['"]password_reset_completed['"]/);
  });

  it('audit labels include an Arabic label for password_reset_completed', () => {
    const SRC = read('packages/shared/src/types/audit.ts');
    expect(SRC).toMatch(/password_reset_completed:\s*['"][^'"]+['"]/);
  });
});
