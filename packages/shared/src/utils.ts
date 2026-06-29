/**
 * Privacy utility for masking sensitive data according to Apple's "Privacy by Design" principles.
 */

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***MASKED***';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `*@${domain}`;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

export function maskPhone(phone: string): string {
  if (!phone) return '***MASKED***';
  if (phone.length <= 4) return '***MASKED***';
  return '***'.repeat(Math.ceil((phone.length - 4) / 3)) + phone.slice(-4);
}

export function maskIP(ip: string): string {
  if (!ip) return '***MASKED***';
  if (ip.includes(':')) { // IPv6
    const parts = ip.split(':');
    return `${parts[0]}:${parts[1]}:****:****:${parts[parts.length - 1]}`;
  }
  // IPv4
  const parts = ip.split('.');
  if (parts.length !== 4) return '***MASKED***';
  return `${parts[0]}.${parts[1]}.x.x`;
}

function maskPartial(value: string): string {
  if (!value || typeof value !== 'string') return '***MASKED***';
  if (value.length <= 4) return '****';
  const visible = value.slice(-4);
  const masked = '*'.repeat(value.length - 4);
  return masked + visible;
}

const FULL_MASK_KEYS = new Set([
  'email', 'phone', 'password', 'address', 'creditCard',
  'token', 'secret', 'apiKey', 'api_key',
  'accessKey', 'access_key', 'secretKey', 'secret_key',
  'privateKey', 'private_key', 'accessToken', 'refreshToken',
  'idToken', 'bearerToken', 'webhookSecret', 'clientSecret',
  'merchantSecret', 'paymentSecret', 'authorization', 'cookie', 'session',
]);

const PARTIAL_MASK_KEYS = new Set([
  'vatNumber', 'commercialRegistrationNumber', 'iban', 'bankAccount',
]);

const EMAIL_KEY_PATTERN = /email/i;
const PHONE_KEY_PATTERN = /(phone|mobile|msisdn|telephone)/i;
const PARTIAL_MASK_KEY_TOKENS = [
  'iban', 'bankaccount', 'accountnumber', 'vatnumber', 'taxnumber',
  'commercialregistration', 'crnumber', 'nationalid', 'identitynumber',
];
const FULL_MASK_KEY_TOKENS = [
  'password', 'passcode', 'token', 'secret', 'apikey', 'accesskey',
  'privatekey', 'authorization', 'cookie', 'session', 'credential', 'oauth',
  'otp', 'cvv', 'cvc', 'pin', 'cardnumber', 'creditcard', 'address',
  'customername', 'beneficiaryname', 'accountholder',
];

function normalizeMaskKey(key: string): string {
  return key.replace(/[_\-\s.]/g, '').toLowerCase();
}

function includesMaskToken(key: string, tokens: string[]): boolean {
  const normalized = normalizeMaskKey(key);
  return tokens.some((token) => normalized.includes(token));
}

function isFullMaskKey(key: string): boolean {
  const lower = key.toLowerCase();
  for (const k of FULL_MASK_KEYS) {
    if (k.toLowerCase() === lower) return true;
  }
  return includesMaskToken(key, FULL_MASK_KEY_TOKENS);
}

function isPartialMaskKey(key: string): boolean {
  const lower = key.toLowerCase();
  for (const k of PARTIAL_MASK_KEYS) {
    if (k.toLowerCase() === lower) return true;
  }
  return includesMaskToken(key, PARTIAL_MASK_KEY_TOKENS);
}

function maskObjectValue(key: string, value: unknown): unknown {
  if (EMAIL_KEY_PATTERN.test(key)) {
    return typeof value === 'string' ? maskEmail(value) : '***MASKED***';
  }
  if (PHONE_KEY_PATTERN.test(key)) {
    return typeof value === 'string' ? maskPhone(value) : '***MASKED***';
  }
  if (isPartialMaskKey(key)) {
    return typeof value === 'string' ? maskPartial(value) : '***MASKED***';
  }
  if (isFullMaskKey(key)) {
    return '***MASKED***';
  }
  if (value && typeof value === 'object') {
    return maskObject(value);
  }
  return value;
}

export function maskObject(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(maskObject);

  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    masked[key] = maskObjectValue(key, value);
  }
  return masked;
}
