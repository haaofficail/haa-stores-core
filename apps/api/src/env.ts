export interface EnvConfig {
  NODE_ENV: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  ADMIN_JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  API_PORT: number;
  API_BASE_URL: string;
  MERCHANT_DASHBOARD_URL: string;
  STOREFRONT_URL: string;
  CORS_ORIGINS: string[];
  LOG_LEVEL: string;
  DATABASE_READ_URL?: string;
  REDIS_URL?: string;
  QUEUE_REDIS_URL?: string;
  RATE_LIMIT_STORE: string;
  WORKER_CONCURRENCY: number;
  CDN_PUBLIC_BASE_URL?: string;
  SENTRY_DSN?: string;
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  STORAGE_DRIVER: string;
  S3_ENDPOINT?: string;
  S3_REGION?: string;
  S3_BUCKET?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_PUBLIC_BASE_URL?: string;
  PAYMENT_PROVIDER: string;
  PAYMENT_MODE: string;
  PAYMENT_SANDBOX_SECRET_KEY?: string;
  PAYMENT_SANDBOX_PUBLIC_KEY?: string;
  PAYMENT_WEBHOOK_SECRET?: string;
  GEIDEA_MERCHANT_PUBLIC_KEY?: string;
  GEIDEA_API_PASSWORD?: string;
  GEIDEA_API_BASE_URL?: string;
  GEIDEA_CALLBACK_URL?: string;
  GEIDEA_RETURN_URL?: string;
  SHIPPING_PROVIDER: string;
  SHIPPING_MODE: string;
  OTO_PLATFORM_MODE?: string;
  OTO_API_BASE_URL?: string;
  OTO_MARKETPLACE_TOKEN?: string;
  OTO_API_KEY?: string;
  OTO_ACCESS_TOKEN?: string;
  OTO_SANDBOX_API_KEY?: string;
  OTO_WEBHOOK_SECRET?: string;
  OTO_WEBHOOK_PUBLIC_KEY?: string;
  OTO_WEBHOOK_AUTHORIZATION_KEY?: string;
  SMTP_HOST?: string;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  OLLAMA_URL?: string;
  OLLAMA_MODEL?: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

function validateLocalEnv(name: string, value: string | undefined): void {
  const knownDevDefaults: Record<string, string> = {
    JWT_SECRET: 'dev-jwt-secret-change-in-production',
    ENCRYPTION_KEY: 'dev-encryption-key-32-chars-minimum!!',
    ADMIN_JWT_SECRET: 'dev-admin-jwt-secret-change-in-production',
  };
  if (value && knownDevDefaults[name] && value === knownDevDefaults[name]) {
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
      throw new Error(`${name} is set to the development default value. Generate a new secret for ${process.env.NODE_ENV} environment.`);
    }
  }
}

export function loadEnv(): EnvConfig {
  const nodeEnv = optionalEnv('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production' || nodeEnv === 'staging';

  const required: string[] = ['DATABASE_URL', 'JWT_SECRET', 'ENCRYPTION_KEY', 'ADMIN_JWT_SECRET'];
  if (isProduction) {
    required.push('API_BASE_URL', 'MERCHANT_DASHBOARD_URL', 'STOREFRONT_URL');
    required.push('DATABASE_READ_URL', 'REDIS_URL', 'QUEUE_REDIS_URL', 'CDN_PUBLIC_BASE_URL', 'SENTRY_DSN', 'OTEL_EXPORTER_OTLP_ENDPOINT');
  }

  const env: Record<string, string> = {};
  for (const key of required) {
    const value = requireEnv(key);
    env[key] = value;
    validateLocalEnv(key, value);
  }

  const storageDriver = optionalEnv('STORAGE_DRIVER', 'local');
  if (storageDriver === 's3') {
    const s3Vars = ['S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_PUBLIC_BASE_URL'];
    for (const key of s3Vars) {
      requireEnv(key);
    }
  }
  if (isProduction && storageDriver === 'local') {
    throw new Error('STORAGE_DRIVER=local is not allowed in staging/production. Use STORAGE_DRIVER=s3 with R2 or S3.');
  }

  // Validate payment mode
  const paymentMode = optionalEnv('PAYMENT_MODE', 'fake');
  if (paymentMode === 'live') {
    throw new Error(
      'PAYMENT_MODE=live is not allowed. ' +
      'Set PAYMENT_MODE=fake or sandbox. ' +
      'Live payments are blocked until Payment Review Gate, KYC, Admin, and formal GO decision.'
    );
  }

  const shippingMode = optionalEnv('SHIPPING_MODE', 'manual');
  if (shippingMode === 'live') {
    throw new Error(
      'SHIPPING_MODE=live is not allowed. ' +
      'Set SHIPPING_MODE=manual, mock, or sandbox. ' +
      'Live shipping is blocked until Shipping Review Gate.'
    );
  }

  const corsOrigins = optionalEnv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:5174,http://localhost:5175').split(',').map(s => s.trim()).filter(Boolean);

  const config: EnvConfig = {
    NODE_ENV: nodeEnv,
    DATABASE_URL: env.DATABASE_URL,
    DATABASE_READ_URL: process.env.DATABASE_READ_URL,
    REDIS_URL: process.env.REDIS_URL,
    QUEUE_REDIS_URL: process.env.QUEUE_REDIS_URL,
    JWT_SECRET: env.JWT_SECRET,
    ADMIN_JWT_SECRET: env.ADMIN_JWT_SECRET,
    ENCRYPTION_KEY: env.ENCRYPTION_KEY,
    API_PORT: parseInt(optionalEnv('API_PORT', '3000'), 10),
    API_BASE_URL: optionalEnv('API_BASE_URL', `http://localhost:${optionalEnv('API_PORT', '3000')}`),
    MERCHANT_DASHBOARD_URL: optionalEnv('MERCHANT_DASHBOARD_URL', 'http://localhost:5173'),
    STOREFRONT_URL: optionalEnv('STOREFRONT_URL', 'http://localhost:5174'),
    CORS_ORIGINS: corsOrigins,
    LOG_LEVEL: optionalEnv('LOG_LEVEL', isProduction ? 'info' : 'debug'),
    RATE_LIMIT_STORE: optionalEnv('RATE_LIMIT_STORE', isProduction ? 'redis-atomic' : 'memory'),
    WORKER_CONCURRENCY: parseInt(optionalEnv('WORKER_CONCURRENCY', '5'), 10),
    CDN_PUBLIC_BASE_URL: process.env.CDN_PUBLIC_BASE_URL,
    SENTRY_DSN: process.env.SENTRY_DSN,
    OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    STORAGE_DRIVER: storageDriver,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_REGION: process.env.S3_REGION,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL,
    PAYMENT_PROVIDER: optionalEnv('PAYMENT_PROVIDER', 'fake'),
    PAYMENT_MODE: paymentMode,
    PAYMENT_SANDBOX_SECRET_KEY: process.env.PAYMENT_SANDBOX_SECRET_KEY,
    PAYMENT_SANDBOX_PUBLIC_KEY: process.env.PAYMENT_SANDBOX_PUBLIC_KEY,
    PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET,
    GEIDEA_MERCHANT_PUBLIC_KEY: process.env.GEIDEA_MERCHANT_PUBLIC_KEY,
    GEIDEA_API_PASSWORD: process.env.GEIDEA_API_PASSWORD,
    GEIDEA_API_BASE_URL: process.env.GEIDEA_API_BASE_URL,
    GEIDEA_CALLBACK_URL: process.env.GEIDEA_CALLBACK_URL,
    GEIDEA_RETURN_URL: process.env.GEIDEA_RETURN_URL,
    SHIPPING_PROVIDER: optionalEnv('SHIPPING_PROVIDER', 'manual'),
    SHIPPING_MODE: shippingMode,
    OTO_PLATFORM_MODE: process.env.OTO_PLATFORM_MODE,
    OTO_API_BASE_URL: process.env.OTO_API_BASE_URL,
    OTO_MARKETPLACE_TOKEN: process.env.OTO_MARKETPLACE_TOKEN,
    OTO_API_KEY: process.env.OTO_API_KEY,
    OTO_ACCESS_TOKEN: process.env.OTO_ACCESS_TOKEN,
    OTO_SANDBOX_API_KEY: process.env.OTO_SANDBOX_API_KEY,
    OTO_WEBHOOK_SECRET: process.env.OTO_WEBHOOK_SECRET,
    OTO_WEBHOOK_PUBLIC_KEY: process.env.OTO_WEBHOOK_PUBLIC_KEY,
    OTO_WEBHOOK_AUTHORIZATION_KEY: process.env.OTO_WEBHOOK_AUTHORIZATION_KEY,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    OLLAMA_URL: optionalEnv('OLLAMA_URL', 'http://localhost:11434'),
    OLLAMA_MODEL: optionalEnv('OLLAMA_MODEL', 'llama3'),
  };

  return config;
}

export const env = loadEnv();
