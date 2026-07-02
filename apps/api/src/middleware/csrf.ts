// CSRF protection middleware — prevents cross-site request forgery on state-change endpoints.
//
// Strategy: SameSite=Strict cookies + X-CSRF-Token header validation (double-submit pattern)
// For admin routes POST/PATCH/DELETE must include X-CSRF-Token matching __csrf in session.
//
// This is supplemental to SameSite cookies (which provide first-line defense).
// The X-CSRF-Token check adds defense-in-depth for API clients without full cookie support.

import type { MiddlewareHandler, Context, Next } from 'hono';
import { createHash } from 'node:crypto';

const TOKEN_LENGTH = 32;
const TOKEN_COOKIE_NAME = '__csrf_token';
const TOKEN_HEADER_NAME = 'x-csrf-token';

function generateCsrfToken(): string {
  return createHash('sha256')
    .update(`${Date.now()}-${Math.random()}`)
    .digest('hex')
    .slice(0, TOKEN_LENGTH);
}

/**
 * CSRF middleware for state-change endpoints (POST/PATCH/DELETE).
 *
 * When called, returns a handler that:
 * 1. Reads __csrf_token cookie (or generates one if missing).
 * 2. For GET/HEAD/OPTIONS: passes through (safe methods).
 * 3. For POST/PATCH/DELETE: validates x-csrf-token header matches cookie.
 *    Missing or mismatched token → 403 Forbidden.
 */
export function csrfProtection(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const method = c.req.method.toUpperCase();
    const cookies = c.req.header('cookie') ?? '';

    // Extract __csrf_token from cookie header
    const cookieMatch = cookies.match(new RegExp(`${TOKEN_COOKIE_NAME}=([^;]+)`));
    let csrfToken = cookieMatch?.[1];

    // Safe methods (GET, HEAD, OPTIONS) — no CSRF risk, pass through
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      // If no token cookie exists, set one for next state-change request
      if (!csrfToken) {
        csrfToken = generateCsrfToken();
        c.header('Set-Cookie', `${TOKEN_COOKIE_NAME}=${csrfToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`);
      }
      await next();
      return;
    }

    // State-change methods (POST, PATCH, DELETE) — validate CSRF token
    if (['POST', 'PATCH', 'DELETE'].includes(method)) {
      // If no cookie token, generate and set (first request) — still validate header for safety
      if (!csrfToken) {
        csrfToken = generateCsrfToken();
        c.header('Set-Cookie', `${TOKEN_COOKIE_NAME}=${csrfToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`);
      }

      const headerToken = c.req.header(TOKEN_HEADER_NAME);
      if (!headerToken || headerToken !== csrfToken) {
        return c.json(
          {
            success: false,
            error: {
              code: 'CSRF_TOKEN_INVALID',
              message: 'CSRF token validation failed. Include x-csrf-token header matching __csrf_token cookie.',
            },
          },
          403,
        );
      }
    }

    await next();
  };
}
