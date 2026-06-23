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

import { SessionManager } from './session-manager.js';
import type { IBaileysClient, SessionEventListener } from './types.js';
import { DrizzleSessionStore } from './session-store.js';
import { BaileysClient } from './baileys-client.js';
import { createDbClient } from '@haa/db';
import * as dbSchema from '@haa/db/schema';

// @haa/db's package.json `exports` map declares only the `import`
// condition (no `require`), so `createRequire(...)('@haa/db')` fails
// with "No exports main defined". Use static ESM imports instead —
// the singleton guard in getWhatsappManager() already ensures we
// don't pay the cost at boot.

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
  // Direct DB wiring (no lazy proxy). The singleton guard above is
  // the cold-start optimisation — the proxy/require pattern that used
  // to live here was the cause of the staging 500s on /whatsapp/status:
  //   - `require()` is undefined in ESM
  //   - even with createRequire, @haa/db has no `require` exports field
  //   - the `db` field on the require'd module was always undefined
  //     because @haa/db exports `createDbClient`, not `db`
  // All three issues were chasing the same problem. Static ESM imports
  // resolve all of them.
  const store = new DrizzleSessionStore({
    db: createDbClient() as unknown as never,
    schema: dbSchema as unknown as never,
  });

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
    store,
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
