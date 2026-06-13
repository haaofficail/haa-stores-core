import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'PAYMENT_CREDENTIALS_ENCRYPTION_KEY is required for encrypting payment provider credentials. ' +
      'Generate a 32-byte hex key with: openssl rand -hex 32'
    );
  }
  return Buffer.from(key, 'hex');
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted payload format');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
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
