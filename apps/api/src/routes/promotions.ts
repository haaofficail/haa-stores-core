import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { PromotionsService } from '@haa/commerce-core';
import { createPromotionSchema, updatePromotionSchema } from '@haa/shared';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

const promotionsRouter = new Hono();

promotionsRouter.use('*', requireAuth(), requireStoreAccess());

promotionsRouter.get('/', requirePermission('promotions:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const search = c.req.query('search');
  const status = c.req.query('status');
  const promotions = await new PromotionsService().list(storeId, { search, status });
  return c.json({ success: true, data: promotions });
});

promotionsRouter.get('/:promotionId', requirePermission('promotions:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const promotionId = Number(c.req.param('promotionId'));
  const promotion = await new PromotionsService().getById(storeId, promotionId);
  if (!promotion) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Promotion not found' } }, 404);
  return c.json({ success: true, data: promotion });
});

promotionsRouter.post('/', requirePermission('promotions:create'), zValidator('json', createPromotionSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');

  const existing = await new PromotionsService().list(storeId, { search: body.name });
  if (existing.some(p => p.name === body.name)) {
    return c.json({ success: false, error: { code: 'CONFLICT', message: 'Promotion name already exists' } }, 409);
  }

  const promotion = await new PromotionsService().create(storeId, body);
  return c.json({ success: true, data: promotion }, 201);
});

promotionsRouter.put('/:promotionId', requirePermission('promotions:update'), zValidator('json', updatePromotionSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const promotionId = Number(c.req.param('promotionId'));
  const body = c.req.valid('json');

  if (body.name) {
    const existingList = await new PromotionsService().list(storeId, { search: body.name });
    const duplicate = existingList.find(p => p.name === body.name && p.id !== promotionId);
    if (duplicate) return c.json({ success: false, error: { code: 'CONFLICT', message: 'Promotion name already exists' } }, 409);
  }

  const promotion = await new PromotionsService().update(storeId, promotionId, body);
  if (!promotion) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Promotion not found' } }, 404);
  return c.json({ success: true, data: promotion });
});

promotionsRouter.delete('/:promotionId', requirePermission('promotions:delete'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const promotionId = Number(c.req.param('promotionId'));
  const promotion = await new PromotionsService().delete(storeId, promotionId);
  if (!promotion) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Promotion not found' } }, 404);
  return c.json({ success: true, data: promotion });
});

export { promotionsRouter };
