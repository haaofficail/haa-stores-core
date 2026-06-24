import { eq, and, count, like, or } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';

export class CustomersService {
  constructor(private db: DbClient = createDbClient()) {}

  async list(storeId: number, opts?: { page?: number; limit?: number; search?: string }) {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const conditions = [eq(s.customers.storeId, storeId)];

    if (opts?.search) {
      conditions.push(or(
        like(s.customers.name, `%${opts.search}%`),
        like(s.customers.phone, `%${opts.search}%`),
        like(s.customers.email, `%${opts.search}%`),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- drizzle SQL builder return-type quirk; touched while adding findByEmail
      ) as any);
    }

    const [totalResult] = await this.db.select({ total: count() }).from(s.customers).where(and(...conditions));
    const total = Number(totalResult.total);
    const items = await this.db.select()
      .from(s.customers)
      .where(and(...conditions))
      .limit(limit).offset((page - 1) * limit)
      .orderBy(s.customers.createdAt);

    return { data: items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(storeId: number, id: number) {
    const [customer] = await this.db.select()
      .from(s.customers)
      .where(and(eq(s.customers.id, id), eq(s.customers.storeId, storeId)))
      .limit(1);
    if (!customer) return null;
    const addresses = await this.db.select()
      .from(s.customerAddresses)
      .where(eq(s.customerAddresses.customerId, id));
    return { ...customer, addresses };
  }

  async findByPhone(storeId: number, phone: string) {
    const [customer] = await this.db.select()
      .from(s.customers)
      .where(and(eq(s.customers.phone, phone), eq(s.customers.storeId, storeId)))
      .limit(1);
    return customer ?? null;
  }

  /**
   * Lookup by normalized email (lowercased + trimmed). Returns null
   * when the email isn't a registered customer — callers must NOT
   * leak this distinction to public surfaces (no enumeration).
   */
  async findByEmail(storeId: number, email: string) {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;
    const [customer] = await this.db.select()
      .from(s.customers)
      .where(and(eq(s.customers.email, normalized), eq(s.customers.storeId, storeId)))
      .limit(1);
    return customer ?? null;
  }

  async create(storeId: number, data: { name: string; phone: string; email?: string; notes?: string }) {
    const [customer] = await this.db.insert(s.customers).values({
      storeId, name: data.name, phone: data.phone, email: data.email ?? null, notes: data.notes ?? null,
    }).returning();
    return customer;
  }

  async update(storeId: number, id: number, data: { name?: string; phone?: string; email?: string; notes?: string }) {
    const [customer] = await this.db.update(s.customers).set({ ...data, updatedAt: new Date() })
      .where(and(eq(s.customers.id, id), eq(s.customers.storeId, storeId)))
      .returning();
    return customer ?? null;
  }

  async findOrCreate(storeId: number, data: { name: string; phone: string; email?: string }) {
    const existing = await this.findByPhone(storeId, data.phone);
    if (existing) {
      if (data.email && existing.email !== data.email) {
        await this.db.update(s.customers).set({ email: data.email, updatedAt: new Date() })
          .where(eq(s.customers.id, existing.id));
      }
      return existing;
    }
    const [customer] = await this.db.insert(s.customers).values({
      storeId, name: data.name, phone: data.phone, email: data.email ?? null,
    }).returning();
    return customer;
  }
}
