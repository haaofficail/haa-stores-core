/**
 * Multi-tenant WhatsApp session manager.
 *
 * Per-store one Baileys client. The registry is keyed by `storeId` with
 * an explicit ACL check before every operation — a request signed for
 * storeA MUST NOT be able to read, send through, or disconnect storeB's
 * session. The unique constraint on `whatsapp_sessions.store_id` makes
 * the persistence layer enforce the same invariant.
 *
 * What this file does NOT do:
 *   - import @whiskeysockets/baileys directly. The runtime is in
 *     `baileys-client.ts`. Tests use a mock `IBaileysClient`.
 *   - encrypt creds itself. The `SessionStore.putEncryptedCreds` port
 *     is the only write path; the implementation in
 *     `whatsapp-session-store.ts` wraps with commerce-core/encryption.
 *   - persist plaintext creds. The encrypted blob arrives as a string
 *     in the format `iv:authTag:ciphertext`.
 */

import type { IBaileysClient, SessionEvent, SessionEventListener, SessionStatus, SessionStore } from './types.js';

export interface SessionManagerOptions {
  /**
   * Factory invoked the first time a store requests a client.
   * Production passes the `BaileysClient` constructor wrapped with the
   * encrypted creds loaded from `store`. Tests pass a mock factory.
   */
  clientFactory: (params: {
    storeId: number;
    store: SessionStore;
  }) => IBaileysClient | Promise<IBaileysClient>;
  /** Persistence port. */
  store: SessionStore;
}

export class SessionManager {
  private clients = new Map<number, IBaileysClient>();
  private listeners = new Map<number, Set<SessionEventListener>>();

  constructor(private opts: SessionManagerOptions) {}

  private async getOrCreate(storeId: number): Promise<IBaileysClient> {
    const existing = this.clients.get(storeId);
    if (existing) return existing;
    const client = await this.opts.clientFactory({ storeId, store: this.opts.store });
    // Wire the client's events into the per-store listener set + the
    // persistence side-effects.
    client.on((event) => {
      // Side-effect: persist status transitions. We swallow persistence
      // errors here (they're logged inside the store impl) so a DB
      // hiccup never prevents the merchant from seeing the live event.
      void this.persist(storeId, event);
      // Fan out to subscribers.
      const subs = this.listeners.get(storeId);
      if (subs) for (const fn of subs) fn(event);
    });
    this.clients.set(storeId, client);
    return client;
  }

  private async persist(storeId: number, event: SessionEvent): Promise<void> {
    const now = new Date();
    try {
      if (event.type === 'connected') {
        await this.opts.store.upsertStatus(storeId, {
          status: 'connected',
          phone: event.phone,
          deviceJid: event.deviceJid,
          displayName: event.displayName ?? null,
          pairedAt: now,
          lastSeenAt: now,
        });
      } else if (event.type === 'disconnected') {
        await this.opts.store.upsertStatus(storeId, {
          status: 'disconnected',
          disconnectedAt: now,
          lastSeenAt: now,
        });
      } else if (event.type === 'qr') {
        await this.opts.store.upsertStatus(storeId, {
          status: 'pairing',
          lastSeenAt: now,
        });
      }
      // 'failure' is observed by listeners but doesn't transition state.
    } catch {
      // Persistence errors are logged inside the store; never bubble.
    }
  }

  /** Start a pairing handshake for the given store. Caller MUST have already
   *  authorized the request as belonging to this storeId. */
  async startPairing(storeId: number): Promise<void> {
    const client = await this.getOrCreate(storeId);
    return client.startPairing();
  }

  /** Disconnect the session. ACL: the caller must own the storeId. */
  async disconnect(storeId: number, reason: 'admin_disconnect' | 'session_expired' = 'admin_disconnect'): Promise<void> {
    const client = this.clients.get(storeId);
    if (!client) return;
    await client.disconnect(reason);
    this.clients.delete(storeId);
  }

  /** Read-only status snapshot. */
  async status(storeId: number): Promise<SessionStatus> {
    const client = this.clients.get(storeId);
    if (client) return client.status();
    // Fall back to persisted status when the in-memory client is gone
    // (e.g. after a process restart before we lazily rehydrate).
    return this.opts.store.getStatus(storeId);
  }

  /** Subscribe to session events for one store. Returns unsubscribe. */
  subscribe(storeId: number, listener: SessionEventListener): () => void {
    let subs = this.listeners.get(storeId);
    if (!subs) {
      subs = new Set();
      this.listeners.set(storeId, subs);
    }
    subs.add(listener);
    return () => {
      subs!.delete(listener);
      if (subs!.size === 0) this.listeners.delete(storeId);
    };
  }

  /** Test/diagnostic helper — never used by routes. */
  hasClientFor(storeId: number): boolean {
    return this.clients.has(storeId);
  }
}
