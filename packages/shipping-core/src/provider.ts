import type {
  ShippingProviderCode,
  ShippingMode,
  ShippingProviderCapabilities,
  UnifiedShipmentStatus,
} from "@haa/shared";

export interface ShippingRateInput {
  storeId: number;
  items: Array<{ weightGrams?: number | null; quantity: number; requiresShipping: boolean }>;
  destination: { city: string; state?: string; country: string };
  subtotal: number;
}

export interface ShippingRate {
  methodId: number;
  methodName: string;
  type: string;
  cost: number;
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
  freeAbove?: number | null;
}

export interface CreateShipmentInput {
  storeId: number;
  orderId: number;
  shippingMethodId: number;
  recipientName: string;
  recipientPhone: string;
  address: {
    street?: string;
    district?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  items: Array<{ weightGrams?: number | null; quantity: number }>;
  shippingCost: number;
  customerFee: number;
  merchantCost: number;
  platformCost: number;
  notes?: string;
}

export interface ShipmentResult {
  id?: number;
  provider: string;
  status: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrierName?: string;
  labelUrl?: string;
  providerShipmentId?: string;
}

export interface TrackingStatus {
  status: string;
  location?: string;
  description?: string;
  occurredAt: Date;
}

export interface AddressValidationResult {
  valid: boolean;
  message?: string;
  normalized?: {
    street?: string;
    city: string;
    state?: string;
    postalCode?: string;
  };
}

export interface ShippingLabel {
  url?: string;
  format: string;
}

export interface ReturnShipmentInput {
  storeId: number;
  originalShipmentId: number;
  orderId: number;
  reason: string;
  items?: Array<{ productId: number; quantity: number }>;
}

export interface ReturnResult {
  id?: number;
  status: string;
  trackingNumber?: string;
  rmaNumber?: string;
}

export interface ShippingProvider {
  readonly code: ShippingProviderCode;
  readonly name: string;
  readonly capabilities: ShippingProviderCapabilities;
  readonly isAvailable: boolean;
  readonly mode: ShippingMode;

  calculateRates(input: ShippingRateInput): Promise<ShippingRate[]>;
  createShipment(input: CreateShipmentInput): Promise<ShipmentResult>;
  cancelShipment(shipmentId: string | number, storeId?: number): Promise<void>;
  getShipmentStatus(shipmentId: string | number): Promise<{ status: string; providerStatus?: string }>;
  getTracking(shipmentId: string | number): Promise<TrackingStatus>;
  createLabel(shipmentId: string | number): Promise<ShippingLabel>;
  getLabel(shipmentId: string | number): Promise<ShippingLabel | null>;
  createReturn(input: ReturnShipmentInput): Promise<ReturnResult>;
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
  handleWebhook(
    payload: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<{ success: boolean; eventType?: string; shipmentId?: number }>;
  mapProviderStatus(providerStatus: string): UnifiedShipmentStatus;
  mapProviderError(errorCode: string): string;
  validateAddress(address: {
    city: string;
    state?: string;
    country: string;
  }): Promise<AddressValidationResult>;
}
