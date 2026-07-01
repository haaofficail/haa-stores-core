import type { Context, Next } from 'hono';
import { getAuth, verifyStoreOwnership } from '@haa/auth-core';
import { verifyLocalStoragePath } from '@haa/shared/media';

export function storageGuard() {
  return async (c: Context, next: Next) => {
    const url = new URL(c.req.url);
    const path = url.pathname.replace(/^\/storage\//, '');
    const expires = Number(url.searchParams.get('expires'));
    const sig = url.searchParams.get('sig') || '';

    // Allow product images publicly (storefront needs them). Anchored to
    // the real upload convention (`stores/<id>/products/...`) rather than
    // a bare `.includes('/products/')` substring check — the latter could
    // be fooled by a path containing `..` segments (e.g.
    // `stores/5/../../products/../secret/x`), which `URL.pathname` does
    // NOT collapse before this check runs.
    if (/^stores\/\d+\/products\//.test(path) && !path.includes('..')) {
      await next();
      return;
    }

    // Valid signature grants access
    if (expires && sig && verifyLocalStoragePath(path, expires, sig)) {
      await next();
      return;
    }

    // Authenticated user with VERIFIED ownership of this store (P1-2 fix:
    // previously any authenticated user with a tenantId could read any
    // other tenant's non-product storage files by guessing the numeric
    // storeId in the path).
    const auth = getAuth(c);
    if (auth && auth.tenantId) {
      const storeMatch = path.match(/^stores\/(\d+)\//);
      if (storeMatch) {
        const storeId = Number(storeMatch[1]);
        if (await verifyStoreOwnership(auth, storeId)) {
          await next();
          return;
        }
      }
    }

    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
  };
}
