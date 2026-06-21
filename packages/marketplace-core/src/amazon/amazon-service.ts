import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { eq, and } from 'drizzle-orm';
import { createHmac, createHash } from 'node:crypto';
import type { ConnectionResult, ProductListing, ChannelOrder, SyncResult, SalesReport } from '../types.js';
import { resilientFetch } from '../resilient-fetch.js';
import { encryptCredentials, decryptCredentials } from '../credential-cipher.js';

interface AmazonCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  awsAccessKey: string;
  awsSecretKey: string;
  marketplaceId: string;
  sellerName?: string;
}

interface LwaTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface AmazonProduct {
  sellerSku: string;
  asin: string;
  price?: number;
  quantity?: number;
  status?: string;
}

interface AmazonProductsResponse {
  payload?: { products?: AmazonProduct[]; nextToken?: string };
}

interface AmazonOrder {
  AmazonOrderId: string;
  OrderStatus: string;
  OrderTotal?: { Amount: string; CurrencyCode: string };
  BuyerInfo?: { BuyerName?: string };
  PurchaseDate: string;
}

interface AmazonOrdersResponse {
  payload?: { Orders?: AmazonOrder[]; nextToken?: string };
}

const MARKETPLACES: Record<string, { endpoint: string; region: string; id: string }> = {
  sa: { endpoint: 'https://sellingpartnerapi-me.amazon.com', region: 'me', id: 'A2E3T7L0C1Z0XH' },
  ae: { endpoint: 'https://sellingpartnerapi-me.amazon.com', region: 'me', id: 'A2VIGQ35RCS4UG' },
  eg: { endpoint: 'https://sellingpartnerapi-me.amazon.com', region: 'me', id: 'ARBP9OOSHTCHU' },
  us: { endpoint: 'https://sellingpartnerapi-na.amazon.com', region: 'na', id: 'ATVPDKIKX0DER' },
  uk: { endpoint: 'https://sellingpartnerapi-eu.amazon.com', region: 'eu', id: 'A1F83G8C2ARO7P' },
  de: { endpoint: 'https://sellingpartnerapi-eu.amazon.com', region: 'eu', id: 'A1PA6795UKMFR9' },
};

function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmacSha256(key: Buffer, message: string): Buffer {
  return createHmac('sha256', key).update(message).digest();
}

function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmacSha256(Buffer.from(`AWS4${key}`), dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

function signV4(
  method: string,
  host: string,
  path: string,
  query: string,
  headers: Record<string, string>,
  body: string,
  accessKey: string,
  secretKey: string,
  region: string,
  service: string,
): { signedHeaders: string; signature: string; credentialScope: string } {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]/g, '').split('.')[0] + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const allHeaders: Record<string, string> = {
    host,
    'x-amz-date': amzDate,
    ...headers,
  };

  const sortedKeys = Object.keys(allHeaders).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const canonicalHeaders = sortedKeys.map((k) => `${k.toLowerCase()}:${allHeaders[k]}\n`).join('');
  const signedHeaders = sortedKeys.map((k) => k.toLowerCase()).join(';');

  const canonicalRequest = [
    method,
    path,
    query,
    canonicalHeaders,
    signedHeaders,
    sha256(body),
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');

  const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
  const signature = hmacSha256(signingKey, stringToSign).toString('hex');

  return { signedHeaders, signature, credentialScope };
}

async function getLwaAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string> {
  const res = await resilientFetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`LWA token error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as LwaTokenResponse;
  return data.access_token;
}

async function amazonFetch<T>(
  method: string,
  path: string,
  query: string,
  body: string,
  credentials: AmazonCredentials,
  marketplaceInfo: { endpoint: string; region: string; id: string },
): Promise<T> {
  const { clientId, clientSecret, refreshToken, awsAccessKey, awsSecretKey } = credentials;
  const { endpoint, region } = marketplaceInfo;

  const token = await getLwaAccessToken(clientId, clientSecret, refreshToken);
  const url = new URL(path + (query ? `?${query}` : ''), endpoint);

  const userHeaders: Record<string, string> = {
    'x-amz-access-token': token,
    'content-type': 'application/json',
    Accept: 'application/json',
  };

  const { signedHeaders, signature, credentialScope } = signV4(
    method,
    url.host,
    url.pathname,
    url.search.replace(/^\?/, ''),
    { ...userHeaders, 'x-amz-access-token': token },
    body,
    awsAccessKey,
    awsSecretKey,
    region,
    'execute-api',
  );

  const authHeader = `AWS4-HMAC-SHA256 Credential=${awsAccessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await resilientFetch(url.toString(), {
    method,
    headers: {
      ...userHeaders,
      Authorization: authHeader,
    },
    body: method === 'GET' || method === 'DELETE' ? undefined : body,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const j: any = await response.json();
      message = j.errors?.[0]?.message || j.message || JSON.stringify(j);
    } catch {}
    throw new Error(`Amazon API error ${response.status}: ${message}`);
  }

  return (await response.json()) as T;
}

export class AmazonService {
  private db = createDbClient();

  constructor(private storeId: number) {}

  private async getCredentials(): Promise<AmazonCredentials> {
    const provider = await this.db
      .select()
      .from(s.marketplaceProviders)
      .where(eq(s.marketplaceProviders.code, 'amazon'))
      .limit(1);

    if (provider.length === 0) throw new Error('Amazon provider not configured');

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

    if (!connection[0]?.credentials) throw new Error('Amazon not connected');

    const creds = decryptCredentials<AmazonCredentials>(connection[0].credentials);
    if (!creds || !creds.clientId || !creds.clientSecret || !creds.refreshToken || !creds.awsAccessKey || !creds.awsSecretKey) {
      throw new Error('Amazon credentials incomplete');
    }

    return creds;
  }

  private getMarketplace(id: string): { endpoint: string; region: string; id: string } {
    return MARKETPLACES[id] || MARKETPLACES.sa;
  }

  private async fetch<T>(
    method: string,
    path: string,
    query: string = '',
    body: string = '{}',
  ): Promise<T> {
    const creds = await this.getCredentials();
    const mp = this.getMarketplace(creds.marketplaceId);
    return amazonFetch<T>(method, path, query, body, creds, mp);
  }

  getOAuthUrl(state: string): string {
    return `https://sellercentral.amazon.com/apps/authorize/consent?application_id=${process.env.AMAZON_APP_CLIENT_ID || ''}&state=${state}&version=beta`;
  }

  async handleCallback(code: string, marketplaceId: string = 'sa'): Promise<ConnectionResult> {
    const clientId = process.env.AMAZON_CLIENT_ID || '';
    const clientSecret = process.env.AMAZON_CLIENT_SECRET || '';

    const res = await resilientFetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) throw new Error('Failed to exchange authorization code');

    const data = (await res.json()) as LwaTokenResponse & { refresh_token: string };

    const mp = this.getMarketplace(marketplaceId);
    const storedCreds: AmazonCredentials = {
      clientId,
      clientSecret,
      refreshToken: data.refresh_token,
      awsAccessKey: process.env.AMAZON_AWS_ACCESS_KEY || '',
      awsSecretKey: process.env.AMAZON_AWS_SECRET_KEY || '',
      marketplaceId,
    };

    const provider = await this.db
      .select()
      .from(s.marketplaceProviders)
      .where(eq(s.marketplaceProviders.code, 'amazon'))
      .limit(1);

    let providerId: number;
    if (provider.length === 0) {
      const [inserted] = await this.db
        .insert(s.marketplaceProviders)
        .values({ code: 'amazon', name: 'أمازون', authType: 'oauth', active: true })
        .returning();
      providerId = inserted.id;
    } else {
      providerId = provider[0].id;
    }

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
          credentials: encryptCredentials(storedCreds) as unknown as ConnectionResult['credentials'],
          isConnected: true,
          status: 'connected',
          connectedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(s.marketplaceConnections.id, existing[0].id));
    } else {
      await this.db.insert(s.marketplaceConnections).values({
        storeId: this.storeId,
        providerId,
        isConnected: true,
        credentials: encryptCredentials(storedCreds) as unknown as ConnectionResult['credentials'],
        status: 'connected',
        connectedAt: new Date(),
      });
    }

    return {
      success: true,
      credentials: storedCreds as unknown as ConnectionResult['credentials'] as unknown as ConnectionResult['credentials'],
      externalStoreId: mp.id,
    };
  }

  async connect(config: Record<string, unknown>): Promise<ConnectionResult> {
    const creds = config as unknown as AmazonCredentials;
    if (!creds.clientId || !creds.clientSecret || !creds.refreshToken || !creds.awsAccessKey || !creds.awsSecretKey) {
      throw new Error('Amazon requires clientId, clientSecret, refreshToken, awsAccessKey, and awsSecretKey');
    }

    const mp = this.getMarketplace(creds.marketplaceId || 'sa');
    const storedCreds: AmazonCredentials = {
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      refreshToken: creds.refreshToken,
      awsAccessKey: creds.awsAccessKey,
      awsSecretKey: creds.awsSecretKey,
      marketplaceId: creds.marketplaceId || 'sa',
      sellerName: creds.sellerName,
    };

    const provider = await this.db
      .select()
      .from(s.marketplaceProviders)
      .where(eq(s.marketplaceProviders.code, 'amazon'))
      .limit(1);

    let providerId: number;
    if (provider.length === 0) {
      const [inserted] = await this.db
        .insert(s.marketplaceProviders)
        .values({ code: 'amazon', name: 'أمازون', authType: 'oauth', active: true })
        .returning();
      providerId = inserted.id;
    } else {
      providerId = provider[0].id;
    }

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
          credentials: encryptCredentials(storedCreds) as unknown as ConnectionResult['credentials'],
          isConnected: true,
          status: 'connected',
          storeName: creds.sellerName,
          connectedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(s.marketplaceConnections.id, existing[0].id));
    } else {
      await this.db.insert(s.marketplaceConnections).values({
        storeId: this.storeId,
        providerId,
        isConnected: true,
        credentials: encryptCredentials(storedCreds) as unknown as ConnectionResult['credentials'],
        status: 'connected',
        storeName: creds.sellerName,
        connectedAt: new Date(),
      });
    }

    return { success: true, credentials: storedCreds as unknown as ConnectionResult['credentials'] };
  }

  async disconnect(): Promise<void> {
    const provider = await this.db
      .select()
      .from(s.marketplaceProviders)
      .where(eq(s.marketplaceProviders.code, 'amazon'))
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
      .set({ isConnected: false, status: 'disconnected', credentials: null, updatedAt: new Date() })
      .where(eq(s.marketplaceConnections.id, connection[0].id));
  }

  async refreshToken(): Promise<void> {
    // LWA tokens are auto-refreshed per request via refresh_token grant
  }

  async listProducts(params?: Record<string, unknown>): Promise<ProductListing[]> {
    const nextToken = params?.nextToken;
    const path = '/catalog/2022-04-01/items' + (params?.search ? `?keywords=${encodeURIComponent(String(params.search))}` : '');
    const data = await this.fetch<AmazonProductsResponse>('GET', path);
    return (data.payload?.products || []).map((p) => ({
      marketplaceProductId: p.asin,
      marketplaceSku: p.sellerSku,
      price: String(p.price || 0),
      quantity: p.quantity || 0,
      status: 'active' as const,
    }));
  }

  async createProduct(data: Record<string, unknown>): Promise<ProductListing> {
    const body = JSON.stringify(data);
    await this.fetch('POST', '/listings/2021-08-01/items', '', body);
    return {
      marketplaceProductId: data.sku as string || '',
      marketplaceSku: data.sku as string || '',
      price: String(data.price || 0),
      quantity: Number(data.quantity) || 0,
      status: 'active',
    };
  }

  async updateProduct(id: string, data: Record<string, unknown>): Promise<ProductListing> {
    const body = JSON.stringify(data);
    await this.fetch('PATCH', `/listings/2021-08-01/items/${encodeURIComponent(id)}`, '', body);
    return {
      marketplaceProductId: id,
      marketplaceSku: id,
      price: String(data.price || 0),
      quantity: Number(data.quantity) || 0,
      status: 'active',
    };
  }

  async deleteProduct(id: string): Promise<void> {
    await this.fetch('DELETE', `/listings/2021-08-01/items/${encodeURIComponent(id)}`);
  }

  async importOrders(since?: string): Promise<ChannelOrder[]> {
    const query = new URLSearchParams({
      MarketplaceIds: await this.getCredentials().then((c) => c.marketplaceId || 'A2E3T7L0C1Z0XH'),
      MaxResultsPerPage: '50',
    });
    if (since) query.set('CreatedAfter', since);

    const data = await this.fetch<AmazonOrdersResponse>('GET', `/orders/v0/orders?${query.toString()}`);

    return (data.payload?.Orders || []).map((o) => ({
      marketplaceOrderId: o.AmazonOrderId,
      status: o.OrderStatus,
      totalAmount: o.OrderTotal?.Amount || '0',
      currency: o.OrderTotal?.CurrencyCode || 'SAR',
      customerName: o.BuyerInfo?.BuyerName,
      orderedAt: o.PurchaseDate,
      orderData: o as unknown as Record<string, unknown>,
    }));
  }

  async syncInventory(items: Array<{ sku: string; quantity: number }>): Promise<SyncResult> {
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        const { marketplaceId } = await this.getCredentials();
        const body = JSON.stringify([
          { sku: item.sku, quantity: item.quantity, marketplaceId: marketplaceId || 'A2E3T7L0C1Z0XH' },
        ]);
        await this.fetch('POST', '/fba/inventory/v1/quantities', '', body);
        synced++;
      } catch {
        failed++;
        errors.push(`Failed to sync SKU ${item.sku}`);
      }
    }

    return { itemsSynced: synced, itemsFailed: failed, errors };
  }

  async getSalesReport(from: string, to: string): Promise<SalesReport> {
    const { marketplaceId } = await this.getCredentials();
    const query = new URLSearchParams({
      MarketplaceIds: marketplaceId || 'A2E3T7L0C1Z0XH',
      CreatedAfter: from,
      CreatedBefore: to,
      MaxResultsPerPage: '100',
    });

    const data = await this.fetch<AmazonOrdersResponse>('GET', `/orders/v0/orders?${query.toString()}`);

    const orders = data.payload?.Orders || [];
    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, o) => sum + Number(o.OrderTotal?.Amount || 0), 0);

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
      const creds = await this.getCredentials();
      return { name: creds.sellerName || '', storeId: creds.marketplaceId };
    } catch {
      return { name: '', storeId: '' };
    }
  }
}
