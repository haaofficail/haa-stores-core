#!/usr/bin/env node
/**
 * G1 — CI env-contract check (PR-A)
 *
 * Asserts that every key in STAGING_REQUIRED_KEYS is documented in
 * deploy/staging/.env.example. Fails fast if any required key is missing so
 * that a new staging-required var can never slip in undocumented.
 *
 * Run: node scripts/check-env-contract.mjs
 * CI:  added to the Preflight job in .github/workflows/ci.yml
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Must mirror STAGING_REQUIRED_KEYS in apps/api/src/env.ts.
const STAGING_REQUIRED_KEYS = [
  'DATABASE_READ_URL',
  'REDIS_URL',
  'QUEUE_REDIS_URL',
  'CDN_PUBLIC_BASE_URL',
  'SENTRY_DSN',
  'OTEL_EXPORTER_OTLP_ENDPOINT',
  'API_BASE_URL',
  'MERCHANT_DASHBOARD_URL',
  'STOREFRONT_URL',
];

const examplePath = resolve(root, 'deploy/staging/.env.example');
const exampleContent = readFileSync(examplePath, 'utf8');

// Extract defined keys (non-comment, non-empty lines that contain '=').
const definedKeys = new Set(
  exampleContent
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#') && line.includes('='))
    .map((line) => line.split('=')[0].trim())
);

const missing = STAGING_REQUIRED_KEYS.filter((k) => !definedKeys.has(k));

if (missing.length > 0) {
  console.error('::error::Env contract violation: the following staging-required');
  console.error('keys are missing from deploy/staging/.env.example:');
  missing.forEach((k) => console.error(`  - ${k}`));
  console.error('');
  console.error('Add them to deploy/staging/.env.example with a placeholder value.');
  console.error('Also ensure STAGING_REQUIRED_KEYS in apps/api/src/env.ts stays in sync.');
  process.exit(1);
}

console.log(`✓ Env contract OK — all ${STAGING_REQUIRED_KEYS.length} staging-required keys are documented in .env.example`);
