export { SHIPPING_CORE_VERSION } from "./version.js";
export type {
  ShippingProvider,
  ShippingRate,
  ShippingRateInput,
  CreateShipmentInput,
  ShipmentResult,
  TrackingStatus,
  ShippingLabel,
  AddressValidationResult,
  ReturnShipmentInput,
  ReturnResult,
} from "./provider.js";
export { ManualShippingProvider } from "./manual.js";
export { HaaMockShippingProvider } from "./mock.js";
export { OtoShippingProvider } from "./oto.js";
export { createShippingProvider, getShippingProviderStatus } from "./factory.js";
export { ShippingService } from "./shipping.js";
export { LabelService } from "./labels.js";
export { OtoMarketplaceService, getOtoApiBaseUrl, getOtoMode, hasOtoMarketplaceToken, verifyOtoWebhookSignature } from "./oto-marketplace.js";
export type { OtoIntegrationModel, OtoPlatformStatus, OtoProviderStatus, RegisterVendorInput } from "./oto-marketplace.js";
export { ReturnService } from "./returns.js";
