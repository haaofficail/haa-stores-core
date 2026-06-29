import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_STEP_SECONDS = 30;
const DEFAULT_DIGITS = 6;
const DEFAULT_WINDOW = 1;
const ENCRYPTION_KEY_BYTES = 32;

export function generateAdminTotpSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

export function buildAdminTotpOtpAuthUrl(input: {
  email: string;
  secret: string;
  issuer?: string;
}): string {
  const issuer = input.issuer ?? process.env.ADMIN_TOTP_ISSUER ?? 'Haa Stores Admin';
  const label = `${issuer}:${input.email.trim().toLowerCase()}`;
  const params = new URLSearchParams({
    secret: input.secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DEFAULT_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

export function generateAdminTotpCode(
  secret: string,
  input: { at?: Date; digits?: number } = {},
): string {
  const digits = input.digits ?? DEFAULT_DIGITS;
  const counter = Math.floor((input.at?.getTime() ?? Date.now()) / 1000 / TOTP_STEP_SECONDS);
  return hotp(secret, counter, digits);
}

export function verifyAdminTotpCode(input: {
  secret: string;
  code: string;
  at?: Date;
  window?: number;
}): boolean {
  const code = input.code.trim();
  if (!/^\d{6}$/.test(code)) return false;

  const time = input.at ?? new Date();
  const counter = Math.floor(time.getTime() / 1000 / TOTP_STEP_SECONDS);
  const window = input.window ?? DEFAULT_WINDOW;
  const provided = Buffer.from(code);

  for (let offset = -window; offset <= window; offset += 1) {
    const expected = Buffer.from(hotp(input.secret, counter + offset, DEFAULT_DIGITS));
    if (expected.length === provided.length && timingSafeEqual(expected, provided)) {
      return true;
    }
  }
  return false;
}

export function isAdminTotpEncryptionConfigured(): boolean {
  try {
    readEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptAdminTotpSecret(secret: string): string {
  const key = readEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', toBase64Url(iv), toBase64Url(tag), toBase64Url(encrypted)].join(':');
}

export function decryptAdminTotpSecret(payload: string): string {
  const [version, ivValue, tagValue, encryptedValue] = payload.split(':');
  if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) {
    throw new Error('Invalid admin TOTP secret envelope');
  }
  const decipher = createDecipheriv('aes-256-gcm', readEncryptionKey(), fromBase64Url(ivValue));
  decipher.setAuthTag(fromBase64Url(tagValue));
  const decrypted = Buffer.concat([
    decipher.update(fromBase64Url(encryptedValue)),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

function hotp(secret: string, counter: number, digits: number): string {
  if (counter < 0) return ''.padStart(digits, '0');
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac('sha1', key).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  const otp = binary % 10 ** digits;
  return otp.toString().padStart(digits, '0');
}

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(secret: string): Buffer {
  const normalized = secret.replace(/\s+/g, '').replace(/=+$/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error('Invalid admin TOTP secret');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

function readEncryptionKey(): Buffer {
  const raw = process.env.ADMIN_TOTP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('ADMIN_TOTP_ENCRYPTION_KEY is required for admin TOTP');
  }

  const trimmed = raw.trim();
  const candidates = [
    /^[a-f0-9]{64}$/i.test(trimmed) ? Buffer.from(trimmed, 'hex') : null,
    tryDecodeBase64(trimmed),
    Buffer.from(trimmed, 'utf8'),
  ].filter((candidate): candidate is Buffer => Boolean(candidate));

  const key = candidates.find((candidate) => candidate.length === ENCRYPTION_KEY_BYTES);
  if (!key) {
    throw new Error('ADMIN_TOTP_ENCRYPTION_KEY must resolve to 32 bytes');
  }
  return key;
}

function tryDecodeBase64(value: string): Buffer | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(normalized, 'base64');
  } catch {
    return null;
  }
}

function toBase64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '='), 'base64');
}
