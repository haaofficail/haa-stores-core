import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { BrandsService, createBrandSchema } from '@haa/commerce-core';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

const brandsRouter = new Hono();

brandsRouter.use('*', requireAuth(), requireStoreAccess());

brandsRouter.get('/', requirePermission('brands:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const items = await new BrandsService().list(storeId);
  return c.json({ success: true, data: items });
});

brandsRouter.get('/:id', requirePermission('brands:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const item = await new BrandsService().getById(storeId, id);
  if (!item) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Brand not found' } }, 404);
  return c.json({ success: true, data: item });
});

brandsRouter.post('/', requirePermission('brands:manage'), zValidator('json', createBrandSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const item = await new BrandsService().create(storeId, body);
  return c.json({ success: true, data: item }, 201);
});

brandsRouter.patch('/:id', requirePermission('brands:manage'), zValidator('json', createBrandSchema.partial()), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const body = c.req.valid('json');
  const item = await new BrandsService().update(storeId, id, body);
  if (!item) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Brand not found' } }, 404);
  return c.json({ success: true, data: item });
});

brandsRouter.put('/reorder', requirePermission('brands:manage'), zValidator('json', z.object({
  items: z.array(z.object({ id: z.number(), sortOrder: z.number() })),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const { items } = c.req.valid('json');
  await new BrandsService().reorder(storeId, items);
  return c.json({ success: true });
});

brandsRouter.delete('/:id', requirePermission('brands:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const item = await new BrandsService().delete(storeId, id);
  if (!item) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Brand not found' } }, 404);
  return c.json({ success: true, data: item });
});

export { brandsRouter };
