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

function isFullMaskKey(key: string): boolean {
  const lower = key.toLowerCase();
  for (const k of FULL_MASK_KEYS) {
    if (k.toLowerCase() === lower) return true;
  }
  return false;
}

function isPartialMaskKey(key: string): boolean {
  const lower = key.toLowerCase();
  for (const k of PARTIAL_MASK_KEYS) {
    if (k.toLowerCase() === lower) return true;
  }
  return false;
}

export function maskObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(maskObject);

  const masked: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isFullMaskKey(key)) {
      if (typeof value === 'string') {
        const lower = key.toLowerCase();
        if (lower.includes('email')) masked[key] = maskEmail(value);
        else if (lower.includes('phone')) masked[key] = maskPhone(value);
        else masked[key] = '***MASKED***';
      } else {
        masked[key] = '***MASKED***';
      }
    } else if (isPartialMaskKey(key)) {
      masked[key] = typeof value === 'string' ? maskPartial(value) : '***MASKED***';
    } else if (typeof value === 'object') {
      masked[key] = maskObject(value);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}
