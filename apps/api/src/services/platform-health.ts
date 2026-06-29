import { constants } from 'node:fs';
import { access } from 'node:fs/promises';

export type PlatformDependencyStatus = 'ok' | 'warn' | 'error';

export type PlatformHealthEnv = Readonly<Record<string, string | undefined>>;

export interface PlatformDependencyHealth {
  readonly status: PlatformDependencyStatus;
  readonly configured: boolean;
  readonly reason: string;
  readonly missing?: readonly string[];
}

export interface StorageDependencyHealth extends PlatformDependencyHealth {
  readonly driver: 'local' | 's3' | 'unknown';
}

export interface PaymentDependencyHealth extends PlatformDependencyHealth {
  readonly provider: string;
  readonly mode: string;
  readonly liveBlocked: boolean;
}

export interface ShippingDependencyHealth extends PlatformDependencyHealth {
  readonly provider: string;
  readonly mode: string;
  readonly liveBlocked: boolean;
}

export interface EmailDependencyHealth extends PlatformDependencyHealth {
  readonly provider: 'smtp' | 'resend' | 'contact_only';
}

export interface ObservabilityDependencyHealth extends PlatformDependencyHealth {
  readonly signals: readonly string[];
}

export interface PlatformDependencyHealthSummary {
  readonly status: PlatformDependencyStatus;
  readonly storage: StorageDependencyHealth;
  readonly payment: PaymentDependencyHealth;
  readonly shipping: ShippingDependencyHealth;
  readonly email: EmailDependencyHealth;
  readonly observability: ObservabilityDependencyHealth;
}

export interface ResolvePlatformDependencyHealthInput {
  readonly env?: PlatformHealthEnv;
  readonly storageRoot: string;
}

const S3_REQUIRED_KEYS = [
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_PUBLIC_BASE_URL',
] as const;

const SMTP_REQUIRED_KEYS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
] as const;

const hasValue = (env: PlatformHealthEnv, key: string): boolean =>
  typeof env[key] === 'string' && env[key]!.trim().length > 0;

const collectMissing = (
  env: PlatformHealthEnv,
  keys: readonly string[],
): string[] => keys.filter((key) => !hasValue(env, key));

const getEnvValue = (
  env: PlatformHealthEnv,
  key: string,
  fallback: string,
): string => {
  const value = env[key]?.trim();
  return value && value.length > 0 ? value : fallback;
};

const isProdLike = (env: PlatformHealthEnv): boolean => {
  const nodeEnv = getEnvValue(env, 'NODE_ENV', 'development');
  return nodeEnv === 'staging' || nodeEnv === 'production';
};

const resolveWorstStatus = (
  statuses: readonly PlatformDependencyStatus[],
): PlatformDependencyStatus => {
  if (statuses.includes('error')) return 'error';
  if (statuses.includes('warn')) return 'warn';
  return 'ok';
};

const hasAny = (env: PlatformHealthEnv, keys: readonly string[]): boolean =>
  keys.some((key) => hasValue(env, key));

export async function resolveStorageHealth({
  env = process.env,
  storageRoot,
}: ResolvePlatformDependencyHealthInput): Promise<StorageDependencyHealth> {
  const rawDriver = getEnvValue(env, 'STORAGE_DRIVER', 'local');
  const driver = rawDriver === 'local' || rawDriver === 's3' ? rawDriver : 'unknown';

  if (driver === 'unknown') {
    return {
      status: 'error',
      configured: false,
      driver,
      reason: `Unsupported STORAGE_DRIVER=${rawDriver}`,
    };
  }

  if (driver === 's3') {
    const missing = collectMissing(env, S3_REQUIRED_KEYS);
    if (missing.length > 0) {
      return {
        status: 'error',
        configured: false,
        driver,
        reason: 'S3 storage is selected but required configuration is incomplete.',
        missing,
      };
    }

    return {
      status: 'ok',
      configured: true,
      driver,
      reason: 'S3 storage configuration is present.',
    };
  }

  if (isProdLike(env)) {
    return {
      status: 'error',
      configured: false,
      driver,
      reason: 'Local storage is not allowed for staging or production readiness.',
    };
  }

  try {
    await access(storageRoot, constants.W_OK);
    return {
      status: 'ok',
      configured: true,
      driver,
      reason: 'Local storage root is writable.',
    };
  } catch {
    return {
      status: 'error',
      configured: false,
      driver,
      reason: 'Local storage root is not writable.',
    };
  }
}

export function resolvePaymentHealth(
  env: PlatformHealthEnv = process.env,
): PaymentDependencyHealth {
  const provider = getEnvValue(env, 'PAYMENT_PROVIDER', 'fake');
  const mode = getEnvValue(env, 'PAYMENT_MODE', 'fake');

  if (mode === 'live') {
    return {
      status: 'error',
      configured: false,
      provider,
      mode,
      liveBlocked: true,
      reason: 'Live payment mode is blocked until the payment review gate is complete.',
    };
  }

  if (provider === 'fake') {
    const prodLike = isProdLike(env);
    return {
      status: prodLike ? 'error' : 'warn',
      configured: !prodLike,
      provider,
      mode,
      liveBlocked: true,
      reason: prodLike
        ? 'Fake payment provider is not launch-ready.'
        : 'Fake payment provider is active for local/test flows.',
    };
  }

  const requiredByProvider: Record<string, readonly string[]> = {
    geidea: ['GEIDEA_MERCHANT_PUBLIC_KEY', 'GEIDEA_API_PASSWORD'],
    moyasar: ['PAYMENT_SANDBOX_SECRET_KEY', 'PAYMENT_SANDBOX_PUBLIC_KEY'],
    tabby: ['TABBY_SECRET_KEY', 'TABBY_PUBLIC_KEY'],
    tamara: ['TAMARA_API_TOKEN'],
  };

  const required = requiredByProvider[provider];
  if (!required) {
    return {
      status: 'error',
      configured: false,
      provider,
      mode,
      liveBlocked: true,
      reason: `Unsupported payment provider: ${provider}`,
    };
  }

  const missing = collectMissing(env, required);
  if (missing.length > 0) {
    return {
      status: 'error',
      configured: false,
      provider,
      mode,
      liveBlocked: true,
      reason: `${provider} payment configuration is incomplete.`,
      missing,
    };
  }

  return {
    status: 'ok',
    configured: true,
    provider,
    mode,
    liveBlocked: true,
    reason: `${provider} payment configuration is present.`,
  };
}

export function resolveShippingHealth(
  env: PlatformHealthEnv = process.env,
): ShippingDependencyHealth {
  const provider = getEnvValue(env, 'SHIPPING_PROVIDER', 'manual');
  const mode = getEnvValue(env, 'SHIPPING_MODE', 'manual');

  if (mode === 'live') {
    return {
      status: 'error',
      configured: false,
      provider,
      mode,
      liveBlocked: true,
      reason: 'Live shipping mode is blocked until the shipping review gate is complete.',
    };
  }

  if (provider === 'manual') {
    return {
      status: 'warn',
      configured: true,
      provider,
      mode,
      liveBlocked: true,
      reason: 'Manual shipping is active; carrier automation is not configured.',
    };
  }

  if (provider === 'haa_mock') {
    const prodLike = isProdLike(env);
    return {
      status: prodLike ? 'error' : 'warn',
      configured: !prodLike,
      provider,
      mode,
      liveBlocked: true,
      reason: prodLike
        ? 'Mock shipping provider is not launch-ready.'
        : 'Mock shipping provider is active for local/test flows.',
    };
  }

  const requiredByProvider: Record<string, readonly string[]> = {
    oto: ['OTO_MARKETPLACE_TOKEN', 'OTO_API_KEY', 'OTO_ACCESS_TOKEN', 'OTO_SANDBOX_API_KEY'],
    aramex: ['ARAMEX_USERNAME', 'ARAMEX_ACCOUNT_NUMBER'],
    smsa: ['SMSA_PASS_KEY', 'SMSA_SENDER_ID'],
  };

  const required = requiredByProvider[provider];
  if (!required) {
    return {
      status: 'error',
      configured: false,
      provider,
      mode,
      liveBlocked: true,
      reason: `Unsupported shipping provider: ${provider}`,
    };
  }

  const configured =
    provider === 'oto'
      ? hasAny(env, required)
      : collectMissing(env, required).length === 0;

  if (!configured) {
    return {
      status: 'error',
      configured: false,
      provider,
      mode,
      liveBlocked: true,
      reason: `${provider} shipping configuration is incomplete.`,
      missing: provider === 'oto' ? [...required] : collectMissing(env, required),
    };
  }

  return {
    status: 'ok',
    configured: true,
    provider,
    mode,
    liveBlocked: true,
    reason: `${provider} shipping configuration is present.`,
  };
}

export function resolveEmailHealth(
  env: PlatformHealthEnv = process.env,
): EmailDependencyHealth {
  const smtpMissing = collectMissing(env, SMTP_REQUIRED_KEYS);
  const smtpHasAny = hasAny(env, SMTP_REQUIRED_KEYS);

  if (smtpMissing.length === 0) {
    return {
      status: 'ok',
      configured: true,
      provider: 'smtp',
      reason: 'SMTP email configuration is present.',
    };
  }

  if (smtpHasAny) {
    return {
      status: 'error',
      configured: false,
      provider: 'smtp',
      reason: 'SMTP email configuration is incomplete.',
      missing: smtpMissing,
    };
  }

  if (hasValue(env, 'RESEND_API_KEY')) {
    return {
      status: 'ok',
      configured: true,
      provider: 'resend',
      reason: 'Resend email configuration is present.',
    };
  }

  const prodLike = isProdLike(env);
  return {
    status: prodLike ? 'error' : 'warn',
    configured: false,
    provider: 'contact_only',
    reason: prodLike
      ? 'No transactional email provider is configured for launch readiness.'
      : 'No transactional email provider is configured; local contact-only fallback is active.',
  };
}

export function resolveObservabilityHealth(
  env: PlatformHealthEnv = process.env,
): ObservabilityDependencyHealth {
  const signals = [
    hasValue(env, 'SENTRY_DSN') ? 'sentry' : null,
    hasValue(env, 'OTEL_EXPORTER_OTLP_ENDPOINT') ? 'otel' : null,
  ].filter((signal): signal is string => signal !== null);

  if (signals.length > 0) {
    return {
      status: 'ok',
      configured: true,
      signals,
      reason: 'Observability sink configuration is present.',
    };
  }

  const prodLike = isProdLike(env);
  return {
    status: prodLike ? 'error' : 'warn',
    configured: false,
    signals,
    reason: prodLike
      ? 'No Sentry or OTEL sink is configured for launch readiness.'
      : 'No Sentry or OTEL sink is configured in local/test mode.',
  };
}

export async function resolvePlatformDependencyHealth({
  env = process.env,
  storageRoot,
}: ResolvePlatformDependencyHealthInput): Promise<PlatformDependencyHealthSummary> {
  const storage = await resolveStorageHealth({ env, storageRoot });
  const payment = resolvePaymentHealth(env);
  const shipping = resolveShippingHealth(env);
  const email = resolveEmailHealth(env);
  const observability = resolveObservabilityHealth(env);

  return {
    status: resolveWorstStatus([
      storage.status,
      payment.status,
      shipping.status,
      email.status,
      observability.status,
    ]),
    storage,
    payment,
    shipping,
    email,
    observability,
  };
}
