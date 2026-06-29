import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  resolveEmailHealth,
  resolveObservabilityHealth,
  resolvePaymentHealth,
  resolvePlatformDependencyHealth,
  resolveShippingHealth,
  resolveStorageHealth,
  type PlatformHealthEnv,
} from '../apps/api/src/services/platform-health.js';

const ROOT = resolve(import.meta.dirname, '..');
const read = (rel: string) => readFile(resolve(ROOT, rel), 'utf-8');

const env = (overrides: PlatformHealthEnv): PlatformHealthEnv => ({
  NODE_ENV: 'development',
  ...overrides,
});

describe('platform health readiness helpers', () => {
  it('reports local storage as ok when the storage root is writable in development', async () => {
    const storageRoot = await mkdtemp(join(tmpdir(), 'haa-storage-health-'));
    const health = await resolveStorageHealth({
      env: env({ STORAGE_DRIVER: 'local' }),
      storageRoot,
    });

    expect(health).toMatchObject({
      status: 'ok',
      configured: true,
      driver: 'local',
    });
  });

  it('reports S3 storage as error when required configuration is missing', async () => {
    const health = await resolveStorageHealth({
      env: env({
        STORAGE_DRIVER: 's3',
        S3_ENDPOINT: 'https://s3.example.test',
        S3_REGION: 'me-south-1',
      }),
      storageRoot: ROOT,
    });

    expect(health.status).toBe('error');
    expect(health.configured).toBe(false);
    expect(health.missing).toEqual(expect.arrayContaining([
      'S3_BUCKET',
      'S3_ACCESS_KEY_ID',
      'S3_SECRET_ACCESS_KEY',
      'S3_PUBLIC_BASE_URL',
    ]));
  });

  it('reports fake payments as a visible local warning, not as launch-ready', () => {
    const health = resolvePaymentHealth(env({
      PAYMENT_PROVIDER: 'fake',
      PAYMENT_MODE: 'fake',
    }));

    expect(health).toMatchObject({
      status: 'warn',
      configured: true,
      provider: 'fake',
      mode: 'fake',
      liveBlocked: true,
    });
  });

  it('reports missing Geidea credentials without leaking provided secret values', () => {
    const health = resolvePaymentHealth(env({
      PAYMENT_PROVIDER: 'geidea',
      PAYMENT_MODE: 'sandbox',
      GEIDEA_MERCHANT_PUBLIC_KEY: 'public-key-value',
    }));

    expect(health.status).toBe('error');
    expect(health.missing).toEqual(['GEIDEA_API_PASSWORD']);
    expect(JSON.stringify(health)).not.toContain('public-key-value');
  });

  it('reports configured Geidea sandbox payments as ok while live mode remains blocked', () => {
    const health = resolvePaymentHealth(env({
      PAYMENT_PROVIDER: 'geidea',
      PAYMENT_MODE: 'sandbox',
      GEIDEA_MERCHANT_PUBLIC_KEY: 'public-key-value',
      GEIDEA_API_PASSWORD: 'api-password-value',
    }));

    expect(health).toMatchObject({
      status: 'ok',
      configured: true,
      provider: 'geidea',
      mode: 'sandbox',
      liveBlocked: true,
    });
    expect(JSON.stringify(health)).not.toContain('api-password-value');
  });

  it('reports OTO shipping as error until at least one OTO credential is present', () => {
    const missingHealth = resolveShippingHealth(env({
      SHIPPING_PROVIDER: 'oto',
      SHIPPING_MODE: 'sandbox',
    }));
    const configuredHealth = resolveShippingHealth(env({
      SHIPPING_PROVIDER: 'oto',
      SHIPPING_MODE: 'sandbox',
      OTO_SANDBOX_API_KEY: 'oto-secret-value',
    }));

    expect(missingHealth.status).toBe('error');
    expect(missingHealth.missing).toEqual(expect.arrayContaining([
      'OTO_MARKETPLACE_TOKEN',
      'OTO_API_KEY',
      'OTO_ACCESS_TOKEN',
      'OTO_SANDBOX_API_KEY',
    ]));
    expect(configuredHealth).toMatchObject({
      status: 'ok',
      configured: true,
      provider: 'oto',
      mode: 'sandbox',
      liveBlocked: true,
    });
    expect(JSON.stringify(configuredHealth)).not.toContain('oto-secret-value');
  });

  it('reports manual shipping as an explicit readiness warning', () => {
    const health = resolveShippingHealth(env({
      SHIPPING_PROVIDER: 'manual',
      SHIPPING_MODE: 'manual',
    }));

    expect(health).toMatchObject({
      status: 'warn',
      configured: true,
      provider: 'manual',
    });
  });

  it('requires SMTP_PORT for SMTP email readiness and supports Resend as an alternative', () => {
    const partialSmtp = resolveEmailHealth(env({
      SMTP_HOST: 'smtp.example.test',
      SMTP_USER: 'mailbox@example.test',
      SMTP_PASSWORD: 'smtp-secret-value',
    }));
    const resend = resolveEmailHealth(env({
      RESEND_API_KEY: 'resend-secret-value',
    }));

    expect(partialSmtp).toMatchObject({
      status: 'error',
      configured: false,
      provider: 'smtp',
      missing: ['SMTP_PORT'],
    });
    expect(JSON.stringify(partialSmtp)).not.toContain('smtp-secret-value');
    expect(resend).toMatchObject({
      status: 'ok',
      configured: true,
      provider: 'resend',
    });
    expect(JSON.stringify(resend)).not.toContain('resend-secret-value');
  });

  it('marks missing observability sinks as launch-readiness errors in production', () => {
    const missing = resolveObservabilityHealth(env({ NODE_ENV: 'production' }));
    const configured = resolveObservabilityHealth(env({
      NODE_ENV: 'production',
      SENTRY_DSN: 'https://secret-sentry-dsn.example/1',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'https://otel.example.test',
    }));

    expect(missing).toMatchObject({
      status: 'error',
      configured: false,
      signals: [],
    });
    expect(configured).toMatchObject({
      status: 'ok',
      configured: true,
      signals: ['sentry', 'otel'],
    });
    expect(JSON.stringify(configured)).not.toContain('secret-sentry-dsn');
  });

  it('aggregates the worst dependency status without leaking raw secret values', async () => {
    const storageRoot = await mkdtemp(join(tmpdir(), 'haa-platform-health-'));
    const health = await resolvePlatformDependencyHealth({
      storageRoot,
      env: env({
        STORAGE_DRIVER: 'local',
        PAYMENT_PROVIDER: 'geidea',
        PAYMENT_MODE: 'sandbox',
        GEIDEA_MERCHANT_PUBLIC_KEY: 'geidea-public-value',
        GEIDEA_API_PASSWORD: 'geidea-password-value',
        SHIPPING_PROVIDER: 'oto',
        SHIPPING_MODE: 'sandbox',
        OTO_ACCESS_TOKEN: 'oto-access-value',
        SMTP_HOST: 'smtp.example.test',
        SMTP_PORT: '465',
        SMTP_USER: 'mailbox@example.test',
        SMTP_PASSWORD: 'smtp-password-value',
        SENTRY_DSN: 'https://secret-sentry-dsn.example/1',
      }),
    });

    expect(health.status).toBe('ok');
    expect(Object.keys(health)).toEqual([
      'status',
      'storage',
      'payment',
      'shipping',
      'email',
      'observability',
    ]);
    expect(JSON.stringify(health)).not.toContain('geidea-password-value');
    expect(JSON.stringify(health)).not.toContain('oto-access-value');
    expect(JSON.stringify(health)).not.toContain('smtp-password-value');
    expect(JSON.stringify(health)).not.toContain('secret-sentry-dsn');
  });
});

describe('health route deep readiness wiring', () => {
  it('exposes dependency readiness from the platform-health service', async () => {
    const src = await read('apps/api/src/routes/health.ts');

    expect(src).toContain('resolvePlatformDependencyHealth');
    expect(src).toContain('dependencies');
    expect(src).toContain('storageRoot: ROOT');
  });

  it('does not read provider secret env vars directly inside the route', async () => {
    const src = await read('apps/api/src/routes/health.ts');

    expect(src).not.toContain('S3_SECRET_ACCESS_KEY');
    expect(src).not.toContain('GEIDEA_API_PASSWORD');
    expect(src).not.toContain('PAYMENT_SANDBOX_SECRET_KEY');
    expect(src).not.toContain('OTO_ACCESS_TOKEN');
    expect(src).not.toContain('SMTP_PASSWORD');
    expect(src).not.toContain('SENTRY_DSN');
  });
});
