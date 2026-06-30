// Merchant Account Security contract.
//
// Guards the signed-in merchant password rotation and "logout all sessions"
// surfaces without hitting a live auth provider or printing secret material.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

function read(path: string): string {
  return readFileSync(resolve(ROOT, path), 'utf-8');
}

const AUTH_ROUTE = read('apps/api/src/routes/auth.ts');
const AUTH_FLOW = read('packages/commerce-core/src/auth-flow.ts');
const MERCHANT_API = read('apps/merchant-dashboard/src/lib/api.ts');
const ACCOUNT_PAGE = read('apps/merchant-dashboard/src/pages/Account.tsx');
const SHARED_AUDIT = read('packages/shared/src/types/audit.ts');
const SHARED_ORDERS = read('packages/shared/src/types/orders.ts');
const MERCHANT_AUDIT_LOGS = read('apps/merchant-dashboard/src/pages/AuditLogs.tsx');

describe('merchant account security — backend contract', () => {
  it('defines a signed-in change-password route with rate limiting and validation', () => {
    expect(AUTH_ROUTE).toMatch(/const changePasswordSchema = z/);
    expect(AUTH_ROUTE).toMatch(/authRouter\.post\(\s*['"]\/change-password['"],\s*requireAuth\(\)/);
    expect(AUTH_ROUTE).toMatch(/rateLimiter\(\{[\s\S]{0,220}maxRequests:\s*10/);
    expect(AUTH_ROUTE).toMatch(/currentPassword:\s*z\.string\(\)\.min\(1\)\.max\(200\)/);
    expect(AUTH_ROUTE).toMatch(/newPassword:\s*z\.string\(\)\.min\(8/);
  });

  it('rotates the password only after verifying the current password', () => {
    expect(AUTH_FLOW).toMatch(/async changePassword/);
    expect(AUTH_FLOW).toMatch(/verifyPassword\(input\.currentPassword,\s*user\.passwordHash\)/);
    expect(AUTH_FLOW).toMatch(/hashPassword\(input\.newPassword\)/);
    expect(AUTH_FLOW).toMatch(/passwordHash,\s*[\s\S]{0,160}tokenVersion:\s*sql`\$\{s\.users\.tokenVersion\} \+ 1`/);
    expect(AUTH_FLOW).toMatch(/action:\s*['"]password_changed['"]/);
    expect(AUTH_FLOW).toMatch(/action:\s*['"]password_change_failed['"]/);
    expect(AUTH_FLOW).toMatch(/tenantId:\s*input\.tenantId/);
    expect(AUTH_FLOW).toMatch(/storeId:\s*input\.storeId/);
    expect(AUTH_ROUTE).toMatch(/tenantId:\s*auth\.tenantId/);
    expect(AUTH_ROUTE).toMatch(/storeId:\s*auth\.activeStoreId/);
    expect(AUTH_FLOW).not.toMatch(/newValue:\s*\{[\s\S]{0,120}password/);
  });

  it('exposes logout-all as an explicit tokenVersion revocation action', () => {
    expect(AUTH_ROUTE).toMatch(/authRouter\.post\(['"]\/logout-all['"],\s*requireAuth\(\)/);
    expect(AUTH_ROUTE).toMatch(/await service\.logout\(auth\.userId\)/);
    expect(AUTH_ROUTE).toMatch(/clearAuthCookie\(c\)/);
  });
});

describe('merchant account security — dashboard contract', () => {
  it('uses typed authApi helpers for password change and logout-all', () => {
    expect(MERCHANT_API).toMatch(/changePassword:\s*\(data:\s*\{\s*currentPassword:\s*string;\s*newPassword:\s*string\s*\}\)/);
    expect(MERCHANT_API).toMatch(/['"]\/auth\/change-password['"]/);
    expect(MERCHANT_API).toMatch(/logoutAll:\s*\(\)\s*=>/);
    expect(MERCHANT_API).toMatch(/['"]\/auth\/logout-all['"]/);
  });

  it('renders account-security UI without exposing tokens or fake 2FA actions', () => {
    expect(ACCOUNT_PAGE).toMatch(/getAuthPersistenceMode/);
    expect(ACCOUNT_PAGE).toMatch(/authApi\.changePassword/);
    expect(ACCOUNT_PAGE).toMatch(/authApi\.logoutAll/);
    expect(ACCOUNT_PAGE).toMatch(/autoComplete="current-password"/);
    expect(ACCOUNT_PAGE).toMatch(/autoComplete="new-password"/);
    expect(ACCOUNT_PAGE).toMatch(/account\.security\.twofa\.unavailable/);
    expect(ACCOUNT_PAGE).not.toMatch(/token:/i);
    expect(ACCOUNT_PAGE).not.toMatch(/secret/i);
  });
});

describe('merchant account security — audit labels', () => {
  it('registers audit actions in shared and merchant audit labels', () => {
    expect(SHARED_ORDERS).toMatch(/['"]password_changed['"]/);
    expect(SHARED_ORDERS).toMatch(/['"]password_change_failed['"]/);
    expect(SHARED_AUDIT).toMatch(/password_changed:\s*['"][^'"]+['"]/);
    expect(SHARED_AUDIT).toMatch(/password_change_failed:\s*['"][^'"]+['"]/);
    expect(MERCHANT_AUDIT_LOGS).toMatch(/password_changed:\s*['"][^'"]+['"]/);
    expect(MERCHANT_AUDIT_LOGS).toMatch(/password_change_failed:\s*['"][^'"]+['"]/);
  });
});
