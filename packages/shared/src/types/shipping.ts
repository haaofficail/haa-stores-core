export type ShippingProviderCode = 'manual' | 'haa_mock' | 'oto' | 'aramex' | 'smsa';

export type ShippingMode = 'manual' | 'mock' | 'sandbox' | 'live';

export const SHIPPING_PROVIDER_CODES: ShippingProviderCode[] = ['manual', 'haa_mock', 'oto', 'aramex', 'smsa'];
export const SHIPPING_MODES: ShippingMode[] = ['manual', 'mock', 'sandbox', 'live'];
export const SAFE_SHIPPING_MODES: ShippingMode[] = ['manual', 'mock', 'sandbox'];

export type UnifiedShipmentStatus =
  | 'draft'
  | 'quoted'
  | 'label_created'
  | 'awaiting_pickup'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'delivery_failed'
  | 'return_requested'
  | 'return_in_transit'
  | 'returned'
  | 'cancelled'
  | 'exception';

export const UNIFIED_SHIPMENT_STATUSES: UnifiedShipmentStatus[] = [
  'draft', 'quoted', 'label_created', 'awaiting_pickup', 'picked_up',
  'in_transit', 'out_for_delivery', 'delivered', 'delivery_failed',
  'return_requested', 'return_in_transit', 'returned', 'cancelled', 'exception',
];

export interface ShippingProviderCapabilities {
  supportsRates: boolean;
  supportsLabels: boolean;
  supportsTracking: boolean;
  supportsReturns: boolean;
  supportsCOD: boolean;
  supportsPickup: boolean;
  supportsInternational: boolean;
  supportsWebhook: boolean;
}

export const MANUAL_CAPABILITIES: ShippingProviderCapabilities = {
  supportsRates: true,
  supportsLabels: false,
  supportsTracking: true,
  supportsReturns: true,
  supportsCOD: true,
  supportsPickup: true,
  supportsInternational: false,
  supportsWebhook: false,
};

export const HAA_MOCK_CAPABILITIES: ShippingProviderCapabilities = {
  supportsRates: true,
  supportsLabels: true,
  supportsTracking: true,
  supportsReturns: true,
  supportsCOD: false,
  supportsPickup: false,
  supportsInternational: false,
  supportsWebhook: true,
};

export const OTO_CAPABILITIES: ShippingProviderCapabilities = {
  supportsRates: true,
  supportsLabels: true,
  supportsTracking: true,
  supportsReturns: true,
  supportsCOD: true,
  supportsPickup: true,
  supportsInternational: true,
  supportsWebhook: true,
};

export const ARAMEX_CAPABILITIES: ShippingProviderCapabilities = {
  supportsRates: true,
  supportsLabels: true,
  supportsTracking: true,
  supportsReturns: true,
  supportsCOD: true,
  supportsPickup: true,
  supportsInternational: true,
  supportsWebhook: true,
};

export const SMSA_CAPABILITIES: ShippingProviderCapabilities = {
  supportsRates: true,
  supportsLabels: true,
  supportsTracking: true,
  supportsReturns: true,
  supportsCOD: true,
  supportsPickup: true,
  supportsInternational: false,
  supportsWebhook: false,
};

export const SHIPPING_STATUS_LABELS: Record<UnifiedShipmentStatus, string> = {
  draft: 'مسودة',
  quoted: 'تم التسعير',
  label_created: 'تم إنشاء البوليصة',
  awaiting_pickup: 'بانتظار الاستلام',
  picked_up: 'تم الاستلام',
  in_transit: 'قيد التوصيل',
  out_for_delivery: 'خارج للتوصيل',
  delivered: 'تم التوصيل',
  delivery_failed: 'فشل التوصيل',
  return_requested: 'طلب إرجاع',
  return_in_transit: 'الإرجاع قيد التوصيل',
  returned: 'تم الإرجاع',
  cancelled: 'ملغي',
  exception: 'استثناء',
};

export const SHIPPING_STATUS_COLORS: Record<UnifiedShipmentStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  quoted: 'bg-blue-100 text-blue-700',
  label_created: 'bg-purple-100 text-purple-700',
  awaiting_pickup: 'bg-yellow-100 text-yellow-700',
  picked_up: 'bg-indigo-100 text-indigo-700',
  in_transit: 'bg-blue-100 text-blue-700',
  out_for_delivery: 'bg-cyan-100 text-cyan-700',
  delivered: 'bg-green-100 text-green-700',
  delivery_failed: 'bg-red-100 text-red-700',
  return_requested: 'bg-orange-100 text-orange-700',
  return_in_transit: 'bg-orange-100 text-orange-700',
  returned: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  exception: 'bg-red-100 text-red-700',
};
