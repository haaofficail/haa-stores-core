import { describe, it, expect, beforeAll } from 'vitest';
import { encryptCredentials, decryptCredentials, isEncryptedCredential } from '../packages/marketplace-core/src/credential-cipher';

describe('Channel credential encryption (QA INT1)', () => {
  beforeAll(() => { process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY = '0'.repeat(64); });

  it('round-trips an object through encrypt→decrypt', () => {
    const creds = { accessToken: 'tok_123', refreshToken: 'ref_456', privateKey: '-----RSA-----' };
    const enc = encryptCredentials(creds);
    expect(typeof enc).toBe('string');
    expect(isEncryptedCredential(enc)).toBe(true);
    const [iv, tag, ciphertext] = String(enc).split(':');
    expect(iv).toHaveLength(32);
    expect(tag).toHaveLength(32);
    expect(ciphertext.length % 2).toBe(0);
    expect(enc).not.toContain('tok_123'); // السر غير ظاهر
    expect(decryptCredentials(enc)).toEqual(creds);
  });
  it('rejects encrypted-looking payloads with malformed GCM parts', () => {
    const creds = { accessToken: 'tok_123' };
    const enc = String(encryptCredentials(creds));
    const [iv, _tag, ciphertext] = enc.split(':');

    expect(() => decryptCredentials(`${iv}:abcd:${ciphertext}`)).toThrow(/format/);
    expect(() => decryptCredentials(`${iv.slice(2)}:${'0'.repeat(32)}:${ciphertext}`)).toThrow(/format/);
    expect(() => decryptCredentials(`${iv}:${'0'.repeat(32)}:abc`)).toThrow(/ciphertext/);
  });
  it('reads legacy plaintext object unchanged (backward-compat)', () => {
    const legacy = { accessToken: 'old', refreshToken: 'old2' };
    expect(decryptCredentials(legacy)).toEqual(legacy);
  });
  it('handles null/undefined', () => {
    expect(decryptCredentials(null)).toBeNull();
    expect(encryptCredentials(null)).toBeNull();
  });
  it('without key, encrypt falls back to passthrough (no regression)', () => {
    delete process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;
    const creds = { a: 1 };
    expect(encryptCredentials(creds)).toEqual(creds);
    process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY = '0'.repeat(64);
  });
});
