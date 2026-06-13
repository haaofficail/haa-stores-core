import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { createDbClient } from '@haa/db';

const healthRouter = new Hono();

healthRouter.get('/', async (c) => {
  const db = createDbClient();
  let dbStatus = 'unknown';
  try {
    await db.execute(sql`SELECT 1 AS ok`);
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  return c.json({
    api: 'ok',
    db: dbStatus,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export { healthRouter };
