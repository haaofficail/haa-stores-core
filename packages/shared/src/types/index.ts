export interface JwtPayload {
  userId: number;
  tenantId: number;
  activeStoreId: number;
  tokenVersion: number;
  roles: string[];
  permissions: string[];
}

export interface AuthContext {
  userId: number;
  tenantId: number;
  activeStoreId: number;
  tokenVersion: number;
  roles: string[];
  permissions: string[];
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface IdempotencyResult {
  idempotent: boolean;
  existingResponse?: Record<string, unknown>;
}

export type {
  OrderStatus, PaymentStatus, FulfillmentStatus, ShipmentStatus,
  ProductStatus, ProductType, StoreStatus,
  WalletEntryType, WalletEntryDirection, WalletEntryStatus,
  WebhookEventStatus, PaymentMethod, WebhookEventType,
  AuditAction, UserRole, Permission,
  ProviderCode, PaymentMode, InternalPaymentStatus,
  PaymentProviderCapabilities,
  KycStatus, BusinessType, KycDocumentType, BankAccountStatus,
} from './orders.js';

export {
  PROVIDER_CODES, PAYMENT_MODES, SAFE_PAYMENT_MODES,
  INTERNAL_PAYMENT_STATUSES,
} from './orders.js';

export type {
  ComplianceCheckItem, ComplianceCheckResult,
  ComplianceSource, ComplianceSeverity,
} from './compliance.js';

export type { PublishStatus } from './stores.js';
export { PUBLISH_STATUS_LABELS } from './stores.js';

export type {
  AuditLogEntry, AuditLogListParams, AuditLogListResult,
} from './audit.js';
export { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from './audit.js';

export type {
  ShippingProviderCode, ShippingMode, UnifiedShipmentStatus,
  ShippingProviderCapabilities,
} from './shipping.js';

export {
  SHIPPING_PROVIDER_CODES, SHIPPING_MODES, SAFE_SHIPPING_MODES,
  UNIFIED_SHIPMENT_STATUSES,
  MANUAL_CAPABILITIES, HAA_MOCK_CAPABILITIES, OTO_CAPABILITIES,
  SHIPPING_STATUS_LABELS, SHIPPING_STATUS_COLORS,
} from './shipping.js';
