// Cart routes for the public storefront.

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { CartService } from '@haa/commerce-core';
import { toPublicCart } from '@haa/shared/dto/storefront-dto';
import { resolveActiveStore } from './_shared.js';

export const cartRouter = new Hono();

const addItemSchema = z.object({
  productId: z.coerce.number(),
  variantId: z.coerce.number().optional(),
  quantity: z.coerce.number().int().positive(),
  notes: z.string().max(500).optional(),
  giftWrapSelected: z.boolean().optional(),
  sendAsGift: z.boolean().optional(),
  giftMessage: z.string().max(1000).optional(),
});

const updateItemSchema = z.object({
  quantity: z.coerce.number().int().positive(),
});

type PublicDtoInput = Record<string, unknown>;

cartRouter.post('/:slug/cart', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const cartService = new CartService();
  const cart = await cartService.createCart(store.id, undefined, c.req.header('x-session-token'));
  return c.json({ success: true, data: toPublicCart(cart as PublicDtoInput) }, 201);
});

cartRouter.get('/:slug/cart/:cartId', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const cartId = c.req.param('cartId') as string | undefined;
  if (!cartId) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Cart ID required' } }, 400);
  const cart = await new CartService().getCart(store.id, cartId);
  if (!cart) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Cart not found' } }, 404);
  return c.json({ success: true, data: toPublicCart(cart as PublicDtoInput) });
});

cartRouter.post('/:slug/cart/:cartId/items', zValidator('json', addItemSchema), async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const cartId = c.req.param('cartId') as string | undefined;
  if (!cartId) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Cart ID required' } }, 400);
  const body = c.req.valid('json');
  const cart = await new CartService().addItem(
    store.id,
    cartId,
    body.productId,
    body.quantity,
    body.notes,
    {
      giftWrapSelected: body.giftWrapSelected,
      sendAsGift: body.sendAsGift,
      giftMessage: body.giftMessage,
    },
    body.variantId,
  );
  if (!cart) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Product not available' } }, 400);
  return c.json({ success: true, data: toPublicCart(cart as PublicDtoInput) });
});

cartRouter.patch('/:slug/cart/:cartId/items/:itemId', zValidator('json', updateItemSchema), async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const cartId = c.req.param('cartId') as string | undefined;
  const itemId = Number(c.req.param('itemId'));
  if (!cartId) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Cart ID required' } }, 400);
  const body = c.req.valid('json');
  const updated = await new CartService().updateItemQuantity(store.id, cartId, itemId, body.quantity);
  if (!updated) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Cart item not found, inactive, or insufficient stock' } }, 400);
  const updatedCart = await new CartService().getCart(store.id, cartId);
  if (!updatedCart) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Cart not found' } }, 404);
  return c.json({ success: true, data: toPublicCart(updatedCart as PublicDtoInput) });
});

cartRouter.delete('/:slug/cart/:cartId/items/:itemId', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const cartId = c.req.param('cartId') as string | undefined;
  const itemId = Number(c.req.param('itemId'));
  if (!cartId) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Cart ID required' } }, 400);
  const removed = await new CartService().removeItem(store.id, cartId, itemId);
  if (!removed) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Cart item not found' } }, 404);
  const updatedCart = await new CartService().getCart(store.id, cartId);
  if (!updatedCart) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Cart not found' } }, 404);
  return c.json({ success: true, data: toPublicCart(updatedCart as PublicDtoInput) });
});
