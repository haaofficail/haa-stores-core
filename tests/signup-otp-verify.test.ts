// HAA-AUTH-SIGNUP-VERIFY — wire the existing email OTP infrastructure
// into the signup flow. Source-grep guards (same pattern as
// tests/email-otp.test.ts + tests/phone-first-registration.test.ts) so
// the suite stays fast and CI-friendly. Behavioural integration
// coverage lands once migration 0081 is applied on staging.

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

describe('HAA-AUTH-SIGNUP-VERIFY — users schema column', () => {
  const PATH = 'packages/db/src/schema/users.ts';

  it('declares the emailVerifiedAt timestamp column (nullable)', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(
      /emailVerifiedAt:\s*timestamp\(\s*['"]email_verified_at['"]\s*\)(?!\.notNull)/,
    );
  });

  it('emailVerifiedAt is NOT marked notNull anywhere on that line', () => {
    const SRC = read(PATH);
    const line = SRC.split('\n').find((l) => l.includes('emailVerifiedAt:'));
    expect(line).toBeDefined();
    expect(line!).not.toMatch(/notNull\(\)/);
  });
});

describe('HAA-AUTH-SIGNUP-VERIFY — migration 0081', () => {
  const SQL_PATH = 'packages/db/src/migrations/0081_users_email_verified_at.sql';
  const JOURNAL_PATH = 'packages/db/src/migrations/meta/_journal.json';
  const SNAPSHOT_PATH = 'packages/db/src/migrations/meta/0081_snapshot.json';

  it('the SQL file exists', () => {
    expect(existsSync(resolve(root, SQL_PATH))).toBe(true);
  });

  it('SQL has the ALTER TABLE adding email_verified_at as a timestamp', () => {
    const SQL = read(SQL_PATH);
    expect(SQL).toMatch(/ALTER\s+TABLE\s+"users"\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+"email_verified_at"\s+timestamp/i);
  });

  it('SQL is idempotent and not auto-applied', () => {
    const SQL = read(SQL_PATH);
    expect(SQL).toMatch(/IF\s+NOT\s+EXISTS/i);
    expect(SQL).toMatch(/NOT auto-applied|ops-staging-migrate/i);
  });

  it('journal has an entry for 0081_users_email_verified_at at idx 77', () => {
    const journal = JSON.parse(read(JOURNAL_PATH));
    const entry = journal.entries.find(
      (e: { tag: string }) => e.tag === '0081_users_email_verified_at',
    );
    expect(entry).toBeDefined();
    expect(entry.idx).toBe(77);
    expect(entry.version).toBe('7');
    expect(entry.when).toBe(1782000077000);
    expect(entry.breakpoints).toBe(true);
  });

  it('snapshot 0081 records the email_verified_at column on public.users', () => {
    const snap = JSON.parse(read(SNAPSHOT_PATH));
    const users = snap.tables['public.users'];
    expect(users).toBeDefined();
    expect(users.columns.email_verified_at).toBeDefined();
    expect(users.columns.email_verified_at.type).toBe('timestamp');
    expect(users.columns.email_verified_at.notNull).toBe(false);
  });
});

describe('HAA-AUTH-SIGNUP-VERIFY — AuthFlowService (register)', () => {
  const PATH = 'packages/commerce-core/src/auth-flow.ts';

  it('imports EmailOtpService from @haa/auth-core', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/import\s*\{[^}]*EmailOtpService[^}]*\}\s*from\s*['"]@haa\/auth-core['"]/);
  });

  it("register() calls EmailOtpService.generateAndSend with purpose 'signup_verify'", () => {
    const SRC = read(PATH);
    // Strip comments so the assertion targets executable code.
    const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(codeOnly).toMatch(/generateAndSend\(\s*\{[\s\S]*?purpose:\s*['"]signup_verify['"]/);
    // And it must happen inside (or right after) the register() body —
    // we approximate by requiring the OTP call to occur before the
    // start of the next method definition.
    const regIdx = codeOnly.indexOf('async register(');
    const otpIdx = codeOnly.indexOf("purpose: 'signup_verify'");
    expect(regIdx).toBeGreaterThan(-1);
    expect(otpIdx).toBeGreaterThan(regIdx);
  });

  it('register() returns verificationRequired: true on success', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/verificationRequired:\s*true/);
  });
});

describe('HAA-AUTH-SIGNUP-VERIFY — AuthFlowService (verifySignup)', () => {
  const PATH = 'packages/commerce-core/src/auth-flow.ts';

  it('verifySignup() method exists', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/async\s+verifySignup\s*\(/);
  });

  it("verifySignup() calls EmailOtpService.verify with purpose 'signup_verify'", () => {
    const SRC = read(PATH);
    const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const verifyIdx = codeOnly.indexOf('verifySignup');
    expect(verifyIdx).toBeGreaterThan(-1);
    // The body must invoke otpService.verify with the signup_verify purpose.
    const after = codeOnly.slice(verifyIdx);
    expect(after).toMatch(/\.verify\(\s*\{[\s\S]*?purpose:\s*['"]signup_verify['"]/);
  });

  it('verifySignup() updates email_verified_at to a fresh timestamp', () => {
    const SRC = read(PATH);
    const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const verifyIdx = codeOnly.indexOf('async verifySignup');
    expect(verifyIdx).toBeGreaterThan(-1);
    // Strip comments and look for an UPDATE of emailVerifiedAt after the
    // verifySignup() opening.
    const body = codeOnly.slice(verifyIdx);
    expect(body).toMatch(/\.set\(\s*\{[^}]*emailVerifiedAt:\s*now/);
  });

  it('verifySignup() returns ALREADY_VERIFIED when email_verified_at is non-null', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/reason:\s*['"]ALREADY_VERIFIED['"]/);
  });
});

describe('HAA-AUTH-SIGNUP-VERIFY — AuthFlowService (login guard)', () => {
  const PATH = 'packages/commerce-core/src/auth-flow.ts';

  it('login() has an email_not_verified branch', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/kind:\s*['"]email_not_verified['"]/);
  });

  it('login() honors the AUTH_LEGACY_VERIFIED env flag', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/process\.env\.AUTH_LEGACY_VERIFIED\s*===\s*['"]1['"]/);
    // And the guard must short-circuit when the flag is on.
    expect(SRC).toMatch(/TREAT_LEGACY_AS_VERIFIED/);
    const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(codeOnly).toMatch(
      /if\s*\(\s*user\.emailVerifiedAt\s*===\s*null\s*&&\s*!TREAT_LEGACY_AS_VERIFIED\s*\)/,
    );
  });
});

describe('HAA-AUTH-SIGNUP-VERIFY — AuthFlowService (resendSignupOtp)', () => {
  const PATH = 'packages/commerce-core/src/auth-flow.ts';

  it('resendSignupOtp() method exists', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/async\s+resendSignupOtp\s*\(/);
  });

  it('resendSignupOtp() guards on ALREADY_VERIFIED and NOT_FOUND', () => {
    const SRC = read(PATH);
    const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const idx = codeOnly.indexOf('async resendSignupOtp');
    expect(idx).toBeGreaterThan(-1);
    const body = codeOnly.slice(idx, idx + 4000);
    expect(body).toMatch(/reason:\s*['"]ALREADY_VERIFIED['"]/);
    expect(body).toMatch(/reason:\s*['"]NOT_FOUND['"]/);
    expect(body).toMatch(/reason:\s*['"]RATE_LIMITED['"]/);
  });
});

describe('HAA-AUTH-SIGNUP-VERIFY — auth route', () => {
  const PATH = 'apps/api/src/routes/auth.ts';

  it('the route file imports rateLimiter and zod', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/import\s*\{\s*rateLimiter\s*\}\s*from\s*['"]\.\.\/middleware\/rate-limiter\.js['"]/);
    expect(SRC).toMatch(/import\s*\{\s*z\s*\}\s*from\s*['"]zod['"]/);
  });

  it('defines POST /signup/verify', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/authRouter\.post\(\s*['"]\/signup\/verify['"]/);
  });

  it('defines POST /signup/resend-otp', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/authRouter\.post\(\s*['"]\/signup\/resend-otp['"]/);
  });

  it('both signup routes are guarded by rateLimiter middleware', () => {
    const SRC = read(PATH);
    // Slice from /signup/verify to the start of /logout so we only
    // scan the new routes' definition blocks.
    const verifyIdx = SRC.indexOf("'/signup/verify'");
    const logoutIdx = SRC.indexOf("'/logout'", verifyIdx);
    expect(verifyIdx).toBeGreaterThan(-1);
    expect(logoutIdx).toBeGreaterThan(verifyIdx);
    const block = SRC.slice(verifyIdx, logoutIdx);
    // Each of /signup/verify and /signup/resend-otp must mount
    // rateLimiter at least once.
    const matches = block.match(/rateLimiter\(\s*\{/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('verify route validates a 6-digit numeric code', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/regex\(\s*\/\^\\d\{6\}\$\//);
  });

  it("login() maps email_not_verified to 403 with code 'EMAIL_NOT_VERIFIED'", () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/result\.kind\s*===\s*['"]email_not_verified['"]/);
    expect(SRC).toMatch(/code:\s*['"]EMAIL_NOT_VERIFIED['"]/);
    expect(SRC).toMatch(/EMAIL_NOT_VERIFIED[\s\S]{0,200}403/);
  });

  it('register response includes verificationRequired flag', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/verificationRequired:\s*result\.verificationRequired/);
  });

  it('resend-otp response does NOT return 404 for unknown emails (no enumeration)', () => {
    const SRC = read(PATH);
    // Slice the resend-otp handler.
    const resendIdx = SRC.indexOf("'/signup/resend-otp'");
    expect(resendIdx).toBeGreaterThan(-1);
    const after = SRC.slice(resendIdx);
    // The handler body ends at the next authRouter.post(... or the
    // module's bottom — we cap at 6000 chars to stay inside one route.
    const block = after.slice(0, 6000);
    // 404 must never appear in this block — only 429 (rate limit) and
    // uniform 200 are allowed.
    expect(block).not.toMatch(/,\s*404\s*\)/);
    // And the success payload must NOT contain `sent: true` or any
    // existence-revealing flag — only a generic Arabic message.
    expect(block).toMatch(/إن\s+وُجد\s+حساب/);
  });
});
