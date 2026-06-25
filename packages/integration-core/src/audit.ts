import { eq, and, count, desc, gte, lte, SQL } from 'drizzle-orm';
import { createDbClient, type DbOrTx } from '@haa/db';
import * as s from '@haa/db/schema';
import type { AuditAction } from '@haa/shared';
import { maskIP, maskObject } from '@haa/shared';

interface AuditInput {
  actorUserId?: number | null;
  tenantId?: number | null;
  storeId?: number | null;
  action: AuditAction;
  entityType: string;
  entityId?: number | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditListOptions {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export class AuditLogService {
  constructor(private db: DbOrTx = createDbClient()) {}

  async record(input: AuditInput) {
    const [log] = await this.db.insert(s.auditLogs).values({
      actorUserId: input.actorUserId ?? null,
      tenantId: input.tenantId ?? null,
      storeId: input.storeId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      oldValue: input.oldValue ? maskObject(input.oldValue) : null,
      newValue: input.newValue ? maskObject(input.newValue) : null,
      ipAddress: input.ipAddress ? maskIP(input.ipAddress) : null,
      userAgent: input.userAgent ?? null,
    }).returning();
    return log;
  }

  private buildConditions(storeId: number, opts?: AuditListOptions): SQL[] {
    // `storeId` is REQUIRED — the previous signature accepted an
    // optional storeId and silently returned ALL platform audit logs
    // when omitted. A future caller forgetting to pass it would leak
    // every store's history. Audit P0 follow-up (2026-06-25).
    const conditions: SQL[] = [eq(s.auditLogs.storeId, storeId)];
    if (opts?.action) conditions.push(eq(s.auditLogs.action, opts.action));
    if (opts?.entityType) conditions.push(eq(s.auditLogs.entityType, opts.entityType));
    if (opts?.dateFrom) conditions.push(gte(s.auditLogs.createdAt, new Date(opts.dateFrom)));
    if (opts?.dateTo) conditions.push(lte(s.auditLogs.createdAt, new Date(opts.dateTo)));
    return conditions;
  }

  async list(storeId: number, opts?: AuditListOptions) {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const conditions = this.buildConditions(storeId, opts);
    const where = conditions.length ? and(...conditions) : undefined;

    const [items, totalResult] = await Promise.all([
      this.db.select().from(s.auditLogs)
        .where(where)
        .limit(limit).offset((page - 1) * limit)
        .orderBy(desc(s.auditLogs.createdAt)),
      this.db.select({ total: count() }).from(s.auditLogs).where(where),
    ]);

    const total = Number(totalResult[0]?.total ?? 0);
    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
