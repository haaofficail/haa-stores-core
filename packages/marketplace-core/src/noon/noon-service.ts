import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { eq, and } from 'drizzle-orm';
import { createSign } from 'node:crypto';
import type { ConnectionResult, ProductListing, ChannelOrder, SyncResult, SalesReport } from '../types.js';

const API_BASE = 'https://api.noon.com/partners';

interface NoonCredentials {
  clientId: string;
  privateKey: string;
  sellerName?: string;
  partnerId?: string;
  warehouseCode?: string;
}

interface NoonStoreInfo {
  id?: string;
  name?: string;
  email?: string;
  partnerId?: string;
}

interface NoonProduct {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  quantity?: number;
  status?: string;
}

interface NoonProductsResponse {
  data?: NoonProduct[];
  pagination?: { total: number; page: number; size: number };
}

interface NoonOrder {
  id: string;
  referenceNumber?: string;
  status: string;
  total: number;
  currency: string;
  customer?: { name?: string };
  createdAt: string;
}

interface NoonOrdersResponse {
  data?: NoonOrder[];
  pagination?: { total: number; page: number; size: number };
}

function generateJwt(clientId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientId,
    sub: clientId,
    iat: now,
    exp: now + 3600,
  };

  const base64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  const headerEncoded = base64url(header);
  const payloadEncoded = base64url(payload);
  const message = `${headerEncoded}.${payloadEncoded}`;

  const sign = createSign('RSA-SHA256');
  sign.update(message);
  const signature = sign.sign(privateKey, 'base64url');

  return `${message}.${signature}`;
}

async function noonFetch<T>(
  path: string,
  clientId: string,
  privateKey: string,
  options: RequestInit = {},
): Promise<T> {
  const token = generateJwt(clientId, privateKey);
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Accept-Language': 'ar',
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body: any = await response.json();
      message = body.message || body.error || JSON.stringify(body);
    } catch {}
    throw new Error(`Noon API error ${response.status}: ${message}`);
  }

  return response.json() as Promise<T>;
}

export class NoonService {
  private db = createDbClient();

  constructor(private storeId: number) {}

  private async getCredentials(): Promise<NoonCredentials> {
    const provider = await this.db
      .select()
      .from(s.marketplaceProviders)
      .where(eq(s.marketplaceProviders.code, 'noon'))
      .limit(1);

    if (provider.length === 0) throw new Error('Noon provider not configured');

    const connection = await this.db
      .select()
      .from(s.marketplaceConnections)
      .where(
        and(
          eq(s.marketplaceConnections.storeId, this.storeId),
          eq(s.marketplaceConnections.providerId, provider[0].id),
        ),
      )
      .limit(1);

    if (!connection[0]?.credentials) throw new Error('Noon not connected');

    const creds = connection[0].credentials as unknown as NoonCredentials;
    if (!creds.clientId || !creds.privateKey) throw new Error('Noon credentials incomplete');

    return creds;
  }

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const { clientId, privateKey } = await this.getCredentials();
    return noonFetch<T>(path, clientId, privateKey, options);
  }

  async connect(config: Record<string, unknown>): Promise<ConnectionResult> {
    const creds = config as unknown as NoonCredentials;
    if (!creds.clientId || !creds.privateKey) {
      throw new Error('Noon requires clientId and privateKey');
    }

    let storeInfo: NoonStoreInfo = {};
    try {
      const info = await noonFetch<{ data: NoonStoreInfo }>('/sellers/me', creds.clientId, creds.privateKey);
      storeInfo = info.data || {};
    } catch {
      storeInfo = {};
    }

    const provider = await this.db
      .select()
      .from(s.marketplaceProviders)
      .where(eq(s.marketplaceProviders.code, 'noon'))
      .limit(1);

    let providerId: number;
    if (provider.length === 0) {
      const [inserted] = await this.db
        .insert(s.marketplaceProviders)
        .values({ code: 'noon', name: 'نون', authType: 'jwt_credentials', active: true })
        .returning();
      providerId = inserted.id;
    } else {
      providerId = provider[0].id;
    }

    const storedCreds: NoonCredentials = {
      clientId: creds.clientId,
      privateKey: creds.privateKey,
      sellerName: creds.sellerName || storeInfo.name,
      partnerId: creds.partnerId || storeInfo.partnerId,
      warehouseCode: creds.warehouseCode,
    };

    const existing = await this.db
      .select()
      .from(s.marketplaceConnections)
      .where(
        and(
          eq(s.marketplaceConnections.storeId, this.storeId),
          eq(s.marketplaceConnections.providerId, providerId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(s.marketplaceConnections)
        .set({
          credentials: storedCreds,
          isConnected: true,
          status: 'connected',
          storeName: storeInfo.name,
          externalStoreId: storeInfo.id,
          connectedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(s.marketplaceConnections.id, existing[0].id));
    } else {
      await this.db.insert(s.marketplaceConnections).values({
        storeId: this.storeId,
        providerId,
        isConnected: true,
        credentials: storedCreds,
        status: 'connected',
        storeName: storeInfo.name,
        externalStoreId: storeInfo.id,
        connectedAt: new Date(),
      });
    }

    return {
      success: true,
      credentials: storedCreds,
      externalStoreId: storeInfo.id,
      storeName: storeInfo.name,
      storeEmail: storeInfo.email,
    };
  }

  async disconnect(): Promise<void> {
    const provider = await this.db
      .select()
      .from(s.marketplaceProviders)
      .where(eq(s.marketplaceProviders.code, 'noon'))
      .limit(1);

    if (provider.length === 0) return;

    const connection = await this.db
      .select()
      .from(s.marketplaceConnections)
      .where(
        and(
          eq(s.marketplaceConnections.storeId, this.storeId),
          eq(s.marketplaceConnections.providerId, provider[0].id),
        ),
      )
      .limit(1);

    if (!connection[0]) return;

    await this.db
      .update(s.marketplaceConnections)
      .set({
        isConnected: false,
        status: 'disconnected',
        credentials: null,
        updatedAt: new Date(),
      })
      .where(eq(s.marketplaceConnections.id, connection[0].id));
  }

  async refreshToken(): Promise<void> {
    // Noon uses self-signed JWTs — just regenerate on each request
  }

  async listProducts(params?: Record<string, unknown>): Promise<ProductListing[]> {
    const page = params?.page || 1;
    const data = await this.fetch<NoonProductsResponse>(`/products?page=${page}&size=50`);

    return (data.data || []).map((p) => ({
      marketplaceProductId: p.id,
      marketplaceSku: p.sku,
      price: String(p.price || 0),
      quantity: p.quantity || 0,
      status: (p.status === 'active' ? 'active' : 'inactive') as 'active' | 'inactive',
    }));
  }

  async createProduct(data: Record<string, unknown>): Promise<ProductListing> {
    const body = {
      name: data.name,
      sku: data.sku,
      price: data.price,
      quantity: data.quantity,
      description: data.description,
    };

    const result = await this.fetch<{ data: NoonProduct }>('/products', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return {
      marketplaceProductId: result.data.id,
      marketplaceSku: result.data.sku,
      price: String(result.data.price || 0),
      quantity: result.data.quantity || 0,
      status: 'active',
    };
  }

  async updateProduct(id: string, data: Record<string, unknown>): Promise<ProductListing> {
    const body: Record<string, unknown> = {};
    if (data.price) body.price = data.price;
    if (data.quantity !== undefined) body.quantity = data.quantity;
    if (data.name) body.name = data.name;

    const result = await this.fetch<{ data: NoonProduct }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    return {
      marketplaceProductId: result.data.id,
      marketplaceSku: result.data.sku,
      price: String(result.data.price || 0),
      quantity: result.data.quantity || 0,
      status: 'active',
    };
  }

  async deleteProduct(id: string): Promise<void> {
    await this.fetch(`/products/${id}`, { method: 'DELETE' });
  }

  async importOrders(since?: string): Promise<ChannelOrder[]> {
    let path = '/orders?size=50';
    if (since) path += `&createdAfter=${since}`;

    const data = await this.fetch<NoonOrdersResponse>(path);

    return (data.data || []).map((o) => ({
      marketplaceOrderId: o.id,
      status: o.status,
      totalAmount: String(o.total),
      currency: o.currency || 'SAR',
      customerName: o.customer?.name,
      orderedAt: o.createdAt,
      orderData: o as unknown as Record<string, unknown>,
    }));
  }

  async syncInventory(items: Array<{ sku: string; quantity: number }>): Promise<SyncResult> {
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        const products = await this.fetch<NoonProductsResponse>(
          `/products?sku=${encodeURIComponent(item.sku)}`,
        );

        if (products.data && products.data.length > 0) {
          await this.fetch(`/products/${products.data[0].id}/inventory`, {
            method: 'PUT',
            body: JSON.stringify({ quantity: item.quantity }),
          });
          synced++;
        } else {
          failed++;
          errors.push(`Product with SKU ${item.sku} not found in Noon`);
        }
      } catch {
        failed++;
        errors.push(`Failed to sync SKU ${item.sku}`);
      }
    }

    return { itemsSynced: synced, itemsFailed: failed, errors };
  }

  async getSalesReport(from: string, to: string): Promise<SalesReport> {
    const path = `/orders?createdAfter=${from}&createdBefore=${to}&size=100`;
    const data = await this.fetch<NoonOrdersResponse>(path);

    const totalOrders = data.data?.length || 0;
    const totalSales = (data.data || []).reduce((sum, o) => sum + Number(o.total), 0);

    return {
      totalSales: String(totalSales),
      totalOrders,
      currency: 'SAR',
      periodFrom: from,
      periodTo: to,
    };
  }

  async getStoreInfo(): Promise<{ name: string; email?: string; storeId: string }> {
    try {
      const { clientId, privateKey } = await this.getCredentials();
      const info = await noonFetch<{ data: NoonStoreInfo }>('/sellers/me', clientId, privateKey);
      const d = info.data || {};
      return { name: d.name || '', email: d.email, storeId: d.id || '' };
    } catch {
      const provider = await this.db
        .select()
        .from(s.marketplaceProviders)
        .where(eq(s.marketplaceProviders.code, 'noon'))
        .limit(1);

      if (provider.length === 0) return { name: '', storeId: '' };

      const connection = await this.db
        .select()
        .from(s.marketplaceConnections)
        .where(
          and(
            eq(s.marketplaceConnections.storeId, this.storeId),
            eq(s.marketplaceConnections.providerId, provider[0].id),
          ),
        )
        .limit(1);

      const creds = connection[0]?.credentials as unknown as NoonCredentials | undefined;
      return {
        name: creds?.sellerName || '',
        storeId: creds?.partnerId || '',
      };
    }
  }
}
