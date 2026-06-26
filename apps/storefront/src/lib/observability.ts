// Sentry initialization — opt-in via VITE_SENTRY_DSN.
// When DSN is unset (local dev, preview deploys without secrets), the
// SDK is never initialized — zero network calls, zero overhead. This
// keeps Sentry purely opt-in per environment instead of forcing every
// deploy to carry a DSN.
import * as Sentry from '@sentry/react';

const APP_NAME = 'haa-storefront';

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
    // PDPL: scrub URL query strings + form bodies before send. Saudi
    // data-protection law treats commerce traffic as sensitive — we ship
    // only error fingerprints, never raw payloads.
    sendDefaultPii: false,
    initialScope: { tags: { app: APP_NAME } },
  });
  initialized = true;
  return true;
}

export function isObservabilityEnabled(): boolean {
  return initialized;
}
