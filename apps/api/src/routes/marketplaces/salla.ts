// Salla-specific routes for the marketplace router.
// POC: extracted from apps/api/src/routes/marketplaces.ts in
// Quality Pass 2 — Item 2.3 to prove the sub-router pattern
// before extracting Zid/Noon/Amazon.

import { Hono } from 'hono';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';
import { SallaService } from '@haa/marketplace-core';

const sallaRouter = new Hono();

sallaRouter.use('*', requireAuth(), requireStoreAccess());

function getSallaService(storeId: number) {
  return new SallaService(storeId);
}

sallaRouter.get('/oauth/url', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const state = crypto.randomUUID();
  const salla = getSallaService(storeId);
  const url = salla.getOAuthUrl(state);

  return c.json({ success: true, data: { url, state } });
});

sallaRouter.get('/oauth/callback', async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const code = c.req.query('code');

  if (!code) {
    return c.json({ success: false, error: { code: 'MISSING_CODE', message: 'Authorization code is required' } }, 400);
  }

  try {
    const salla = getSallaService(storeId);
    const result = await salla.handleCallback(code);
    return c.redirect(`/channels/salla?connected=true`);
  } catch (error) {
    return c.redirect(`/channels/salla?error=${encodeURIComponent((error as Error).message)}`);
  }
});

export { sallaRouter };
