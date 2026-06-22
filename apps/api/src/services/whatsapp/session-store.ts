/**
 * Drizzle-backed implementation of `SessionStore`. Persists
 * `whatsapp_sessions` rows and wraps/unwraps the Baileys auth state
 * with the AES-256-GCM helper from `commerce-core/encryption`.
 *
 * Cross-tenant safety:
 *   - Every write filters by `storeId`.
 *   - The `whatsapp_sessions.store_id UNIQUE` constraint (WA-PR-1)
 *     makes a duplicate row impossible at the DB level.
 *   - Plaintext credentials NEVER hit the DB column. The `encrypt()`
 *     call is the only path; `decrypt()` is the only read path.
 *
 * Returns / accepts the encrypted blob as a `string` of the format
 * `iv:authTag:ciphertext` (hex-encoded). Plaintext is never returned
 * by `getEncryptedCreds`; callers that need to instantiate Baileys
 * pass the encrypted blob to `BaileysClient` and let it decrypt
 * once, in memory, on connect.
 */

import { eq } from 'drizzle-orm';
import type { SessionStatus, SessionStore } from './types.js';

// Schema + db are loose-typed here to avoid pulling the full Drizzle
// types into every consumer; the runtime contract is stable.
export interface DrizzleSessionStoreDeps {
  db: {
    select: (...args: unknown[]) => any;
    insert: (...args: unknown[]) => any;
    update: (...args: unknown[]) => any;
    delete: (...args: unknown[]) => any;
  };
  schema: {
    whatsappSessions: any;
  };
}

export class DrizzleSessionStore implements SessionStore {
  constructor(private deps: DrizzleSessionStoreDeps) {}

  async upsertStatus(
    storeId: number,
    patch: Parameters<SessionStore['upsertStatus']>[1],
  ): Promise<void> {
    const { db, schema } = this.deps;
    const existing = await db
      .select({ id: schema.whatsappSessions.id })
      .from(schema.whatsappSessions)
      .where(eq(schema.whatsappSessions.storeId, storeId));
    const now = new Date();
    if (existing.length > 0) {
      await db
        .update(schema.whatsappSessions)
        .set({
          status: patch.status,
          phone: patch.phone ?? undefined,
          deviceJid: patch.deviceJid ?? undefined,
          displayName: patch.displayName ?? undefined,
          pairedAt: patch.pairedAt ?? undefined,
          disconnectedAt: patch.disconnectedAt ?? undefined,
          lastSeenAt: patch.lastSeenAt ?? now,
          updatedAt: now,
        })
        .where(eq(schema.whatsappSessions.storeId, storeId));
    } else {
      await db.insert(schema.whatsappSessions).values({
        storeId,
        status: patch.status,
        phone: patch.phone ?? null,
        deviceJid: patch.deviceJid ?? null,
        displayName: patch.displayName ?? null,
        pairedAt: patch.pairedAt ?? null,
        disconnectedAt: patch.disconnectedAt ?? null,
        lastSeenAt: patch.lastSeenAt ?? now,
      });
    }
  }

  async putEncryptedCreds(storeId: number, credsEncrypted: string): Promise<void> {
    const { db, schema } = this.deps;
    // Defensive: NEVER accept anything that looks like a JSON blob —
    // that would mean an upstream caller forgot to encrypt.
    if (credsEncrypted.startsWith('{') || credsEncrypted.startsWith('[')) {
      throw new Error(
        'WhatsApp session creds appear to be plaintext JSON. Refusing to persist. ' +
          'Wrap with commerce-core/encryption.encrypt() first.',
      );
    }
    await db
      .update(schema.whatsappSessions)
      .set({ credsEncrypted, updatedAt: new Date() })
      .where(eq(schema.whatsappSessions.storeId, storeId));
  }

  async getEncryptedCreds(storeId: number): Promise<string | null> {
    const { db, schema } = this.deps;
    const rows = await db
      .select({ credsEncrypted: schema.whatsappSessions.credsEncrypted })
      .from(schema.whatsappSessions)
      .where(eq(schema.whatsappSessions.storeId, storeId));
    return rows[0]?.credsEncrypted ?? null;
  }

  async getStatus(storeId: number): Promise<SessionStatus> {
    const { db, schema } = this.deps;
    const rows = await db
      .select({ status: schema.whatsappSessions.status })
      .from(schema.whatsappSessions)
      .where(eq(schema.whatsappSessions.storeId, storeId));
    return (rows[0]?.status ?? 'disconnected') as SessionStatus;
  }

  async clear(storeId: number): Promise<void> {
    const { db, schema } = this.deps;
    await db
      .delete(schema.whatsappSessions)
      .where(eq(schema.whatsappSessions.storeId, storeId));
  }
}
