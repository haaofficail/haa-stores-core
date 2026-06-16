// CSRF Origin/Referer middleware — Quality Pass 3
//
// Defense-in-depth against cross-origin form submissions that
// trick a victim's browser into sending a mutating request to
// our API. The project uses Bearer tokens in localStorage (no
// cookies anywhere), so the classic cookie-auto-attach CSRF
// vector is not directly applicable. However:
//
//   1. Some browsers treat Authorization headers as credentials
//      in cross-origin fetch-with-credentials mode.
//   2. The project sets `cors({ credentials: true })` which
//      signals cookie-or-credential based auth to clients.
//   3. Defense-in-depth: any mutating request whose Origin
//      header is present and not in the allow-list is rejected,
//      regardless of which auth header it carries.
//
// This is the modern equivalent of double-submit cookies for
// Bearer-token APIs (the pattern used by GitHub, GitLab, etc.).
// A double-submit-cookie layer can be added later if the project
// ever introduces cookie-based sessions.
//
// Behavior:
//   - GET / HEAD / OPTIONS / safe methods: pass through.
//   - Mutating methods (POST / PUT / PATCH / DELETE) with no
//     Origin header: pass through (server-to-server, mobile apps,
//     CLI, webhooks — all legitimate cases where the browser
//     doesn't send an Origin).
//   - Mutating methods with an Origin NOT in env.CORS_ORIGINS:
//     return 403 with code CSRF_ORIGIN_REJECTED.

import type { Context, MiddlewareHandler, Next } from 'hono';
import { env } from '../env.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function csrfOrigin(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const method = c.req.method.toUpperCase();
    if (!MUTATING_METHODS.has(method)) {
      return next();
    }

    // No Origin header → not a browser-driven request. Pass through.
    const origin = c.req.header('Origin');
    if (!origin) {
      return next();
    }

    // Strip any trailing slash for normalized comparison.
    const normalized = origin.replace(/\/+$/, '');
    if (env.CORS_ORIGINS.includes(normalized)) {
      return next();
    }

    return c.json(
      {
        success: false,
        error: {
          code: 'CSRF_ORIGIN_REJECTED',
          message: 'Cross-origin request blocked by CSRF origin check.',
        },
      },
      403,
    );
  };
}
