import { createDbClient, type DbClient } from '@haa/db';

const TEST_DB_URL = process.env.TEST_DATABASE_URL
  ?? process.env.DATABASE_URL?.replace(/\/[^/]+$/, '/haastores_test')
  ?? 'postgres://haa:haa_secret_2024@localhost:5432/haastores_test';

process.env.DATABASE_URL = TEST_DB_URL;

export const db: DbClient = createDbClient();
