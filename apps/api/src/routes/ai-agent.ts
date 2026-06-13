import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { AiCommerceAgent } from '@haa/commerce-core';
import { requireAuth, requireStoreAccess } from '@haa/auth-core';

const aiRouter = new Hono();
aiRouter.use('*', requireAuth(), requireStoreAccess());

aiRouter.get('/daily-summary', async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const result = await new AiCommerceAgent().getDailySummary(storeId);
  return c.json({ success: true, data: result });
});

aiRouter.get('/weekly-summary', async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const result = await new AiCommerceAgent().getWeeklySummary(storeId);
  return c.json({ success: true, data: result });
});

aiRouter.get('/sales-decline', async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const result = await new AiCommerceAgent().analyzeSalesDecline(storeId);
  return c.json({ success: true, data: result });
});

aiRouter.get('/product-suggestions', async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const result = await new AiCommerceAgent().suggestProductImprovements(storeId);
  return c.json({ success: true, data: result });
});

aiRouter.post('/product-title', zValidator('json', z.object({
  productName: z.string().optional(),
  category: z.string().optional(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const result = await new AiCommerceAgent().generateProductTitle(storeId, c.req.valid('json'));
  return c.json({ success: true, data: result });
});

aiRouter.post('/product-description', zValidator('json', z.object({
  productName: z.string().optional(),
  category: z.string().optional(),
  features: z.string().optional(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const result = await new AiCommerceAgent().generateProductDescription(storeId, c.req.valid('json'));
  return c.json({ success: true, data: result });
});

aiRouter.get('/promotions', async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const result = await new AiCommerceAgent().suggestPromotions(storeId);
  return c.json({ success: true, data: result });
});

aiRouter.get('/abandoned-carts', async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const result = await new AiCommerceAgent().analyzeAbandonedCarts(storeId);
  return c.json({ success: true, data: result });
});

aiRouter.get('/wallet', async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const result = await new AiCommerceAgent().explainWallet(storeId);
  return c.json({ success: true, data: result });
});

aiRouter.post('/generate-products', zValidator('json', z.object({
  category: z.string().optional(),
  count: z.number().optional(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const result = await new AiCommerceAgent().generateProducts(storeId, c.req.valid('json'));
  return c.json({ success: true, data: result });
});

aiRouter.post('/chat', zValidator('json', z.object({
  prompt: z.string(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const { prompt, history } = c.req.valid('json');
  const result = await new AiCommerceAgent().chat(storeId, prompt, history);
  return c.json({ success: true, data: result });
});

aiRouter.post('/execute', zValidator('json', z.object({
  action: z.string(),
  params: z.record(z.any()),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const { action, params } = c.req.valid('json');
  const result = await new AiCommerceAgent().executeAction(storeId, action, params);
  return c.json({ success: true, data: result });
});

export { aiRouter };
