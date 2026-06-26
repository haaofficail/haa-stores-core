// Sentry initialization — opt-in via VITE_SENTRY_DSN. See
// apps/storefront/src/lib/observability.ts for the rationale (PDPL
// scrubbing, zero-DSN no-op).
import * as Sentry from '@sentry/react';

const APP_NAME = 'haa-admin-dashboard';

let initialized = false;

export function initObservability(): boolean {
  if (initialized) return true;
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) ?? import.meta.env.MODE,
    release: (import.meta.env.VITE_SENTRY_RELEASE as string | undefined) ?? undefined,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.05),
    sendDefaultPii: false,
    initialScope: { tags: { app: APP_NAME } },
  });
  initialized = true;
  return true;
}

export function isObservabilityEnabled(): boolean {
  return initialized;
}
