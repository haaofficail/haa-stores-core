// HAA-AUTH-MAGIC-LOGIN — source-grep guards for the magic-login OTP
// flow (mirrors tests/password-reset.test.ts). Behavioural integration
// coverage lands once the service is exercised against a real database;
// these tests pin the no-enumeration / no-password-rotation invariants
// and the route shape so accidental regressions trip CI.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

// Slice a single async-method body out of the auth-flow source, stripping
// comments so source-grep targets executable code only. Stops at the next
// 2-space class-method declaration (skipping `async (tx) =>` callbacks).
function sliceMethod(src: string, methodName: string): string {
  const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const idx = codeOnly.indexOf(`async ${methodName}`);
  if (idx === -1) return '';
  const nextIdx = codeOnly.slice(idx + 1).search(/\n {2}async\s+[a-zA-Z_]\w*\s*\(/);
  const sliceEnd = nextIdx > -1 ? idx + 1 + nextIdx : undefined;
  return codeOnly.slice(idx, sliceEnd);
}

describe('HAA-AUTH-MAGIC-LOGIN — AuthFlowService (requestMagicLogin)', () => {
  const PATH = 'packages/commerce-core/src/auth-flow.ts';

  it('requestMagicLogin() method exists', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/async\s+requestMagicLogin\s*\(/);
  });

  it("calls EmailOtpService.generateAndSend with purpose 'magic_login' (valid email path)", () => {
    const SRC = read(PATH);
    const body = sliceMethod(SRC, 'requestMagicLogin');
    expect(body).toMatch(/generateAndSend\(\s*\{[\s\S]*?purpose:\s*['"]magic_login['"]/);
  });

  it('uses normalizeSaudiPhone for phone-first identifier resolution', () => {
    const SRC = read(PATH);
    const body = sliceMethod(SRC, 'requestMagicLogin');
    expect(body).toMatch(/normalizeSaudiPhone\(/);
  });

  it('returns uniform { ok: true } for unknown identifiers (no enumeration)', () => {
    const SRC = read(PATH);
    const body = sliceMethod(SRC, 'requestMagicLogin');
    // The unknown-user branch must return { ok: true } and MUST NOT
    // surface a NOT_FOUND reason — that would expose existence.
    expect(body).not.toMatch(/reason:\s*['"]NOT_FOUND['"]/);
    expect(body).toMatch(/return\s*\{\s*ok:\s*true\s*\}/);
  });

  it('only surfaces RATE_LIMITED as a failure reason', () => {
    const SRC = read(PATH);
    const body = sliceMethod(SRC, 'requestMagicLogin');
    expect(body).toMatch(/reason:\s*['"]RATE_LIMITED['"]/);
    // No other reason should appear in the request-path body.
    expect(body).not.toMatch(/reason:\s*['"]INVALID_CODE['"]/);
    expect(body).not.toMatch(/reason:\s*['"]EXPIRED['"]/);
    expect(body).not.toMatch(/reason:\s*['"]USED['"]/);
  });

  it('logs failures with kind=magic_login and user.id only (no PII)', () => {
    const SRC = read(PATH);
    const body = sliceMethod(SRC, 'requestMagicLogin');
    // The fallback log line must reference kind=magic_login and userId
    // — and must NOT print user.email or user.phone or input.identifier.
    expect(body).toMatch(/kind=magic_login/);
    expect(body).toMatch(/userId=\$\{user\.id\}/);
    // Ensure no PII fields leak into the log line.
    const logLineMatch = body.match(/console\.warn\([^;]+kind=magic_login[^;]+\)/);
    expect(logLineMatch).not.toBeNull();
    const logLine = logLineMatch![0];
    expect(logLine).not.toMatch(/user\.email/);
    expect(logLine).not.toMatch(/user\.phone/);
    expect(logLine).not.toMatch(/input\.identifier/);
  });
});

describe('HAA-AUTH-MAGIC-LOGIN — AuthFlowService (confirmMagicLogin)', () => {
  const PATH = 'packages/commerce-core/src/auth-flow.ts';

  it('confirmMagicLogin() method exists', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/async\s+confirmMagicLogin\s*\(/);
  });

  it("calls EmailOtpService.verify with purpose 'magic_login'", () => {
    const SRC = read(PATH);
    const body = sliceMethod(SRC, 'confirmMagicLogin');
    expect(body).toMatch(/\.verify\(\s*\{[\s\S]*?purpose:\s*['"]magic_login['"]/);
  });

  it('does NOT mutate users.passwordHash (pure session-mint)', () => {
    const SRC = read(PATH);
    const body = sliceMethod(SRC, 'confirmMagicLogin');
    // Magic login is a session-mint, NOT a password rotation. The
    // method body must never touch passwordHash or call bcrypt.hash.
    expect(body).not.toMatch(/passwordHash/);
    expect(body).not.toMatch(/hashPassword\(/);
    expect(body).not.toMatch(/bcrypt\.hash\(/);
  });

  it('does NOT bump token_version (no JWT invalidation on magic-login)', () => {
    const SRC = read(PATH);
    const body = sliceMethod(SRC, 'confirmMagicLogin');
    // Token-version bump is a password-rotation concern (kill existing
    // sessions because the old credential is assumed compromised).
    // Magic-login is a new session alongside any existing ones —
    // existing JWTs must remain valid.
    expect(body).not.toMatch(/tokenVersion:\s*sql/);
    expect(body).not.toMatch(/token_version[\s\S]{0,40}\+\s*1/);
  });

  it('honors the AUTH_LEGACY_VERIFIED env flag (transitional bypass)', () => {
    const SRC = read(PATH);
    const body = sliceMethod(SRC, 'confirmMagicLogin');
    // Same shape as login(): the env flag short-circuits the
    // email_verified_at guard while ops backfills staging rows.
    expect(body).toMatch(/process\.env\.AUTH_LEGACY_VERIFIED\s*===\s*['"]1['"]/);
    expect(body).toMatch(
      /if\s*\(\s*user\.emailVerifiedAt\s*===\s*null\s*&&\s*!TREAT_LEGACY_AS_VERIFIED\s*\)/,
    );
  });

  it('returns EMAIL_NOT_VERIFIED when email_verified_at is null and the flag is off', () => {
    const SRC = read(PATH);
    const body = sliceMethod(SRC, 'confirmMagicLogin');
    expect(body).toMatch(/reason:\s*['"]EMAIL_NOT_VERIFIED['"]/);
  });

  it('exposes the full documented reasons union', () => {
    const SRC = read(PATH);
    // Union must include each reason — TypeScript types appear in the
    // signature so we grep the whole file.
    expect(SRC).toMatch(/['"]INVALID_CODE['"]/);
    expect(SRC).toMatch(/['"]EXPIRED['"]/);
    expect(SRC).toMatch(/['"]NOT_FOUND['"]/);
    expect(SRC).toMatch(/['"]TOO_MANY_ATTEMPTS['"]/);
    expect(SRC).toMatch(/['"]USED['"]/);
    expect(SRC).toMatch(/['"]EMAIL_NOT_VERIFIED['"]/);
    expect(SRC).toMatch(/['"]USER_NOT_FOUND['"]/);
  });

  it('returns the same payload shape as confirmPasswordReset (VerifySignupPayload)', () => {
    const SRC = read(PATH);
    const body = sliceMethod(SRC, 'confirmMagicLogin');
    // The success branch returns `payload: { userId, ... role }` —
    // grep for the canonical fields.
    expect(body).toMatch(/payload:\s*\{/);
    expect(body).toMatch(/userId:\s*user\.id/);
    expect(body).toMatch(/userTokenVersion:\s*user\.tokenVersion/);
    expect(body).toMatch(/tenantId:\s*tenantUser\.tenantId/);
    expect(body).toMatch(/role:\s*tenantUser\.role/);
  });
});

describe('HAA-AUTH-MAGIC-LOGIN — auth route', () => {
  const PATH = 'apps/api/src/routes/auth.ts';

  it('defines POST /magic-login/request', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/authRouter\.post\(\s*['"]\/magic-login\/request['"]/);
  });

  it('defines POST /magic-login/confirm', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/authRouter\.post\(\s*['"]\/magic-login\/confirm['"]/);
  });

  it('both magic-login routes are guarded by rateLimiter middleware', () => {
    const SRC = read(PATH);
    const requestIdx = SRC.indexOf("'/magic-login/request'");
    const confirmIdx = SRC.indexOf("'/magic-login/confirm'");
    expect(requestIdx).toBeGreaterThan(-1);
    expect(confirmIdx).toBeGreaterThan(requestIdx);

    const reqBlock = SRC.slice(requestIdx, confirmIdx);
    expect(reqBlock).toMatch(/rateLimiter\(\s*\{/);

    const confirmBlock = SRC.slice(confirmIdx, confirmIdx + 8000);
    expect(confirmBlock).toMatch(/rateLimiter\(\s*\{/);
  });

  it('/magic-login/request uses the 5-per-60-min rate limit', () => {
    const SRC = read(PATH);
    const idx = SRC.indexOf("'/magic-login/request'");
    expect(idx).toBeGreaterThan(-1);
    const block = SRC.slice(idx, idx + 1500);
    expect(block).toMatch(/windowMs:\s*60\s*\*\s*60\s*\*\s*1000/);
    expect(block).toMatch(/maxRequests:\s*5/);
  });

  it('/magic-login/confirm uses the 10-per-10-min rate limit', () => {
    const SRC = read(PATH);
    const idx = SRC.indexOf("'/magic-login/confirm'");
    expect(idx).toBeGreaterThan(-1);
    const block = SRC.slice(idx, idx + 1500);
    expect(block).toMatch(/windowMs:\s*10\s*\*\s*60\s*\*\s*1000/);
    expect(block).toMatch(/maxRequests:\s*10/);
  });

  it('/magic-login/request returns the uniform no-enumeration message even on errors', () => {
    const SRC = read(PATH);
    const idx = SRC.indexOf("'/magic-login/request'");
    expect(idx).toBeGreaterThan(-1);
    // Slice the whole handler — cap at next authRouter.post.
    const confirmIdx = SRC.indexOf("'/magic-login/confirm'", idx);
    const block = SRC.slice(idx, confirmIdx);
    // The exact uniform message must appear in the block.
    expect(block).toMatch(/إن\s+وُجد\s+حساب\s+لهذا\s+المعرّف،\s+فقد\s+أُرسل\s+رمز\s+الدخول/);
    // And the catch path must ALSO return success: true (never expose
    // infra errors that could be probed for existence).
    expect(block).toMatch(/catch[\s\S]+success:\s*true/);
  });

  it('/magic-login/request does NOT return 404 for unknown identifiers', () => {
    const SRC = read(PATH);
    const idx = SRC.indexOf("'/magic-login/request'");
    expect(idx).toBeGreaterThan(-1);
    const confirmIdx = SRC.indexOf("'/magic-login/confirm'", idx);
    const block = SRC.slice(idx, confirmIdx);
    // 404 must never appear — only 429 (rate limit) and uniform 200.
    expect(block).not.toMatch(/,\s*404\s*\)/);
  });

  it('/magic-login/request maps RATE_LIMITED → 429', () => {
    const SRC = read(PATH);
    const idx = SRC.indexOf("'/magic-login/request'");
    const confirmIdx = SRC.indexOf("'/magic-login/confirm'", idx);
    const block = SRC.slice(idx, confirmIdx);
    expect(block).toMatch(/RATE_LIMITED[\s\S]{0,200}429/);
  });

  it('/magic-login/confirm validates a 6-digit numeric code', () => {
    const SRC = read(PATH);
    const idx = SRC.indexOf("'/magic-login/confirm'");
    expect(idx).toBeGreaterThan(-1);
    const block = SRC.slice(idx, idx + 4000);
    expect(block).toMatch(/regex\(\s*\/\^\\d\{6\}\$\//);
  });

  it('/magic-login/confirm requires the identifier field', () => {
    const SRC = read(PATH);
    const idx = SRC.indexOf("'/magic-login/confirm'");
    expect(idx).toBeGreaterThan(-1);
    const block = SRC.slice(idx, idx + 4000);
    expect(block).toMatch(/identifier:\s*z\.string\(\)/);
  });

  it('/magic-login/confirm does NOT accept a newPassword field', () => {
    const SRC = read(PATH);
    const idx = SRC.indexOf("'/magic-login/confirm'");
    expect(idx).toBeGreaterThan(-1);
    // Slice the handler body — cap before the next authRouter.post.
    const nextIdx = SRC.indexOf('authRouter.post(', idx + 10);
    const block = SRC.slice(idx, nextIdx > -1 ? nextIdx : idx + 5000);
    expect(block).not.toMatch(/newPassword/);
  });

  it('/magic-login/confirm maps EMAIL_NOT_VERIFIED → 403 (matches login() behaviour)', () => {
    const SRC = read(PATH);
    const idx = SRC.indexOf("'/magic-login/confirm'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = SRC.indexOf('authRouter.post(', idx + 10);
    const block = SRC.slice(idx, nextIdx > -1 ? nextIdx : idx + 5000);
    // The 403 must be tied to EMAIL_NOT_VERIFIED (not some other code).
    expect(block).toMatch(/EMAIL_NOT_VERIFIED[\s\S]{0,400}403/);
  });

  it('/magic-login/confirm maps USER_NOT_FOUND to the same Arabic message as INVALID_CODE', () => {
    const SRC = read(PATH);
    const idx = SRC.indexOf("'/magic-login/confirm'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = SRC.indexOf('authRouter.post(', idx + 10);
    const block = SRC.slice(idx, nextIdx > -1 ? nextIdx : idx + 5000);
    // Both INVALID_CODE and USER_NOT_FOUND must map to the SAME Arabic
    // phrase ('الرمز غير صحيح') so the HTTP boundary never leaks
    // account existence at the confirm step.
    expect(block).toMatch(/INVALID_CODE:\s*['"]الرمز غير صحيح['"]/);
    expect(block).toMatch(/USER_NOT_FOUND:\s*['"]الرمز غير صحيح['"]/);
  });

  it('/magic-login/confirm mints a JWT via signToken + setAuthCookie on success', () => {
    const SRC = read(PATH);
    const idx = SRC.indexOf("'/magic-login/confirm'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = SRC.indexOf('authRouter.post(', idx + 10);
    const block = SRC.slice(idx, nextIdx > -1 ? nextIdx : idx + 5000);
    expect(block).toMatch(/signToken\(/);
    expect(block).toMatch(/setAuthCookie\(/);
    // Response body matches the password-reset/confirm shape.
    expect(block).toMatch(/data:\s*\{[\s\S]*?token,[\s\S]*?user:\s*\{/);
  });
});

describe('HAA-AUTH-MAGIC-LOGIN — service-route wiring', () => {
  it('the route calls AuthFlowService.requestMagicLogin', () => {
    const SRC = read('apps/api/src/routes/auth.ts');
    expect(SRC).toMatch(/service\.requestMagicLogin\(/);
  });

  it('the route calls AuthFlowService.confirmMagicLogin', () => {
    const SRC = read('apps/api/src/routes/auth.ts');
    expect(SRC).toMatch(/service\.confirmMagicLogin\(/);
  });

  it('magic_login purpose is registered in the schema enum', () => {
    const SRC = read('packages/db/src/schema/email-otp-codes.ts');
    expect(SRC).toMatch(/['"]magic_login['"]/);
  });

  it('EmailOtpService renders a subject + body for the magic_login purpose', () => {
    const SRC = read('packages/auth-core/src/email-otp-service.ts');
    // Subject + body switch arms exist — the dedicated magic-login PR
    // owns the copy; we just guard the wiring is still in place.
    expect(SRC).toMatch(/case\s+['"]magic_login['"]:/);
    expect(SRC).toMatch(/magic_login:\s*['"][^'"]+['"]/);
  });
});
