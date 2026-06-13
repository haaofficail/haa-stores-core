import 'dotenv/config';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is required for db:explain.');
}

const sql = postgres(url, { prepare: false, max: 1 });

const storeId = Number(process.env.EXPLAIN_STORE_ID || 1);

const checks = [
  {
    name: 'products_by_store_status',
    query: sql`EXPLAIN (FORMAT JSON) SELECT * FROM products WHERE store_id = ${storeId} AND status = 'active' ORDER BY created_at DESC LIMIT 20`,
  },
  {
    name: 'orders_by_store_status',
    query: sql`EXPLAIN (FORMAT JSON) SELECT * FROM orders WHERE store_id = ${storeId} AND status = 'paid' ORDER BY created_at DESC LIMIT 50`,
  },
  {
    name: 'carts_by_session',
    query: sql`EXPLAIN (FORMAT JSON) SELECT * FROM carts WHERE store_id = ${storeId} AND session_token = 'explain-session' LIMIT 1`,
  },
  {
    name: 'wallet_entries_by_store',
    query: sql`EXPLAIN (FORMAT JSON) SELECT * FROM wallet_entries WHERE store_id = ${storeId} ORDER BY created_at DESC LIMIT 50`,
  },
  {
    name: 'webhook_events_pending',
    query: sql`EXPLAIN (FORMAT JSON) SELECT * FROM webhook_events WHERE status = 'pending' ORDER BY created_at ASC LIMIT 100`,
  },
];

const maxSeqScanRows = Number(process.env.HOT_SEQ_SCAN_MAX_ROWS || 1_000);

function largestSequentialScanRows(plan: unknown): number {
  if (!plan || typeof plan !== 'object') return 0;
  const node = plan as Record<string, unknown>;
  const ownRows = node['Node Type'] === 'Seq Scan' ? Number(node['Plan Rows'] || 0) : 0;
  const plans = Array.isArray(node.Plans) ? node.Plans : [];
  return Math.max(ownRows, ...plans.map(largestSequentialScanRows));
}

async function main(): Promise<void> {
  let failed = false;

  for (const check of checks) {
    const rows = await check.query;
    const plan = rows[0]?.['QUERY PLAN']?.[0]?.Plan;
    const seqScanRows = largestSequentialScanRows(plan);
    const hasRiskySeqScan = seqScanRows > maxSeqScanRows;
    const label = seqScanRows > 0 ? `${check.name} seq_scan_rows=${seqScanRows}` : check.name;
    console.log(`${hasRiskySeqScan ? '✗' : '✓'} ${label}`);
    if (hasRiskySeqScan && process.env.ALLOW_SEQ_SCAN !== 'true') failed = true;
  }

  await sql.end();

  if (failed) {
    console.error('db:explain found sequential scans on hot paths.');
    process.exit(1);
  }
}

main().catch(async (error) => {
  await sql.end({ timeout: 1 }).catch(() => undefined);
  console.error(error);
  process.exit(1);
});
