// P1-2 audit fix — storageGuard cross-tenant IDOR.
//
// Previously, `apps/api/src/middleware/storage-guard.ts` granted access
// to any `stores/<id>/...` path for any authenticated user with a
// tenantId, without checking that the user's tenant actually owned
// `<id>`. A merchant from tenant A could read tenant B's non-product
// storage files (receipts, documents) by guessing the numeric store id.
//
// `verifyStoreOwnership` (packages/auth-core/src/middleware.ts) extracts
// the same tenant-boundary + membership check `requireStoreAccess` uses,
// so storageGuard can reuse it. This test exercises the function
// directly against fake resolvers — no DB, no Hono context.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  verifyStoreOwnership,
  setStoreTenantResolver,
  setStoreMembershipResolver,
} from '../packages/auth-core/src/index';
import type { AuthContext } from '@haa/shared';

const TENANT_A_USER: AuthContext = {
  userId: 1,
  tenantId: 10,
  activeStoreId: 100,
  roles: ['merchant_owner'],
  permissions: ['settings:read'],
};

// storeId 100 belongs to tenant 10 (tenant A); storeId 200 belongs to
// tenant 20 (tenant B) — a sibling store the requester does NOT own.
function fakeTenantResolver(storeId: number): number | null {
  if (storeId === 100) return 10;
  if (storeId === 200) return 20;
  return null;
}

describe('verifyStoreOwnership', () => {
  beforeEach(() => {
    setStoreTenantResolver(async (storeId) => fakeTenantResolver(storeId));
    setStoreMembershipResolver(async (_userId, storeId) => (storeId === 100 ? 'ok' : 'no_role'));
  });

  it('grants access to a store the user\'s tenant owns and has membership on', async () => {
    expect(await verifyStoreOwnership(TENANT_A_USER, 100)).toBe(true);
  });

  it('DENIES access to a sibling tenant\'s store (the IDOR this fix closes)', async () => {
    expect(await verifyStoreOwnership(TENANT_A_USER, 200)).toBe(false);
  });

  it('denies access to a nonexistent store', async () => {
    expect(await verifyStoreOwnership(TENANT_A_USER, 999)).toBe(false);
  });

  it('denies when the tenant owns the store but the user has no membership on it', async () => {
    setStoreMembershipResolver(async () => 'no_role');
    expect(await verifyStoreOwnership(TENANT_A_USER, 100)).toBe(false);
  });

  it('denies when membership was revoked', async () => {
    setStoreMembershipResolver(async () => 'revoked');
    expect(await verifyStoreOwnership(TENANT_A_USER, 100)).toBe(false);
  });

  it('fails closed when the resolver cannot find the store', async () => {
    setStoreTenantResolver(async () => null);
    expect(await verifyStoreOwnership(TENANT_A_USER, 100)).toBe(false);
  });

  it('fails closed on invalid storeId', async () => {
    expect(await verifyStoreOwnership(TENANT_A_USER, 0)).toBe(false);
    expect(await verifyStoreOwnership(TENANT_A_USER, -1)).toBe(false);
    expect(await verifyStoreOwnership(TENANT_A_USER, NaN)).toBe(false);
  });

  it('fails closed when the resolver throws', async () => {
    setStoreTenantResolver(async () => { throw new Error('db down'); });
    expect(await verifyStoreOwnership(TENANT_A_USER, 100)).toBe(false);
  });
});
