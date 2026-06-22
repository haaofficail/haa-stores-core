/**
 * Real Baileys-backed implementation of `IBaileysClient`.
 *
 * Wraps `@whiskeysockets/baileys` v7 into the surface the session
 * manager expects. Holds the live WebSocket connection to WhatsApp's
 * edge, persists encrypted auth state via `SessionStore`, and emits
 * `qr` / `connected` / `disconnected` / `failure` events.
 *
 * Encryption contract:
 *   - The Baileys auth state is serialized via `BufferJSON.replacer`,
 *     wrapped with `commerce-core/encryption.encrypt` (AES-256-GCM,
 *     keyed by `PAYMENT_CREDENTIALS_ENCRYPTION_KEY`), then persisted
 *     to `whatsapp_sessions.creds_encrypted` as a `text` column.
 *   - On `creds.update` (Baileys events), we re-encrypt the full
 *     creds blob and overwrite the column. Plaintext is never logged
 *     and never returned by any API.
 *
 * Lifecycle:
 *   - `startPairing()` opens a socket without auth; the `qr` event
 *     fires every ~30s until the merchant scans, then `connection.update`
 *     fires with `connection='open'`.
 *   - `disconnect(reason)` calls `sock.logout()` (cleanly removes the
 *     device from WhatsApp's linked-devices list) and clears creds
 *     when reason is `logged_out` or `admin_disconnect`.
 *   - `sendMessage(jid, body)` is exposed for the send service. The
 *     rate-limiter is enforced ABOVE this layer (in `send-service.ts`).
 *
 * Why a class (not a function): the session manager calls `on(listener)`
 * to subscribe + `status()` to read. A class is the natural shape.
 */

import { encrypt, decrypt } from '@haa/commerce-core';
import qrcode from 'qrcode';
import type pino from 'pino';
import type { IBaileysClient, SessionEvent, SessionEventListener, SessionStatus, SessionStore } from './types.js';

// Lazy-load Baileys + pino so the test environment (and the stub
// codepath) can run without these heavyweights loaded into memory.
type BaileysSocket = {
  ev: { on: (event: string, cb: (data: unknown) => void) => void };
  sendMessage: (jid: string, content: { text: string }) => Promise<unknown>;
  logout: () => Promise<void>;
  end: (err?: Error) => void;
};

interface BaileysModule {
  default: (opts: Record<string, unknown>) => BaileysSocket;
  DisconnectReason: Record<string, number>;
  useMultiFileAuthState?: unknown;
  initAuthCreds: () => unknown;
  BufferJSON: { replacer: (k: string, v: unknown) => unknown; reviver: (k: string, v: unknown) => unknown };
}

let baileysModule: BaileysModule | null = null;
async function loadBaileys(): Promise<BaileysModule> {
  if (baileysModule) return baileysModule;
  // Dynamic import keeps cold-start fast and lets the stub codepath
  // run without the dep loaded.
  // @ts-expect-error — runtime resolved
  const mod = (await import('@whiskeysockets/baileys')) as BaileysModule;
  baileysModule = mod;
  return mod;
}

let pinoLogger: pino.Logger | null = null;
async function loadLogger(): Promise<pino.Logger> {
  if (pinoLogger) return pinoLogger;
  const { default: pinoFactory } = await import('pino');
  pinoLogger = pinoFactory({ level: 'warn' });
  return pinoLogger!;
}

export interface BaileysClientOptions {
  storeId: number;
  store: SessionStore;
}

export class BaileysClient implements IBaileysClient {
  private sock: BaileysSocket | null = null;
  private currentStatus: SessionStatus = 'disconnected';
  private listeners = new Set<SessionEventListener>();

  constructor(private opts: BaileysClientOptions) {}

  status(): SessionStatus {
    return this.currentStatus;
  }

  on(listener: SessionEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: SessionEvent): void {
    if (event.type === 'connected') this.currentStatus = 'connected';
    if (event.type === 'disconnected') this.currentStatus = 'disconnected';
    if (event.type === 'qr') this.currentStatus = 'pairing';
    for (const fn of this.listeners) fn(event);
  }

  async startPairing(): Promise<void> {
    if (this.sock) return; // already connected/pairing
    const baileys = await loadBaileys();
    const logger = await loadLogger();

    // Build the auth state from the encrypted blob (if any).
    const state = await this.loadAuthState(baileys);

    const sock = baileys.default({
      auth: state.state,
      logger,
      printQRInTerminal: false,
      browser: ['Haa Stores', 'Desktop', '1.0.0'],
    });
    this.sock = sock;

    // Connection events — emit `qr`, `connected`, `disconnected`.
    sock.ev.on('connection.update', (raw) => {
      const update = raw as {
        connection?: 'open' | 'close' | 'connecting';
        qr?: string;
        lastDisconnect?: { error?: { output?: { statusCode?: number } } };
      };
      if (update.qr) {
        // Convert the raw QR string into a PNG data URL → strip prefix
        // to get a base64-only payload (the SSE frame transports it).
        void qrcode.toDataURL(update.qr, { width: 320 }).then((dataUrl) => {
          const pngBase64 = dataUrl.replace(/^data:image\/png;base64,/, '');
          this.emit({ type: 'qr', qrPngBase64: pngBase64, expiresAt: Date.now() + 30_000 });
        });
      }
      if (update.connection === 'open') {
        // After successful pair, phone identity isn't always immediately
        // available on the socket. We use the JID from the creds.
        const jid = (state.state.creds as { me?: { id?: string; name?: string } })?.me?.id ?? 'unknown';
        const displayName = (state.state.creds as { me?: { id?: string; name?: string } })?.me?.name;
        const phone = jid.split('@')[0]?.split(':')[0] ?? '';
        this.emit({
          type: 'connected',
          phone: phone ? `+${phone}` : '',
          deviceJid: jid,
          displayName,
        });
      }
      if (update.connection === 'close') {
        const code = update.lastDisconnect?.error?.output?.statusCode;
        const loggedOut = code === baileys.DisconnectReason.loggedOut;
        this.emit({ type: 'disconnected', reason: loggedOut ? 'logged_out' : 'connection_lost' });
        this.sock = null;
        if (loggedOut) {
          void this.opts.store.clear(this.opts.storeId);
        }
      }
    });

    // Persist creds on every update — wrapped with AES-256-GCM.
    sock.ev.on('creds.update', () => {
      void this.persistCreds(state.state.creds, baileys.BufferJSON.replacer);
    });
  }

  async disconnect(reason: 'logged_out' | 'connection_lost' | 'admin_disconnect' | 'session_expired'): Promise<void> {
    const sock = this.sock;
    this.sock = null;
    if (sock) {
      try {
        if (reason === 'admin_disconnect' || reason === 'logged_out') {
          await sock.logout().catch(() => undefined);
        } else {
          sock.end();
        }
      } catch {
        // best-effort
      }
    }
    if (reason === 'admin_disconnect' || reason === 'logged_out') {
      await this.opts.store.clear(this.opts.storeId).catch(() => undefined);
    }
    this.emit({ type: 'disconnected', reason });
  }

  /**
   * Send a plain-text message. Called by `send-service.ts` after the
   * rate limiter approves. Throws if the socket isn't connected.
   */
  async sendMessage(to: string, body: string): Promise<void> {
    if (!this.sock) throw new Error('WhatsApp session is not connected');
    const jid = normalizeJid(to);
    await this.sock.sendMessage(jid, { text: body });
  }

  private async loadAuthState(
    baileys: BaileysModule,
  ): Promise<{ state: { creds: unknown; keys: unknown } }> {
    const credsBlob = await this.opts.store.getEncryptedCreds(this.opts.storeId);
    if (!credsBlob) {
      // Fresh start.
      const creds = baileys.initAuthCreds();
      return { state: { creds, keys: makeEphemeralKeyStore() } };
    }
    try {
      const json = decrypt(credsBlob);
      const creds = JSON.parse(json, baileys.BufferJSON.reviver) as unknown;
      return { state: { creds, keys: makeEphemeralKeyStore() } };
    } catch {
      // Corrupted creds → start fresh; the merchant will need to re-pair.
      const creds = baileys.initAuthCreds();
      return { state: { creds, keys: makeEphemeralKeyStore() } };
    }
  }

  private async persistCreds(creds: unknown, replacer: (k: string, v: unknown) => unknown): Promise<void> {
    try {
      const json = JSON.stringify(creds, replacer);
      const wrapped = encrypt(json);
      await this.opts.store.putEncryptedCreds(this.opts.storeId, wrapped);
    } catch {
      // Persistence failures are logged inside the store impl; never
      // bubble. The next creds.update will retry.
    }
  }
}

/**
 * Convert "+966500000000" / "0500000000" / "966500000000" into the
 * Baileys JID format `<digits>@s.whatsapp.net`. Returns whatever is
 * passed if it already looks like a JID.
 */
function normalizeJid(phoneOrJid: string): string {
  if (phoneOrJid.includes('@')) return phoneOrJid;
  const digits = phoneOrJid.replace(/\D/g, '');
  // Saudi-aware: a leading 0 means a local SA number, prepend country.
  const final = digits.startsWith('0') ? `966${digits.slice(1)}` : digits;
  return `${final}@s.whatsapp.net`;
}

/**
 * Minimal in-memory `keys` store. The real Baileys signal-protocol
 * key store needs persistence to recover messages across restarts,
 * but for the MVP we accept the trade-off: a process restart forces
 * re-pair. WA-PR-4 (analytics + hardening) will add a DB-backed key
 * store keyed by store_id.
 */
function makeEphemeralKeyStore(): unknown {
  const data = new Map<string, unknown>();
  return {
    get(type: string, ids: string[]) {
      const result: Record<string, unknown> = {};
      for (const id of ids) {
        const key = `${type}:${id}`;
        if (data.has(key)) result[id] = data.get(key);
      }
      return result;
    },
    set(modification: Record<string, Record<string, unknown>>) {
      for (const [type, byId] of Object.entries(modification)) {
        for (const [id, value] of Object.entries(byId)) {
          const key = `${type}:${id}`;
          if (value == null) data.delete(key);
          else data.set(key, value);
        }
      }
    },
    clear: () => data.clear(),
  };
}
