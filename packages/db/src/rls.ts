import { sql } from 'drizzle-orm';
import type { DbClient } from './index.js';

export async function setRlsContext(
  db: DbClient,
  storeId: number,
  tenantId: number,
): Promise<void> {
  await db.execute(
    sql`SELECT set_tenant_context(${storeId}, ${tenantId})`,
  );
}

export function clearRlsContext(): string {
  return 'SELECT set_config(\'app.current_store_id\', \'0\', TRUE), set_config(\'app.current_tenant_id\', \'0\', TRUE)';
}
