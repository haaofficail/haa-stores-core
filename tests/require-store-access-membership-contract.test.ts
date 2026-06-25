// requireStoreAccess membership check — source-grep contract.
//
// Audit P0 follow-up (2026-06-25): the prior middleware only verified
// the tenant boundary, letting owner of store A pass a sibling store
// B's URL when the two shared a tenant. Every downstream service
// (wallet, subscriptions, compliance, billing, audit, payment-
// settings, policies) trusts the middleware and scopes its own
// queries by the URL's storeId — so the leak amplified across the
// merchant API.
//
// This test locks in:
//   1. The middleware now exposes a `StoreMembershipResolver` hook.
//   2. The resolver is invoked AFTER the tenant boundary check (so
//      tenant-mismatch still wins with a distinct denial reason).
//   3. The API layer (apps/api/src/index.ts) wires a real resolver
//      that queries `tenant_users` for an active membership matching
//      (userId, tenantId, storeId-or-NULL).
//   4. `no_store_role` is added to the denial-reason union (and the
//      failure tracker can rate-limit it).
//   5. login() no longer falls back to "first store in the tenant"
//      when the user has no role for the membership's store —
//      activeStore stays undefined and the dashboard handles the
//      empty selection.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MIDDLEWARE = readFileSync(
  resolve(__dirname, '../packages/auth-core/src/middleware.ts'),
  'utf-8',
);
const API_INDEX = readFileSync(
  resolve(__dirname, '../apps/api/src/index.ts'),
  'utf-8',
);
const AUTH_FLOW = readFileSync(
  resolve(__dirname, '../packages/commerce-core/src/auth-flow.ts'),
  'utf-8',
);

describe('middleware — StoreMembershipResolver hook', () => {
  it('exports the resolver type', () => {
    expect(MIDDLEWARE).toMatch(
      /export type StoreMembershipResolver = \(\s*userId:\s*number,\s*storeId:\s*number,\s*tenantId:\s*number,?\s*\)\s*=>\s*Promise<['"]ok['"]\s*\|\s*['"]no_role['"]\s*\|\s*['"]revoked['"]>/,
    );
  });

  it('exports setStoreMembershipResolver', () => {
    expect(MIDDLEWARE).toMatch(/export function setStoreMembershipResolver\(fn: StoreMembershipResolver\): void/);
  });

  it('adds no_store_role to the denial reason union', () => {
    expect(MIDDLEWARE).toMatch(/\|\s*['"]no_store_role['"]/);
  });

  it('requireStoreAccess invokes the resolver AFTER the tenant boundary check', () => {
    const body = MIDDLEWARE.slice(MIDDLEWARE.indexOf('export function requireStoreAccess'));
    const tenantCheckIdx = body.indexOf('storeTenantId !== auth.tenantId');
    const membershipCheckIdx = body.indexOf('_storeMembershipResolver(auth.userId');
    expect(tenantCheckIdx).toBeGreaterThan(0);
    expect(membershipCheckIdx).toBeGreaterThan(0);
    expect(membershipCheckIdx).toBeGreaterThan(tenantCheckIdx);
  });

  it('revoked memberships are surfaced separately (richer i18n)', () => {
    expect(MIDDLEWARE).toMatch(/membership === ['"]revoked['"]/);
    expect(MIDDLEWARE).toMatch(/revoked/i);
  });
});

describe('apps/api/src/index.ts — resolver implementation', () => {
  it('wires setStoreMembershipResolver with a tenant_users query', () => {
    // Find the resolver invocation that's followed by `async` (the
    // setter call, not the import). Walk forward to the body.
    const setterIdx = API_INDEX.indexOf('setStoreMembershipResolver(async');
    expect(setterIdx).toBeGreaterThan(0);
    const block = API_INDEX.slice(setterIdx);
    expect(block).toMatch(/eq\(s\.tenantUsers\.userId,\s*userId\)/);
    expect(block).toMatch(/eq\(s\.tenantUsers\.tenantId,\s*tenantId\)/);
    // The store scoping clause — NULL = tenant-wide member, or
    // exact match with the requested storeId.
    expect(block).toMatch(/tenantUsers\.storeId/);
  });

  it('fails CLOSED on DB error (returns no_role, not ok)', () => {
    const setterIdx = API_INDEX.indexOf('setStoreMembershipResolver(async');
    expect(setterIdx).toBeGreaterThan(0);
    const block = API_INDEX.slice(setterIdx, setterIdx + 2500);
    expect(block).toMatch(/catch[\s\S]{0,400}return\s+['"]no_role['"]/);
  });

  it('returns revoked when is_active is false (distinct from no_role)', () => {
    const setterIdx = API_INDEX.indexOf('setStoreMembershipResolver(async');
    expect(setterIdx).toBeGreaterThan(0);
    const block = API_INDEX.slice(setterIdx, setterIdx + 2500);
    expect(block).toMatch(/if\s*\(!row\.isActive\)\s*return\s+['"]revoked['"]/);
  });
});

describe('auth-flow.ts — no "first store in the tenant" fallback in login', () => {
  it('removes the unconditional allStores[0] fallback on login', () => {
    const loginBlock = AUTH_FLOW.slice(
      AUTH_FLOW.indexOf('async login('),
      AUTH_FLOW.indexOf('async selectStore('),
    );
    // The historic bug was: `?? allStores[0]` at the end of the
    // chain. Login is the highest-value entry point — must be gone.
    expect(loginBlock).not.toMatch(/allStores\.find\([^)]+\)\s*\?\?\s*allStores\[0\]/);
  });

  it('the fallback path requires allowedStoreIds.length > 0 before reading stores', () => {
    const loginBlock = AUTH_FLOW.slice(
      AUTH_FLOW.indexOf('async login('),
      AUTH_FLOW.indexOf('async selectStore('),
    );
    expect(loginBlock).toMatch(/if\s*\(allowedStoreIds\.length\s*>\s*0\)/);
  });
});
