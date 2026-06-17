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
    // TASK-0038 G8: hosting region + data residency surface.
    // Operators and owner can verify the deployment region from
    // this endpoint. 'pending' means owner hasn't confirmed yet.
    hostingRegion: process.env.HOSTING_REGION || 'pending',
    dataResidency: process.env.DATA_RESIDENCY || 'pending',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export { healthRouter };
