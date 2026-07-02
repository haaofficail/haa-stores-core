// Error response masking — prevents internal path disclosure in 5xx responses.
//
// Masks file paths, stack traces, and internal error details in production
// error responses. Error details are only exposed for 4xx client errors;
// 5xx server errors return a generic "internal server error" message.

import type { MiddlewareHandler, Context, Next } from 'hono';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Mask sensitive error details in 5xx responses.
 *
 * - 4xx errors (client fault): return as-is for debugging
 * - 5xx errors (server fault): mask paths, stack traces, detailed messages
 * - Logs full error to stderr for ops visibility
 */
export function errorMasking(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (err) {
      const status = c.res.status || 500;
      const isServerError = status >= 500;

      if (isServerError && IS_PRODUCTION) {
        // Log full error for ops debugging
        console.error('[5xx Error]', err);

        // Return generic message to client
        return c.json(
          {
            success: false,
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'An internal server error occurred. Please contact support.',
            },
          },
          500,
        );
      }

      // For 4xx or non-production, expose full error details
      if (err instanceof Error) {
        return c.json(
          {
            success: false,
            error: {
              code: 'ERROR',
              message: err.message,
            },
          },
          500,
        );
      }

      throw err;
    }
  };
}
