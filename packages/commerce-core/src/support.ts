import { eq, and, asc, desc, sql } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';

type AnyRecord = Record<string, unknown>;

export interface CreateTicketInput {
  storeId: number;
  customerId?: number | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  subject: string;
  message: string;
}

export interface ReplyToTicketInput {
  ticketId: number;
  authorType: 'customer' | 'merchant' | 'admin';
  authorId?: number | null;
  message: string;
  isStaffReply?: boolean;
}

export interface CreateKbArticleInput {
  storeId: number;
  title: string;
  slug: string;
  content: string;
  category?: string | null;
  isPublished?: boolean;
  sortOrder?: number;
}

export interface UpdateKbArticleInput {
  title?: string;
  content?: string;
  category?: string | null;
  isPublished?: boolean;
  sortOrder?: number;
}

export class SupportService {
  constructor(private db: DbClient = createDbClient()) {}

  // ─── Tickets ───

  async createTicket(input: CreateTicketInput) {
    const [ticket] = await this.db.insert(s.supportTickets)
      .values({
        storeId: input.storeId,
        customerId: input.customerId ?? null,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        subject: input.subject,
        message: input.message,
        status: 'open',
        priority: 'medium',
      })
      .returning();
    return ticket;
  }

  async listTickets(storeId: number, options?: { status?: string; limit?: number; offset?: number }) {
    const conditions = [eq(s.supportTickets.storeId, storeId)];
    if (options?.status) conditions.push(eq(s.supportTickets.status, options.status));
    return this.db.select()
      .from(s.supportTickets)
      .where(and(...conditions))
      .orderBy(desc(s.supportTickets.createdAt))
      .limit(options?.limit ?? 50)
      .offset(options?.offset ?? 0);
  }

  async getTicket(ticketId: number, storeId: number) {
    const [ticket] = await this.db.select()
      .from(s.supportTickets)
      .where(and(eq(s.supportTickets.id, ticketId), eq(s.supportTickets.storeId, storeId)))
      .limit(1);
    return ticket ?? null;
  }

  async getTicketByAccessToken(accessToken: string) {
    const [ticket] = await this.db.select()
      .from(s.supportTickets)
      .where(eq(s.supportTickets.accessToken, accessToken))
      .limit(1);
    return ticket ?? null;
  }

  async getTicketByCustomer(ticketId: number, customerId: number) {
    const [ticket] = await this.db.select()
      .from(s.supportTickets)
      .where(and(eq(s.supportTickets.id, ticketId), eq(s.supportTickets.customerId, customerId)))
      .limit(1);
    return ticket ?? null;
  }

  async updateTicketStatus(ticketId: number, storeId: number, status: string) {
    const [ticket] = await this.db.update(s.supportTickets)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(s.supportTickets.id, ticketId), eq(s.supportTickets.storeId, storeId)))
      .returning();
    return ticket ?? null;
  }

  async updateTicketPriority(ticketId: number, storeId: number, priority: string) {
    const [ticket] = await this.db.update(s.supportTickets)
      .set({ priority, updatedAt: new Date() })
      .where(and(eq(s.supportTickets.id, ticketId), eq(s.supportTickets.storeId, storeId)))
      .returning();
    return ticket ?? null;
  }

  async deleteTicket(ticketId: number, storeId: number) {
    const [ticket] = await this.db.delete(s.supportTickets)
      .where(and(eq(s.supportTickets.id, ticketId), eq(s.supportTickets.storeId, storeId)))
      .returning();
    return ticket ?? null;
  }

  async countTickets(storeId: number, status?: string) {
    const conditions = [eq(s.supportTickets.storeId, storeId)];
    if (status) conditions.push(eq(s.supportTickets.status, status));
    const [result] = await this.db.select({ count: sql<number>`count(*)::int` })
      .from(s.supportTickets)
      .where(and(...conditions));
    return result?.count ?? 0;
  }

  // ─── Messages ───

  async addMessage(input: ReplyToTicketInput) {
    const [msg] = await this.db.insert(s.ticketMessages)
      .values({
        ticketId: input.ticketId,
        authorType: input.authorType,
        authorId: input.authorId ?? null,
        message: input.message,
        isStaffReply: input.isStaffReply ?? false,
      })
      .returning();
    return msg;
  }

  async getMessages(ticketId: number) {
    return this.db.select()
      .from(s.ticketMessages)
      .where(eq(s.ticketMessages.ticketId, ticketId))
      .orderBy(asc(s.ticketMessages.createdAt));
  }

  // ─── Knowledge Base ───

  async createArticle(input: CreateKbArticleInput) {
    const [article] = await this.db.insert(s.knowledgeBaseArticles)
      .values({
        storeId: input.storeId,
        title: input.title,
        slug: input.slug,
        content: input.content,
        category: input.category ?? null,
        isPublished: input.isPublished ?? false,
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();
    return article;
  }

  async listArticles(storeId: number, options?: { category?: string; publishedOnly?: boolean; limit?: number; offset?: number }) {
    const conditions = [eq(s.knowledgeBaseArticles.storeId, storeId)];
    if (options?.publishedOnly) conditions.push(eq(s.knowledgeBaseArticles.isPublished, true));
    if (options?.category) conditions.push(eq(s.knowledgeBaseArticles.category, options.category));
    return this.db.select()
      .from(s.knowledgeBaseArticles)
      .where(and(...conditions))
      .orderBy(asc(s.knowledgeBaseArticles.sortOrder), desc(s.knowledgeBaseArticles.createdAt))
      .limit(options?.limit ?? 50)
      .offset(options?.offset ?? 0);
  }

  async getArticle(articleId: number, storeId: number) {
    const [article] = await this.db.select()
      .from(s.knowledgeBaseArticles)
      .where(and(eq(s.knowledgeBaseArticles.id, articleId), eq(s.knowledgeBaseArticles.storeId, storeId)))
      .limit(1);
    return article ?? null;
  }

  async getArticleBySlug(slug: string, storeId: number) {
    const [article] = await this.db.select()
      .from(s.knowledgeBaseArticles)
      .where(and(eq(s.knowledgeBaseArticles.slug, slug), eq(s.knowledgeBaseArticles.storeId, storeId)))
      .limit(1);
    return article ?? null;
  }

  async updateArticle(articleId: number, storeId: number, input: UpdateKbArticleInput) {
    const updates: AnyRecord = { updatedAt: new Date() };
    if (input.title !== undefined) updates.title = input.title;
    if (input.content !== undefined) updates.content = input.content;
    if (input.category !== undefined) updates.category = input.category;
    if (input.isPublished !== undefined) updates.isPublished = input.isPublished;
    if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
    const [article] = await this.db.update(s.knowledgeBaseArticles)
      .set(updates)
      .where(and(eq(s.knowledgeBaseArticles.id, articleId), eq(s.knowledgeBaseArticles.storeId, storeId)))
      .returning();
    return article ?? null;
  }

  async deleteArticle(articleId: number, storeId: number) {
    const [article] = await this.db.delete(s.knowledgeBaseArticles)
      .where(and(eq(s.knowledgeBaseArticles.id, articleId), eq(s.knowledgeBaseArticles.storeId, storeId)))
      .returning();
    return article ?? null;
  }

  async listCategories(storeId: number) {
    const rows = await this.db.select({ category: s.knowledgeBaseArticles.category })
      .from(s.knowledgeBaseArticles)
      .where(and(eq(s.knowledgeBaseArticles.storeId, storeId), eq(s.knowledgeBaseArticles.isPublished, true)))
      .groupBy(s.knowledgeBaseArticles.category);
    return rows.map(r => r.category).filter(Boolean) as string[];
  }
}
