// Storefront route aggregator — combines store-info, products, cart, checkout, and support sub-routers.
// Split from apps/api/src/routes/storefront.ts in Quality Pass 2 (Item 2.2).

import { Hono } from 'hono';
import { storeInfoRouter } from './store-info.js';
import { productsRouter } from './products.js';
import { cartRouter } from './cart.js';
import { checkoutRouter } from './checkout.js';
import { supportRouter } from './support.js';
import { pixelsPublicRouter } from './pixels.js';
import { cartRecoveryRouter } from './cart-recovery.js';
import { loyaltyPublicRouter } from './loyalty-public.js';
import { unsubscribeRouter } from './unsubscribe.js';
import { myOrdersRouter } from './my-orders.js';

export const storefrontRouter = new Hono();

// Mount sub-routers. All sub-routers handle their own route patterns and middlewares.
// NOTE: routers exposing literal single-segment paths (e.g. `/pixels`) MUST be
// mounted BEFORE storeInfoRouter, whose catch-all `GET /:slug` would otherwise
// shadow them (matching "pixels" as a store slug → 404). See
// tests/storefront-pixels-route.test.ts.
storefrontRouter.route('/', pixelsPublicRouter);
storefrontRouter.route('/', storeInfoRouter);
storefrontRouter.route('/', productsRouter);
storefrontRouter.route('/', cartRouter);
storefrontRouter.route('/', checkoutRouter);
storefrontRouter.route('/', supportRouter);
storefrontRouter.route('/', cartRecoveryRouter);
storefrontRouter.route('/', loyaltyPublicRouter);
storefrontRouter.route('/', unsubscribeRouter);
storefrontRouter.route('/', myOrdersRouter);
