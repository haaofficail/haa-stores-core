// Storefront route aggregator — combines store-info, products, cart, checkout, and support sub-routers.
// Split from apps/api/src/routes/storefront.ts in Quality Pass 2 (Item 2.2).

import { Hono } from 'hono';
import { storeInfoRouter } from './store-info.js';
import { productsRouter } from './products.js';
import { cartRouter } from './cart.js';
import { checkoutRouter } from './checkout.js';
import { supportRouter } from './support.js';

export const storefrontRouter = new Hono();

// Mount sub-routers. All sub-routers handle their own route patterns and middlewares.
storefrontRouter.route('/', storeInfoRouter);
storefrontRouter.route('/', productsRouter);
storefrontRouter.route('/', cartRouter);
storefrontRouter.route('/', checkoutRouter);
storefrontRouter.route('/', supportRouter);
