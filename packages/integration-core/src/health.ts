import { createDbClient, DbClient } from '@haa/db';
import { sql } from 'drizzle-orm';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: {
    database: { status: 'up' | 'down'; latency: number };
    redis: { status: 'up' | 'down'; latency: number };
    api: { status: 'up' | 'down' };
  };
}

export class HealthCheckService {
  constructor(private db: DbClient = createDbClient()) {}

  async check(): Promise<HealthStatus> {
    const start = Date.now();
    const results: HealthStatus['checks'] = {
      api: { status: 'up' },
      database: { status: 'down', latency: 0 },
      redis: { status: 'down', latency: 0 },
    };

    // 1. Database Check
    try {
      const dbStart = Date.now();
      await this.db.select({ result: sql`1` });
      results.database = { status: 'up', latency: Date.now() - dbStart };
    } catch (e) {
      console.error('HealthCheck: Database Down', e);
    }

    // 2. Redis Check
    try {
      const redisStart = Date.now();
      if (!process.env.REDIS_URL) {
        results.redis = { status: 'down', latency: Date.now() - redisStart };
      } else {
        results.redis = { status: 'down', latency: Date.now() - redisStart };
      }
    } catch (e) {
      console.error('HealthCheck: Redis Down', e);
    }

    const overallStatus = 
      (results.database.status === 'up' && results.redis.status === 'up') 
      ? 'healthy' 
      : (results.database.status === 'up' || results.redis.status === 'up') 
        ? 'degraded' 
        : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results,
    };
  }
}
