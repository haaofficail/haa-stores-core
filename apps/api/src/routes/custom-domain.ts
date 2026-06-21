import { Hono } from 'hono';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';
import { CustomDomainService } from '@haa/commerce-core';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export const customDomainRouter = new Hono();
customDomainRouter.use('*', requireAuth(), requireStoreAccess());

const setSchema = z.object({ domain: z.string().min(3).max(253) });

// GET /merchant/:storeId/domain — current status + DNS records to set
customDomainRouter.get('/', requirePermission('settings:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const status = await new CustomDomainService().getStatus(storeId);
  return c.json({ success: true, data: status });
});

// PUT /merchant/:storeId/domain — set/replace the custom domain (-> pending)
customDomainRouter.put('/', requirePermission('settings:update'), zValidator('json', setSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const { domain } = c.req.valid('json');
  const result = await new CustomDomainService().setDomain(storeId, domain);
  if (!result.ok) {
    const code = result.error === 'already_taken' ? 409 : 400;
    return c.json({ success: false, error: { code: result.error, message: result.error } }, code);
  }
  return c.json({ success: true, data: result });
});

// POST /merchant/:storeId/domain/verify — run DNS verification now
customDomainRouter.post('/verify', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const result = await new CustomDomainService().verifyDomain(storeId);
  return c.json({ success: true, data: result });
});

// DELETE /merchant/:storeId/domain — unlink the custom domain
customDomainRouter.delete('/', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  await new CustomDomainService().removeDomain(storeId);
  return c.json({ success: true });
});
