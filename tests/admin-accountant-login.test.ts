import { beforeAll, describe, expect, it } from 'vitest';
import { AdminAuthService, hashPassword } from '@haa/auth-core';
import { getAdminPermissionsForRole } from '@haa/shared';

/** Decode a JWT payload without verifying — we only assert the claims. */
function decodeJwtPayload(token: string): { permissions: string[]; twoFactorEnabled?: boolean } {
  const part = token.split('.')[1];
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

/**
 * Batch 2 — admin login must mint role-scoped JWT permissions.
 *
 * Historically the service hardcoded `['admin:*']` for every admin. After this
 * batch the minted permissions must come from the user's `adminRole`:
 *   - super_admin (or legacy rows with no role) → ['admin:*']
 *   - accountant → finance-only set
 */

beforeAll(() => {
  process.env.ADMIN_JWT_SECRET ??= 'test-admin-secret-for-accountant-batch2';
});

function fakeDbReturning(user: Record<string, unknown>) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [user],
        }),
      }),
    }),
  } as never;
}

function fakeDbSelectSequence(sequence: Array<Record<string, unknown>[] | Error>) {
  let calls = 0;
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            const result = sequence[calls++];
            if (result instanceof Error) throw result;
            return result;
          },
        }),
      }),
    }),
  } as never;
}

const noopAudit = { record: async () => {} } as never;

async function loginWith(adminRole: string | null | undefined) {
  const password = 'correct-horse-battery';
  const user = {
    id: 42,
    name: 'Finance User',
    email: 'finance@haa.test',
    isAdmin: true,
    isActive: true,
    passwordHash: await hashPassword(password),
    adminRole,
  };
  const svc = new AdminAuthService(fakeDbReturning(user), noopAudit);
  const result = await svc.login({ email: user.email, password });
  if (!('token' in result)) throw new Error('expected successful login');
  return decodeJwtPayload(result.token).permissions;
}

describe('admin login mints role-scoped permissions', () => {
  it('accountant login mints the finance-only permission set', async () => {
    const perms = await loginWith('accountant');
    expect([...perms].sort()).toEqual([...getAdminPermissionsForRole('accountant')].sort());
    expect(perms).not.toContain('admin:*');
  });

  it('super_admin login mints the admin:* wildcard', async () => {
    const perms = await loginWith('super_admin');
    expect(perms).toEqual(['admin:*']);
  });

  it('legacy admin row with no role falls back to admin:* (no lockout)', async () => {
    const perms = await loginWith(null);
    expect(perms).toEqual(['admin:*']);
  });

  it('does not lock out local admins when admin_role column is not applied yet', async () => {
    const password = 'correct-horse-battery';
    const user = {
      id: 44,
      name: 'Legacy Local Admin',
      email: 'legacy-admin@haa.test',
      isAdmin: true,
      isActive: true,
      passwordHash: await hashPassword(password),
    };
    const missingAdminRole = Object.assign(new Error('column "admin_role" does not exist'), {
      code: '42703',
    });
    const svc = new AdminAuthService(fakeDbSelectSequence([[user], [], missingAdminRole]), noopAudit);
    const result = await svc.login({ email: user.email, password });
    if (!('token' in result)) throw new Error('expected successful login');

    const payload = decodeJwtPayload(result.token);
    expect(payload.permissions).toEqual(['admin:*']);
    expect(payload.twoFactorEnabled).toBe(false);
  });

  it('does not lock out admins when TOTP migration columns are not applied yet', async () => {
    const password = 'correct-horse-battery';
    const user = {
      id: 43,
      name: 'Ops Admin',
      email: 'ops@haa.test',
      isAdmin: true,
      isActive: true,
      passwordHash: await hashPassword(password),
      adminRole: 'super_admin',
    };
    const missingColumn = Object.assign(new Error('column "admin_totp_enabled_at" does not exist'), {
      code: '42703',
    });
    const svc = new AdminAuthService(fakeDbSelectSequence([[user], missingColumn]), noopAudit);
    const result = await svc.login({ email: user.email, password });
    if (!('token' in result)) throw new Error('expected successful login');

    const payload = decodeJwtPayload(result.token);
    expect(payload.permissions).toEqual(['admin:*']);
    expect(payload.twoFactorEnabled).toBe(false);
  });
});
