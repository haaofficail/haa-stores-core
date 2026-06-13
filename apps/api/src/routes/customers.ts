import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { CustomersService } from '@haa/commerce-core';
import { paginationSchema } from '@haa/shared';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

const customersRouter = new Hono();

customersRouter.use('*', requireAuth(), requireStoreAccess());

customersRouter.get('/', requirePermission('customers:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const query = paginationSchema.parse(c.req.query());
  const search = c.req.query('search');
  const result = await new CustomersService().list(storeId, { ...query, search });
  return c.json({ success: true, data: result });
});

customersRouter.get('/:id', requirePermission('customers:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const customer = await new CustomersService().getById(storeId, id);
  if (!customer) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } }, 404);
  return c.json({ success: true, data: customer });
});

customersRouter.get('/phone/:phone', requirePermission('customers:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const phone = c.req.param('phone') ?? '';
  if (!phone) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Phone is required' } }, 400);
  const customer = await new CustomersService().findByPhone(storeId, phone);
  if (!customer) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } }, 404);
  return c.json({ success: true, data: customer });
});

const createCustomerSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().min(1).max(20),
  email: z.string().email().max(255).optional(),
  notes: z.string().optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

customersRouter.post('/', requirePermission('customers:create'), zValidator('json', createCustomerSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const customer = await new CustomersService().create(storeId, body);
  return c.json({ success: true, data: customer }, 201);
});

customersRouter.patch('/:id', requirePermission('customers:update'), zValidator('json', updateCustomerSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const body = c.req.valid('json');
  const customer = await new CustomersService().update(storeId, id, body);
  if (!customer) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } }, 404);
  return c.json({ success: true, data: customer });
});

export { customersRouter };
