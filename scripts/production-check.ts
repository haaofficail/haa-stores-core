import 'dotenv/config';

const managedEnvs = new Set(['staging', 'production']);
const nodeEnv = process.env.NODE_ENV || 'development';

const requiredWhenManaged = [
  'DATABASE_URL',
  'DATABASE_READ_URL',
  'REDIS_URL',
  'QUEUE_REDIS_URL',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'API_BASE_URL',
  'MERCHANT_DASHBOARD_URL',
  'STOREFRONT_URL',
  'STORAGE_DRIVER',
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_PUBLIC_BASE_URL',
  'CDN_PUBLIC_BASE_URL',
  'SENTRY_DSN',
  'OTEL_EXPORTER_OTLP_ENDPOINT',
  'RATE_LIMIT_STORE',
];

const devDefaults: Record<string, string> = {
  JWT_SECRET: 'dev-jwt-secret-change-in-production',
  ENCRYPTION_KEY: 'dev-encryption-key-32-chars-minimum!!',
};

function fail(message: string): void {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

function pass(message: string): void {
  console.log(`✓ ${message}`);
}

console.log(`=== Haa Stores Production Check (${nodeEnv}) ===`);

if (!managedEnvs.has(nodeEnv)) {
  pass('NODE_ENV is not staging/production; production-only checks skipped.');
  process.exit(0);
}

for (const key of requiredWhenManaged) {
  if (!process.env[key]) {
    fail(`${key} is required in ${nodeEnv}.`);
  } else {
    pass(`${key} is present.`);
  }
}

for (const [key, value] of Object.entries(devDefaults)) {
  if (process.env[key] === value) {
    fail(`${key} still uses the development default.`);
  }
}

if (process.env.STORAGE_DRIVER !== 's3') {
  fail('STORAGE_DRIVER must be s3 in staging/production.');
}

if (process.env.RATE_LIMIT_STORE !== 'redis-atomic') {
  fail('RATE_LIMIT_STORE must be redis-atomic in staging/production.');
}

if (process.env.PAYMENT_MODE === 'live') {
  fail('PAYMENT_MODE=live is blocked until the payment GO decision.');
}

if (process.env.SHIPPING_MODE === 'live') {
  fail('SHIPPING_MODE=live is blocked until the shipping GO decision.');
}

if (process.exitCode) {
  console.error('Production check failed.');
  process.exit(process.exitCode);
}

pass('Production check passed.');
