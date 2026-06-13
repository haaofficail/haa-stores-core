import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { AuditLogService } from '@haa/integration-core';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

const auditRouter = new Hono();
auditRouter.use('*', requireAuth(), requireStoreAccess());

auditRouter.get('/', requirePermission('stores:read'), zValidator('query', z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().optional(),
  entityType: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const { page, limit, action, entityType, dateFrom, dateTo } = c.req.valid('query');
  const auditService = new AuditLogService();
  const result = await auditService.list(storeId, { page, limit, action, entityType, dateFrom, dateTo });
  return c.json({ success: true, data: result });
});

export { auditRouter };
