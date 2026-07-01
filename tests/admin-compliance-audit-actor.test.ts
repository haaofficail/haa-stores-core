// P1-8 audit fix — tenant compliance-field audit log always recorded a
// null actor.
//
// apps/api/src/routes/admin/tenants-stores.ts read `c.get('admin')?.id`
// when logging compliance-field changes (CR/VAT/ASV/pentest etc.), but
// the admin auth middleware (packages/auth-core/src/admin.ts) sets the
// context key 'adminAuth' with a `userId` field, not 'admin'/'id'. Every
// compliance change was therefore logged with `adminId: undefined` —
// defeating the audit trail's regulatory purpose (NCA/ZATCA).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROUTE = readFileSync(
  resolve(__dirname, '../apps/api/src/routes/admin/tenants-stores.ts'),
  'utf-8',
);

describe('tenant compliance-update audit log actor', () => {
  it('reads the admin id from the real context key (adminAuth.userId)', () => {
    expect(ROUTE).toMatch(/adminId:\s*c\.get\(['"]adminAuth['"]\)\?\.\s*userId/);
  });

  it('never reads the nonexistent "admin" context key again', () => {
    expect(ROUTE).not.toMatch(/c\.get\(['"]admin['"]\)/);
  });
});
