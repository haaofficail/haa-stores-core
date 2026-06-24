// HAA-LAND-001 — Landing Contact MVP backend.
//
// Source-grep tests (the established repo pattern — see
// `tests/webhook-dedup-race-recovery.test.ts`). We assert the shape /
// presence of generated artifacts WITHOUT spinning up a DB so the suite
// stays fast and CI-friendly. Behaviour tests live in the service-level
// integration suite once the migration is applied on staging.

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

describe('HAA-LAND-001 — landing_contacts schema', () => {
  const SRC = read('packages/db/src/schema/landing-contacts.ts');

  it('declares the landing_contacts pgTable', () => {
    expect(SRC).toMatch(/export\s+const\s+landingContacts\s*=\s*pgTable\(\s*['"]landing_contacts['"]/);
  });

  it('has the required submitter columns', () => {
    expect(SRC).toMatch(/name:\s*varchar\(['"]name['"],\s*\{\s*length:\s*120\s*\}\)\.notNull/);
    expect(SRC).toMatch(/email:\s*varchar\(['"]email['"],\s*\{\s*length:\s*255\s*\}\)\.notNull/);
    expect(SRC).toMatch(/phone:\s*varchar\(['"]phone['"],\s*\{\s*length:\s*30\s*\}\)/);
    expect(SRC).toMatch(/message:\s*text\(['"]message['"]\)\.notNull/);
  });

  it('has the audit context columns (source_ip, user_agent)', () => {
    expect(SRC).toMatch(/sourceIp:\s*varchar\(['"]source_ip['"],\s*\{\s*length:\s*45\s*\}\)/);
    expect(SRC).toMatch(/userAgent:\s*text\(['"]user_agent['"]\)/);
  });

  it('has the admin-workflow columns + status default "new"', () => {
    expect(SRC).toMatch(/status:\s*varchar\(['"]status['"],\s*\{\s*length:\s*20\s*\}\)\.notNull\(\)\.default\(['"]new['"]\)/);
    expect(SRC).toMatch(/adminUserId:\s*integer\(['"]admin_user_id['"]\)/);
    expect(SRC).toMatch(/adminNotes:\s*text\(['"]admin_notes['"]\)/);
    expect(SRC).toMatch(/repliedAt:\s*timestamp\(['"]replied_at['"]\)/);
  });

  it('declares both indexes used by the admin inbox / analytics', () => {
    expect(SRC).toMatch(/landing_contacts_status_created_at_idx/);
    expect(SRC).toMatch(/landing_contacts_created_at_idx/);
  });

  it('exports LANDING_CONTACT_STATUSES with the 5 lifecycle states', () => {
    expect(SRC).toMatch(/LANDING_CONTACT_STATUSES/);
    for (const status of ['new', 'in_progress', 'replied', 'closed', 'spam']) {
      expect(SRC).toMatch(new RegExp(`['"]${status}['"]`));
    }
  });
});

describe('HAA-LAND-001 — schema index re-exports', () => {
  it('schema barrel re-exports landing-contacts.js', () => {
    const SRC = read('packages/db/src/schema/index.ts');
    expect(SRC).toMatch(/export\s+\*\s+from\s+['"]\.\/landing-contacts\.js['"]/);
  });
});

describe('HAA-LAND-001 — migration 0078', () => {
  const SQL_PATH = 'packages/db/src/migrations/0078_landing_contacts.sql';
  const JOURNAL_PATH = 'packages/db/src/migrations/meta/_journal.json';
  const SNAPSHOT_PATH = 'packages/db/src/migrations/meta/0078_snapshot.json';

  it('the SQL file exists', () => {
    expect(existsSync(resolve(root, SQL_PATH))).toBe(true);
  });

  it('SQL contains CREATE TABLE landing_contacts with all key columns', () => {
    const SQL = read(SQL_PATH);
    expect(SQL).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+"landing_contacts"/i);
    for (const col of ['"id"', '"name"', '"email"', '"phone"', '"message"',
      '"source_ip"', '"user_agent"', '"status"', '"admin_user_id"',
      '"admin_notes"', '"replied_at"', '"created_at"', '"updated_at"']) {
      expect(SQL).toContain(col);
    }
  });

  it('SQL declares both indexes (status+created_at composite, created_at)', () => {
    const SQL = read(SQL_PATH);
    expect(SQL).toMatch(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+"landing_contacts_status_created_at_idx"/i);
    expect(SQL).toMatch(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+"landing_contacts_created_at_idx"/i);
  });

  it('SQL is idempotent and not auto-applied (header documents lifecycle)', () => {
    const SQL = read(SQL_PATH);
    expect(SQL).toMatch(/IF NOT EXISTS/i);
    expect(SQL).toMatch(/NOT auto-applied|ops-staging-migrate/i);
  });

  it('journal has an entry for 0078_landing_contacts at idx 74', () => {
    const journal = JSON.parse(read(JOURNAL_PATH));
    const entry = journal.entries.find((e: { tag: string }) => e.tag === '0078_landing_contacts');
    expect(entry).toBeDefined();
    expect(entry.idx).toBe(74);
    expect(entry.version).toBe('7');
    expect(entry.breakpoints).toBe(true);
    expect(typeof entry.when).toBe('number');
  });

  it('snapshot 0078 contains public.landing_contacts table', () => {
    const snap = JSON.parse(read(SNAPSHOT_PATH));
    const table = snap.tables['public.landing_contacts'];
    expect(table).toBeDefined();
    expect(table.name).toBe('landing_contacts');
    // Spot-check a few columns and both indexes.
    expect(table.columns.email.type).toBe('varchar(255)');
    expect(table.columns.email.notNull).toBe(true);
    expect(table.columns.status.default).toBe("'new'");
    expect(table.indexes.landing_contacts_status_created_at_idx).toBeDefined();
    expect(table.indexes.landing_contacts_created_at_idx).toBeDefined();
  });
});

describe('HAA-LAND-001 — service (LandingContactsService)', () => {
  const PATH = 'packages/commerce-core/src/landing-contacts-service.ts';
  let SRC: string;

  it('the service file exists', () => {
    expect(existsSync(resolve(root, PATH))).toBe(true);
    SRC = read(PATH);
  });

  it('exposes create / list / getById / update / countRecentByIp', () => {
    SRC ??= read(PATH);
    expect(SRC).toMatch(/async\s+create\s*\(/);
    expect(SRC).toMatch(/async\s+list\s*\(/);
    expect(SRC).toMatch(/async\s+getById\s*\(/);
    expect(SRC).toMatch(/async\s+update\s*\(/);
    expect(SRC).toMatch(/async\s+countRecentByIp\s*\(/);
  });

  it('create() trims inputs and rejects empty-after-trim values', () => {
    SRC ??= read(PATH);
    expect(SRC).toMatch(/input\.name\.trim\(\)/);
    expect(SRC).toMatch(/input\.email\.trim\(\)\.toLowerCase\(\)/);
    expect(SRC).toMatch(/input\.message\.trim\(\)/);
    expect(SRC).toMatch(/VALIDATION_ERROR/);
  });

  it('update() stamps repliedAt when status moves to "replied"', () => {
    SRC ??= read(PATH);
    expect(SRC).toMatch(/status\s*===\s*['"]replied['"]/);
    expect(SRC).toMatch(/patch\.repliedAt\s*=\s*new Date\(\)/);
  });

  it('countRecentByIp defaults to a 60-minute window', () => {
    SRC ??= read(PATH);
    expect(SRC).toMatch(/sinceMs[^=]*=\s*60\s*\*\s*60\s*\*\s*1000/);
  });

  it('is re-exported from commerce-core barrel', () => {
    const barrel = read('packages/commerce-core/src/index.ts');
    expect(barrel).toMatch(/LandingContactsService/);
    expect(barrel).toMatch(/LANDING_CONTACT_STATUSES/);
    expect(barrel).toMatch(/from\s+['"]\.\/landing-contacts-service\.js['"]/);
  });
});

describe('HAA-LAND-001 — public route (POST /landing/contact)', () => {
  const PATH = 'apps/api/src/routes/landing.ts';

  it('the route file exists', () => {
    expect(existsSync(resolve(root, PATH))).toBe(true);
  });

  it('mounts rateLimiter at 5 requests/hour', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/import\s*\{\s*rateLimiter\s*\}/);
    expect(SRC).toMatch(/rateLimiter\(\s*\{[\s\S]*?maxRequests:\s*5[\s\S]*?\}\s*\)/);
    expect(SRC).toMatch(/windowMs:\s*60\s*\*\s*60\s*\*\s*1000/);
  });

  it('uses zValidator with a honeypot field "website" capped at max(0)', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/zValidator\(\s*['"]json['"]/);
    expect(SRC).toMatch(/website:\s*z\.string\(\)\.max\(0\)/);
  });

  it('silently absorbs honeypot trips (returns success without persisting)', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/body\.website[\s\S]*?body\.website\.length\s*>\s*0/);
  });

  it('reads sourceIp from x-forwarded-for / x-real-ip', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/x-forwarded-for/);
    expect(SRC).toMatch(/x-real-ip/);
  });

  it('has app-layer 5/hour defense-in-depth via countRecentByIp', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/countRecentByIp\(/);
    expect(SRC).toMatch(/recent\s*>=\s*5/);
    expect(SRC).toMatch(/RATE_LIMITED/);
  });

  it('returns 400 on VALIDATION_ERROR thrown by the service', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/VALIDATION_ERROR/);
    expect(SRC).toMatch(/\}\s*,\s*400\s*\)/);
  });

  it('fire-and-forget admin notification — never blocks the response', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/void\s+notifyAdmin\(/);
    expect(SRC).toMatch(/\.catch\(/);
  });

  it('admin email goes through ResendEmailProvider (platform-level)', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/ResendEmailProvider/);
  });

  it('is mounted at /landing in apps/api/src/index.ts', () => {
    const idx = read('apps/api/src/index.ts');
    expect(idx).toMatch(/import\s*\{\s*landingRouter\s*\}\s*from\s*['"]\.\/routes\/landing\.js['"]/);
    expect(idx).toMatch(/app\.route\(\s*['"]\/landing['"]\s*,\s*landingRouter\s*\)/);
  });
});

describe('HAA-LAND-001 — admin routes (/admin/landing-contacts/*)', () => {
  const PATH = 'apps/api/src/routes/admin/landing-contacts.ts';

  it('the admin route file exists', () => {
    expect(existsSync(resolve(root, PATH))).toBe(true);
  });

  it('exports list / get / patch handlers and Zod schemas', () => {
    const SRC = read(PATH);
    expect(SRC).toMatch(/export\s+(async\s+)?function\s+listLandingContacts/);
    expect(SRC).toMatch(/export\s+(async\s+)?function\s+getLandingContact/);
    expect(SRC).toMatch(/export\s+(async\s+)?function\s+patchLandingContact/);
    expect(SRC).toMatch(/listLandingContactsQuerySchema/);
    expect(SRC).toMatch(/patchLandingContactBodySchema/);
  });

  it('reads adminAuth from context for the audit trail (adminUserId)', () => {
    const SRC = read(PATH);
    // Either `c.get('adminAuth')` or the cast form `(c as Context).get('adminAuth')`.
    expect(SRC).toMatch(/\.get\(\s*['"]adminAuth['"]\s*\)/);
    expect(SRC).toMatch(/adminUserId/);
  });

  it('admin aggregator wires routes behind requireAdminAuth + requireAdminPermission', () => {
    const SRC = read('apps/api/src/routes/admin/index.ts');
    expect(SRC).toMatch(/listLandingContacts/);
    expect(SRC).toMatch(/patchLandingContact/);
    expect(SRC).toMatch(/requireAdminPermission\(\s*['"]landing_contacts\.read['"]\s*\)/);
    expect(SRC).toMatch(/requireAdminPermission\(\s*['"]landing_contacts\.update['"]\s*\)/);
    expect(SRC).toMatch(/adminRouter\.get\(\s*['"]\/landing-contacts['"]/);
    expect(SRC).toMatch(/adminRouter\.get\(\s*['"]\/landing-contacts\/:id['"]/);
    expect(SRC).toMatch(/adminRouter\.patch\(\s*['"]\/landing-contacts\/:id['"]/);
  });
});
