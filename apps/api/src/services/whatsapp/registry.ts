/**
 * Process-singleton SessionManager wiring.
 *
 * Why a singleton: the in-process Baileys client registry holds
 * long-lived WebSocket connections to WhatsApp's edge. Re-creating
 * the manager per-request would reset every session on the first
 * call. The singleton is created lazily on first use.
 *
 * Why a stub clientFactory in WA-PR-2: this PR doesn't import the
 * `@whiskeysockets/baileys` runtime — that's WA-PR-3. The stub emits
 * a clear `failure` event so the merchant UI can render an
 * informative "WhatsApp client not yet enabled" state instead of
 * hanging forever. The session-manager + store + routes + UI are all
 * wired and shipped; flipping the factory to the real `BaileysClient`
 * in WA-PR-3 lights up the actual messaging.
 */

import { createRequire } from 'module';
import { SessionManager } from './session-manager.js';
import type { IBaileysClient, SessionEventListener } from './types.js';
import { DrizzleSessionStore } from './session-store.js';
import { BaileysClient } from './baileys-client.js';

// apps/api is ESM — bare `require()` is undefined. Use createRequire so
// the lazy `require('@haa/db')` below works at runtime (same root cause
// fixed for queue.ts in PR #111).
const require = createRequire(import.meta.url);

let singleton: SessionManager | null = null;

/**
 * Stub IBaileysClient. Until WA-PR-3 swaps the factory, every pairing
 * attempt resolves to a single `failure` event with a friendly message.
 * The session-manager still records the attempt as `pairing` so the
 * dashboard renders the right state.
 */
function createStubClient(): IBaileysClient {
  const listeners = new Set<SessionEventListener>();
  return {
    async startPairing() {
      // Emit on next tick so listeners attached after this call still see it.
      queueMicrotask(() => {
        for (const fn of listeners) {
          fn({
            type: 'failure',
            message:
              'WhatsApp runtime not enabled yet. The pairing UI is shipping in WA-PR-2; the live Baileys client lands in WA-PR-3.',
          });
        }
      });
    },
    async disconnect() {
      for (const fn of listeners) fn({ type: 'disconnected', reason: 'admin_disconnect' });
    },
    status: () => 'disconnected',
    on(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function getWhatsappManager(): SessionManager {
  if (singleton) return singleton;
  // Lazy import to keep the cold-start path light.
  // The store delegate is wired to the DB the first time it's used;
  // until WA-PR-3 lands, no real session events fire, so the DB
  // touches remain minimal.
  let storeDeps:
    | { db: unknown; schema: { whatsappSessions: unknown } }
    | null = null;
  const lazyStore = new DrizzleSessionStore(
    new Proxy(
      {},
      {
        get(_t, prop) {
          if (!storeDeps) {
            // Pull db + schema modules on first read. We import
            // synchronously via require-equivalent dynamic import; if
            // these imports fail (e.g. test sandbox without the DB),
            // the store methods will reject — which the session
            // manager already swallows.
             
            const dbModule = require('@haa/db');
             
            const schemaModule = require('@haa/db/schema');
            storeDeps = { db: dbModule.db, schema: schemaModule };
          }
          return (storeDeps as any)[prop as string];
        },
      },
    ) as never,
  );

  // Feature gate — flip to the real Baileys runtime only when the
  // owner has set FEATURE_WHATSAPP_LIVE=1 on the environment. Keeps
  // the stub on by default so the page renders cleanly without any
  // live socket attempts on environments that don't have the
  // ENCRYPTION_KEY or the Redis worker plumbed.
  const live = process.env.FEATURE_WHATSAPP_LIVE === '1';

  singleton = new SessionManager({
    clientFactory: live
      ? ({ storeId, store }) => new BaileysClient({ storeId, store })
      : createStubClient,
    store: lazyStore,
  });
  return singleton;
}

/**
 * Test-only — replace the singleton with a custom one. Tests use this
 * to inject a mock client factory + in-memory store.
 */
export function __setWhatsappManagerForTests(manager: SessionManager | null): void {
  singleton = manager;
}
