import 'dotenv/config';
import { closeDbClient } from '@haa/db';
import { env } from './env.js';

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
  const start = Date.now();
  try {
    await job.handler();
    console.log(`[scheduler] completed ${job.name} in ${Date.now() - start}ms`);
  } catch (error) {
    console.error(`[scheduler] failed ${job.name}:`, error);
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

async function shutdown(): Promise<void> {
  stopScheduler();
  await closeDbClient();
}

process.on('SIGTERM', () => shutdown().finally(() => process.exit(0)));
process.on('SIGINT', () => shutdown().finally(() => process.exit(0)));

console.log(`Haa Stores scheduler started in ${env.NODE_ENV}`);