// HAA-AUTH-PHONE-001 — Phone-first registration source-grep guards.
//
// Mirrors the pattern in `tests/email-otp.test.ts`: we assert the
// shape / presence of artifacts WITHOUT spinning up a DB so the suite
// stays fast. Behavioural integration coverage lands once the
// migration is applied on staging.

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

describe('HAA-AUTH-PHONE-001 — phone helper', () => {
  const PATH = 'packages/shared/src/phone.ts';

  it('the helper file exists', () => {
    expect(existsSync(resolve(root, PATH))).toBe(true);
  });

  it('exports normalizeSaudiPhone and isValidSaudiPhone', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/export\s+function\s+normalizeSaudiPhone\s*\(/);
    expect(SRC).toMatch(/export\s+function\s+isValidSaudiPhone\s*\(/);
  });

  it('is re-exported from the shared barrel', () => {
    const barrel = read('packages/shared/src/index.ts');
    expect(barrel).toMatch(/export\s+\*\s+from\s+['"]\.\/phone\.js['"]/);
  });
});

describe('HAA-AUTH-PHONE-001 — migration 0080', () => {
  const SQL_PATH = 'packages/db/src/migrations/0080_users_phone_unique.sql';
  const JOURNAL_PATH = 'packages/db/src/migrations/meta/_journal.json';
  const SNAPSHOT_PATH = 'packages/db/src/migrations/meta/0080_snapshot.json';

  it('the SQL file exists', () => {
    expect(existsSync(resolve(root, SQL_PATH))).toBe(true);
  });

  it('SQL creates a partial UNIQUE index on users.phone', () => {
    const SQL = read(SQL_PATH);
    expect(SQL).toMatch(/CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+"users_phone_unique"/i);
    expect(SQL).toMatch(/ON\s+"users"\s*\(\s*"phone"\s*\)/i);
    // Partial index — only non-NULL values must be unique. Without
    // the WHERE clause legacy NULL-phone rows would collide on a
    // strict UNIQUE.
    expect(SQL).toMatch(/WHERE\s+"phone"\s+IS\s+NOT\s+NULL/i);
  });

  it('SQL is idempotent and not auto-applied', () => {
    const SQL = read(SQL_PATH);
    expect(SQL).toMatch(/IF NOT EXISTS/i);
    expect(SQL).toMatch(/NOT auto-applied|ops-staging-migrate/i);
  });

  it('journal has an entry for 0080_users_phone_unique at idx 76', () => {
    const journal = JSON.parse(read(JOURNAL_PATH));
    const entry = journal.entries.find(
      (e: { tag: string }) => e.tag === '0080_users_phone_unique',
    );
    expect(entry).toBeDefined();
    expect(entry.idx).toBe(76);
    expect(entry.version).toBe('7');
    expect(entry.when).toBe(1782000076000);
    expect(entry.breakpoints).toBe(true);
  });

  it('snapshot 0080 records the users_phone_unique index', () => {
    const snap = JSON.parse(read(SNAPSHOT_PATH));
    const users = snap.tables['public.users'];
    expect(users).toBeDefined();
    expect(users.indexes.users_phone_unique).toBeDefined();
    expect(users.indexes.users_phone_unique.isUnique).toBe(true);
    expect(users.indexes.users_phone_unique.where).toMatch(/phone.*IS NOT NULL/i);
  });
});

describe('HAA-AUTH-PHONE-001 — zod schema changes', () => {
  const PATH = 'packages/shared/src/schemas/index.ts';

  it('registerSchema includes a required phone field', () => {
    const SRC = read(PATH);
    // Pull out the registerSchema object literal.
    const block = /export\s+const\s+registerSchema\s*=\s*z\.object\(\{([\s\S]*?)\}\);/.exec(SRC);
    expect(block).not.toBeNull();
    // The phone line must NOT be `.optional()` — phone is now required.
    expect(block![1]).toMatch(/phone:\s*z\.string\(\)\.min\(1[^)]*\)(?!\s*\.optional\(\))/);
    // And it must NOT be marked optional anywhere on that line.
    const phoneLine = block![1].split('\n').find((l) => /\bphone:/.test(l));
    expect(phoneLine).toBeDefined();
    expect(phoneLine!).not.toMatch(/optional\(\)/);
  });

  it('loginSchema accepts identifier (canonical) and legacy email / phone aliases', () => {
    const SRC = read(PATH);
    const block = /export\s+const\s+loginSchema\s*=\s*z\.object\(\{([\s\S]*?)\}\);/.exec(SRC);
    expect(block).not.toBeNull();
    expect(block![1]).toMatch(/identifier:\s*z\.string\(\)/);
    expect(block![1]).toMatch(/email:\s*z\.string\(\)/);
    expect(block![1]).toMatch(/phone:\s*z\.string\(\)/);
  });
});

describe('HAA-AUTH-PHONE-001 — AuthFlowService (register)', () => {
  const PATH = 'packages/commerce-core/src/auth-flow.ts';

  it('imports normalizeSaudiPhone from @haa/shared', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/import\s*\{\s*normalizeSaudiPhone\s*\}\s*from\s*['"]@haa\/shared['"]/);
  });

  it('register() normalizes the phone BEFORE the existing-user lookup', () => {
    const SRC = read(PATH);
    // The first call to normalizeSaudiPhone() must occur before the
    // `db.transaction` call — that's the only ordering that guarantees
    // the same canonical phone is checked AND inserted.
    const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const normIdx = codeOnly.indexOf('normalizeSaudiPhone(');
    const txIdx = codeOnly.indexOf('this.db.transaction');
    expect(normIdx).toBeGreaterThan(-1);
    expect(txIdx).toBeGreaterThan(-1);
    expect(normIdx).toBeLessThan(txIdx);
  });

  it('register() returns invalid_phone when normalization fails', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/kind:\s*['"]invalid_phone['"]/);
  });

  it('register() returns phone_taken on duplicate phone', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/kind:\s*['"]phone_taken['"]/);
    // The duplicate-check query must lookup by users.phone.
    expect(SRC).toMatch(/eq\(s\.users\.phone,\s*normalizedPhone\)/);
  });
});

describe('HAA-AUTH-PHONE-001 — AuthFlowService (login)', () => {
  const PATH = 'packages/commerce-core/src/auth-flow.ts';

  it('login() accepts identifier and legacy email / phone aliases', () => {
    const SRC = read(PATH);
    // The LoginInput interface or the function body must mention all
    // three — identifier (canonical) + email + phone (legacy).
    expect(SRC).toMatch(/identifier\?:\s*string/);
    expect(SRC).toMatch(/email\?:\s*string/);
    expect(SRC).toMatch(/phone\?:\s*string/);
    // And the lookup must consult normalizeSaudiPhone on the identifier
    // (not just email).
    expect(SRC).toMatch(/normalizeSaudiPhone\(rawIdentifier\)/);
  });

  it('login() returns a generic INVALID_CREDENTIALS without leaking which field failed', () => {
    const SRC = read(PATH);
    const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    // Both the "no user found" branch and the "wrong password" branch
    // must return `kind: 'invalid_credentials'`. The legacy code used
    // "Invalid email or password" which both leaked the schema AND
    // would now be wrong (login also accepts phones). The new code
    // must use a generic message — we just assert no field-specific
    // message survives.
    expect(codeOnly).not.toMatch(/Invalid email or password/);
    // At least 2 invalid_credentials returns (missing user + wrong pw).
    const hits = codeOnly.match(/kind:\s*['"]invalid_credentials['"]/g) ?? [];
    expect(hits.length).toBeGreaterThanOrEqual(2);
  });
});

describe('HAA-AUTH-PHONE-001 — auth route mapping', () => {
  const PATH = 'apps/api/src/routes/auth.ts';

  it("maps phone_taken to 409 with code 'PHONE_TAKEN'", () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/result\.kind\s*===\s*['"]phone_taken['"]/);
    expect(SRC).toMatch(/code:\s*['"]PHONE_TAKEN['"]/);
    // 409 must appear in the same vicinity. Loose check — full
    // structural assertion is in the e2e suite.
    expect(SRC).toMatch(/PHONE_TAKEN[\s\S]{0,200}409/);
  });

  it("maps invalid_phone to 400 with code 'INVALID_PHONE'", () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/result\.kind\s*===\s*['"]invalid_phone['"]/);
    expect(SRC).toMatch(/code:\s*['"]INVALID_PHONE['"]/);
    expect(SRC).toMatch(/INVALID_PHONE[\s\S]{0,200}400/);
  });

  it('forwards identifier + legacy email/phone to the service', () => {
    const SRC = read(PATH);
    // The login route must pass all three so the service can pick.
    expect(SRC).toMatch(/identifier:\s*body\.identifier/);
    expect(SRC).toMatch(/email:\s*body\.email/);
    expect(SRC).toMatch(/phone:\s*body\.phone/);
  });

  it('register route returns Arabic phone messages from the service (does not hardcode English)', () => {
    const SRC = read(PATH);
    // We pass `result.message` straight through — the Arabic copy
    // lives in the service, not the route. If a future PR hardcodes
    // an English string in the route this test catches it.
    //
    // We capture from the kind check through the closing `)` of the
    // c.json(...) call so the `message:` line is in scope.
    const block = /result\.kind\s*===\s*['"](invalid_phone|phone_taken)['"][\s\S]*?\},\s*\d{3}\s*,?\s*\)/g;
    const matches = SRC.match(block) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
    // Both branches must reference `result.message` (Arabic from the
    // service), not a hardcoded English literal.
    for (const m of matches) {
      expect(m).toMatch(/result\.message/);
    }
  });
});
