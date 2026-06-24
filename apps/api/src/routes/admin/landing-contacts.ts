// Admin: Landing-page contact inbox.
//
// Mounted under /admin/landing-contacts via the aggregator in
// ./index.ts. Following the post-review billing-settings.ts pattern:
// this file exports raw Hono handlers; `requireAdminAuth()` and
// `requireAdminPermission(...)` are attached at the aggregator layer
// so the middleware sequence stays uniform across admin routes.
//
//   GET  /admin/landing-contacts             — list, filterable by status
//   GET  /admin/landing-contacts/:id         — read one row
//   PATCH /admin/landing-contacts/:id        — update status / notes
//
// Permission strings used at the aggregator:
//   - landing_contacts.read
//   - landing_contacts.update
// `admin:*` (super-admin) implicitly grants both — see
// requireAdminPermission() in ./index.ts.

import type { Context } from 'hono';
import { z } from 'zod';
import {
  LandingContactsService,
  LANDING_CONTACT_STATUSES,
  type LandingContactStatus,
} from '@haa/commerce-core';
import type { AdminAuthContext } from '@haa/auth-core';

// Mutable copy for Zod (z.enum needs a mutable [string, ...string[]]).
const STATUS_VALUES = [...LANDING_CONTACT_STATUSES] as [LandingContactStatus, ...LandingContactStatus[]];

export const listLandingContactsQuerySchema = z.object({
  status: z.enum(STATUS_VALUES).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const patchLandingContactBodySchema = z.object({
  status: z.enum(STATUS_VALUES).optional(),
  adminNotes: z.string().max(5000).optional().nullable(),
});

// Context shape for the PATCH handler so c.req.valid('json') is typed.
type PatchContext = Context<
  { Variables: { adminAuth: AdminAuthContext } },
  string,
  {
    in: { json: z.infer<typeof patchLandingContactBodySchema> };
    out: { json: z.infer<typeof patchLandingContactBodySchema> };
  }
>;

// Same idea for the GET list — keeps `c.req.valid('query')` typed.
type ListContext = Context<
  { Variables: { adminAuth: AdminAuthContext } },
  string,
  {
    in: { query: z.infer<typeof listLandingContactsQuerySchema> };
    out: { query: z.infer<typeof listLandingContactsQuerySchema> };
  }
>;

export async function listLandingContacts(c: ListContext) {
  const q = c.req.valid('query');
  const result = await new LandingContactsService().list({
    status: q.status,
    page: q.page,
    limit: q.limit,
  });
  return c.json({ success: true, data: result });
}

export async function getLandingContact(c: Context) {
  const id = Number(c.req.param('id'));
  if (!Number.isFinite(id) || id <= 0) {
    return c.json(
      { success: false, error: { code: 'INVALID_ID', message: 'Invalid id' } },
      400,
    );
  }
  const row = await new LandingContactsService().getById(id);
  if (!row) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'غير موجود' } },
      404,
    );
  }
  return c.json({ success: true, data: row });
}

export async function patchLandingContact(c: PatchContext) {
  const id = Number(c.req.param('id'));
  if (!Number.isFinite(id) || id <= 0) {
    return c.json(
      { success: false, error: { code: 'INVALID_ID', message: 'Invalid id' } },
      400,
    );
  }
  const body = c.req.valid('json');
  // Pulled from the admin JWT by requireAdminAuth() at the aggregator.
  const adminAuth = (c as Context).get('adminAuth') as AdminAuthContext | undefined;

  const row = await new LandingContactsService().update(id, {
    status: body.status,
    adminNotes: body.adminNotes ?? undefined,
    adminUserId: adminAuth?.userId ?? null,
  });

  if (!row) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'غير موجود' } },
      404,
    );
  }
  return c.json({ success: true, data: row });
}
