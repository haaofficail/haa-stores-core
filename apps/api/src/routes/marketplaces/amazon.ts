// Amazon-specific routes for the marketplace router.
// Extracted from apps/api/src/routes/marketplaces.ts in
// Quality Pass 2 — Item 2.3d. Follows the same pattern as
// marketplaces/salla.ts and marketplaces/zid.ts.

import { Hono } from 'hono';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';
import { AmazonService } from '@haa/marketplace-core';

const amazonRouter = new Hono();

amazonRouter.use('*', requireAuth(), requireStoreAccess());

function getAmazonService(storeId: number) {
  return new AmazonService(storeId);
}

amazonRouter.get('/oauth/url', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const state = crypto.randomUUID();
  const url = getAmazonService(storeId).getOAuthUrl(state);
  return c.json({ success: true, data: { url, state } });
});

amazonRouter.get('/oauth/callback', async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const code = c.req.query('code');
  const marketplaceId = c.req.query('marketplaceId') || 'sa';

  if (!code) {
    return c.json({ success: false, error: { code: 'MISSING_CODE', message: 'Authorization code is required' } }, 400);
  }

  try {
    const _result = await getAmazonService(storeId).handleCallback(code, marketplaceId);
    return c.redirect(`/channels/amazon?connected=true`);
  } catch (error) {
    return c.redirect(`/channels/amazon?error=${encodeURIComponent((error as Error).message)}`);
  }
});

export { amazonRouter };
