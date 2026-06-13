import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { TagsService, createTagSchema } from '@haa/commerce-core';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

const tagsRouter = new Hono();

tagsRouter.use('*', requireAuth(), requireStoreAccess());

tagsRouter.get('/', requirePermission('tags:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const items = await new TagsService().list(storeId);
  return c.json({ success: true, data: items });
});

tagsRouter.get('/:id', requirePermission('tags:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const item = await new TagsService().getById(storeId, id);
  if (!item) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Tag not found' } }, 404);
  return c.json({ success: true, data: item });
});

tagsRouter.post('/', requirePermission('tags:manage'), zValidator('json', createTagSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const item = await new TagsService().create(storeId, body);
  return c.json({ success: true, data: item }, 201);
});

tagsRouter.patch('/:id', requirePermission('tags:manage'), zValidator('json', createTagSchema.partial()), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const body = c.req.valid('json');
  const item = await new TagsService().update(storeId, id, body);
  if (!item) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Tag not found' } }, 404);
  return c.json({ success: true, data: item });
});

tagsRouter.put('/reorder', requirePermission('tags:manage'), zValidator('json', z.object({
  items: z.array(z.object({ id: z.number(), sortOrder: z.number() })),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const { items } = c.req.valid('json');
  await new TagsService().reorder(storeId, items);
  return c.json({ success: true });
});

tagsRouter.delete('/:id', requirePermission('tags:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const item = await new TagsService().delete(storeId, id);
  if (!item) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Tag not found' } }, 404);
  return c.json({ success: true, data: item });
});

export { tagsRouter };
