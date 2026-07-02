import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { ApiKeyService } from '@haa/integration-core';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

const apiKeysRouter = new Hono();
apiKeysRouter.use('*', requireAuth(), requireStoreAccess());

// P1-10 audit fix: UI gates /api-keys on the catalog's dedicated
// `api_keys:view`/`api_keys:create`/`api_keys:revoke` (see
// packages/shared/src/permissions.ts) — these routes still checked the
// coarser `settings:read`/`settings:update`, so an employee granted only
// `api_keys:*` (no `settings:*`) would see the page load then get 403 on
// every call.
apiKeysRouter.get('/', requirePermission('api_keys:view'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const keys = await new ApiKeyService().listKeys(storeId);
  return c.json({ success: true, data: keys });
});

apiKeysRouter.post('/', requirePermission('api_keys:create'), zValidator('json', z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).min(1),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const { name, scopes } = c.req.valid('json');
  const key = await new ApiKeyService().createKey(storeId, name, scopes);
  return c.json({ success: true, data: key }, 201);
});

apiKeysRouter.delete('/:keyId', requirePermission('api_keys:revoke'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const keyId = Number(c.req.param('keyId'));
  await new ApiKeyService().revokeKey(storeId, keyId);
  return c.json({ success: true, data: { revoked: true } });
});

apiKeysRouter.get('/scopes', requirePermission('api_keys:view'), async (c) => {
  const scopes = await new ApiKeyService().getScopes();
  return c.json({ success: true, data: scopes });
});

apiKeysRouter.get('/logs', requirePermission('api_keys:view'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const logs = await new ApiKeyService().listLogs(storeId);
  return c.json({ success: true, data: logs });
});

export { apiKeysRouter };
