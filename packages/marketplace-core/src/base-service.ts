import type { ConnectionResult, ProductListing, ChannelOrder, SyncResult, SalesReport, ProviderCode } from './types.js';

export abstract class BaseMarketplaceService {
  constructor(
    protected providerCode: ProviderCode,
    protected credentials: Record<string, unknown> = {},
  ) {}

  abstract connect(config: Record<string, unknown>): Promise<ConnectionResult>;

  abstract disconnect(): Promise<void>;

  abstract refreshToken(): Promise<void>;

  abstract listProducts(params?: Record<string, unknown>): Promise<ProductListing[]>;

  abstract createProduct(data: Record<string, unknown>): Promise<ProductListing>;

  abstract updateProduct(id: string, data: Record<string, unknown>): Promise<ProductListing>;

  abstract deleteProduct(id: string): Promise<void>;

  abstract importOrders(since?: string): Promise<ChannelOrder[]>;

  abstract syncInventory(items: Array<{ sku: string; quantity: number }>): Promise<SyncResult>;

  abstract getSalesReport(from: string, to: string): Promise<SalesReport>;

  abstract getStoreInfo(): Promise<{ name: string; email?: string; storeId: string }>;
}
