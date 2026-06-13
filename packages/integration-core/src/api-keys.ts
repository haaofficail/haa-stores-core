import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';

const AVAILABLE_SCOPES = ['products:read', 'products:write', 'orders:read', 'orders:create', 'customers:read', 'reports:read'];

export class ApiKeyService {
  constructor(private db: DbClient = createDbClient()) {}

  async createKey(storeId: number, name: string, scopes: string[]) {
    const validScopes = scopes.filter(s => AVAILABLE_SCOPES.includes(s));
    const rawKey = `haa_${crypto.randomBytes(24).toString('hex')}`;
    const keyPrefix = rawKey.substring(0, 12);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const [key] = await this.db.insert(s.apiKeys).values({
      storeId, name, keyPrefix, keyHash, scopes: validScopes,
    }).returning();

    return { id: key.id, name: key.name, key: rawKey, prefix: keyPrefix, scopes: validScopes };
  }

  async listKeys(storeId: number) {
    const keys = await this.db.select().from(s.apiKeys)
      .where(eq(s.apiKeys.storeId, storeId));
    return keys.map(k => ({ id: k.id, name: k.name, prefix: k.keyPrefix, scopes: k.scopes, isActive: k.isActive, lastUsedAt: k.lastUsedAt, createdAt: k.createdAt }));
  }

  async revokeKey(storeId: number, keyId: number) {
    await this.db.update(s.apiKeys).set({ isActive: false, revokedAt: new Date() })
      .where(and(eq(s.apiKeys.id, keyId), eq(s.apiKeys.storeId, storeId)));
  }

  async validateKey(rawKey: string) {
    const prefix = rawKey.substring(0, 12);
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const [key] = await this.db.select().from(s.apiKeys)
      .where(and(eq(s.apiKeys.keyPrefix, prefix), eq(s.apiKeys.keyHash, hash), eq(s.apiKeys.isActive, true))).limit(1);
    return key || null;
  }

  async getScopes() {
    return AVAILABLE_SCOPES;
  }

  async logRequest(data: { storeId: number; apiKeyId?: number; method: string; path: string; statusCode: number; ipAddress?: string; durationMs?: number; requestBody?: unknown; responseSummary?: string; errorMessage?: string }) {
    await this.db.insert(s.integrationLogs).values(data as any);
  }
}
