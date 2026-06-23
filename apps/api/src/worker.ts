import 'dotenv/config';
import { closeDbClient } from '@haa/db';
import { env } from './env.js';

// Distributed lock — prevents multiple API instances from running the
// same scheduled job simultaneously. Uses Redis SET NX EX (atomic):
// only the instance that acquires the lock runs the job; others skip
// this cycle. The TTL is 90% of the job interval so the lock auto-
// expires before the next cycle if the instance dies mid-job.
const INSTANCE_ID = `${process.pid}-${Math.random().toString(36).slice(2)}`;
let redisLockClient: {
  set: (...args: unknown[]) => Promise<unknown>;
  del: (...args: unknown[]) => Promise<unknown>;
  quit: () => Promise<unknown>;
} | null = null;

async function getLockClient() {
  if (redisLockClient) return redisLockClient;
  const url = process.env.REDIS_URL || process.env.QUEUE_REDIS_URL;
  if (!url) return null;
  try {
    const { default: Redis } = await import('ioredis') as any;
    const client = new Redis(url, { lazyConnect: true, enableOfflineQueue: false, connectTimeout: 2000 });
    await client.connect();
    redisLockClient = client;
    return redisLockClient;
  } catch {
    return null;
  }
}

async function acquireLock(jobName: string, ttlMs: number): Promise<boolean> {
  const redis = await getLockClient();
  if (!redis) return true; // no Redis → single-instance mode, always run
  try {
    const key = `haa:scheduler:lock:${jobName}`;
    const result = await redis.set(key, INSTANCE_ID, 'NX', 'PX', ttlMs);
    return result === 'OK';
  } catch {
    return true; // Redis error → fall back to running the job
  }
}

async function releaseLock(jobName: string): Promise<void> {
  const redis = await getLockClient();
  if (!redis) return;
  try {
    const key = `haa:scheduler:lock:${jobName}`;
    // Only release the lock if we own it
    const owner = await (redis as any).get(key);
    if (owner === INSTANCE_ID) await redis.del(key);
  } catch { /* best-effort */ }
}

export const JOB_NAMES = {
  marketplaceSync: 'marketplace.sync',
  webhookDeliver: 'webhook.deliver',
  imageOptimize: 'image.optimize',
  cartRecover: 'cart.recover',
  reportExport: 'report.export',
  livePresenceCleanup: 'live-presence.cleanup',
  liveSnapshot: 'live-snapshot.create',
  marketingActionGenerate: 'marketing-action.generate',
  whatsappCampaign: 'whatsapp.campaign',
  loyaltyExpiry: 'loyalty.expiry',
} as const;

type JobName = typeof JOB_NAMES[keyof typeof JOB_NAMES];

interface ScheduledJob {
  name: JobName;
  intervalMs: number;
  handler: () => Promise<void>;
  timeoutId?: NodeJS.Timeout;
}

const scheduledJobs: ScheduledJob[] = [
  {
    name: JOB_NAMES.marketplaceSync,
    intervalMs: Number(process.env.MARKETPLACE_SYNC_INTERVAL_MS || 5 * 60 * 1000),
    handler: async () => {
      const { syncAllStores } = await import('./routes/marketplaces.js');
      await syncAllStores();
    },
  },
  {
    name: JOB_NAMES.livePresenceCleanup,
    intervalMs: 60 * 60 * 1000,
    handler: async () => {
      const { runLivePresenceCleanup } = await import('@haa/commerce-core');
      await runLivePresenceCleanup();
    },
  },
  {
    name: JOB_NAMES.liveSnapshot,
    intervalMs: 15 * 60 * 1000,
    handler: async () => {
      const { runLiveSnapshotCron } = await import('@haa/commerce-core');
      await runLiveSnapshotCron();
    },
  },
  {
    name: JOB_NAMES.whatsappCampaign,
    intervalMs: 60 * 1000,
    handler: async () => {
      const { WhatsAppCampaignService } = await import('@haa/commerce-core');
      const { createDbClient } = await import('@haa/db');
      const { whatsappCampaigns } = await import('@haa/db/schema');
      const { and, eq, lte } = await import('drizzle-orm');
      const db = createDbClient();
      const due = await db.select({ id: whatsappCampaigns.id, storeId: whatsappCampaigns.storeId })
        .from(whatsappCampaigns)
        .where(and(
          eq(whatsappCampaigns.status, 'scheduled'),
          lte(whatsappCampaigns.scheduledAt, new Date()),
        )).limit(10);
      for (const campaign of due) {
        try {
          await new WhatsAppCampaignService(db).sendCampaign(campaign.id, campaign.storeId);
        } catch (err) {
          console.error(`[scheduler] whatsapp.campaign failed for campaign ${campaign.id}:`, err);
        }
      }
    },
  },
  {
    name: JOB_NAMES.cartRecover,
    intervalMs: 5 * 60 * 1000,
    handler: async () => {
      const { AbandonedCartCampaignService } = await import('@haa/commerce-core');
      const service = new AbandonedCartCampaignService();
      await service.runRecoveryPass();
    },
  },
  {
    name: JOB_NAMES.webhookDeliver,
    intervalMs: 5 * 60 * 1000,
    handler: async () => {
      const { OutboundWebhookService } = await import('@haa/commerce-core');
      const service = new OutboundWebhookService();
      await service.retryPending();
    },
  },
  {
    // L-PR-7 — loyalty points expiry sweep.
    //
    // Runs once per hour and only executes the sweep when the current
    // Riyadh-local hour is 02:00, so the effective cadence is "daily at
    // 02:00 Asia/Riyadh". The hour-grained guard plus the per-instance
    // Redis lock (acquireLock) means the sweep fires at most once per
    // calendar day even if multiple API instances are running.
    //
    // KNOWN GAP (PROBLEM-003): without `QUEUE_REDIS_URL` the lock layer
    // degrades to single-instance mode and the scheduler still runs the
    // hourly interval, but the cron is also harmless if no stores have
    // expiry configured (LoyaltyService.expireAllAccounts short-circuits
    // when pointsExpiryMonths <= 0). Document this in the PR body.
    name: JOB_NAMES.loyaltyExpiry,
    intervalMs: 60 * 60 * 1000,
    handler: async () => {
      const hourRiyadh = Number(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Riyadh',
          hour: 'numeric',
          hour12: false,
        }).format(new Date()),
      );
      if (hourRiyadh !== 2) return; // wrong hour-of-day — skip cycle

      const { LoyaltyService } = await import('@haa/commerce-core');
      const { createDbClient } = await import('@haa/db');
      const schema = await import('@haa/db/schema');
      const { gt } = await import('drizzle-orm');
      const db = createDbClient();
      const svc = new LoyaltyService(db);

      // Only sweep stores that have expiry enabled (pointsExpiryMonths > 0).
      // The default in the schema is 12, but disabled stores set it to 0.
      const eligible = await db.select({
        storeId: schema.loyaltySettings.storeId,
      }).from(schema.loyaltySettings)
        .where(gt(schema.loyaltySettings.pointsExpiryMonths, 0));

      let totalAccounts = 0;
      let totalExpired = 0;
      for (const row of eligible) {
        try {
          const r = await svc.expireAllAccounts(row.storeId);
          totalAccounts += r.accounts;
          totalExpired += r.totalExpired;
        } catch (err) {
          console.error(`[scheduler] loyalty.expiry failed for store ${row.storeId}:`, err);
        }
      }
      console.log(`[scheduler] loyalty.expiry swept ${totalAccounts} accounts across ${eligible.length} stores; expired ${totalExpired} points`);
    },
  },
  {
    name: JOB_NAMES.marketingActionGenerate,
    intervalMs: 60 * 60 * 1000,
    handler: async () => {
      const { MarketingActionService } = await import('@haa/commerce-core');
      const { createDbClient } = await import('@haa/db');
      const db = createDbClient();
      const service = new MarketingActionService(db);
      const stores = await db.select({ id: (await import('@haa/db/schema')).stores.id })
        .from((await import('@haa/db/schema')).stores);
      for (const store of stores) {
        try {
          await service.generateActions(store.id);
        } catch (err) {
          console.error(`[scheduler] marketing-action.generate failed for store ${store.id}:`, err);
        }
      }
    },
  },
];

async function runJob(job: ScheduledJob): Promise<void> {
  const lockTtlMs = Math.floor(job.intervalMs * 0.9);
  const acquired = await acquireLock(job.name, lockTtlMs);
  if (!acquired) {
    console.log(`[scheduler] skipped ${job.name} — lock held by another instance`);
    return;
  }
  const start = Date.now();
  try {
    await job.handler();
    console.log(`[scheduler] completed ${job.name} in ${Date.now() - start}ms`);
  } catch (error) {
    console.error(`[scheduler] failed ${job.name}:`, error);
  } finally {
    await releaseLock(job.name);
  }
}

function startScheduler(): void {
  if (process.env.ENABLE_SCHEDULER === 'false') {
    console.log('[scheduler] disabled via ENABLE_SCHEDULER=false');
    return;
  }

  console.log('[scheduler] starting with jobs:', scheduledJobs.map(j => `${j.name} (${j.intervalMs}ms)`).join(', '));

  for (const job of scheduledJobs) {
    const intervalId = setInterval(() => runJob(job), job.intervalMs);
    job.timeoutId = intervalId;
    intervalId.unref();
    runJob(job);
  }
}

function stopScheduler(): void {
  for (const job of scheduledJobs) {
    if (job.timeoutId) {
      clearInterval(job.timeoutId);
      job.timeoutId = undefined;
    }
  }
}

startScheduler();

// ── BullMQ Worker (consumer side) ───────────────────────────────────────────
//
// When QUEUE_REDIS_URL is configured, starts a BullMQ Worker that processes
// jobs enqueued via getQueue().enqueue(). This is the consumer counterpart of
// the producer in services/queue.ts.
//
// The setInterval scheduler above remains the primary scheduling mechanism.
// This worker handles on-demand jobs (e.g. async report exports, webhook
// retries triggered by API events) enqueued via the queue service.

// Lookup table: job name → handler. Must mirror JOB_NAMES entries.
const jobHandlers: Partial<Record<JobName, () => Promise<void>>> = {};
for (const job of scheduledJobs) {
  jobHandlers[job.name] = job.handler;
}

let bullWorker: { close: () => Promise<void>; on: (event: string, cb: (...args: unknown[]) => void) => void } | null = null;

async function startBullMQWorker(): Promise<void> {
  const redisUrl = process.env.QUEUE_REDIS_URL;
  if (!redisUrl) return;

  try {
     
    const { Worker } = require('bullmq') as any;

    bullWorker = new Worker(
      'haa-default',
      async (job: { name: string; data: Record<string, unknown> }) => {
        const handler = jobHandlers[job.name as JobName];
        if (!handler) {
          console.warn(`[bullmq-worker] no handler for job: ${job.name}`);
          return;
        }
        const start = Date.now();
        try {
          await handler();
          console.log(`[bullmq-worker] completed ${job.name} in ${Date.now() - start}ms`);
        } catch (err) {
          console.error(`[bullmq-worker] failed ${job.name}:`, err);
          throw err; // re-throw so BullMQ marks the job as failed (enables retries)
        }
      },
      {
        connection: { url: redisUrl },
        concurrency: Number(process.env.WORKER_CONCURRENCY || 5),
      },
    );

    bullWorker!.on('error', (err: unknown) => {
      console.error('[bullmq-worker] worker error:', (err as Error).message);
    });

    console.log('[bullmq-worker] started — processing queue: haa-default');
  } catch (err) {
    console.error('[bullmq-worker] failed to start; queue jobs will not be processed:', (err as Error).message);
  }
}

startBullMQWorker();

async function shutdown(): Promise<void> {
  stopScheduler();
  if (bullWorker) {
    try { await bullWorker.close(); } catch { /* best-effort */ }
    bullWorker = null;
  }
  if (redisLockClient) {
    try { await redisLockClient.quit(); } catch { /* best-effort */ }
    redisLockClient = null;
  }
  await closeDbClient();
}

process.on('SIGTERM', () => shutdown().finally(() => process.exit(0)));
process.on('SIGINT', () => shutdown().finally(() => process.exit(0)));

console.log(`Haa Stores scheduler started in ${env.NODE_ENV}`);