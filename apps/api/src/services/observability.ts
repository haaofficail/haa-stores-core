import { setErrorMonitor, type ErrorMonitor } from '../middleware/error-handler.js';

/**
 * Observability shim — wires an ErrorMonitor to the API's error handler.
 *
 * Design:
 *  - If `SENTRY_DSN` is set AND `@sentry/node` is installed at runtime,
 *    we use a Sentry-backed monitor (lazy require — never hard-imported
 *    so the module is optional in dev/test/local).
 *  - Otherwise we fall back to a noop monitor that simply logs to stderr.
 *    The noop path is also taken if Sentry is set but the package isn't
 *    installed (graceful degradation — never throw at boot).
 *
 * The shim is intentionally SDK-agnostic: adding a real `@sentry/node`
 * install later is a one-line code change inside `createSentryMonitor`.
 */

let initialized = false;

/**
 * Minimal shape of the @sentry/node API surface we use. Defined locally
 * so we don't need to import @sentry/node types (the package is optional
 * — only present in production deployments). The shape matches the v7+
 * SDK contract; if the installed version differs, the methods we call
 * are still safe (we use `?.` chains in places that allow it).
 */
interface SentryShape {
  init?: (options: { dsn: string; tracesSampleRate?: number; environment?: string }) => void;
  getCurrentHub?: () => { getClient?: () => unknown } | undefined;
  captureException: (err: Error, opts?: { extra?: Record<string, unknown> }) => void;
  captureMessage: (msg: string, opts?: { extra?: Record<string, unknown>; level?: string }) => void;
}

class NoopMonitor implements ErrorMonitor {
  captureException(_err: Error, context?: Record<string, unknown>): void {
    // Use stderr (not stdout) so it doesn't pollute test output
    process.stderr.write(
      `[noop-monitor] captureException ${JSON.stringify({ message: _err.message, ...context })}\n`
    );
  }
  captureMessage(msg: string, context?: Record<string, unknown>): void {
    process.stderr.write(
      `[noop-monitor] captureMessage ${JSON.stringify({ message: msg, ...context })}\n`
    );
  }
}

/**
 * Lazy Sentry monitor. We never `import` @sentry/node at the top of the
 * file — that would force the dependency on every dev/test run. Instead
 * we use a synchronous require behind a try/catch. If the package is not
 * installed, we return a noop and warn once.
 */
function tryCreateSentryMonitor(dsn: string): ErrorMonitor {
  try {
    // Synchronous require to keep the boot sequence deterministic.
    // The package is OPTIONAL — it is only present in production deployments
    // that have run `pnpm add @sentry/node`. We use `require` (not import)
    // precisely so the type-checker doesn't reject this file when the
    // package is absent. The try/catch handles runtime absence too.
    // The `unknown` cast + the SentryShape narrowing keeps TS happy
    // without forcing a hard import of the optional @sentry/node package.
    const Sentry = require('@sentry/node') as SentryShape;

    if (Sentry.init && !Sentry.getCurrentHub?.()?.getClient?.()) {
      Sentry.init({
        dsn,
        // Minimal config — production tuning happens in deployment env.
        tracesSampleRate: 0.1,
        environment: process.env.NODE_ENV || 'development',
      });
    }

    return {
      captureException(err: Error, context?: Record<string, unknown>) {
        Sentry.captureException(err, { extra: context });
      },
      captureMessage(msg: string, context?: Record<string, unknown>) {
        Sentry.captureMessage(msg, { extra: context, level: 'info' });
      },
    };
  } catch (err) {
    // @sentry/node not installed or failed to init — graceful noop.
    process.stderr.write(
      `[observability] SENTRY_DSN set but @sentry/node is not available; falling back to noop. ` +
        `Reason: ${(err as Error).message}\n`
    );
    return new NoopMonitor();
  }
}

/**
 * Create the right monitor for the current environment.
 *  - SENTRY_DSN set + @sentry/node installed → Sentry monitor
 *  - otherwise → noop monitor (always safe to call)
 */
export function createErrorMonitor(): ErrorMonitor {
  const dsn = process.env.SENTRY_DSN;
  if (dsn) {
    return tryCreateSentryMonitor(dsn);
  }
  return new NoopMonitor();
}

/**
 * Initialize observability for the API. Idempotent — safe to call multiple
 * times (e.g. from boot scripts and tests). Wires the chosen monitor into
 * the existing error-handler so all unhandled errors get reported.
 */
export function initObservability(): void {
  if (initialized) return;
  const monitor = createErrorMonitor();
  setErrorMonitor(monitor);
  initialized = true;
}
