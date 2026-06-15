import { sql } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';

/**
 * BasicHealthService — owns the simple DB liveness ping.
 *
 * This service is intentionally separate from the existing
 * `HealthCheckService` in this package. That service returns a
 * k8s-style readiness shape (`{status, timestamp, checks: {...}}`)
 * and is meant for orchestrated environments. The basic health
 * route (`apps/api/src/routes/health.ts`) returns a SIMPLER
 * liveness shape (`{api, db, environment, timestamp, uptime}`)
 * for ops dashboards and CI synthetic checks. Mixing the two
 * would change the response shape of the basic route, which
 * monitoring tools may depend on.
 *
 * Originally extracted from `apps/api/src/routes/health.ts` as
 * part of Quality Pass 5, Route Migration 3/24.
 */

export interface BasicHealthPingResult {
  /** True if the DB answered SELECT 1 within the call's lifetime. */
  connected: boolean;
}

export class BasicHealthService {
  constructor(private db: DbClient = createDbClient()) {}

  /**
   * Run a no-op query against the database. Returns whether the
   * query succeeded. The caller maps the boolean to whatever
   * string shape its response needs.
   *
   * Errors are swallowed (return false) — the caller is expected
   * to treat a failed ping as "not connected" without needing to
   * know the underlying error. This matches the original route's
   * behavior exactly.
   */
  async ping(): Promise<BasicHealthPingResult> {
    try {
      await this.db.execute(sql`SELECT 1 AS ok`);
      return { connected: true };
    } catch {
      return { connected: false };
    }
  }
}

/** Shared default instance for ad-hoc callers (most code uses DI). */
export const basicHealthService = new BasicHealthService();
