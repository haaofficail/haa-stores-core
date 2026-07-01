import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';

export const SUPPORT_STATUSES = ['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'] as const;
export const SUPPORT_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export type SupportGatewayStatus = (typeof SUPPORT_STATUSES)[number];
export type SupportGatewayPriority = (typeof SUPPORT_PRIORITIES)[number];

export interface SupportGatewayQuery {
  status?: SupportGatewayStatus;
  priority?: SupportGatewayPriority;
  storeId?: number;
  q?: string;
  page?: number;
  limit?: number;
}

function buildTicketConditions(query: SupportGatewayQuery) {
  const conditions: SQL[] = [];
  if (query.status) conditions.push(eq(s.supportTickets.status, query.status));
  if (query.priority) conditions.push(eq(s.supportTickets.priority, query.priority));
  if (query.storeId) conditions.push(eq(s.supportTickets.storeId, query.storeId));
  if (query.q) {
    const term = `%${query.q}%`;
    const searchCondition = or(
      ilike(s.supportTickets.subject, term),
      ilike(s.supportTickets.name, term),
      ilike(s.supportTickets.email, term),
      ilike(s.stores.name, term),
      ilike(s.tenants.name, term),
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  return conditions.length ? and(...conditions) : undefined;
}

function countBy(where?: SQL) {
  const db = createDbClient();
  return db
    .select({ count: sql<number>`count(*)::int` })
    .from(s.supportTickets)
    .innerJoin(s.stores, eq(s.supportTickets.storeId, s.stores.id))
    .innerJoin(s.tenants, eq(s.stores.tenantId, s.tenants.id))
    .where(where);
}

export async function getAdminSupportGatewayTickets(query: SupportGatewayQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const offset = (page - 1) * limit;
  const where = buildTicketConditions(query);
  const db = createDbClient();

  const rows = await db
    .select({
      id: s.supportTickets.id,
      storeId: s.supportTickets.storeId,
      storeName: s.stores.name,
      storeSlug: s.stores.slug,
      tenantId: s.tenants.id,
      tenantName: s.tenants.name,
      customerId: s.supportTickets.customerId,
      name: s.supportTickets.name,
      email: s.supportTickets.email,
      phone: s.supportTickets.phone,
      subject: s.supportTickets.subject,
      message: s.supportTickets.message,
      status: s.supportTickets.status,
      priority: s.supportTickets.priority,
      assignedTo: s.supportTickets.assignedTo,
      createdAt: s.supportTickets.createdAt,
      updatedAt: s.supportTickets.updatedAt,
    })
    .from(s.supportTickets)
    .innerJoin(s.stores, eq(s.supportTickets.storeId, s.stores.id))
    .innerJoin(s.tenants, eq(s.stores.tenantId, s.tenants.id))
    .where(where)
    .orderBy(desc(s.supportTickets.updatedAt))
    .limit(limit)
    .offset(offset);

  const [[total], [open], [waiting], [urgent]] = await Promise.all([
    countBy(where),
    countBy(eq(s.supportTickets.status, 'open')),
    countBy(eq(s.supportTickets.status, 'waiting_on_customer')),
    countBy(eq(s.supportTickets.priority, 'urgent')),
  ]);

  return {
    data: rows.map(({ message, ...row }) => ({
      ...row,
      messagePreview: message.length > 180 ? `${message.slice(0, 180)}...` : message,
    })),
    page,
    limit,
    total: Number(total?.count ?? 0),
    totalPages: Math.max(1, Math.ceil(Number(total?.count ?? 0) / limit)),
    summary: {
      open: Number(open?.count ?? 0),
      waitingOnCustomer: Number(waiting?.count ?? 0),
      urgent: Number(urgent?.count ?? 0),
    },
  };
}
