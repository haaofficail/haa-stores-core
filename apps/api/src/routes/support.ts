import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { SupportService } from '@haa/commerce-core';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';

const supportRouter = new Hono();

supportRouter.use('*', requireAuth(), requireStoreAccess());

const createTicketSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  subject: z.string().min(1).max(500),
  message: z.string().min(1),
});

const replySchema = z.object({
  message: z.string().min(1),
  authorType: z.enum(['merchant', 'admin']),
  isStaffReply: z.boolean().optional().default(true),
});

const createArticleSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(500),
  content: z.string().min(1),
  category: z.string().max(100).optional().or(z.literal('')),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const updateArticleSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  category: z.string().max(100).optional().nullable(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const statusUpdateSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed']),
});

const priorityUpdateSchema = z.object({
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

// ─── Tickets ───

supportRouter.get('/support/tickets', requirePermission('support:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const status = c.req.query('status') || undefined;
  const limit = Number(c.req.query('limit')) || 50;
  const offset = Number(c.req.query('offset')) || 0;
  const tickets = await new SupportService().listTickets(storeId, { status, limit, offset });
  const count = await new SupportService().countTickets(storeId, status);
  return c.json({ success: true, data: { tickets, count, limit, offset } });
});

supportRouter.get('/support/tickets/:ticketId', requirePermission('support:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const ticketId = Number(c.req.param('ticketId'));
  const ticket = await new SupportService().getTicket(ticketId, storeId);
  if (!ticket) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } }, 404);
  const messages = await new SupportService().getMessages(ticketId);
  return c.json({ success: true, data: { ...ticket, messages } });
});

supportRouter.put('/support/tickets/:ticketId/status', requirePermission('support:update'), zValidator('json', statusUpdateSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const ticketId = Number(c.req.param('ticketId'));
  const { status } = c.req.valid('json');
  const ticket = await new SupportService().updateTicketStatus(ticketId, storeId, status);
  if (!ticket) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } }, 404);
  return c.json({ success: true, data: ticket });
});

supportRouter.put('/support/tickets/:ticketId/priority', requirePermission('support:update'), zValidator('json', priorityUpdateSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const ticketId = Number(c.req.param('ticketId'));
  const { priority } = c.req.valid('json');
  const ticket = await new SupportService().updateTicketPriority(ticketId, storeId, priority);
  if (!ticket) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } }, 404);
  return c.json({ success: true, data: ticket });
});

supportRouter.post('/support/tickets/:ticketId/reply', requirePermission('support:update'), zValidator('json', replySchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const ticketId = Number(c.req.param('ticketId'));
  const auth = getAuth(c);
  if (!auth) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
  const { message, authorType, isStaffReply } = c.req.valid('json');
  const ticket = await new SupportService().getTicket(ticketId, storeId);
  if (!ticket) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } }, 404);
  const msg = await new SupportService().addMessage({
    ticketId,
    authorType,
    authorId: auth.userId,
    message,
    isStaffReply,
  });
  await new SupportService().updateTicketStatus(ticketId, storeId, 'in_progress');
  return c.json({ success: true, data: msg });
});

supportRouter.delete('/support/tickets/:ticketId', requirePermission('support:delete'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const ticketId = Number(c.req.param('ticketId'));
  const ticket = await new SupportService().deleteTicket(ticketId, storeId);
  if (!ticket) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } }, 404);
  return c.json({ success: true, data: { id: ticket.id } });
});

// ─── Knowledge Base ───

supportRouter.get('/support/kb', requirePermission('support:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const category = c.req.query('category') || undefined;
  const publishedOnly = c.req.query('publishedOnly') !== 'false';
  const limit = Number(c.req.query('limit')) || 50;
  const offset = Number(c.req.query('offset')) || 0;
  const articles = await new SupportService().listArticles(storeId, { category, publishedOnly, limit, offset });
  const categories = await new SupportService().listCategories(storeId);
  return c.json({ success: true, data: { articles, categories, limit, offset } });
});

supportRouter.get('/support/kb/categories', requirePermission('support:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const categories = await new SupportService().listCategories(storeId);
  return c.json({ success: true, data: categories });
});

supportRouter.get('/support/kb/:articleId', requirePermission('support:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const articleId = Number(c.req.param('articleId'));
  const article = await new SupportService().getArticle(articleId, storeId);
  if (!article) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Article not found' } }, 404);
  return c.json({ success: true, data: article });
});

supportRouter.post('/support/kb', requirePermission('support:create'), zValidator('json', createArticleSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const input = c.req.valid('json');
  const article = await new SupportService().createArticle({
    storeId,
    title: input.title,
    slug: input.slug,
    content: input.content,
    category: input.category || null,
    isPublished: input.isPublished,
    sortOrder: input.sortOrder,
  });
  return c.json({ success: true, data: article });
});

supportRouter.put('/support/kb/:articleId', requirePermission('support:update'), zValidator('json', updateArticleSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const articleId = Number(c.req.param('articleId'));
  const input = c.req.valid('json');
  const article = await new SupportService().updateArticle(articleId, storeId, input);
  if (!article) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Article not found' } }, 404);
  return c.json({ success: true, data: article });
});

supportRouter.delete('/support/kb/:articleId', requirePermission('support:delete'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const articleId = Number(c.req.param('articleId'));
  const article = await new SupportService().deleteArticle(articleId, storeId);
  if (!article) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Article not found' } }, 404);
  return c.json({ success: true, data: { id: article.id } });
});

// ─── Storefront-facing customer tickets (authenticated by store rather than merchant) ───

supportRouter.post('/support/tickets/:ticketId/customer-reply', async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const ticketId = Number(c.req.param('ticketId'));
  const { message, customerId } = await c.req.json();
  if (!message || !customerId) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Missing message or customerId' } }, 400);
  const ticket = await new SupportService().getTicketByCustomer(ticketId, customerId);
  if (!ticket || ticket.storeId !== storeId) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } }, 404);
  const msg = await new SupportService().addMessage({
    ticketId,
    authorType: 'customer',
    authorId: customerId,
    message,
    isStaffReply: false,
  });
  await new SupportService().updateTicketStatus(ticketId, storeId, 'waiting_on_customer');
  return c.json({ success: true, data: msg });
});

export { supportRouter };
