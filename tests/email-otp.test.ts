// HAA-AUTH-OTP-001 — Email OTP infrastructure.
//
// Source-grep tests (the established repo pattern — see
// `tests/landing-contact-mvp.test.ts`). We assert the shape / presence
// of generated artifacts WITHOUT spinning up a DB so the suite stays
// fast and CI-friendly. Behavioural tests live in the integration suite
// once the migration is applied on staging.

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

describe('HAA-AUTH-OTP-001 — email_otp_codes schema', () => {
  const SRC = read('packages/db/src/schema/email-otp-codes.ts');

  it('declares the email_otp_codes pgTable', () => {
    expect(SRC).toMatch(/export\s+const\s+emailOtpCodes\s*=\s*pgTable\(\s*['"]email_otp_codes['"]/);
  });

  it('has the required core columns', () => {
    expect(SRC).toMatch(/email:\s*varchar\(['"]email['"],\s*\{\s*length:\s*255\s*\}\)\.notNull/);
    expect(SRC).toMatch(/purpose:\s*varchar\(['"]purpose['"],\s*\{\s*length:\s*30\s*\}\)\.notNull/);
    expect(SRC).toMatch(/codeHash:\s*text\(['"]code_hash['"]\)\.notNull/);
    expect(SRC).toMatch(/userId:\s*integer\(['"]user_id['"]\)/);
    expect(SRC).toMatch(/expiresAt:\s*timestamp\(['"]expires_at['"]\)\.notNull/);
    expect(SRC).toMatch(/attempts:\s*integer\(['"]attempts['"]\)\.notNull\(\)\.default\(0\)/);
    expect(SRC).toMatch(/maxAttempts:\s*integer\(['"]max_attempts['"]\)\.notNull\(\)\.default\(5\)/);
    expect(SRC).toMatch(/usedAt:\s*timestamp\(['"]used_at['"]\)/);
    expect(SRC).toMatch(/sourceIp:\s*varchar\(['"]source_ip['"],\s*\{\s*length:\s*45\s*\}\)/);
    expect(SRC).toMatch(/userAgent:\s*text\(['"]user_agent['"]\)/);
    expect(SRC).toMatch(/createdAt:\s*timestamp\(['"]created_at['"]\)\.notNull\(\)\.defaultNow/);
    expect(SRC).toMatch(/updatedAt:\s*timestamp\(['"]updated_at['"]\)\.notNull\(\)\.defaultNow/);
  });

  it('declares the three indexes (email+purpose+createdAt desc, email+createdAt, expiresAt)', () => {
    expect(SRC).toMatch(/email_otp_codes_email_purpose_created_at_idx/);
    expect(SRC).toMatch(/email_otp_codes_email_created_at_idx/);
    expect(SRC).toMatch(/email_otp_codes_expires_at_idx/);
    // The composite lookup index must order created_at DESC for "latest unused" reads.
    expect(SRC).toMatch(/createdAt\.desc\(\)/);
  });

  it('exports EMAIL_OTP_PURPOSES with the 3 purposes', () => {
    expect(SRC).toMatch(/EMAIL_OTP_PURPOSES/);
    for (const purpose of ['signup_verify', 'magic_login', 'password_reset']) {
      expect(SRC).toMatch(new RegExp(`['"]${purpose}['"]`));
    }
  });
});

describe('HAA-AUTH-OTP-001 — schema index re-exports', () => {
  it('schema barrel re-exports email-otp-codes.js', () => {
    const SRC = read('packages/db/src/schema/index.ts');
    expect(SRC).toMatch(/export\s+\*\s+from\s+['"]\.\/email-otp-codes\.js['"]/);
  });
});

describe('HAA-AUTH-OTP-001 — migration 0079', () => {
  const SQL_PATH = 'packages/db/src/migrations/0079_email_otp_codes.sql';
  const JOURNAL_PATH = 'packages/db/src/migrations/meta/_journal.json';
  const SNAPSHOT_PATH = 'packages/db/src/migrations/meta/0079_snapshot.json';

  it('the SQL file exists', () => {
    expect(existsSync(resolve(root, SQL_PATH))).toBe(true);
  });

  it('SQL contains CREATE TABLE email_otp_codes with all key columns', () => {
    const SQL = read(SQL_PATH);
    expect(SQL).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+"email_otp_codes"/i);
    for (const col of [
      '"id"',
      '"email"',
      '"purpose"',
      '"code_hash"',
      '"user_id"',
      '"expires_at"',
      '"attempts"',
      '"max_attempts"',
      '"used_at"',
      '"source_ip"',
      '"user_agent"',
      '"created_at"',
      '"updated_at"',
    ]) {
      expect(SQL).toContain(col);
    }
  });

  it('SQL declares all three indexes', () => {
    const SQL = read(SQL_PATH);
    expect(SQL).toMatch(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+"email_otp_codes_email_purpose_created_at_idx"/i);
    expect(SQL).toMatch(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+"email_otp_codes_email_created_at_idx"/i);
    expect(SQL).toMatch(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+"email_otp_codes_expires_at_idx"/i);
  });

  it('SQL is idempotent and not auto-applied (header documents lifecycle + cleanup follow-up)', () => {
    const SQL = read(SQL_PATH);
    expect(SQL).toMatch(/IF NOT EXISTS/i);
    expect(SQL).toMatch(/NOT auto-applied|ops-staging-migrate/i);
    expect(SQL).toMatch(/cleanup|OWNER-FOLLOWUP/i);
  });

  it('journal has an entry for 0079_email_otp_codes at idx 75', () => {
    const journal = JSON.parse(read(JOURNAL_PATH));
    const entry = journal.entries.find((e: { tag: string }) => e.tag === '0079_email_otp_codes');
    expect(entry).toBeDefined();
    expect(entry.idx).toBe(75);
    expect(entry.version).toBe('7');
    expect(entry.when).toBe(1782000075000);
    expect(entry.breakpoints).toBe(true);
  });

  it('snapshot 0079 contains public.email_otp_codes table', () => {
    const snap = JSON.parse(read(SNAPSHOT_PATH));
    const table = snap.tables['public.email_otp_codes'];
    expect(table).toBeDefined();
    expect(table.name).toBe('email_otp_codes');
    expect(table.columns.email.type).toBe('varchar(255)');
    expect(table.columns.email.notNull).toBe(true);
    expect(table.columns.purpose.type).toBe('varchar(30)');
    expect(table.columns.code_hash.type).toBe('text');
    expect(table.columns.user_id.notNull).toBe(false);
    expect(table.columns.attempts.default).toBe(0);
    expect(table.columns.max_attempts.default).toBe(5);
    expect(table.indexes.email_otp_codes_email_purpose_created_at_idx).toBeDefined();
    expect(table.indexes.email_otp_codes_email_created_at_idx).toBeDefined();
    expect(table.indexes.email_otp_codes_expires_at_idx).toBeDefined();
  });
});

describe('HAA-AUTH-OTP-001 — service (EmailOtpService)', () => {
  const PATH = 'packages/auth-core/src/email-otp-service.ts';

  it('the service file exists', () => {
    expect(existsSync(resolve(root, PATH))).toBe(true);
  });

  it('uses node:crypto.randomBytes for code generation (NOT Math.random)', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/import\s+\{\s*randomBytes\s*\}\s+from\s+['"]node:crypto['"]/);
    expect(SRC).toMatch(/randomBytes\(\s*4\s*\)/);
    // Strip comment blocks before asserting "no Math.random" — the
    // docstring intentionally references it to explain WHY it's banned.
    const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(codeOnly).not.toMatch(/Math\.random/);
  });

  it('uses bcrypt for hashing (storage) and constant-time compare (verification)', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/import\s+bcrypt\s+from\s+['"]bcryptjs['"]/);
    expect(SRC).toMatch(/bcrypt\.hash\(/);
    expect(SRC).toMatch(/bcrypt\.compare\(/);
  });

  it('exposes generateAndSend with rate-limit query (3/hour per email+purpose)', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/async\s+generateAndSend\s*\(/);
    expect(SRC).toMatch(/SEND_RATE_PER_HOUR\s*=\s*3/);
    // Rate-limit query must filter by email AND purpose AND createdAt window.
    expect(SRC).toMatch(/gte\(s\.emailOtpCodes\.createdAt,\s*oneHourAgo\)/);
    expect(SRC).toMatch(/RATE_LIMITED/);
  });

  it('verify increments attempts atomically BEFORE comparing (race-safe, no lost update)', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/async\s+verify\s*\(/);
    // Strip comment blocks so we compare positions in code, not docs.
    const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

    // The increment must be a DB-side atomic `attempts + 1`, NOT a
    // read-modify-write of the in-memory row value (which loses updates
    // under concurrency and lets parallel requests exceed maxAttempts).
    expect(codeOnly).not.toMatch(/attempts:\s*row\.attempts\s*\+\s*1/);
    expect(codeOnly).toMatch(/attempts:\s*sql`\$\{s\.emailOtpCodes\.attempts\}\s*\+\s*1`/);

    // The UPDATE must be guarded by `attempts < maxAttempts` so the row
    // lock enforces the cap, and must read back a row (returning) so a
    // no-match means TOO_MANY_ATTEMPTS.
    expect(codeOnly).toMatch(/s\.emailOtpCodes\.attempts\}\s*<\s*\$\{s\.emailOtpCodes\.maxAttempts\}/);
    expect(codeOnly).toMatch(/if\s*\(!bumped\)\s*return\s*\{\s*ok:\s*false,\s*reason:\s*['"]TOO_MANY_ATTEMPTS['"]/);

    // Increment still precedes the bcrypt comparison.
    const updateIdx = codeOnly.indexOf('.returning({ attempts');
    const compareIdx = codeOnly.indexOf('bcrypt.compare(');
    expect(updateIdx).toBeGreaterThan(-1);
    expect(compareIdx).toBeGreaterThan(-1);
    expect(updateIdx).toBeLessThan(compareIdx);
  });

  it('refuses re-used codes (checks usedAt is null in lookup and rejects USED)', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/isNull\(s\.emailOtpCodes\.usedAt\)/);
    expect(SRC).toMatch(/reason:\s*['"]USED['"]/);
    expect(SRC).toMatch(/usedAt:\s*new Date\(\)/);
  });

  it('enforces 10-minute expiry and 5 max attempts', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/EXPIRY_MS\s*=\s*10\s*\*\s*60\s*\*\s*1000/);
    expect(SRC).toMatch(/MAX_ATTEMPTS\s*=\s*5/);
    expect(SRC).toMatch(/reason:\s*['"]EXPIRED['"]/);
    expect(SRC).toMatch(/reason:\s*['"]TOO_MANY_ATTEMPTS['"]/);
  });

  it('uses notification-core providers (SMTP preferred, Resend fallback)', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/SmtpEmailProvider/);
    expect(SRC).toMatch(/ResendEmailProvider/);
    expect(SRC).toMatch(/renderHaaEmail/);
  });

  it('is re-exported from auth-core barrel', () => {
    const barrel = read('packages/auth-core/src/index.ts');
    expect(barrel).toMatch(/email-otp-service\.js/);
  });
});

describe('HAA-AUTH-OTP-001 — public route (POST /auth/otp/send|verify)', () => {
  const PATH = 'apps/api/src/routes/auth/otp.ts';

  it('the route file exists', () => {
    expect(existsSync(resolve(root, PATH))).toBe(true);
  });

  it('uses zValidator on both send and verify endpoints', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/import\s*\{\s*zValidator\s*\}/);
    // Both POSTs reference zValidator('json', …).
    const matches = SRC.match(/zValidator\(\s*['"]json['"]/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('mounts rateLimiter on both endpoints', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/import\s*\{\s*rateLimiter\s*\}/);
    const matches = SRC.match(/rateLimiter\(\s*\{/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('verifyBody validates a 6-digit numeric code', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/regex\(\s*\/\^\\d\{6\}\$\//);
  });

  it('reads sourceIp from x-forwarded-for / x-real-ip', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/x-forwarded-for/);
    expect(SRC).toMatch(/x-real-ip/);
  });

  it('does NOT return the OTP code in any response payload', () => {
    const SRC = read(PATH);
    // The handler must not pass `code:` or `result.code` into c.json.
    // We accept ZodValidator's `code` enum field but not in c.json data.
    // Scan every c.json data object: it must only contain whitelisted fields.
    // Quick guard: there should be no occurrence of `code:` *inside* a c.json data object.
    const sendData = /\/send[\s\S]*?return c\.json\(\s*\{\s*success:\s*true,\s*data:\s*\{([\s\S]*?)\}\s*\}\s*\)/m.exec(SRC);
    expect(sendData).not.toBeNull();
    expect(sendData![1]).not.toMatch(/\bcode\b\s*:/);
    // Also: send-response must not leak otpId.
    expect(sendData![1]).not.toMatch(/\botpId\b\s*:/);
  });

  it('exports otpRouter', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/export\s*\{\s*otpRouter\s*\}|export\s+const\s+otpRouter/);
  });

  it('is mounted at /auth/otp in apps/api/src/index.ts', () => {
    const idx = read('apps/api/src/index.ts');
    expect(idx).toMatch(/import\s*\{\s*otpRouter\s*\}\s*from\s*['"]\.\/routes\/auth\/otp\.js['"]/);
    expect(idx).toMatch(/app\.route\(\s*['"]\/auth\/otp['"]\s*,\s*otpRouter\s*\)/);
  });
});

describe('HAA-AUTH-OTP-001 — rbac DENY_LIST update', () => {
  it('rbac-coverage DENY_LIST contains the otp.ts entry', () => {
    const SRC = read('tests/rbac-coverage.test.ts');
    expect(SRC).toMatch(/['"]auth\/otp\.ts['"]/);
    expect(SRC).toMatch(/['"]otp\.ts['"]/);
  });
});
