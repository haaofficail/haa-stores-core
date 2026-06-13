const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 10_000;

const storeTenantCache = new Map<number, { tenantId: number; expiresAt: number }>();

export function getCachedTenantId(storeId: number): number | undefined {
  const now = Date.now();
  const cached = storeTenantCache.get(storeId);
  if (cached && cached.expiresAt > now) return cached.tenantId;
  if (cached) storeTenantCache.delete(storeId);
  return undefined;
}

export function setCachedTenantId(storeId: number, tenantId: number): void {
  if (storeTenantCache.size >= CACHE_MAX) {
    const oldest = storeTenantCache.entries().next().value;
    if (oldest) storeTenantCache.delete(oldest[0]);
  }
  storeTenantCache.set(storeId, { tenantId, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function invalidateStoreTenantCache(storeId: number): void {
  storeTenantCache.delete(storeId);
}

export function clearStoreTenantCache(): void {
  storeTenantCache.clear();
}
