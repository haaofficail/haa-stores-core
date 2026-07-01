// Admin: platform support gateway.
//
// This is intentionally read-only for TASK-0142. Merchant/store support
// actions keep using the merchant scoped /merchant/:storeId/support/* APIs;
// the admin dashboard only gets a platform-wide queue for visibility and
// triage without exposing support ticket access tokens.

import type { Context } from 'hono';
import { z } from 'zod';
import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';

const SUPPORT_STATUSES = ['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'] as const;
const SUPPORT_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export const listSupportGatewayTicketsQuerySchema = z.object({
  status: z.enum(SUPPORT_STATUSES).optional(),
  priority: z.enum(SUPPORT_PRIORITIES).optional(),
  storeId: z.coerce.number().int().positive().optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

type ListSupportGatewayContext = Context<
  { Variables: Record<string, unknown> },
  string,
  {
    in: { query: z.infer<typeof listSupportGatewayTicketsQuerySchema> };
    out: { query: z.infer<typeof listSupportGatewayTicketsQuerySchema> };
  }
>;

type SupportGatewayQuery = z.infer<typeof listSupportGatewayTicketsQuerySchema>;

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

export async function listSupportGatewayTickets(c: ListSupportGatewayContext) {
  const query = c.req.valid('query');
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

  return c.json({
    success: true,
    data: {
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
    },
  });
}
