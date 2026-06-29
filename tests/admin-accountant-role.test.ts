import { describe, expect, it } from 'vitest';
import {
  ADMIN_ROLE_PERMISSIONS,
  ADMIN_PERMISSION_CATALOG,
  getAdminPermissionsForRole,
} from '@haa/shared';

/**
 * Batch 2 — `accountant` admin role contract.
 *
 * The platform admin auth layer historically minted `['admin:*']` for every
 * admin. This batch introduces scoped admin roles so that an `accountant`
 * sees and acts on finance only, while `super_admin` keeps `admin:*` so no
 * existing admin is locked out.
 *
 * These tests pin the contract: the exact accountant permission set, the
 * super_admin wildcard, and the hard "no overreach" boundary.
 */

const FINANCE_ALLOWED = [
  'finance.dashboard.view',
  'payments.read',
  'wallet.payout.view_all',
  'wallet.payout.review',
  'wallet.payout.approve',
  'wallet.payout.mark_transferred',
  'wallet.payout.upload_proof',
  'wallet.payout.verify_transfer',
  'wallet.payout.export',
  'merchant.bank_accounts.view',
  'merchant.bank_accounts.verify_for_payout',
  'merchant.bank_accounts.reveal_iban_for_payout',
  'finance.audit_log.view',
  'finance.reconciliation.view',
];

// Anything an accountant must NEVER receive — general platform power.
const FORBIDDEN_FOR_ACCOUNTANT = [
  'admin:*',
  'stores.read',
  'stores.update',
  'stores.status.update',
  'tenants.read',
  'tenants.create',
  'tenants.status.update',
  'plans.read',
  'plans.update',
  'users.read',
  'platform.settings.read',
  'platform.settings.update',
  'platform.media.upload',
  'kyc.read',
  'kyc.review',
  'marketplace.review',
  'marketplace.feature',
  'billing.platform_fee.update',
  'wallet.payout.second_approve',
  'wallet.payout.reject',
  'wallet.payout.cancel',
  'wallet.payout.reverse',
];

describe('admin role: super_admin', () => {
  it('keeps the admin:* wildcard so no existing admin is locked out', () => {
    expect(getAdminPermissionsForRole('super_admin')).toEqual(['admin:*']);
  });

  it('is registered in ADMIN_ROLE_PERMISSIONS', () => {
    expect(ADMIN_ROLE_PERMISSIONS.super_admin).toEqual(['admin:*']);
  });

  it('defaults unknown/missing role to super_admin (fail-safe for existing rows)', () => {
    // existing admin rows have no adminRole yet; they must remain full admins
    expect(getAdminPermissionsForRole(undefined)).toEqual(['admin:*']);
    expect(getAdminPermissionsForRole(null)).toEqual(['admin:*']);
  });
});

describe('admin role: accountant', () => {
  const perms = getAdminPermissionsForRole('accountant');

  it('grants exactly the finance-only permission set', () => {
    expect([...perms].sort()).toEqual([...FINANCE_ALLOWED].sort());
  });

  it('never grants the admin:* wildcard', () => {
    expect(perms).not.toContain('admin:*');
  });

  it.each(FORBIDDEN_FOR_ACCOUNTANT)('does not grant forbidden permission: %s', (p) => {
    expect(perms).not.toContain(p);
  });

  it('every accountant permission is a real catalog key (no typos / phantom keys)', () => {
    const catalogKeys = new Set(ADMIN_PERMISSION_CATALOG.map((p) => p.key));
    for (const p of perms) {
      expect(catalogKeys.has(p as never)).toBe(true);
    }
  });
});

describe('admin guard contract (mirrors requireAdminPermission logic)', () => {
  // requireAdminPermission allows when permissions includes 'admin:*' OR the exact key.
  const can = (granted: string[], required: string) =>
    granted.includes('admin:*') || granted.includes(required);

  it('accountant is allowed on a finance route permission', () => {
    const acc = getAdminPermissionsForRole('accountant');
    expect(can(acc, 'wallet.payout.view_all')).toBe(true);
    expect(can(acc, 'wallet.payout.upload_proof')).toBe(true);
  });

  it('accountant is denied on non-finance route permissions even if called directly', () => {
    const acc = getAdminPermissionsForRole('accountant');
    expect(can(acc, 'tenants.read')).toBe(false);
    expect(can(acc, 'stores.update')).toBe(false);
    expect(can(acc, 'users.read')).toBe(false);
    expect(can(acc, 'plans.update')).toBe(false);
    expect(can(acc, 'kyc.review')).toBe(false);
  });

  it('super_admin is allowed everywhere via wildcard', () => {
    const sup = getAdminPermissionsForRole('super_admin');
    expect(can(sup, 'tenants.delete')).toBe(true);
    expect(can(sup, 'wallet.payout.verify_transfer')).toBe(true);
  });
});
