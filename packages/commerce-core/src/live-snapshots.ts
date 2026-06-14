import { and, eq, gte, lte, sql, count, isNotNull } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { LivePresenceService } from './live-presence.js';
import type { LivePageInfo } from '@haa/shared';

const SNAPSHOT_INTERVAL_MS = 15 * 60 * 1000;

function now(): Date {
  return new Date();
}

function roundToInterval(date: Date, intervalMs: number): Date {
  const rounded = new Date(Math.floor(date.getTime() / intervalMs) * intervalMs);
  return rounded;
}

export interface LiveSnapshot {
  id: number;
  storeId: number;
  onlineVisitors: number;
  activeProductViewers: number;
  activeCarts: number;
  activeCheckouts: number;
  currentCartValueTotal: string;
  ordersLast30Min: number;
  paidOrdersLast30Min: number;
  revenueLast30Min: string;
  paymentFailuresLast30Min: number;
  topPages: { path: string; pageType: string; visitorCount: number }[];
  topProducts: { productId: number; productName: string; viewers: number }[];
  topSources: { label: string; count: number }[];
  createdAt: string;
}

export class LiveSnapshotService {
  constructor(private db: DbClient = createDbClient()) {}

  async createSnapshot(storeId: number): Promise<LiveSnapshot | null> {
    const snapshotTime = roundToInterval(now(), SNAPSHOT_INTERVAL_MS);

    const existing = await this.db
      .select({ id: s.liveRadarSnapshots.id })
      .from(s.liveRadarSnapshots)
      .where(and(eq(s.liveRadarSnapshots.storeId, storeId), eq(s.liveRadarSnapshots.createdAt, snapshotTime)))
      .limit(1);

    if (existing.length > 0) {
      return null;
    }

    const presence = new LivePresenceService(this.db);
    const overview = await presence.getOverview(storeId);
    const pages = await presence.getPages(storeId);
    const sources = await presence.getSources(storeId);

    const topPages: { path: string; pageType: string; visitorCount: number }[] =
      pages.activePages.slice(0, 10).map((p) => ({
        path: p.path,
        pageType: p.pageType,
        visitorCount: p.visitorCount,
      }));

    const topProducts: { productId: number; productName: string; viewers: number }[] =
      pages.topViewedProductsNow.slice(0, 10).map((p) => ({
        productId: p.productId,
        productName: p.productName,
        viewers: p.viewers,
      }));

    const topSources: { label: string; count: number }[] =
      sources.visitorsByUtmSource.slice(0, 10).map((s) => ({
        label: s.label,
        count: s.count,
      }));

    const [inserted] = await this.db
      .insert(s.liveRadarSnapshots)
      .values({
        storeId,
        onlineVisitors: overview.onlineVisitors,
        activeProductViewers: overview.activeProductViewers,
        activeCarts: overview.activeCarts,
        activeCheckouts: overview.activeCheckouts,
        currentCartValueTotal: overview.currentCartValueTotal,
        ordersLast30Min: overview.ordersLast30Min,
        paidOrdersLast30Min: overview.paidOrdersLast30Min,
        revenueLast30Min: overview.revenueLast30Min,
        paymentFailuresLast30Min: overview.paymentFailuresLast30Min,
        topPages,
        topProducts,
        topSources,
        createdAt: snapshotTime,
      })
      .returning();

    return {
      id: inserted.id,
      storeId,
      onlineVisitors: overview.onlineVisitors,
      activeProductViewers: overview.activeProductViewers,
      activeCarts: overview.activeCarts,
      activeCheckouts: overview.activeCheckouts,
      currentCartValueTotal: overview.currentCartValueTotal,
      ordersLast30Min: overview.ordersLast30Min,
      paidOrdersLast30Min: overview.paidOrdersLast30Min,
      revenueLast30Min: overview.revenueLast30Min,
      paymentFailuresLast30Min: overview.paymentFailuresLast30Min,
      topPages,
      topProducts,
      topSources,
      createdAt: snapshotTime.toISOString(),
    };
  }

  async createSnapshotsForActiveStores(): Promise<number> {
    const activeStoreIds = await this.db
      .select({ id: s.stores.id })
      .from(s.stores)
      .where(eq(s.stores.status, 'active'));

    let created = 0;
    for (const store of activeStoreIds) {
      const snapshot = await this.createSnapshot(store.id);
      if (snapshot) created++;
    }
    return created;
  }

  async getHistory(
    storeId: number,
    range: '24h' | '7d' = '24h',
    interval: '15m' | '1h' = '15m'
  ): Promise<LiveSnapshot[]> {
    const now_ = now();
    let startDate: Date;
    if (range === '24h') {
      startDate = new Date(now_.getTime() - 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now_.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const intervalMs = interval === '15m' ? 15 * 60 * 1000 : 60 * 60 * 1000;
    const bucketCol = interval === '15m'
      ? sql`date_trunc('minute', ${s.liveRadarSnapshots.createdAt})`
      : sql`date_trunc('hour', ${s.liveRadarSnapshots.createdAt})`;

    const rows = await this.db
      .select({
        id: s.liveRadarSnapshots.id,
        storeId: s.liveRadarSnapshots.storeId,
        onlineVisitors: s.liveRadarSnapshots.onlineVisitors,
        activeProductViewers: s.liveRadarSnapshots.activeProductViewers,
        activeCarts: s.liveRadarSnapshots.activeCarts,
        activeCheckouts: s.liveRadarSnapshots.activeCheckouts,
        currentCartValueTotal: s.liveRadarSnapshots.currentCartValueTotal,
        ordersLast30Min: s.liveRadarSnapshots.ordersLast30Min,
        paidOrdersLast30Min: s.liveRadarSnapshots.paidOrdersLast30Min,
        revenueLast30Min: s.liveRadarSnapshots.revenueLast30Min,
        paymentFailuresLast30Min: s.liveRadarSnapshots.paymentFailuresLast30Min,
        topPages: s.liveRadarSnapshots.topPages,
        topProducts: s.liveRadarSnapshots.topProducts,
        topSources: s.liveRadarSnapshots.topSources,
        createdAt: s.liveRadarSnapshots.createdAt,
      })
      .from(s.liveRadarSnapshots)
      .where(
        and(
          eq(s.liveRadarSnapshots.storeId, storeId),
          gte(s.liveRadarSnapshots.createdAt, startDate),
          lte(s.liveRadarSnapshots.createdAt, now_),
        )
      )
      .orderBy(s.liveRadarSnapshots.createdAt);

    return rows.map((r) => ({
      id: r.id,
      storeId: r.storeId,
      onlineVisitors: r.onlineVisitors,
      activeProductViewers: r.activeProductViewers,
      activeCarts: r.activeCarts,
      activeCheckouts: r.activeCheckouts,
      currentCartValueTotal: String(r.currentCartValueTotal),
      ordersLast30Min: r.ordersLast30Min,
      paidOrdersLast30Min: r.paidOrdersLast30Min,
      revenueLast30Min: String(r.revenueLast30Min),
      paymentFailuresLast30Min: r.paymentFailuresLast30Min,
      topPages: (r.topPages as any) ?? [],
      topProducts: (r.topProducts as any) ?? [],
      topSources: (r.topSources as any) ?? [],
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    }));
  }
}

export async function runLiveSnapshotCron(db?: DbClient): Promise<number> {
  const service = new LiveSnapshotService(db);
  return service.createSnapshotsForActiveStores();
}