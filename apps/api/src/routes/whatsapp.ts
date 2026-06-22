/**
 * WhatsApp Local pairing routes (WA-PR-2).
 *
 * Mounts under `/merchant/:storeId/whatsapp`. All endpoints require
 * the merchant to be authenticated and to have access to the storeId
 * in the URL — cross-tenant isolation is enforced by the
 * `requireStoreAccess` middleware. The route handlers ADDITIONALLY
 * never read or write any other store's session.
 *
 * Endpoints:
 *   POST  /pair            — start pairing (creates the pairing flow;
 *                            QR is streamed separately via /qr-stream)
 *   GET   /qr-stream       — Server-Sent Events stream of session
 *                            events (qr / connected / disconnected /
 *                            failure). The dashboard subscribes when
 *                            the pairing page mounts.
 *   POST  /disconnect      — log out / drop the Baileys session for
 *                            this store. Idempotent.
 *   GET   /status          — read-only snapshot of the current session
 *                            status + phone + display name.
 *
 * The actual Baileys runtime is provided by a singleton `SessionManager`
 * injected via `getWhatsappManager()` — its production wiring (with
 * the real Baileys client) lands in WA-PR-3. Until then, the manager
 * has a stub clientFactory that emits a clear "not yet implemented"
 * failure event so the UI can render a friendly state.
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';
import type { SessionEvent } from '../services/whatsapp/types.js';
import { getWhatsappManager } from '../services/whatsapp/registry.js';
import { sendWhatsappMessage, WhatsappSendException } from '../services/whatsapp/send-service.js';

export const whatsappRouter = new Hono();
whatsappRouter.use('*', requireAuth(), requireStoreAccess());

// POST /merchant/:storeId/whatsapp/pair
whatsappRouter.post('/pair', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const mgr = getWhatsappManager();
  await mgr.startPairing(storeId);
  return c.json({ success: true, data: { status: await mgr.status(storeId) } });
});

// GET /merchant/:storeId/whatsapp/status
whatsappRouter.get('/status', requirePermission('settings:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const mgr = getWhatsappManager();
  const status = await mgr.status(storeId);
  return c.json({ success: true, data: { status } });
});

// POST /merchant/:storeId/whatsapp/disconnect
whatsappRouter.post('/disconnect', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const mgr = getWhatsappManager();
  await mgr.disconnect(storeId, 'admin_disconnect');
  return c.json({ success: true, data: { status: 'disconnected' } });
});

// POST /merchant/:storeId/whatsapp/send — single-message test send.
//
// Body: { to: '+966...', body: 'text' }. The campaign worker has its
// own send path (WA-PR-4) that writes whatsapp_delivery rows; this
// route is the merchant's "send to my own number" smoke test and the
// stub for transactional sends.
const sendSchema = z.object({
  to: z.string().min(8).max(30),
  body: z.string().min(1).max(4000),
});
whatsappRouter.post('/send', requirePermission('promotions:update'), zValidator('json', sendSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const { to, body } = c.req.valid('json');
  const mgr = getWhatsappManager();
  try {
    await sendWhatsappMessage(mgr, storeId, to, body);
    return c.json({ success: true, data: { sent: true } });
  } catch (err) {
    if (err instanceof WhatsappSendException) {
      const info = err.info;
      // Map the typed error onto the API contract that the dashboard
      // error mapper recognises.
      const code = info.code;
      const status = code === 'RATE_LIMITED' ? 429 : code === 'SESSION_NOT_CONNECTED' ? 409 : 400;
      return c.json({ success: false, error: { code, message: code, details: info } }, status);
    }
    throw err;
  }
});

// GET /merchant/:storeId/whatsapp/qr-stream — Server-Sent Events
//
// The client EventSource subscribes here while the pairing page is
// open. Every session event is forwarded as an SSE `message`. The
// stream ends when the client disconnects or when the server hits the
// hard timeout (5 min — pairing should complete well within that).
whatsappRouter.get('/qr-stream', requirePermission('settings:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const mgr = getWhatsappManager();
  return streamSSE(c, async (stream) => {
    let alive = true;
    const queue: SessionEvent[] = [];
    let resolveNext: (() => void) | null = null;
    const unsubscribe = mgr.subscribe(storeId, (event) => {
      queue.push(event);
      resolveNext?.();
      resolveNext = null;
    });
    // Hard timeout safety — close the stream after 5 minutes to avoid
    // ever holding a connection open indefinitely.
    const timeout = setTimeout(() => {
      alive = false;
      resolveNext?.();
    }, 5 * 60 * 1000);

    try {
      while (alive) {
        if (queue.length === 0) {
          await new Promise<void>((resolve) => {
            resolveNext = resolve;
          });
          continue;
        }
        const event = queue.shift()!;
        await stream.writeSSE({ data: JSON.stringify(event), event: event.type });
        if (event.type === 'connected' || event.type === 'disconnected') {
          // Stay open after connected so the page can also surface
          // post-connect disconnect events. Close only on the next
          // disconnect.
          if (event.type === 'disconnected') break;
        }
      }
    } finally {
      clearTimeout(timeout);
      unsubscribe();
    }
  });
});
