import { describe, it, expect, beforeAll } from 'vitest';
import {
  getTabbyBaseUrl,
  getTamaraBaseUrl,
  validateTabbyCredentials,
  validateTamaraCredentials,
  redactCredential,
} from '@haa/commerce-core';
import { encrypt, decrypt, isEncryptionKeySet } from '@haa/commerce-core/encryption';

const TEST_ENCRYPTION_KEY = '00001111222233334444555566667777aaaaaaaaaaaabbbbbbbbbbcccccccccc';
const TEST_SLICE = TEST_ENCRYPTION_KEY.slice(0, 64);

describe('Encryption Utility', () => {
  beforeAll(() => {
    process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY = TEST_SLICE;
  });

  it('encrypt and decrypt round-trips correctly', () => {
    const original = JSON.stringify({ secretKey: 'sk_test_abc', publicKey: 'pk_test_xyz' });
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(':');
    const [iv, tag, ciphertext] = encrypted.split(':');
    expect(iv).toHaveLength(32);
    expect(tag).toHaveLength(32);
    expect(ciphertext.length % 2).toBe(0);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('produces different ciphertext each time for same input', () => {
    const payload = JSON.stringify({ key: 'value' });
    const a = encrypt(payload);
    const b = encrypt(payload);
    expect(a).not.toBe(b);
  });

  it('decrypt fails with wrong key', () => {
    const encrypted = encrypt('test');
    process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    expect(() => decrypt(encrypted)).toThrow();
    process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY = TEST_SLICE;
  });

  it('rejects malformed GCM payload parts before decrypting', () => {
    const encrypted = encrypt('test');
    const [iv, _tag, ciphertext] = encrypted.split(':');

    expect(() => decrypt(`${iv}:abcd:${ciphertext}`)).toThrow(/auth tag/);
    expect(() => decrypt(`${iv.slice(2)}:${'0'.repeat(32)}:${ciphertext}`)).toThrow(/iv/);
    expect(() => decrypt(`${iv}:${'0'.repeat(32)}:not-hex`)).toThrow(/ciphertext/);
  });

  it('isEncryptionKeySet returns true when key is set', () => {
    expect(isEncryptionKeySet()).toBe(true);
  });

  it('isEncryptionKeySet returns false when key is not set', () => {
    const original = process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;
    delete process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;
    expect(isEncryptionKeySet()).toBe(false);
    process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY = original;
  });
});

describe('Redaction Helper', () => {
  it('redacts showing first 4 and last 4 characters', () => {
    expect(redactCredential('PLACEHOLDER_credential_value')).toBe('PLAC****alue');
  });

  it('returns **** for short values', () => {
    expect(redactCredential('abc')).toBe('****');
  });

  it('returns **** for empty string', () => {
    expect(redactCredential('')).toBe('****');
  });

  it('returns **** for null-like input', () => {
    expect(redactCredential('')).toBe('****');
  });

  it('does not leak the full value', () => {
    const value = 'super_secret_key_value_12345';
    const redacted = redactCredential(value);
    expect(redacted).not.toContain(value);
    expect(redacted.length).toBeLessThan(value.length);
  });
});

describe('Tabby Base URL Resolver', () => {
  it('returns api.tabby.sa for SA country', () => {
    expect(getTabbyBaseUrl('SA')).toBe('https://api.tabby.sa');
  });

  it('returns api.tabby.ai for non-SA country', () => {
    expect(getTabbyBaseUrl('AE')).toBe('https://api.tabby.ai');
    expect(getTabbyBaseUrl('KW')).toBe('https://api.tabby.ai');
  });
});

describe('Tamara Base URL Resolver', () => {
  it('returns sandbox URL for test mode', () => {
    expect(getTamaraBaseUrl('test')).toBe('https://api-sandbox.tamara.co');
  });

  it('returns production URL for live mode', () => {
    expect(getTamaraBaseUrl('live')).toBe('https://api.tamara.co');
  });
});

describe('Credential Validation', () => {
  it('Tabby validation succeeds with both keys', () => {
    const result = validateTabbyCredentials({ secretKey: 'sk_test', publicKey: 'pk_test' });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('Tabby validation fails without secretKey', () => {
    const result = validateTabbyCredentials({ publicKey: 'pk_test' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Tabby secretKey is required');
  });

  it('Tabby validation fails without publicKey', () => {
    const result = validateTabbyCredentials({ secretKey: 'sk_test' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Tabby publicKey is required');
  });

  it('Tabby validation fails with both missing', () => {
    const result = validateTabbyCredentials({});
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it('Tamara validation succeeds with apiToken', () => {
    const result = validateTamaraCredentials({ apiToken: 'tok_test', notificationToken: 'ntok_test' });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('Tamara validation fails without apiToken', () => {
    const result = validateTamaraCredentials({ notificationToken: 'ntok_test' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Tamara apiToken is required');
  });

  it('Tamara validation fails without notificationToken', () => {
    const result = validateTamaraCredentials({ apiToken: 'tok_test' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Tamara notificationToken (webhookToken) is required');
  });
});
