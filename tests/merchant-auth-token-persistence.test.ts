import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const API = readFileSync(
  resolve(ROOT, 'apps/merchant-dashboard/src/lib/api.ts'),
  'utf-8',
);
const AUTH_HOOK = readFileSync(
  resolve(ROOT, 'apps/merchant-dashboard/src/hooks/useAuth.tsx'),
  'utf-8',
);

describe('Merchant auth token persistence', () => {
  it('stores auth persistence mode and supports local/session token storage', () => {
    expect(API).toContain("const AUTH_PERSISTENCE_KEY = 'auth_persistence'");
    expect(API).toMatch(/type AuthPersistenceMode = 'local' \| 'session'/);
    expect(API).toMatch(/getStorageForMode\(mode\)\.setItem\(TOKEN_STORAGE_KEY,\s*token\)/);
    expect(API).toMatch(/localStorage\.setItem\(AUTH_PERSISTENCE_KEY,\s*mode\)/);
  });

  it('reads token in a migration-safe way and clears stale persistence mode', () => {
    expect(API).toMatch(/localStorage\.getItem\(AUTH_PERSISTENCE_KEY\)/);
    expect(API).toMatch(/localStorage\.getItem\(TOKEN_STORAGE_KEY\)/);
    expect(API).toMatch(/sessionStorage\.getItem\(TOKEN_STORAGE_KEY\)/);
    expect(API).toMatch(/localStorage\.removeItem\(AUTH_PERSISTENCE_KEY\)/);
  });

  it('clears token from both storages and clears persistence mode on logout/unauthorized', () => {
    expect(API).toMatch(/localStorage\.removeItem\(TOKEN_STORAGE_KEY\)/);
    expect(API).toMatch(/sessionStorage\.removeItem\(TOKEN_STORAGE_KEY\)/);
    expect(API).toMatch(/localStorage\.removeItem\(AUTH_PERSISTENCE_KEY\)/);
  });

  it('wires rememberMe from auth hook to token persistence mode', () => {
    expect(AUTH_HOOK).toMatch(/login:\s*\(email: string, password: string, rememberMe: boolean\)/);
    expect(AUTH_HOOK).toMatch(/const mode: AuthPersistenceMode = rememberMe \? 'local' : 'session'/);
    expect(AUTH_HOOK).toMatch(/saveToken\(result\.token,\s*mode\)/);
  });
});
