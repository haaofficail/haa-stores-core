export const COMMERCE_CORE_VERSION = '0.1.0';

// VAT helpers (ZATCA 15% standard; env-overridable for future jurisdictions)
export {
  DEFAULT_VAT_RATE, isValidVatRate, priceIncVat, priceExVat, vatAmount,
  formatVatLine, formatPriceIncVatLabel,
} from './vat.js';

export { ProductsService } from './products.js';
export { CategoriesService } from './categories.js';
export { BrandsService, createBrandSchema } from './brands.js';
export { TagsService, createTagSchema } from './tags.js';
export { CustomersService } from './customers.js';
export { CartService } from './cart.js';
export { OrdersService } from './orders.js';
export { CheckoutService } from './checkout.js';
export { WalletPostingService } from './wallet-posting-service.js';
export type {
  DedupKey,
  PostResult,
  PolicySource,
} from './wallet-posting-service.js';
export { AuthFlowService, authFlowService } from './auth-flow.js';
export type {
  RegisterInput,
  RegisterPayload,
  RegisterError,
  LoginInput,
  LoginError,
  LoginPayload,
  MeUser,
} from './auth-flow.js';
export { ProviderStatusService, providerStatusService } from './provider-status-service.js';
export { MarketplaceSyncService, marketplaceSyncService } from './marketplace-sync.js';
export type { MarketplaceProvider, MarketplaceProviderResolver, AutoPublishInput, AutoPublishResult } from './marketplace-sync.js';
export { StoreSettingsService, storeSettingsService } from './store-settings-service.js';
export { DashboardService, dashboardService } from './dashboard-service.js';
export type { DashboardSummary, ReadinessIssue, RecentActionableOrder } from './dashboard-service.js';
export {
  FakePaymentProvider, GeideaPaymentProvider, MoyasarSandboxProvider, TabbyProvider, TamaraProvider,
  PaymentService, createGeideaSignature, createPaymentProvider, getPaymentProviderStatus,
  getAvailablePaymentMethods, mapProviderStatus, mapProviderError, verifyGeideaCallbackSignature,
  FAKE_CAPABILITIES, MOYASAR_CAPABILITIES, GEIDEA_CAPABILITIES, TABBY_CAPABILITIES, TAMARA_CAPABILITIES,
} from '@haa/payment-providers';
export type { PaymentProvider } from '@haa/payment-providers';
export { buildLocalWhatsappQrDataUrl, buildWhatsappContactChannel, buildWhatsappLink, getOfficialContactEmail, isValidWhatsappPhone, normalizeWhatsappPhone } from './contact-channels.js';
export { PaymentProviderSettingsService, getTabbyBaseUrl, getTamaraBaseUrl, validateTabbyCredentials, validateTamaraCredentials, redactCredential } from './payment-settings.js';
export type { PaymentProviderSetting, PaymentProviderSettingView, UpsertPaymentProviderInput, CredentialsInput, ProviderValidationResult, PaymentMethodAvailability, UnavailabilityReason } from './payment-settings.js';
export { CouponsService } from './coupons.js';
export { ReportsService } from './reports.js';
export { ExportsService } from './exports.js';
export { ImportsService } from './imports.js';
export { PromotionsService } from './promotions.js';
export { PoliciesService } from './policies.js';
export { SeoService } from './seo.js';
export { AbandonedCartsService } from './abandoned-carts.js';
export { KycService } from './kyc.js';
export { SubscriptionService } from './subscriptions.js';
export { ProductFeedService } from './feeds.js';
export { AiCommerceAgent, MockAiAgentProvider } from './ai-agent.js';
export type { AiAgentRequest, AiAgentResponse, AiAgentProvider } from './ai-agent.js';
export { ComplianceChecklistService } from './compliance-checklist.js';
export type { ComplianceCheckInput } from './compliance-checklist.js';
export { PublishGateService } from './publish-gate.js';
export type { PublishResult } from './publish-gate.js';
export { AcknowledgementService } from './acknowledgement.js';
export type { AcknowledgementStatus, AcknowledgeInput } from './acknowledgement.js';
export { SaudiPolicyGenerator } from './saudi-policy-generator.js';
export type { PolicyGeneratorInput, GeneratedPolicy, PolicyGenerationResult } from './saudi-policy-generator.js';
export { SupportService } from './support.js';
export type { CreateTicketInput, ReplyToTicketInput, CreateKbArticleInput, UpdateKbArticleInput } from './support.js';
export { GrowthAggregationService } from './growth-aggregation.js';
export type { OverviewMetrics, ProductMetrics, SourceMetrics, CampaignMetrics, GrowthInsight } from './growth-aggregation.js';
export { LivePresenceService, runLivePresenceCleanup } from './live-presence.js';
export type { NormalizedDevice } from './device-normalization.js';
export { normalizeDevice } from './device-normalization.js';
export { resolveGeo, resolveGeoFromHeaders } from './geo-resolver.js';
export type { GeoInfo } from './geo-resolver.js';
export { LiveSnapshotService, runLiveSnapshotCron } from './live-snapshots.js';
export type { LiveSnapshot } from './live-snapshots.js';
export { MarketingActionService, runMarketingActionGeneration } from './marketing-action-engine.js';
export type { GeneratedAction, ActionListOptions, ActionListResult } from './marketing-action-engine.js';
export { CustomerSegmentationService, runCustomerSegmentationSummary } from './customer-segmentation.js';
export { StoreBillingSettingsService } from './billing-settings-service.js';
export { PixelService } from './pixels.js';
export type { PixelConfig } from './pixels.js';
export { AbandonedCartCampaignService } from './abandoned-cart-campaigns.js';
export type { CampaignInput, RecoveryStats } from './abandoned-cart-campaigns.js';
export { WhatsAppCampaignService, classifyInboundMessage, significantDigits } from './whatsapp-campaigns.js';
export type { CreateCampaignInput } from './whatsapp-campaigns.js';
export { OutboundWebhookService } from './outbound-webhook.js';
export { ShipmentsService } from './shipments-service.js';
export type { ShipmentsResult } from './shipments-service.js';
export { PaymentWebhookService } from './payment-webhook-service.js';
export type { PaymentWebhookResult, PaymentWebhookInput } from './payment-webhook-service.js';
export {
  calcPlatformFee,
  normalizePlatformFeePolicy,
  describePlatformFeePolicy,
  validatePlatformFeePolicyInput,
  DEFAULT_PLATFORM_FEE_POLICY,
  PLATFORM_FEE_MODES,
  MAX_PLATFORM_FEE_PCT,
} from '@haa/wallet-core';
export type { PlatformFeeMode, PlatformFeePolicy } from '@haa/wallet-core';
