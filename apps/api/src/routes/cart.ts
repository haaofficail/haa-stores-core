import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { CartService } from '@haa/commerce-core';
import { requireAuth, requireStoreAccess, getAuth } from '@haa/auth-core';

const cartRouter = new Hono();

cartRouter.use('*', requireAuth(), requireStoreAccess());

cartRouter.post('/', async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const auth = getAuth(c);
  const cart = await new CartService().createCart(storeId, auth?.userId);
  return c.json({ success: true, data: cart }, 201);
});

cartRouter.get('/:cartId', async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const cartId = c.req.param('cartId');
  const cart = await new CartService().getCart(storeId, cartId);
  if (!cart) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Cart not found' } }, 404);
  return c.json({ success: true, data: cart });
});

cartRouter.post('/:cartId/items', zValidator('json', z.object({
  productId: z.coerce.number(),
  variantId: z.coerce.number().optional(),
  quantity: z.coerce.number().int().positive(),
  notes: z.string().max(500).optional(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const cartId = c.req.param('cartId');
  const body = c.req.valid('json');
  const cart = await new CartService().addItem(storeId, cartId, body.productId, body.quantity, body.notes, undefined, body.variantId);
  if (!cart) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Product not available or insufficient stock' } }, 400);
  return c.json({ success: true, data: cart });
});

cartRouter.patch('/:cartId/items/:itemId', zValidator('json', z.object({
  quantity: z.coerce.number().int().positive(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const cartId = c.req.param('cartId');
  const itemId = Number(c.req.param('itemId'));
  const { quantity } = c.req.valid('json');
  const updated = await new CartService().updateItemQuantity(storeId, cartId, itemId, quantity);
  if (!updated) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Cart item not found, inactive, or insufficient stock' } }, 400);
  return c.json({ success: true });
});

cartRouter.delete('/:cartId/items/:itemId', async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const cartId = c.req.param('cartId');
  const itemId = Number(c.req.param('itemId'));
  const removed = await new CartService().removeItem(storeId, cartId, itemId);
  if (!removed) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Cart item not found' } }, 404);
  return c.json({ success: true });
});

cartRouter.post('/:cartId/clear', async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const cartId = c.req.param('cartId');
  const cleared = await new CartService().clearCart(storeId, cartId);
  if (!cleared) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Cart not found' } }, 404);
  return c.json({ success: true });
});

export { cartRouter };
