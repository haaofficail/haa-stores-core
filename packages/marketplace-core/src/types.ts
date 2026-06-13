export type ProviderCode = 'salla' | 'zid' | 'noon' | 'amazon';

export type AuthType = 'oauth' | 'api_key' | 'jwt_credentials';

export type ConnectionStatus = 'disconnected' | 'connected' | 'error' | 'expired';

export type SyncType = 'products' | 'orders' | 'inventory';

export type SyncStatus = 'running' | 'completed' | 'failed' | 'partial';

export type ListingStatus = 'active' | 'inactive' | 'error';

export interface ProviderConfig {
  code: ProviderCode;
  name: string;
  authType: AuthType;
  logo?: string;
}

export interface OAuthCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  storeId?: string;
  storeName?: string;
  storeEmail?: string;
}

export interface ApiKeyCredentials {
  apiKey: string;
  apiSecret?: string;
  storeId?: string;
}

export interface JwtCredentials {
  clientId: string;
  privateKey: string;
  sellerName?: string;
  partnerId?: string;
  warehouseCode?: string;
}

export interface ConnectionResult {
  success: boolean;
  credentials: OAuthCredentials | ApiKeyCredentials | JwtCredentials;
  externalStoreId?: string;
  storeName?: string;
  storeEmail?: string;
}

export interface ProductListing {
  id?: number;
  productId?: number;
  marketplaceProductId?: string;
  marketplaceSku?: string;
  price?: string;
  salePrice?: string;
  quantity?: number;
  status: ListingStatus;
  marketplaceUrl?: string;
}

export interface ChannelOrder {
  marketplaceOrderId: string;
  status: string;
  totalAmount: string;
  currency: string;
  customerName?: string;
  orderedAt: string;
  orderData: Record<string, unknown>;
}

export interface SyncResult {
  itemsSynced: number;
  itemsFailed: number;
  errors?: string[];
}

export interface SalesReport {
  totalSales: string;
  totalOrders: number;
  currency: string;
  periodFrom: string;
  periodTo: string;
}

export const PROVIDERS: Record<ProviderCode, ProviderConfig> = {
  salla: { code: 'salla', name: 'سلة', authType: 'oauth' },
  zid: { code: 'zid', name: 'زد', authType: 'oauth' },
  noon: { code: 'noon', name: 'نون', authType: 'jwt_credentials' },
  amazon: { code: 'amazon', name: 'أمازون', authType: 'oauth' },
};

export const PROVIDER_CODES: ProviderCode[] = ['salla', 'zid', 'noon', 'amazon'];
