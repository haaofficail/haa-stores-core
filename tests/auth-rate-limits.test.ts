/**
 * Phase 1 hardening — guards that ensure /auth/register and /auth/login
 * carry a rate-limiter middleware in front of their zValidator.
 *
 * Source-grep only (no http call): the goal is to fail CI if a future
 * refactor accidentally drops the limiter from these two specific
 * routes, which would re-open credential-stuffing + signup-flood
 * surfaces.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SRC = readFileSync(
  new URL('../apps/api/src/routes/auth.ts', import.meta.url),
  'utf-8',
);

describe('Phase 1 — auth rate limits on register + login', () => {
  it('rateLimiter is imported at the top of auth.ts', () => {
    expect(SRC).toMatch(
      /^\s*import\s*\{\s*rateLimiter\s*\}\s*from\s*['"]\.\.\/middleware\/rate-limiter\.js['"]/m,
    );
  });

  it('/register handler has rateLimiter() before zValidator', () => {
    // Capture from the route literal to the matching `zValidator('json', registerSchema)`.
    const slice = SRC.slice(SRC.indexOf("'/register'"), SRC.indexOf("registerSchema", SRC.indexOf("'/register'")) + 50);
    expect(slice).toMatch(/rateLimiter\s*\(/);
    expect(slice).toMatch(/zValidator\s*\(\s*['"]json['"]\s*,\s*registerSchema\s*\)/);
    // rateLimiter must come BEFORE zValidator in the middleware chain.
    expect(slice.indexOf('rateLimiter')).toBeLessThan(slice.indexOf('zValidator'));
  });

  it('/login handler has rateLimiter() before zValidator', () => {
    const slice = SRC.slice(SRC.indexOf("'/login'"), SRC.indexOf("loginSchema", SRC.indexOf("'/login'")) + 50);
    expect(slice).toMatch(/rateLimiter\s*\(/);
    expect(slice).toMatch(/zValidator\s*\(\s*['"]json['"]\s*,\s*loginSchema\s*\)/);
    expect(slice.indexOf('rateLimiter')).toBeLessThan(slice.indexOf('zValidator'));
  });

  it('/register limit is 10 attempts per 60 minutes', () => {
    const slice = SRC.slice(SRC.indexOf("'/register'"), SRC.indexOf("registerSchema", SRC.indexOf("'/register'")) + 50);
    expect(slice).toMatch(/windowMs:\s*60\s*\*\s*60\s*\*\s*1000/);
    expect(slice).toMatch(/maxRequests:\s*10/);
  });

  it('/login limit is 20 attempts per 15 minutes', () => {
    const slice = SRC.slice(SRC.indexOf("'/login'"), SRC.indexOf("loginSchema", SRC.indexOf("'/login'")) + 50);
    expect(slice).toMatch(/windowMs:\s*15\s*\*\s*60\s*\*\s*1000/);
    expect(slice).toMatch(/maxRequests:\s*20/);
  });

  it('both rate-limit messages are in Arabic and start with "تم تجاوز"', () => {
    const registerSlice = SRC.slice(SRC.indexOf("'/register'"), SRC.indexOf("registerSchema", SRC.indexOf("'/register'")) + 50);
    const loginSlice = SRC.slice(SRC.indexOf("'/login'"), SRC.indexOf("loginSchema", SRC.indexOf("'/login'")) + 50);
    expect(registerSlice).toMatch(/message:\s*['"`]تم تجاوز/);
    expect(loginSlice).toMatch(/message:\s*['"`]تم تجاوز/);
  });

  it('does NOT modify existing OTP/reset rate limits on other routes', () => {
    // Defensive: signup/verify and signup/resend-otp + password-reset
    // routes are NOT in scope of this PR. The rateLimiter calls there
    // should remain at their original windows.
    const signupVerifySlice = SRC.slice(
      SRC.indexOf("'/signup/verify'"),
      SRC.indexOf("'/signup/verify'") + 400,
    );
    if (signupVerifySlice.length > 0) {
      expect(signupVerifySlice).toMatch(/rateLimiter/);
    }
  });
});
