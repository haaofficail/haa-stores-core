import type { Context, Next } from 'hono';
import { getAuth } from '@haa/auth-core';
import { verifyLocalStoragePath } from '@haa/shared';

export function storageGuard() {
  return async (c: Context, next: Next) => {
    const url = new URL(c.req.url);
    const path = url.pathname.replace(/^\/storage\//, '');
    const expires = Number(url.searchParams.get('expires'));
    const sig = url.searchParams.get('sig') || '';

    // Allow product images publicly (storefront needs them)
    if (path.includes('/products/')) {
      await next();
      return;
    }

    // Valid signature grants access
    if (expires && sig && verifyLocalStoragePath(path, expires, sig)) {
      await next();
      return;
    }

    // Authenticated user with store access
    const auth = getAuth(c);
    if (auth && auth.tenantId) {
      const storeMatch = path.match(/^stores\/(\d+)\//);
      if (storeMatch) {
        const storeId = Number(storeMatch[1]);
        if (storeId > 0) {
          await next();
          return;
        }
      }
    }

    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
  };
}
