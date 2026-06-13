import 'dotenv/config';
import { Queue, Worker, type JobsOptions } from 'bullmq';
import { closeDbClient } from '@haa/db';
import { env } from './env.js';

export const JOB_QUEUE_NAME = 'haa-production-jobs';

export const JOB_NAMES = {
  marketplaceSync: 'marketplace.sync',
  webhookDeliver: 'webhook.deliver',
  imageOptimize: 'image.optimize',
  cartRecover: 'cart.recover',
  reportExport: 'report.export',
} as const;

type JobName = typeof JOB_NAMES[keyof typeof JOB_NAMES];

const redisUrl = process.env.QUEUE_REDIS_URL || process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error('QUEUE_REDIS_URL or REDIS_URL is required to start workers.');
}

const parsedRedisUrl = new URL(redisUrl);
const connection = {
  host: parsedRedisUrl.hostname,
  port: Number(parsedRedisUrl.port || 6379),
  username: parsedRedisUrl.username || undefined,
  password: parsedRedisUrl.password || undefined,
  db: Number(parsedRedisUrl.pathname.replace('/', '') || 0),
  tls: parsedRedisUrl.protocol === 'rediss:' ? {} : undefined,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
};

export const productionQueue = new Queue(JOB_QUEUE_NAME, { connection });

const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { age: 60 * 60 * 24, count: 5_000 },
  removeOnFail: { age: 60 * 60 * 24 * 7, count: 10_000 },
};

export async function scheduleRecurringJobs(): Promise<void> {
  if (process.env.ENABLE_MARKETPLACE_SYNC_WORKER === 'false') return;

  await productionQueue.add(
    JOB_NAMES.marketplaceSync,
    {},
    {
      ...defaultJobOptions,
      jobId: 'marketplace.sync.recurring',
      repeat: { every: Number(process.env.MARKETPLACE_SYNC_INTERVAL_MS || 5 * 60 * 1000) },
    },
  );
}

async function handleJob(name: JobName, data: unknown): Promise<unknown> {
  switch (name) {
    case JOB_NAMES.marketplaceSync: {
      const { syncAllStores } = await import('./routes/marketplaces.js');
      return syncAllStores();
    }
    case JOB_NAMES.webhookDeliver:
    case JOB_NAMES.imageOptimize:
    case JOB_NAMES.cartRecover:
    case JOB_NAMES.reportExport:
      throw new Error(`${name} worker handler is not wired yet. Keep this job disabled until its service is moved out of HTTP.`);
    default:
      throw new Error(`Unknown job: ${name}`);
  }
}

const concurrency = Number(process.env.WORKER_CONCURRENCY || 5);

await scheduleRecurringJobs();

const worker = new Worker(
  JOB_QUEUE_NAME,
  async (job) => {
    return handleJob(job.name as JobName, job.data);
  },
  { connection, concurrency },
);

worker.on('completed', (job) => {
  console.log(`[worker] completed ${job.name}#${job.id}`);
});

worker.on('failed', (job, error) => {
  console.error(`[worker] failed ${job?.name}#${job?.id}:`, error);
});

console.log(`Haa Stores worker started in ${env.NODE_ENV} with concurrency=${concurrency}`);

async function shutdown(): Promise<void> {
  await worker.close();
  await productionQueue.close();
  await closeDbClient();
}

process.on('SIGTERM', () => shutdown().finally(() => process.exit(0)));
process.on('SIGINT', () => shutdown().finally(() => process.exit(0)));
