import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { eq, and } from 'drizzle-orm';
import type { ConnectionResult, ProductListing, ChannelOrder, SyncResult, SalesReport } from '../types.js';
import { encryptCredentials, decryptCredentials } from '../credential-cipher.js';
import { resilientFetch } from '../resilient-fetch.js';

const AUTH_URL = 'https://accounts.salla.sa/oauth2/auth';
const TOKEN_URL = 'https://accounts.salla.sa/oauth2/token';
const API_BASE = 'https://api.salla.dev/admin/v2';

interface SallaOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface SallaTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

interface SallaStoreInfo {
  data?: {
    id: number;
    name: string;
    email: string;
    username: string;
  };
}

interface SallaProduct {
  id: number;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
  status: string;
  url?: string;
}

interface SallaProductsResponse {
  data: SallaProduct[];
  pagination?: { total: number; page: number; pages: number };
}

interface SallaOrder {
  id: number;
  reference_id: string;
  status: { name: string; value: string };
  amount: { total: number; currency: string };
  customer: { first_name: string; last_name: string };
  created_at: { date: string };
}

interface SallaOrdersResponse {
  data: SallaOrder[];
  pagination?: { total: number; page: number; pages: number };
}

interface CredentialsStore {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
}

interface SallaApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

async function sallaFetch<T>(path: string, accessToken: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await resilientFetch(url, { ...options, headers });

  if (!response.ok) {
    const error: SallaApiError = { status: response.status, message: response.statusText };
    try {
      const body: any = await response.json();
      error.message = body.message || JSON.stringify(body);
    } catch {}
    throw new Error(`Salla API error ${error.status}: ${error.message}`);
  }

  const data = await response.json() as T;
  return data;
}

export class SallaService {
  private config: SallaOAuthConfig;
  private db = createDbClient();

  constructor(
    private storeId: number,
    config?: Partial<SallaOAuthConfig>,
  ) {
    this.config = {
      clientId: config?.clientId || process.env.SALLA_CLIENT_ID || '',
      clientSecret: config?.clientSecret || process.env.SALLA_CLIENT_SECRET || '',
      redirectUri: config?.redirectUri || process.env.SALLA_REDIRECT_URI || '',
    };
  }

  getOAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: 'offline_access',
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<ConnectionResult> {
    const response = await resilientFetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        code,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Salla token exchange failed: ${err}`);
    }

    const tokenData = await response.json() as SallaTokenResponse;

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const storeInfo = await this.getStoreInfo(tokenData.access_token);

    const provider = await this.db
      .select()
      .from(s.marketplaceProviders)
      .where(eq(s.marketplaceProviders.code, 'salla'))
      .limit(1);

    let providerId: number;
    if (provider.length === 0) {
      const [inserted] = await this.db
        .insert(s.marketplaceProviders)
        .values({ code: 'salla', name: 'سلة', authType: 'oauth', active: true })
        .returning();
      providerId = inserted.id;
    } else {
      providerId = provider[0].id;
    }

    const credentials = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
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
          credentials: encryptCredentials(credentials) as typeof credentials,
          isConnected: true,
          status: 'connected',
          storeName: storeInfo.name,
          storeEmail: storeInfo.email,
          externalStoreId: String(storeInfo.id),
          connectedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(s.marketplaceConnections.id, existing[0].id));
    } else {
      await this.db.insert(s.marketplaceConnections).values({
        storeId: this.storeId,
        providerId,
        isConnected: true,
        credentials: encryptCredentials(credentials) as typeof credentials,
        status: 'connected',
        storeName: storeInfo.name,
        storeEmail: storeInfo.email,
        externalStoreId: String(storeInfo.id),
        connectedAt: new Date(),
      });
    }

    return {
      success: true,
      credentials,
      externalStoreId: String(storeInfo.id),
      storeName: storeInfo.name,
      storeEmail: storeInfo.email,
    };
  }

  async refreshToken(): Promise<void> {
    const connection = await this.getConnection();
    if (!connection?.credentials?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await resilientFetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: connection.credentials.refreshToken as string,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Salla token');
    }

    const tokenData = await response.json() as SallaTokenResponse;
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const credentials = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || connection.credentials.refreshToken,
      expiresAt,
    };

    await this.db
      .update(s.marketplaceConnections)
      .set({ credentials: encryptCredentials(credentials) as typeof credentials, updatedAt: new Date() })
      .where(eq(s.marketplaceConnections.id, connection.id));
  }

  private async getConnection() {
    const provider = await this.db
      .select()
      .from(s.marketplaceProviders)
      .where(eq(s.marketplaceProviders.code, 'salla'))
      .limit(1);

    if (provider.length === 0) return null;

    const connections = await this.db
      .select()
      .from(s.marketplaceConnections)
      .where(
        and(
          eq(s.marketplaceConnections.storeId, this.storeId),
          eq(s.marketplaceConnections.providerId, provider[0].id),
        ),
      )
      .limit(1);

    if (!connections[0]) return null;
    const conn = connections[0] as typeof connections[0] & { credentials: CredentialsStore | null };
    conn.credentials = decryptCredentials<CredentialsStore>(conn.credentials);
    return conn;
  }

  private async getAccessToken(): Promise<string> {
    const connection = await this.getConnection();
    if (!connection?.credentials?.accessToken) {
      throw new Error('Salla not connected. Please connect your store first.');
    }

    const expiresAt = connection.credentials.expiresAt as string;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      await this.refreshToken();
      const updated = await this.getConnection();
      return updated?.credentials?.accessToken as string;
    }

    return connection.credentials.accessToken as string;
  }

  private async getStoreInfo(accessToken: string) {
    const info = await sallaFetch<SallaStoreInfo>('/store/info', accessToken);
    return {
      id: info.data?.id || 0,
      name: info.data?.name || '',
      email: info.data?.email || '',
    };
  }

  async getStoreInfoFromConnection(): Promise<{ name: string; email?: string; storeId: string }> {
    const token = await this.getAccessToken();
    const info = await this.getStoreInfo(token);
    return { name: info.name, email: info.email, storeId: String(info.id) };
  }

  async listProducts(params?: Record<string, unknown>): Promise<ProductListing[]> {
    const token = await this.getAccessToken();
    const page = params?.page || 1;
    const data = await sallaFetch<SallaProductsResponse>(`/products?page=${page}&limit=50`, token);

    return (data.data || []).map((p) => ({
      marketplaceProductId: String(p.id),
      marketplaceSku: p.sku,
      price: String(p.price),
      quantity: p.quantity,
      status: (p.status === 'published' ? 'active' : 'inactive') as 'active' | 'inactive',
      marketplaceUrl: p.url,
    }));
  }

  async createProduct(data: Record<string, unknown>): Promise<ProductListing> {
    const token = await this.getAccessToken();
    const body = {
      name: data.name,
      sku: data.sku,
      price: data.price,
      quantity: data.quantity,
      description: data.description,
      status: 'published',
    };

    const result = await sallaFetch<{ data: SallaProduct }>('/products', token, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return {
      marketplaceProductId: String(result.data.id),
      marketplaceSku: result.data.sku,
      price: String(result.data.price),
      quantity: result.data.quantity,
      status: 'active',
    };
  }

  async updateProduct(id: string, data: Record<string, unknown>): Promise<ProductListing> {
    const token = await this.getAccessToken();
    const body: Record<string, unknown> = {};
    if (data.price) body.price = data.price;
    if (data.quantity !== undefined) body.quantity = data.quantity;
    if (data.name) body.name = data.name;

    const result = await sallaFetch<{ data: SallaProduct }>(`/products/${id}`, token, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    return {
      marketplaceProductId: String(result.data.id),
      marketplaceSku: result.data.sku,
      price: String(result.data.price),
      quantity: result.data.quantity,
      status: result.data.status === 'published' ? 'active' : 'inactive',
    };
  }

  async deleteProduct(id: string): Promise<void> {
    const token = await this.getAccessToken();
    await sallaFetch(`/products/${id}`, token, { method: 'DELETE' });
  }

  async importOrders(since?: string): Promise<ChannelOrder[]> {
    const token = await this.getAccessToken();
    let path = '/orders?limit=50';
    if (since) path += `&created_at[after]=${since}`;

    const data = await sallaFetch<SallaOrdersResponse>(path, token);

    return (data.data || []).map((o) => ({
      marketplaceOrderId: String(o.id),
      status: o.status.value,
      totalAmount: String(o.amount.total),
      currency: o.amount.currency,
      customerName: `${o.customer.first_name} ${o.customer.last_name}`,
      orderedAt: o.created_at.date,
      orderData: o as unknown as Record<string, unknown>,
    }));
  }

  async syncInventory(items: Array<{ sku: string; quantity: number }>): Promise<SyncResult> {
    const token = await this.getAccessToken();
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        const products = await sallaFetch<SallaProductsResponse>(
          `/products?sku=${encodeURIComponent(item.sku)}`,
          token,
        );

        if (products.data.length > 0) {
          await sallaFetch(`/products/${products.data[0].id}`, token, {
            method: 'PUT',
            body: JSON.stringify({ quantity: item.quantity }),
          });
          synced++;
        } else {
          failed++;
          errors.push(`Product with SKU ${item.sku} not found in Salla`);
        }
      } catch {
        failed++;
        errors.push(`Failed to sync SKU ${item.sku}`);
      }
    }

    return { itemsSynced: synced, itemsFailed: failed, errors };
  }

  async getSalesReport(from: string, to: string): Promise<SalesReport> {
    const token = await this.getAccessToken();
    const path = `/orders?created_at[after]=${from}&created_at[before]=${to}&limit=100`;
    const data = await sallaFetch<SallaOrdersResponse>(path, token);

    const totalOrders = data.data?.length || 0;
    const totalSales = (data.data || []).reduce((sum, o) => sum + Number(o.amount.total), 0);

    return {
      totalSales: String(totalSales),
      totalOrders,
      currency: 'SAR',
      periodFrom: from,
      periodTo: to,
    };
  }

  async connect(_config: Record<string, unknown>): Promise<ConnectionResult> {
    throw new Error('Use OAuth flow to connect Salla. Call getOAuthUrl() first.');
  }

  async disconnect(): Promise<void> {
    const connection = await this.getConnection();
    if (!connection) return;

    await this.db
      .update(s.marketplaceConnections)
      .set({
        isConnected: false,
        status: 'disconnected',
        credentials: null,
        updatedAt: new Date(),
      })
      .where(eq(s.marketplaceConnections.id, connection.id));
  }
}
