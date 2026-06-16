import { Hono } from 'hono';
import { BasicHealthService } from '@haa/integration-core';

const healthRouter = new Hono();

healthRouter.get('/', async (c) => {
  const service = new BasicHealthService();
  const { connected } = await service.ping();

  return c.json({
    api: 'ok',
    db: connected ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export { healthRouter };
