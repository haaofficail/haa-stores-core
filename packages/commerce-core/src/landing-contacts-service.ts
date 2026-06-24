// Landing-page contact submissions service.
//
// Backs the public `/landing/contact` POST endpoint and the admin
// `/admin/landing-contacts/*` inbox endpoints. The schema lives in
// `packages/db/src/schema/landing-contacts.ts`; lifecycle statuses are
// enumerated in `LANDING_CONTACT_STATUSES` (re-exported from this module
// for the route layer's Zod enum).
//
// Defensive notes:
//   - `create()` trims every text field and lower-cases the email.
//     Empty-after-trim values throw `VALIDATION_ERROR` so the route
//     layer can map to a 400.
//   - `update()` only writes the fields the caller explicitly passed
//     (`undefined` ⇒ leave alone, `null` ⇒ clear). When status moves to
//     'replied' we stamp `repliedAt` automatically so the inbox can
//     show "responded N hours ago" without an extra column write from
//     the caller.
//   - `countRecentByIp()` powers the app-layer rate-limit fallback in
//     the route. The middleware limiter is the primary gate; this is
//     defense in depth (and a usable signal for spam detection).

import { eq, desc, and, gte, count } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { LANDING_CONTACT_STATUSES, type LandingContactStatus } from '@haa/db/schema';

export type CreateLandingContactInput = {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  sourceIp?: string | null;
  userAgent?: string | null;
};

export type UpdateLandingContactInput = {
  status?: LandingContactStatus;
  adminNotes?: string | null;
  adminUserId?: number | null;
};

export type ListLandingContactsOpts = {
  status?: LandingContactStatus;
  page?: number;
  limit?: number;
};

export class LandingContactsService {
  constructor(private db: DbClient = createDbClient()) {}

  async create(input: CreateLandingContactInput) {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const message = input.message.trim();
    if (!name || !email || !message) {
      throw new Error('VALIDATION_ERROR');
    }
    const phone = input.phone?.trim() || null;

    const [row] = await this.db.insert(s.landingContacts).values({
      name,
      email,
      phone,
      message,
      sourceIp: input.sourceIp ?? null,
      userAgent: input.userAgent ?? null,
    }).returning();
    return row;
  }

  async list(opts?: ListLandingContactsOpts) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts?.limit ?? 20));
    const where = opts?.status
      ? and(eq(s.landingContacts.status, opts.status))
      : undefined;

    const [items, totals] = await Promise.all([
      this.db.select().from(s.landingContacts)
        .where(where)
        .orderBy(desc(s.landingContacts.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ total: count() }).from(s.landingContacts).where(where),
    ]);
    const total = Number(totals[0]?.total ?? 0);
    return { data: items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(id: number) {
    const [row] = await this.db.select().from(s.landingContacts)
      .where(eq(s.landingContacts.id, id))
      .limit(1);
    return row ?? null;
  }

  async update(id: number, input: UpdateLandingContactInput) {
    const patch: Partial<typeof s.landingContacts.$inferInsert> = { updatedAt: new Date() };
    if (input.status !== undefined) {
      patch.status = input.status;
      if (input.status === 'replied') {
        patch.repliedAt = new Date();
      }
    }
    if (input.adminNotes !== undefined) {
      patch.adminNotes = input.adminNotes;
    }
    if (input.adminUserId !== undefined) {
      patch.adminUserId = input.adminUserId;
    }
    const [row] = await this.db.update(s.landingContacts)
      .set(patch)
      .where(eq(s.landingContacts.id, id))
      .returning();
    return row ?? null;
  }

  /**
   * Submissions from this IP since `sinceMs` ago (default: last hour).
   * Used by the route-layer rate limiter as a defense-in-depth check
   * alongside the in-memory/Redis middleware limiter — the middleware
   * counter resets on process restart, but the DB row count does not.
   */
  async countRecentByIp(ip: string, sinceMs: number = 60 * 60 * 1000) {
    const since = new Date(Date.now() - sinceMs);
    const [r] = await this.db.select({ total: count() })
      .from(s.landingContacts)
      .where(and(
        eq(s.landingContacts.sourceIp, ip),
        gte(s.landingContacts.createdAt, since),
      ));
    return Number(r?.total ?? 0);
  }
}

export { LANDING_CONTACT_STATUSES, type LandingContactStatus };
