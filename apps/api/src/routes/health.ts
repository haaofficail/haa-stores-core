import { Hono } from 'hono';
import { BasicHealthService } from '@haa/integration-core';
import { getQueueStatus } from '../services/queue.js';

const healthRouter = new Hono();

healthRouter.get('/', async (c) => {
  const service = new BasicHealthService();
  const { connected } = await service.ping();

  // Queue reliability surface (Batch 3). Exposes mode/health only — never the
  // Redis connection string (redisConfigured is a boolean, set in the service).
  const q = getQueueStatus();

  return c.json({
    api: 'ok',
    db: connected ? 'connected' : 'disconnected',
    queue: {
      status: q.health,
      mode: q.mode,
      backend: q.backend,
      redisConfigured: q.redisConfigured,
      reason: q.reason,
    },
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
