import { Hono } from 'hono'
import { reportSupportError } from '../services/support-error-log.js'

const router = new Hono()

const IS_LOCAL = !process.env.NODE_ENV || process.env.NODE_ENV === 'development'

router.post('/report', async (c) => {
  if (!IS_LOCAL) {
    // AGENTS.md §13 #5 specifies 404 in production (hides endpoint existence).
    return c.json({ ok: false, message: 'Not found.' }, 404)
  }

  try {
    const body = await c.req.json<Record<string, unknown>>()
    const { correlationId, eventId } = await reportSupportError({
      ...body as any,
      origin: body.origin === 'dashboard' ? 'dashboard' : body.origin === 'storefront' ? 'storefront' : 'api',
      app: body.app as string || 'system',
      handled: body.handled !== false,
    })

    return c.json({ ok: true, correlationId, eventId })
  } catch (err) {
    console.warn('[support-errors] failed to process report:', err)
    return c.json({ ok: false, message: 'Failed to record error.' }, 500)
  }
})

export { router as supportErrorsRouter }
