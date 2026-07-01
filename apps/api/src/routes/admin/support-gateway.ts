// Admin: platform support gateway.
//
// This is intentionally read-only for TASK-0142. Merchant/store support
// actions keep using the merchant scoped /merchant/:storeId/support/* APIs;
// the admin dashboard only gets a platform-wide queue for visibility and
// triage without exposing support ticket access tokens.

import type { Context } from 'hono';
import { z } from 'zod';
import {
  getAdminSupportGatewayTickets,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
} from '../../services/admin-support-gateway.js';

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

export async function listSupportGatewayTickets(c: ListSupportGatewayContext) {
  const data = await getAdminSupportGatewayTickets(c.req.valid('query'));
  return c.json({ success: true, data });
}
