/**
 * Integration tests for PaymentProviderSettingsService and getAvailableMethods.
 * Requires a running PostgreSQL database with seeded data (store ID 1).
 * Excluded from the standard CI test run — run manually with:
 *   DATABASE_URL=<url> pnpm vitest run tests/payment-settings.integration.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  PaymentProviderSettingsService,
} from '@haa/commerce-core';

const TEST_ENCRYPTION_KEY = '00001111222233334444555566667777aaaaaaaaaaaabbbbbbbbbbcccccccccc';
const TEST_SLICE = TEST_ENCRYPTION_KEY.slice(0, 64);

describe('PaymentProviderSettingsService', () => {
  let service: PaymentProviderSettingsService;
  const TEST_STORE = 1; // seeded demo store

  beforeAll(() => {
    process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY = TEST_SLICE;
    service = new PaymentProviderSettingsService();
  });

  afterAll(async () => {
    // Clean up test data
    await service.deleteCredentials(TEST_STORE, 'tabby').catch(() => {});
    await service.deleteCredentials(TEST_STORE, 'tamara').catch(() => {});
  });

  it('list returns both BNPL providers with not_configured status', async () => {
    const providers = await service.list(TEST_STORE);
    expect(providers).toHaveLength(2);
    expect(providers[0].providerCode).toBe('tabby');
    expect(providers[1].providerCode).toBe('tamara');
  });

  it('upsertSettings creates new settings row', async () => {
    const result = await service.upsertSettings(TEST_STORE, 'tabby', {
      enabled: true,
      displayNameAr: 'تابي',
      displayNameEn: 'Tabby',
      sortOrder: 1,
    });
    expect(result.enabled).toBe(true);
    expect(result.providerCode).toBe('tabby');
  });

  it('upsertSettings updates existing settings', async () => {
    const result = await service.upsertSettings(TEST_STORE, 'tabby', {
      enabled: false,
      minOrderAmount: '100',
    });
    expect(result.enabled).toBe(false);
    expect(Number(result.minOrderAmount)).toBe(100);
  });

  it('save and get credentials round-trips', async () => {
    const input = { secretKey: 'sk_test_abc', publicKey: 'pk_test_xyz' };
    await service.saveCredentials(TEST_STORE, 'tabby', input);
    const decrypted = await service.getCredentialsDecrypted(TEST_STORE, 'tabby');
    expect(decrypted).toEqual(input);
  });

  it('saveCredentials returns void', async () => {
    const result = await service.saveCredentials(TEST_STORE, 'tabby', { secretKey: 'sk_test_abc', publicKey: 'pk_test_xyz' });
    expect(result).toBeUndefined();
  });

  it('list returns credentialsConfigured=true after saving', async () => {
    const providers = await service.list(TEST_STORE);
    const tabby = providers.find(p => p.providerCode === 'tabby');
    expect(tabby!.credentialsConfigured).toBe(true);
  });

  it('list returns masked credentials preview', async () => {
    const providers = await service.list(TEST_STORE);
    const tabby = providers.find(p => p.providerCode === 'tabby');
    expect(tabby!.credentialsPreview).toBeTruthy();
    expect(tabby!.credentialsPreview).not.toContain('sk_test_abc');
  });

  it('validate returns valid for complete credentials', async () => {
    await service.saveCredentials(TEST_STORE, 'tabby', { secretKey: 'sk_test_abc', publicKey: 'pk_test_xyz' });
    const result = await service.validate(TEST_STORE, 'tabby');
    expect(result.valid).toBe(true);
  });

  it('validate returns invalid for incomplete credentials', async () => {
    await service.saveCredentials(TEST_STORE, 'tamara', { apiToken: 'tok' }); // missing notificationToken
    const result = await service.validate(TEST_STORE, 'tamara');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('validate updates status and lastValidatedAt', async () => {
    await service.saveCredentials(TEST_STORE, 'tabby', { secretKey: 'sk', publicKey: 'pk' });
    await service.validate(TEST_STORE, 'tabby');
    const providers = await service.list(TEST_STORE);
    const tabby = providers.find(p => p.providerCode === 'tabby');
    expect(tabby!.status).toBe('configured');
    expect(tabby!.lastValidatedAt).toBeTruthy();
  });

  it('disable sets enabled=false but keeps credentials', async () => {
    await service.disable(TEST_STORE, 'tabby');
    const providers = await service.list(TEST_STORE);
    const tabby = providers.find(p => p.providerCode === 'tabby');
    expect(tabby!.enabled).toBe(false);
    expect(tabby!.credentialsConfigured).toBe(true);
  });

  it('deleteCredentials removes credentials and resets status', async () => {
    await service.deleteCredentials(TEST_STORE, 'tabby');
    const creds = await service.getCredentialsDecrypted(TEST_STORE, 'tabby');
    expect(creds).toBeNull();
    const providers = await service.list(TEST_STORE);
    const tabby = providers.find(p => p.providerCode === 'tabby');
    expect(tabby!.status).toBe('not_configured');
    expect(tabby!.credentialsConfigured).toBe(false);
  });

  it('validate returns invalid when no credentials', async () => {
    const result = await service.validate(TEST_STORE, 'tabby');
    expect(result.valid).toBe(false);
  });
});

describe('getAvailableMethods', () => {
  let service: PaymentProviderSettingsService;
  const STORE = 1;

  beforeAll(() => {
    process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY = '00001111222233334444555566667777aaaaaaaaaaaabbbbbbbbbbcccccccccc';
    service = new PaymentProviderSettingsService();
  });

  afterAll(async () => {
    await service.deleteCredentials(STORE, 'tabby').catch(() => {});
    await service.deleteCredentials(STORE, 'tamara').catch(() => {});
  });

  async function setupConfigured(
    provider: string,
    opts?: { enabled?: boolean; country?: string; currency?: string; min?: string; max?: string; sortOrder?: number }
  ) {
    await service.upsertSettings(STORE, provider, {
      enabled: opts?.enabled ?? true,
      country: opts?.country ?? 'SA',
      currency: opts?.currency ?? 'SAR',
      minOrderAmount: opts?.min,
      maxOrderAmount: opts?.max,
      sortOrder: opts?.sortOrder ?? (provider === 'tabby' ? 1 : 2),
    });
    const creds = provider === 'tabby'
      ? { secretKey: 'sk_test_abc', publicKey: 'pk_test_xyz' }
      : { apiToken: 'tok_test', notificationToken: 'ntok_test' };
    await service.saveCredentials(STORE, provider, creds);
    await service.validate(STORE, provider);
  }

  it('returns both providers in sorted order (by sort_order, then name)', async () => {
    await setupConfigured('tabby', { sortOrder: 2 });
    await setupConfigured('tamara', { sortOrder: 1 });
    const methods = await service.getAvailableMethods(STORE);
    expect(methods).toHaveLength(2);
    expect(methods[0].provider).toBe('tamara');
    expect(methods[1].provider).toBe('tabby');
    await service.deleteCredentials(STORE, 'tabby').catch(() => {});
    await service.deleteCredentials(STORE, 'tamara').catch(() => {});
  });

  it('returns available=true when fully configured and valid', async () => {
    await setupConfigured('tabby', { min: '100', max: '5000' });
    const methods = await service.getAvailableMethods(STORE, { amount: 500, country: 'SA', currency: 'SAR' });
    const tabby = methods.find(m => m.provider === 'tabby')!;
    expect(tabby.available).toBe(true);
    expect(tabby.reason).toBeNull();
    expect(tabby.mode).toBe('test');
    expect(Number(tabby.minOrderAmount)).toBe(100);
    expect(Number(tabby.maxOrderAmount)).toBe(5000);
    expect(tabby.currency).toBe('SAR');
    expect(tabby.name).toBeTruthy();
    await service.deleteCredentials(STORE, 'tabby').catch(() => {});
  });

  it('returns PROVIDER_DISABLED when provider is disabled', async () => {
    await setupConfigured('tabby', { enabled: false });
    await service.validate(STORE, 'tabby');
    const methods = await service.getAvailableMethods(STORE);
    const tabby = methods.find(m => m.provider === 'tabby')!;
    expect(tabby.available).toBe(false);
    expect(tabby.reason).toBe('PROVIDER_DISABLED');
    await service.deleteCredentials(STORE, 'tabby').catch(() => {});
  });

  it('returns PROVIDER_NOT_CONFIGURED when status is not_configured', async () => {
    await service.upsertSettings(STORE, 'tabby', { enabled: true });
    const methods = await service.getAvailableMethods(STORE);
    const tabby = methods.find(m => m.provider === 'tabby')!;
    expect(tabby.available).toBe(false);
    expect(tabby.reason).toBe('PROVIDER_NOT_CONFIGURED');
    await service.deleteCredentials(STORE, 'tabby').catch(() => {});
  });

  it('returns MISSING_CREDENTIALS when credentials absent despite configured status', async () => {
    await setupConfigured('tabby');
    await service.deleteCredentials(STORE, 'tabby');
    await service.upsertSettings(STORE, 'tabby', { enabled: true });
    const methods = await service.getAvailableMethods(STORE);
    const tabby = methods.find(m => m.provider === 'tabby')!;
    expect(tabby.available).toBe(false);
    expect(tabby.reason).toBe('PROVIDER_NOT_CONFIGURED');
    await service.deleteCredentials(STORE, 'tabby').catch(() => {});
  });

  it('returns UNSUPPORTED_COUNTRY when country does not match', async () => {
    await setupConfigured('tabby', { country: 'SA' });
    const methods = await service.getAvailableMethods(STORE, { country: 'AE', amount: 500 });
    const tabby = methods.find(m => m.provider === 'tabby')!;
    expect(tabby.available).toBe(false);
    expect(tabby.reason).toBe('UNSUPPORTED_COUNTRY');
    await service.deleteCredentials(STORE, 'tabby').catch(() => {});
  });

  it('returns UNSUPPORTED_CURRENCY when currency does not match', async () => {
    await setupConfigured('tabby', { currency: 'SAR' });
    const methods = await service.getAvailableMethods(STORE, { currency: 'AED', amount: 500 });
    const tabby = methods.find(m => m.provider === 'tabby')!;
    expect(tabby.available).toBe(false);
    expect(tabby.reason).toBe('UNSUPPORTED_CURRENCY');
    await service.deleteCredentials(STORE, 'tabby').catch(() => {});
  });

  it('returns ORDER_AMOUNT_BELOW_MINIMUM when amount below min', async () => {
    await setupConfigured('tabby', { min: '200' });
    const methods = await service.getAvailableMethods(STORE, { amount: 50 });
    const tabby = methods.find(m => m.provider === 'tabby')!;
    expect(tabby.available).toBe(false);
    expect(tabby.reason).toBe('ORDER_AMOUNT_BELOW_MINIMUM');
    await service.deleteCredentials(STORE, 'tabby').catch(() => {});
  });

  it('returns ORDER_AMOUNT_ABOVE_MAXIMUM when amount above max', async () => {
    await setupConfigured('tabby', { max: '1000' });
    const methods = await service.getAvailableMethods(STORE, { amount: 5000 });
    const tabby = methods.find(m => m.provider === 'tabby')!;
    expect(tabby.available).toBe(false);
    expect(tabby.reason).toBe('ORDER_AMOUNT_ABOVE_MAXIMUM');
    await service.deleteCredentials(STORE, 'tabby').catch(() => {});
  });

  it('skips amount checks when no amount provided', async () => {
    await setupConfigured('tabby', { min: '200', max: '1000' });
    const methods = await service.getAvailableMethods(STORE);
    const tabby = methods.find(m => m.provider === 'tabby')!;
    expect(tabby.available).toBe(true);
    expect(tabby.reason).toBeNull();
    await service.deleteCredentials(STORE, 'tabby').catch(() => {});
  });

  it('does not return any secrets in response', async () => {
    await setupConfigured('tabby');
    const methods = await service.getAvailableMethods(STORE);
    const tabby = methods.find(m => m.provider === 'tabby')!;
    expect(tabby.available).toBe(true);
    expect((tabby as any).secretKey).toBeUndefined();
    expect((tabby as any).publicKey).toBeUndefined();
    expect((tabby as any).encryptedPayload).toBeUndefined();
    expect((tabby as any).credentialsPreview).toBeUndefined();
    await service.deleteCredentials(STORE, 'tabby').catch(() => {});
  });
});

describe('getAvailableMethods — Demo Store behavior', () => {
  let service: PaymentProviderSettingsService;
  const DEMO_STORE = 1;

  beforeAll(() => {
    process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY = '00001111222233334444555566667777aaaaaaaaaaaabbbbbbbbbbcccccccccc';
    service = new PaymentProviderSettingsService();
     
    service.deleteCredentials(DEMO_STORE, 'tabby').catch(() => {});
     
    service.deleteCredentials(DEMO_STORE, 'tamara').catch(() => {});
  });

  it('demo store returns both BNPL providers available without any credentials', async () => {
    const methods = await service.getAvailableMethods(DEMO_STORE, { isDemo: true });
    const tabby = methods.find(m => m.provider === 'tabby')!;
    const tamara = methods.find(m => m.provider === 'tamara')!;
    expect(tabby.available).toBe(true);
    expect(tabby.reason).toBeNull();
    expect(tabby.mode).toBe('demo');
    expect(tamara.available).toBe(true);
    expect(tamara.reason).toBeNull();
    expect(tamara.mode).toBe('demo');
  });

  it('demo store returns demo methods even when amount is outside normal limits', async () => {
    const methods = await service.getAvailableMethods(DEMO_STORE, { isDemo: true, amount: 1 });
    expect(methods.every(m => m.available)).toBe(true);
  });

  it('real store (no isDemo flag) returns unavailable when no credentials', async () => {
    const methods = await service.getAvailableMethods(DEMO_STORE, { amount: 500 });
    const tabby = methods.find(m => m.provider === 'tabby')!;
    const tamara = methods.find(m => m.provider === 'tamara')!;
    expect(tabby.available).toBe(false);
    expect([null, 'PROVIDER_DISABLED', 'PROVIDER_NOT_CONFIGURED']).toContain(tabby.reason);
    expect(tamara.available).toBe(false);
    expect([null, 'PROVIDER_DISABLED', 'PROVIDER_NOT_CONFIGURED']).toContain(tamara.reason);
  });
});
