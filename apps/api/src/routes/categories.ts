import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { CategoriesService } from '@haa/commerce-core';
import { createCategorySchema } from '@haa/shared';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

const categoriesRouter = new Hono();

categoriesRouter.use('*', requireAuth(), requireStoreAccess());

categoriesRouter.get('/', requirePermission('categories:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const items = await new CategoriesService().list(storeId);
  return c.json({ success: true, data: items });
});

categoriesRouter.get('/tree', requirePermission('categories:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const tree = await new CategoriesService().getTree(storeId);
  return c.json({ success: true, data: tree });
});

categoriesRouter.get('/:id', requirePermission('categories:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const item = await new CategoriesService().getById(storeId, id);
  if (!item) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } }, 404);
  return c.json({ success: true, data: item });
});

categoriesRouter.post('/', requirePermission('categories:manage'), zValidator('json', createCategorySchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  try {
    const item = await new CategoriesService().create(storeId, body);
    return c.json({ success: true, data: item }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: err.message } }, 400);
  }
});

categoriesRouter.put('/reorder', requirePermission('categories:manage'), zValidator('json', z.object({
  items: z.array(z.object({
    id: z.number(),
    parentId: z.number().nullable(),
    sortOrder: z.number(),
  })),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const { items } = c.req.valid('json');
  try {
    await new CategoriesService().reorder(storeId, items);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: err.message } }, 400);
  }
});

categoriesRouter.patch('/:id', requirePermission('categories:manage'), zValidator('json', createCategorySchema.partial()), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const body = c.req.valid('json');
  try {
    const item = await new CategoriesService().update(storeId, id, body);
    if (!item) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } }, 404);
    return c.json({ success: true, data: item });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: err.message } }, 400);
  }
});

categoriesRouter.delete('/:id', requirePermission('categories:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  try {
    const item = await new CategoriesService().delete(storeId, id);
    if (!item) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } }, 404);
    return c.json({ success: true, data: item });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'CONFLICT', message: err.message } }, 409);
  }
});

export { categoriesRouter };
