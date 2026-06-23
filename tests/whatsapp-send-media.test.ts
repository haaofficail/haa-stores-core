// WA-PR-6 — outbound media send: MIME allow-list + size cap + RBAC.
//
// This suite proves three guarantees in WA-PR-6:
//   1. The MIME allow-list (image/jpeg|png|webp, video/mp4, application/pdf)
//      is enforced fail-closed in BOTH the send-service AND the
//      BaileysClient (defence in depth).
//   2. The 16 MB hard cap is enforced before Baileys ever fetches the URL
//      (when the caller passes `sizeBytes` — which the route does).
//   3. The `POST /send-media` route is mounted behind
//      `requirePermission('promotions:update')` (same RBAC as `/send`).
//
// Strategy: unit-test the send-service with a mocked SessionManager +
// mocked BaileysClient — no real Baileys runtime, no DB, no network.
// RBAC assertion is a static-source check (matching the pattern in
// `require-permission-routes.test.ts`).

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { SessionManager } from '../apps/api/src/services/whatsapp/session-manager.js';
import type {
  IBaileysClient,
  SessionEvent,
  SessionEventListener,
  SessionStatus,
  SessionStore,
} from '../apps/api/src/services/whatsapp/types.js';
import {
  sendWhatsappMedia,
  WhatsappSendException,
  type SendMediaInput,
} from '../apps/api/src/services/whatsapp/send-service.js';
import {
  WA_MEDIA_MAX_BYTES,
  WA_MEDIA_MIME_ALLOWLIST,
  isAllowedWhatsappMime,
  inferMediaTypeFromMime,
  type WhatsappMediaType,
  type SendMediaOptions,
} from '../apps/api/src/services/whatsapp/baileys-client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Mocks — a SessionManager wired with a mock client we can introspect.
// ---------------------------------------------------------------------------

interface MockClient extends IBaileysClient {
  sendMessage: (to: string, body: string) => Promise<void>;
  sendMediaMessage: (to: string, opts: SendMediaOptions) => Promise<void>;
  __emit(event: SessionEvent): void;
  __sendCalls: Array<{ to: string; opts: SendMediaOptions }>;
}

function makeMockClient(opts: { failWith?: Error } = {}): MockClient {
  let status: SessionStatus = 'disconnected';
  const listeners = new Set<SessionEventListener>();
  const __sendCalls: Array<{ to: string; opts: SendMediaOptions }> = [];
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
    sendMessage: vi.fn(async () => {
      if (opts.failWith) throw opts.failWith;
    }),
    sendMediaMessage: vi.fn(async (to: string, sendOpts: SendMediaOptions) => {
      if (opts.failWith) throw opts.failWith;
      __sendCalls.push({ to, opts: sendOpts });
    }),
    __emit(event) {
      if (event.type === 'connected') status = 'connected';
      if (event.type === 'disconnected') status = 'disconnected';
      if (event.type === 'qr') status = 'pairing';
      for (const fn of listeners) fn(event);
    },
    __sendCalls,
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

async function makeConnectedManager(
  storeId: number,
  client = makeMockClient(),
): Promise<{ mgr: SessionManager; client: MockClient }> {
  const mgr = new SessionManager({
    clientFactory: async () => client,
    store: makeMockStore(),
  });
  await mgr.startPairing(storeId);
  client.__emit({ type: 'connected', phone: '+966500000000', deviceJid: 'jid' });
  return { mgr, client };
}

const validInput = (over: Partial<SendMediaInput> = {}): SendMediaInput => ({
  to: '+966500000001',
  mediaUrl: 'https://cdn.example.com/stores/1/uploads/x.jpg',
  type: 'image',
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  ...over,
});

// We bypass the rate limiter between cases (it's a process singleton).
import { whatsappRateLimiter } from '../apps/api/src/services/whatsapp/rate-limiter.js';

beforeEach(() => {
  // Reset the rate limiter buckets used by these tests.
  for (let i = 0; i < 50; i += 1) (whatsappRateLimiter as unknown as { __reset(n: number): void }).__reset(i);
});

// ---------------------------------------------------------------------------
// 1. MIME allow-list — the contract guards what reaches Baileys.
// ---------------------------------------------------------------------------

describe('WA-PR-6 — MIME allow-list', () => {
  it('exports exactly the approved MIMEs (raising the list requires owner approval)', () => {
    // Locking this exact set so a future "just add one" PR can't silently
    // extend the allow-list without updating this test.
    expect([...WA_MEDIA_MIME_ALLOWLIST].sort()).toEqual(
      [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'video/mp4',
      ].sort(),
    );
  });

  it('isAllowedWhatsappMime accepts every allow-listed MIME', () => {
    for (const m of WA_MEDIA_MIME_ALLOWLIST) {
      expect(isAllowedWhatsappMime(m)).toBe(true);
    }
  });

  it('isAllowedWhatsappMime rejects MIMEs outside the list', () => {
    for (const m of [
      'image/gif',
      'image/svg+xml',
      'video/quicktime',
      'video/webm',
      'audio/mpeg',
      'application/zip',
      'application/octet-stream',
      'text/html',
      '',
      undefined,
    ]) {
      expect(isAllowedWhatsappMime(m as string | undefined)).toBe(false);
    }
  });

  it('inferMediaTypeFromMime maps each allow-listed MIME to the right Baileys shape', () => {
    expect(inferMediaTypeFromMime('image/jpeg')).toBe<WhatsappMediaType>('image');
    expect(inferMediaTypeFromMime('image/png')).toBe<WhatsappMediaType>('image');
    expect(inferMediaTypeFromMime('image/webp')).toBe<WhatsappMediaType>('image');
    expect(inferMediaTypeFromMime('video/mp4')).toBe<WhatsappMediaType>('video');
    expect(inferMediaTypeFromMime('application/pdf')).toBe<WhatsappMediaType>('document');
  });

  it('rejects a not-allowed MIME with MEDIA_MIME_NOT_ALLOWED (fail-closed at send-service)', async () => {
    const { mgr } = await makeConnectedManager(1);
    await expect(
      sendWhatsappMedia(mgr, 1, validInput({ mimeType: 'image/gif', type: 'image' })),
    ).rejects.toMatchObject({
      info: { code: 'MEDIA_MIME_NOT_ALLOWED', mime: 'image/gif' },
    });
  });

  it('rejects when type tag does not agree with MIME (no smuggling a PDF as image)', async () => {
    const { mgr } = await makeConnectedManager(2);
    await expect(
      sendWhatsappMedia(
        mgr,
        2,
        validInput({ mimeType: 'application/pdf', type: 'image' }),
      ),
    ).rejects.toMatchObject({
      info: { code: 'MEDIA_TYPE_MISMATCH' },
    });
  });

  it('accepts every allow-listed MIME with the matching type and forwards to Baileys', async () => {
    const cases: Array<{ mimeType: string; type: WhatsappMediaType }> = [
      { mimeType: 'image/jpeg', type: 'image' },
      { mimeType: 'image/png', type: 'image' },
      { mimeType: 'image/webp', type: 'image' },
      { mimeType: 'video/mp4', type: 'video' },
      { mimeType: 'application/pdf', type: 'document' },
    ];
    for (const tc of cases) {
      const { mgr, client } = await makeConnectedManager(10);
      await sendWhatsappMedia(
        mgr,
        10,
        validInput({ mimeType: tc.mimeType, type: tc.type, fileName: 'doc.pdf' }),
      );
      expect(client.__sendCalls.length).toBe(1);
      expect(client.__sendCalls[0]!.opts.type).toBe(tc.type);
      expect(client.__sendCalls[0]!.opts.mimeType).toBe(tc.mimeType);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Defence in depth — BaileysClient re-validates the MIME.
// ---------------------------------------------------------------------------

describe('WA-PR-6 — BaileysClient defensive MIME re-check', () => {
  it('throws Unsupported media MIME when a future caller bypasses the send-service', async () => {
    // Import lazily so we don't pull in the Baileys runtime by accident.
    const { BaileysClient } = await import('../apps/api/src/services/whatsapp/baileys-client.js');
    const store = makeMockStore();
    const client = new BaileysClient({ storeId: 99, store });
    // Inject a fake socket so the "not connected" branch is skipped and
    // we hit the MIME guard directly.
    (client as unknown as { sock: unknown }).sock = {
      sendMessage: vi.fn(async () => undefined),
    };
    await expect(
      client.sendMediaMessage('+966500000000', {
        mediaUrl: 'https://cdn.example.com/x.bin',
        type: 'document',
        mimeType: 'application/zip',
      }),
    ).rejects.toThrow(/Unsupported media MIME/);
  });

  it('throws "session is not connected" when the socket is down (mirrors sendMessage)', async () => {
    const { BaileysClient } = await import('../apps/api/src/services/whatsapp/baileys-client.js');
    const client = new BaileysClient({ storeId: 100, store: makeMockStore() });
    await expect(
      client.sendMediaMessage('+966500000000', {
        mediaUrl: 'https://cdn.example.com/x.jpg',
        type: 'image',
        mimeType: 'image/jpeg',
      }),
    ).rejects.toThrow(/not connected/);
  });
});

// ---------------------------------------------------------------------------
// 3. Size cap — 16 MB. Owner-only to raise.
// ---------------------------------------------------------------------------

describe('WA-PR-6 — 16 MB size cap', () => {
  it('exports the cap as 16 MiB (owner-only to raise)', () => {
    expect(WA_MEDIA_MAX_BYTES).toBe(16 * 1024 * 1024);
  });

  it('rejects when sizeBytes > 16 MB with MEDIA_TOO_LARGE', async () => {
    const { mgr } = await makeConnectedManager(3);
    await expect(
      sendWhatsappMedia(
        mgr,
        3,
        validInput({ sizeBytes: WA_MEDIA_MAX_BYTES + 1 }),
      ),
    ).rejects.toMatchObject({
      info: {
        code: 'MEDIA_TOO_LARGE',
        maxBytes: WA_MEDIA_MAX_BYTES,
      },
    });
  });

  it('accepts payloads exactly at the cap (boundary = allowed)', async () => {
    const { mgr, client } = await makeConnectedManager(4);
    await sendWhatsappMedia(
      mgr,
      4,
      validInput({ sizeBytes: WA_MEDIA_MAX_BYTES }),
    );
    expect(client.__sendCalls.length).toBe(1);
  });

  it('still works when sizeBytes is omitted (cap is best-effort when caller skips it)', async () => {
    const { mgr, client } = await makeConnectedManager(5);
    const { sizeBytes: _omit, ...withoutSize } = validInput();
    void _omit;
    await sendWhatsappMedia(mgr, 5, withoutSize as SendMediaInput);
    expect(client.__sendCalls.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 4. URL hardening — reject http, file://, junk; accept /storage signed.
// ---------------------------------------------------------------------------

describe('WA-PR-6 — media URL hardening', () => {
  it('rejects http:// URLs (HTTPS only)', async () => {
    const { mgr } = await makeConnectedManager(6);
    await expect(
      sendWhatsappMedia(mgr, 6, validInput({ mediaUrl: 'http://cdn.example.com/x.jpg' })),
    ).rejects.toMatchObject({ info: { code: 'INVALID_MEDIA_URL' } });
  });

  it('rejects file:// URLs', async () => {
    const { mgr } = await makeConnectedManager(7);
    await expect(
      sendWhatsappMedia(mgr, 7, validInput({ mediaUrl: 'file:///etc/passwd' })),
    ).rejects.toMatchObject({ info: { code: 'INVALID_MEDIA_URL' } });
  });

  it('accepts our own signed /storage/ path (the merchant upload pipeline output)', async () => {
    const { mgr, client } = await makeConnectedManager(8);
    await sendWhatsappMedia(
      mgr,
      8,
      validInput({
        mediaUrl: '/storage/stores/1/uploads/abc.jpg?expires=123&sig=deadbeefdeadbeef',
      }),
    );
    expect(client.__sendCalls.length).toBe(1);
  });

  it('rejects an empty / oversized URL', async () => {
    const { mgr } = await makeConnectedManager(9);
    await expect(
      sendWhatsappMedia(mgr, 9, validInput({ mediaUrl: '' })),
    ).rejects.toMatchObject({ info: { code: 'INVALID_MEDIA_URL' } });
    await expect(
      sendWhatsappMedia(mgr, 9, validInput({ mediaUrl: 'https://' + 'a'.repeat(3000) })),
    ).rejects.toMatchObject({ info: { code: 'INVALID_MEDIA_URL' } });
  });
});

// ---------------------------------------------------------------------------
// 5. Phone validation + session + rate limiter — reuses /send guarantees.
// ---------------------------------------------------------------------------

describe('WA-PR-6 — send-service guard rails', () => {
  it('rejects an obviously invalid phone with INVALID_PHONE', async () => {
    const { mgr } = await makeConnectedManager(11);
    await expect(
      sendWhatsappMedia(mgr, 11, validInput({ to: 'abc' })),
    ).rejects.toMatchObject({ info: { code: 'INVALID_PHONE' } });
  });

  it('returns SESSION_NOT_CONNECTED when the session is not paired (covers the flag-off path)', async () => {
    // No connected event emitted — status stays 'pairing' / 'disconnected'.
    const client = makeMockClient();
    const mgr = new SessionManager({
      clientFactory: async () => client,
      store: makeMockStore(),
    });
    await mgr.startPairing(12);
    await expect(
      sendWhatsappMedia(mgr, 12, validInput()),
    ).rejects.toMatchObject({ info: { code: 'SESSION_NOT_CONNECTED' } });
  });

  it('returns RATE_LIMITED when the per-store bucket is empty', async () => {
    const { mgr } = await makeConnectedManager(13);
    // Drain the bucket directly.
    for (let i = 0; i < 121; i += 1) whatsappRateLimiter.tryTake(13);
    await expect(
      sendWhatsappMedia(mgr, 13, validInput()),
    ).rejects.toMatchObject({ info: { code: 'RATE_LIMITED' } });
  });

  it('passes caption + fileName through to the Baileys layer', async () => {
    const { mgr, client } = await makeConnectedManager(14);
    await sendWhatsappMedia(
      mgr,
      14,
      validInput({
        type: 'document',
        mimeType: 'application/pdf',
        mediaUrl: 'https://cdn.example.com/invoice.pdf',
        caption: 'Your invoice',
        fileName: 'invoice-2026-06.pdf',
      }),
    );
    expect(client.__sendCalls[0]!.opts.caption).toBe('Your invoice');
    expect(client.__sendCalls[0]!.opts.fileName).toBe('invoice-2026-06.pdf');
  });
});

// ---------------------------------------------------------------------------
// 6. Route surface — RBAC + flag + cap declared in the source.
// ---------------------------------------------------------------------------

describe('WA-PR-6 — POST /send-media route surface', () => {
  const route = readFileSync(
    resolve(projectRoot, 'apps/api/src/routes/whatsapp.ts'),
    'utf-8',
  );

  it('mounts POST /send-media', () => {
    expect(route).toMatch(/whatsappRouter\.post\(\s*['"]\/send-media['"]/);
  });

  it('requires the promotions:update permission (same RBAC as /send)', () => {
    // The route block must include requirePermission('promotions:update')
    // adjacent to the /send-media handler.
    const block = route.slice(route.indexOf("'/send-media'"));
    expect(block).toMatch(/requirePermission\(['"]promotions:update['"]\)/);
  });

  it('validates the request body with zod and the MIME enum is the allow-list', () => {
    const block = route.slice(route.indexOf("'/send-media'"));
    expect(block).toMatch(/zValidator\(['"]json['"]\s*,\s*sendMediaSchema/);
    expect(route).toMatch(/'image\/jpeg'/);
    expect(route).toMatch(/'image\/png'/);
    expect(route).toMatch(/'image\/webp'/);
    expect(route).toMatch(/'video\/mp4'/);
    expect(route).toMatch(/'application\/pdf'/);
  });

  it('caps sizeBytes in the zod schema at WA_MEDIA_MAX_BYTES (defence in depth)', () => {
    expect(route).toMatch(/\.max\(WA_MEDIA_MAX_BYTES\)/);
  });

  it('maps MEDIA_TOO_LARGE → 413, RATE_LIMITED → 429, SESSION_NOT_CONNECTED → 409', () => {
    const block = route.slice(route.indexOf("'/send-media'"));
    expect(block).toMatch(/'MEDIA_TOO_LARGE'\s*\?\s*413/);
    expect(block).toMatch(/'RATE_LIMITED'\s*\?\s*429/);
    expect(block).toMatch(/'SESSION_NOT_CONNECTED'\s*\?\s*409/);
  });
});

// ---------------------------------------------------------------------------
// 7. Error surface — WhatsappSendException is the only typed surface.
// ---------------------------------------------------------------------------

describe('WA-PR-6 — error surface', () => {
  it('every send-service failure is a WhatsappSendException', async () => {
    const { mgr } = await makeConnectedManager(15);
    for (const bad of [
      validInput({ to: 'nope' }),
      validInput({ mediaUrl: 'http://nope' }),
      validInput({ mimeType: 'image/gif' }),
      validInput({ mimeType: 'application/pdf', type: 'image' }),
      validInput({ sizeBytes: WA_MEDIA_MAX_BYTES + 1 }),
    ]) {
      let caught: unknown;
      try {
        await sendWhatsappMedia(mgr, 15, bad);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(WhatsappSendException);
    }
  });
});
