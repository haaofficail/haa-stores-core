/**
 * WhatsApp pairing types — surface that's testable without the
 * @whiskeysockets/baileys runtime. The real Baileys implementation
 * lives in `baileys-client.ts`; tests inject a mock implementation
 * of `IBaileysClient` so unit tests stay deterministic and dep-free.
 */

export type SessionStatus = 'disconnected' | 'pairing' | 'connected';

export interface PairingQrEvent {
  type: 'qr';
  /** Base64-encoded PNG of the pairing QR (no `data:` prefix). */
  qrPngBase64: string;
  /** Pairing QRs expire ~30s; refresh fires a new event. */
  expiresAt: number;
}

export interface ConnectedEvent {
  type: 'connected';
  phone: string;
  deviceJid: string;
  displayName?: string;
}

export interface DisconnectedEvent {
  type: 'disconnected';
  reason: 'logged_out' | 'connection_lost' | 'admin_disconnect' | 'session_expired';
}

export interface FailureEvent {
  type: 'failure';
  message: string;
}

export type SessionEvent = PairingQrEvent | ConnectedEvent | DisconnectedEvent | FailureEvent;

export type SessionEventListener = (event: SessionEvent) => void;

/**
 * Interface for the per-store Baileys client. The session manager
 * never reaches inside the implementation; it only consumes the
 * lifecycle methods and events.
 *
 * Production implementation is `BaileysClient` in `baileys-client.ts`.
 * Tests use a `MockBaileysClient` that emits scripted events.
 */
export interface IBaileysClient {
  /** Start a pairing handshake. Emits `qr` events until paired or aborted. */
  startPairing(): Promise<void>;
  /** Disconnect the current session and clear in-memory state. */
  disconnect(reason: DisconnectedEvent['reason']): Promise<void>;
  /** Current snapshot of session status (does NOT emit). */
  status(): SessionStatus;
  /** Subscribe to lifecycle events. Returns an unsubscribe function. */
  on(listener: SessionEventListener): () => void;
}

/**
 * Persistence port — the session manager calls these to push status
 * updates to the database. The default impl reads/writes the
 * `whatsapp_sessions` table; tests inject an in-memory fake.
 */
export interface SessionStore {
  upsertStatus(storeId: number, patch: {
    status: SessionStatus;
    phone?: string | null;
    deviceJid?: string | null;
    displayName?: string | null;
    pairedAt?: Date | null;
    disconnectedAt?: Date | null;
    lastSeenAt?: Date | null;
  }): Promise<void>;
  /** AES-256-GCM-wrapped Baileys auth state. Plaintext NEVER passed in. */
  putEncryptedCreds(storeId: number, credsEncrypted: string): Promise<void>;
  getEncryptedCreds(storeId: number): Promise<string | null>;
  getStatus(storeId: number): Promise<SessionStatus>;
  clear(storeId: number): Promise<void>;
}
