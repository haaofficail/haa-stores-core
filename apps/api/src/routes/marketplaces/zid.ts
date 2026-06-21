// Zid-specific routes for the marketplace router.
// Extracted from apps/api/src/routes/marketplaces.ts in
// Quality Pass 2 — Item 2.3b. Follows the same pattern as
// marketplaces/salla.ts (extracted in Item 2.3 POC).

import { Hono } from 'hono';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';
import { ZidService } from '@haa/marketplace-core';

const zidRouter = new Hono();

zidRouter.use('*', requireAuth(), requireStoreAccess());

function getZidService(storeId: number) {
  return new ZidService(storeId);
}

zidRouter.get('/oauth/url', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const state = crypto.randomUUID();
  const url = getZidService(storeId).getOAuthUrl(state);
  return c.json({ success: true, data: { url, state } });
});

zidRouter.get('/oauth/callback', async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const code = c.req.query('code');

  if (!code) {
    return c.json({ success: false, error: { code: 'MISSING_CODE', message: 'Authorization code is required' } }, 400);
  }

  try {
    const _result = await getZidService(storeId).handleCallback(code);
    return c.redirect(`/channels/zid?connected=true`);
  } catch (error) {
    return c.redirect(`/channels/zid?error=${encodeURIComponent((error as Error).message)}`);
  }
});

export { zidRouter };
