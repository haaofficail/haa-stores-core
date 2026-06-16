export const WALLET_CORE_VERSION = '0.1.0';

export { WalletLedger } from './ledger.js';
export {
  calcPlatformFee,
  normalizePlatformFeePolicy,
  describePlatformFeePolicy,
  validatePlatformFeePolicyInput,
  DEFAULT_PLATFORM_FEE_POLICY,
  PLATFORM_FEE_MODES,
  MAX_PLATFORM_FEE_PCT,
} from './platform-fees.js';
export type { PlatformFeeMode, PlatformFeePolicy } from './platform-fees.js';
