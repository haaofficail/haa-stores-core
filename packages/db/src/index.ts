import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export * from './schema/index.js';
export { setRlsContext, clearRlsContext } from './rls.js';

export type DbClient = ReturnType<typeof drizzle>;

let _client: postgres.Sql | null = null;
let _db: DbClient | null = null;

export function createDbClient(url?: string): DbClient {
  const connectionString = url ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required. Set it in .env file (see .env.example).');
  }

  // Return cached singleton when no specific URL is requested
  if (!url && _db) return _db;

  const max = parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20', 10);
  const idleTimeout = parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000', 10);
  const connectTimeout = parseInt(process.env.DATABASE_CONNECT_TIMEOUT || '10000', 10);

  const client = postgres(connectionString, {
    prepare: false,
    max,
    idle_timeout: idleTimeout,
    connect_timeout: connectTimeout,
  });
  const db = drizzle(client, { schema });

  if (!url) {
    _client = client;
    _db = db;
  }

  return db;
}

export async function closeDbClient(): Promise<void> {
  if (_client) {
    await _client.end();
    _client = null;
    _db = null;
  }
}
