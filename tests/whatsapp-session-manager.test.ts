// WhatsApp SessionManager — multi-tenant isolation unit tests.
//
// Tests the manager's contract with a mock `IBaileysClient` so we
// never need the real Baileys runtime to verify the isolation rules.
//
// What this test locks:
//   - Per-store at-most-one client (the manager re-uses the existing
//     client on second call for the same storeId).
//   - storeA's events never reach storeB's listener.
//   - disconnect(storeA) does NOT affect storeB.
//   - Persistence side-effects fire on connected / disconnected / qr.
//   - Persistence errors are swallowed (never reach the caller).

import { describe, it, expect, vi } from 'vitest';
import { SessionManager } from '../apps/api/src/services/whatsapp/session-manager.js';
import type {
  IBaileysClient,
  SessionEvent,
  SessionEventListener,
  SessionStatus,
  SessionStore,
} from '../apps/api/src/services/whatsapp/types.js';

function makeMockClient(): IBaileysClient & { __emit(event: SessionEvent): void } {
  let status: SessionStatus = 'disconnected';
  const listeners = new Set<SessionEventListener>();
  return {
    startPairing: vi.fn(async () => {
      status = 'pairing';
    }),
    disconnect: vi.fn(async () => {
      status = 'disconnected';
    }),
    status: () => status,
    on(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    __emit(event) {
      if (event.type === 'connected') status = 'connected';
      if (event.type === 'disconnected') status = 'disconnected';
      if (event.type === 'qr') status = 'pairing';
      for (const fn of listeners) fn(event);
    },
  };
}

function makeMockStore(): SessionStore {
  const statuses = new Map<number, SessionStatus>();
  const creds = new Map<number, string>();
  return {
    async upsertStatus(storeId, patch) {
      statuses.set(storeId, patch.status);
    },
    async putEncryptedCreds(storeId, c) {
      creds.set(storeId, c);
    },
    async getEncryptedCreds(storeId) {
      return creds.get(storeId) ?? null;
    },
    async getStatus(storeId) {
      return statuses.get(storeId) ?? 'disconnected';
    },
    async clear(storeId) {
      statuses.delete(storeId);
      creds.delete(storeId);
    },
  };
}

describe('WhatsApp SessionManager — multi-tenant isolation', () => {
  it('reuses a client across calls for the same store (no leak across calls)', async () => {
    const client = makeMockClient();
    const factory = vi.fn(async () => client);
    const mgr = new SessionManager({ clientFactory: factory, store: makeMockStore() });

    await mgr.startPairing(7);
    await mgr.startPairing(7);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(mgr.hasClientFor(7)).toBe(true);
  });

  it('creates separate clients per store (storeA and storeB are independent)', async () => {
    const clientA = makeMockClient();
    const clientB = makeMockClient();
    const factory = vi.fn(async ({ storeId }) => (storeId === 1 ? clientA : clientB));
    const mgr = new SessionManager({ clientFactory: factory, store: makeMockStore() });

    await mgr.startPairing(1);
    await mgr.startPairing(2);

    expect(factory).toHaveBeenCalledTimes(2);
    expect(clientA.startPairing).toHaveBeenCalledTimes(1);
    expect(clientB.startPairing).toHaveBeenCalledTimes(1);
  });

  it("storeA's emitted events do NOT reach storeB's subscriber", async () => {
    const clientA = makeMockClient();
    const clientB = makeMockClient();
    const factory = vi.fn(async ({ storeId }) => (storeId === 1 ? clientA : clientB));
    const mgr = new SessionManager({ clientFactory: factory, store: makeMockStore() });

    const eventsA: SessionEvent[] = [];
    const eventsB: SessionEvent[] = [];

    await mgr.startPairing(1);
    await mgr.startPairing(2);
    mgr.subscribe(1, (e) => eventsA.push(e));
    mgr.subscribe(2, (e) => eventsB.push(e));

    clientA.__emit({ type: 'qr', qrPngBase64: 'aaa', expiresAt: 1000 });
    clientB.__emit({ type: 'connected', phone: '+966500000001', deviceJid: 'jidB' });

    expect(eventsA).toEqual([{ type: 'qr', qrPngBase64: 'aaa', expiresAt: 1000 }]);
    expect(eventsB).toEqual([{ type: 'connected', phone: '+966500000001', deviceJid: 'jidB' }]);
  });

  it("disconnect(storeA) does NOT affect storeB's connection", async () => {
    const clientA = makeMockClient();
    const clientB = makeMockClient();
    const factory = vi.fn(async ({ storeId }) => (storeId === 1 ? clientA : clientB));
    const mgr = new SessionManager({ clientFactory: factory, store: makeMockStore() });

    await mgr.startPairing(1);
    await mgr.startPairing(2);
    clientA.__emit({ type: 'connected', phone: '+966500000001', deviceJid: 'jidA' });
    clientB.__emit({ type: 'connected', phone: '+966500000002', deviceJid: 'jidB' });

    await mgr.disconnect(1);

    expect(clientA.disconnect).toHaveBeenCalledTimes(1);
    expect(clientB.disconnect).not.toHaveBeenCalled();
    expect(mgr.hasClientFor(1)).toBe(false);
    expect(mgr.hasClientFor(2)).toBe(true);
    expect(await mgr.status(2)).toBe('connected');
  });

  it('persists status transitions on connected / disconnected / qr', async () => {
    const client = makeMockClient();
    const store = makeMockStore();
    const upsert = vi.spyOn(store, 'upsertStatus');
    const mgr = new SessionManager({
      clientFactory: async () => client,
      store,
    });

    await mgr.startPairing(42);
    client.__emit({ type: 'qr', qrPngBase64: 'abc', expiresAt: 100 });
    client.__emit({ type: 'connected', phone: '+966500000099', deviceJid: 'jid' });
    client.__emit({ type: 'disconnected', reason: 'connection_lost' });

    // Allow the void Promises from .persist() to settle.
    await new Promise((resolve) => setImmediate(resolve));

    const calls = upsert.mock.calls.map((c) => c[1]);
    const statuses = calls.map((c) => c.status);
    expect(statuses).toContain('pairing');
    expect(statuses).toContain('connected');
    expect(statuses).toContain('disconnected');
  });

  it('swallows persistence errors (never bubbles to the caller)', async () => {
    const client = makeMockClient();
    const store = makeMockStore();
    vi.spyOn(store, 'upsertStatus').mockRejectedValue(new Error('boom'));
    const mgr = new SessionManager({
      clientFactory: async () => client,
      store,
    });

    await mgr.startPairing(99);
    // The emit triggers .persist() which rejects internally. The
    // listener fan-out MUST still happen.
    const received: SessionEvent[] = [];
    mgr.subscribe(99, (e) => received.push(e));
    client.__emit({ type: 'connected', phone: '+966', deviceJid: 'jid' });
    await new Promise((resolve) => setImmediate(resolve));

    expect(received.length).toBe(1);
  });

  it('falls back to persisted status when no in-memory client exists', async () => {
    const store = makeMockStore();
    await store.upsertStatus(7, { status: 'connected' });
    const mgr = new SessionManager({
      clientFactory: async () => makeMockClient(),
      store,
    });

    expect(await mgr.status(7)).toBe('connected');
    expect(mgr.hasClientFor(7)).toBe(false);
  });

  it('subscribe returns an unsubscribe that removes the listener', async () => {
    const client = makeMockClient();
    const mgr = new SessionManager({
      clientFactory: async () => client,
      store: makeMockStore(),
    });

    await mgr.startPairing(5);
    const events: SessionEvent[] = [];
    const unsub = mgr.subscribe(5, (e) => events.push(e));
    client.__emit({ type: 'qr', qrPngBase64: 'x', expiresAt: 1 });
    unsub();
    client.__emit({ type: 'qr', qrPngBase64: 'y', expiresAt: 2 });

    expect(events).toEqual([{ type: 'qr', qrPngBase64: 'x', expiresAt: 1 }]);
  });
});
