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
export {
  calcCodFee,
  normalizeCodFeePolicy,
  describeCodFeePolicy,
  validateCodFeePolicyInput,
  DEFAULT_COD_FEE_POLICY,
  COD_FEE_MODES,
  MAX_COD_FEE_PCT,
} from './cod-fees.js';
export type { CodFeeMode, CodFeePolicy } from './cod-fees.js';
