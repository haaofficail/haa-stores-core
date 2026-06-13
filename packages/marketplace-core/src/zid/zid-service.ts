import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { eq, and } from 'drizzle-orm';
import type { ConnectionResult, ProductListing, ChannelOrder, SyncResult, SalesReport } from '../types.js';

const AUTH_URL = 'https://oauth.zid.sa/oauth/authorize';
const TOKEN_URL = 'https://oauth.zid.sa/oauth/token';
const API_BASE = 'https://api.zid.sa/v1';

interface ZidOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface ZidTokenResponse {
  access_token: string;
  authorization: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface ZidStoreInfo {
  data?: {
    id: number;
    name: string;
    email: string;
  };
}

interface ZidProduct {
  id: number;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
  status: string;
  url?: string;
}

interface ZidProductsResponse {
  data: ZidProduct[];
  pagination?: { total: number; current_page: number; last_page: number };
}

interface ZidOrder {
  id: number;
  reference_id?: string;
  status: string;
  total: number;
  currency: string;
  customer_name?: string;
  created_at: string;
}

interface ZidOrdersResponse {
  data: ZidOrder[];
  pagination?: { total: number; current_page: number; last_page: number };
}

interface CredentialsStore {
  accessToken?: string;
  authorization?: string;
  refreshToken?: string;
  expiresAt?: string;
}

async function zidFetch<T>(path: string, authorization: string, accessToken: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${authorization}`,
    'X-Manager-Token': accessToken,
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
    throw new Error(`Zid API error ${response.status}: ${message}`);
  }

  return response.json() as Promise<T>;
}

export class ZidService {
  private config: ZidOAuthConfig;
  private db = createDbClient();

  constructor(
    private storeId: number,
    config?: Partial<ZidOAuthConfig>,
  ) {
    this.config = {
      clientId: config?.clientId || process.env.ZID_CLIENT_ID || '',
      clientSecret: config?.clientSecret || process.env.ZID_CLIENT_SECRET || '',
      redirectUri: config?.redirectUri || process.env.ZID_REDIRECT_URI || '',
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
    const response = await fetch(TOKEN_URL, {
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
      throw new Error(`Zid token exchange failed: ${err}`);
    }

    const tokenData = await response.json() as ZidTokenResponse;
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const info = await this.getStoreInfo(tokenData.authorization, tokenData.access_token);

    const provider = await this.db
      .select()
      .from(s.marketplaceProviders)
      .where(eq(s.marketplaceProviders.code, 'zid'))
      .limit(1);

    let providerId: number;
    if (provider.length === 0) {
      const [inserted] = await this.db
        .insert(s.marketplaceProviders)
        .values({ code: 'zid', name: 'زد', authType: 'oauth', active: true })
        .returning();
      providerId = inserted.id;
    } else {
      providerId = provider[0].id;
    }

    const credentials: CredentialsStore = {
      accessToken: tokenData.access_token,
      authorization: tokenData.authorization,
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
          credentials,
          isConnected: true,
          status: 'connected',
          storeName: info.name,
          storeEmail: info.email,
          externalStoreId: String(info.id),
          connectedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(s.marketplaceConnections.id, existing[0].id));
    } else {
      await this.db.insert(s.marketplaceConnections).values({
        storeId: this.storeId,
        providerId,
        isConnected: true,
        credentials,
        status: 'connected',
        storeName: info.name,
        storeEmail: info.email,
        externalStoreId: String(info.id),
        connectedAt: new Date(),
      });
    }

    return {
      success: true,
      credentials: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
      },
      externalStoreId: String(info.id),
      storeName: info.name,
      storeEmail: info.email,
    };
  }

  private async getConnection() {
    const provider = await this.db
      .select()
      .from(s.marketplaceProviders)
      .where(eq(s.marketplaceProviders.code, 'zid'))
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
    return connections[0] as typeof connections[0] & { credentials: CredentialsStore | null };
  }

  private async getTokens(): Promise<{ authorization: string; accessToken: string }> {
    const connection = await this.getConnection();
    if (!connection?.credentials) {
      throw new Error('Zid not connected. Please connect your store first.');
    }

    const auth = connection.credentials.authorization;
    const access = connection.credentials.accessToken;
    if (!auth || !access) {
      throw new Error('Zid credentials incomplete.');
    }

    return { authorization: auth, accessToken: access };
  }

  private async getStoreInfo(authorization: string, accessToken: string) {
    try {
      const info = await zidFetch<ZidStoreInfo>('/managers/account/profile', authorization, accessToken);
      return {
        id: info.data?.id || 0,
        name: info.data?.name || '',
        email: info.data?.email || '',
      };
    } catch {
      return { id: 0, name: '', email: '' };
    }
  }

  async getStoreInfoFromConnection(): Promise<{ name: string; email?: string; storeId: string }> {
    const { authorization, accessToken } = await this.getTokens();
    const info = await this.getStoreInfo(authorization, accessToken);
    return { name: info.name, email: info.email, storeId: String(info.id) };
  }

  async listProducts(params?: Record<string, unknown>): Promise<ProductListing[]> {
    const { authorization, accessToken } = await this.getTokens();
    const page = params?.page || 1;
    const data = await zidFetch<ZidProductsResponse>(`/products?page=${page}&limit=50`, authorization, accessToken);

    return (data.data || []).map((p) => ({
      marketplaceProductId: String(p.id),
      marketplaceSku: p.sku,
      price: String(p.price),
      quantity: p.quantity,
      status: (p.status === 'active' ? 'active' : 'inactive') as 'active' | 'inactive',
      marketplaceUrl: p.url,
    }));
  }

  async createProduct(data: Record<string, unknown>): Promise<ProductListing> {
    const { authorization, accessToken } = await this.getTokens();
    const body = {
      name: data.name,
      sku: data.sku,
      price: data.price,
      quantity: data.quantity,
      description: data.description,
    };

    const result = await zidFetch<{ data: ZidProduct }>('/products', authorization, accessToken, {
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
    const { authorization, accessToken } = await this.getTokens();
    const body: Record<string, unknown> = {};
    if (data.price) body.price = data.price;
    if (data.quantity !== undefined) body.quantity = data.quantity;
    if (data.name) body.name = data.name;

    const result = await zidFetch<{ data: ZidProduct }>(`/products/${id}`, authorization, accessToken, {
      method: 'PUT',
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

  async deleteProduct(id: string): Promise<void> {
    const { authorization, accessToken } = await this.getTokens();
    await zidFetch(`/products/${id}`, authorization, accessToken, { method: 'DELETE' });
  }

  async importOrders(since?: string): Promise<ChannelOrder[]> {
    const { authorization, accessToken } = await this.getTokens();
    let path = '/orders?limit=50';
    if (since) path += `&created_at[after]=${since}`;

    const data = await zidFetch<ZidOrdersResponse>(path, authorization, accessToken);

    return (data.data || []).map((o) => ({
      marketplaceOrderId: String(o.id),
      status: o.status,
      totalAmount: String(o.total),
      currency: o.currency || 'SAR',
      customerName: o.customer_name,
      orderedAt: o.created_at,
      orderData: o as unknown as Record<string, unknown>,
    }));
  }

  async syncInventory(items: Array<{ sku: string; quantity: number }>): Promise<SyncResult> {
    const { authorization, accessToken } = await this.getTokens();
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        const products = await zidFetch<ZidProductsResponse>(
          `/products?sku=${encodeURIComponent(item.sku)}`,
          authorization,
          accessToken,
        );

        if (products.data.length > 0) {
          await zidFetch(`/products/${products.data[0].id}`, authorization, accessToken, {
            method: 'PUT',
            body: JSON.stringify({ quantity: item.quantity }),
          });
          synced++;
        } else {
          failed++;
          errors.push(`Product with SKU ${item.sku} not found in Zid`);
        }
      } catch {
        failed++;
        errors.push(`Failed to sync SKU ${item.sku}`);
      }
    }

    return { itemsSynced: synced, itemsFailed: failed, errors };
  }

  async getSalesReport(from: string, to: string): Promise<SalesReport> {
    const { authorization, accessToken } = await this.getTokens();
    const path = `/orders?created_at[after]=${from}&created_at[before]=${to}&limit=100`;
    const data = await zidFetch<ZidOrdersResponse>(path, authorization, accessToken);

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

  async connect(config: Record<string, unknown>): Promise<ConnectionResult> {
    throw new Error('Use OAuth flow to connect Zid. Call getOAuthUrl() first.');
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
