import { describe, it, expect, beforeAll } from 'vitest';
import { encryptCredentials, decryptCredentials, isEncryptedCredential } from '../packages/marketplace-core/src/credential-cipher';

describe('Channel credential encryption (QA INT1)', () => {
  beforeAll(() => { process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY = '0'.repeat(64); });

  it('round-trips an object through encrypt→decrypt', () => {
    const creds = { accessToken: 'tok_123', refreshToken: 'ref_456', privateKey: '-----RSA-----' };
    const enc = encryptCredentials(creds);
    expect(typeof enc).toBe('string');
    expect(isEncryptedCredential(enc)).toBe(true);
    expect(enc).not.toContain('tok_123'); // السر غير ظاهر
    expect(decryptCredentials(enc)).toEqual(creds);
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
