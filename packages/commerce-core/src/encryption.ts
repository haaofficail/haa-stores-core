import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function fromFixedHex(value: string, label: string, expectedBytes: number): Buffer {
  if (!/^[0-9a-f]+$/i.test(value) || value.length !== expectedBytes * 2) {
    throw new Error(`Invalid encrypted payload ${label}`);
  }
  return Buffer.from(value, 'hex');
}

function getEncryptionKey(): Buffer {
  const key = process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;
  if (!key || !/^[0-9a-f]+$/i.test(key) || key.length !== KEY_LENGTH * 2) {
    throw new Error(
      'PAYMENT_CREDENTIALS_ENCRYPTION_KEY must be a 32-byte hex key for encrypting payment provider credentials. ' +
      'Generate a 32-byte hex key with: openssl rand -hex 32'
    );
  }
  return Buffer.from(key, 'hex');
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted payload format');
  const iv = fromFixedHex(parts[0], 'iv', IV_LENGTH);
  const authTag = fromFixedHex(parts[1], 'auth tag', AUTH_TAG_LENGTH);
  const encrypted = parts[2];
  if (!/^[0-9a-f]+$/i.test(encrypted) || encrypted.length % 2 !== 0) {
    throw new Error('Invalid encrypted payload ciphertext');
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function redactCredential(value: string): string {
  if (!value || value.length <= 8) return '****';
  const first = value.slice(0, 4);
  const last = value.slice(-4);
  return `${first}****${last}`;
}

export function isEncryptionKeySet(): boolean {
  return !!process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;
}
