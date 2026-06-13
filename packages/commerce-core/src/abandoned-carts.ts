import { eq, and, lt, sql, count } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';

export class AbandonedCartsService {
  constructor(private db: DbClient = createDbClient()) {}

  async list(storeId: number, hours: number = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const sessions = await this.db.select()
      .from(s.checkoutSessions)
      .where(and(
        eq(s.checkoutSessions.storeId, storeId),
        eq(s.checkoutSessions.status, 'pending'),
        lt(s.checkoutSessions.updatedAt, cutoff),
      ))
      .orderBy(s.checkoutSessions.updatedAt);

    const enriched = await Promise.all(sessions.map(async (session) => {
      const items = await this.db.select({
        item: s.cartItems,
        product: s.products,
      }).from(s.cartItems)
        .innerJoin(s.products, eq(s.cartItems.productId, s.products.id))
        .where(eq(s.cartItems.cartId, session.cartId));

      return { ...session, items };
    }));

    return enriched;
  }

  async count(storeId: number, hours: number = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [result] = await this.db.select({ total: count() })
      .from(s.checkoutSessions)
      .where(and(
        eq(s.checkoutSessions.storeId, storeId),
        eq(s.checkoutSessions.status, 'pending'),
        lt(s.checkoutSessions.updatedAt, cutoff),
      ));

    return Number(result.total);
  }

  async recoverableTotal(storeId: number, hours: number = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const result = await this.db.select({ total: sql<string>`COALESCE(SUM(${s.checkoutSessions.total}), 0)` })
      .from(s.checkoutSessions)
      .where(and(
        eq(s.checkoutSessions.storeId, storeId),
        eq(s.checkoutSessions.status, 'pending'),
        lt(s.checkoutSessions.updatedAt, cutoff),
      ));

    return Number(result[0]?.total ?? 0);
  }
}
