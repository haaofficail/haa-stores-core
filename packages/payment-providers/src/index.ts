// @haa/payment-providers — public surface.
//
// Extracted from packages/commerce-core/src/payment.ts in
// Quality Pass 2 — Item 2.5. Re-exports the 5 provider classes,
// the PaymentProvider interface, the factory functions, and the
// shared base helpers (status mapping, Geidea signature).
//
// This package is intentionally standalone (depends only on
// @haa/db and @haa/shared) so that new payment providers can
// be added without touching @haa/commerce-core.

export {
  FAKE_CAPABILITIES,
  MOYASAR_CAPABILITIES,
  GEIDEA_CAPABILITIES,
  TABBY_CAPABILITIES,
  TAMARA_CAPABILITIES,
  mapProviderStatus,
  mapProviderError,
  createGeideaSignature,
  verifyGeideaCallbackSignature,
  type PaymentProvider,
} from './base.js';

export { FakePaymentProvider } from './fake.js';
export { GeideaPaymentProvider } from './geidea.js';
export { TabbyProvider } from './tabby.js';
export { TamaraProvider } from './tamara.js';
export { MoyasarSandboxProvider } from './moyasar.js';

export {
  createPaymentProvider,
  getPaymentProviderStatus,
  getAvailablePaymentMethods,
  PaymentService,
} from './factory.js';
