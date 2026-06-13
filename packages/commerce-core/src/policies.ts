import { eq, and } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';

export type PolicyType = 'privacy' | 'terms' | 'shipping' | 'returns' | 'about';

export class PoliciesService {
  constructor(private db: DbClient = createDbClient()) {}

  async list(storeId: number) {
    return this.db.select()
      .from(s.storePolicies)
      .where(eq(s.storePolicies.storeId, storeId))
      .orderBy(s.storePolicies.type);
  }

  async getByType(storeId: number, type: string) {
    const [policy] = await this.db.select()
      .from(s.storePolicies)
      .where(and(eq(s.storePolicies.storeId, storeId), eq(s.storePolicies.type, type)))
      .limit(1);
    return policy ?? null;
  }

  async upsert(storeId: number, type: string, data: { title: string; content: string }) {
    const existing = await this.getByType(storeId, type);
    const vals = { storeId, type, title: data.title, content: data.content, updatedAt: new Date() };

    if (existing) {
      const [policy] = await this.db.update(s.storePolicies)
        .set(vals)
        .where(and(eq(s.storePolicies.storeId, storeId), eq(s.storePolicies.type, type)))
        .returning();
      return policy;
    }

    const [policy] = await this.db.insert(s.storePolicies)
      .values(vals)
      .returning();
    return policy;
  }

  async publish(storeId: number, type: string) {
    const existing = await this.getByType(storeId, type);
    if (!existing) return null;
    const [policy] = await this.db.update(s.storePolicies)
      .set({ isPublished: true, updatedAt: new Date() })
      .where(and(eq(s.storePolicies.storeId, storeId), eq(s.storePolicies.type, type)))
      .returning();
    return policy;
  }

  async unpublish(storeId: number, type: string) {
    const existing = await this.getByType(storeId, type);
    if (!existing) return null;
    const [policy] = await this.db.update(s.storePolicies)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(and(eq(s.storePolicies.storeId, storeId), eq(s.storePolicies.type, type)))
      .returning();
    return policy;
  }

  async getPublished(storeId: number, type: string) {
    const [policy] = await this.db.select()
      .from(s.storePolicies)
      .where(and(eq(s.storePolicies.storeId, storeId), eq(s.storePolicies.type, type), eq(s.storePolicies.isPublished, true)))
      .limit(1);
    return policy ?? null;
  }
}
