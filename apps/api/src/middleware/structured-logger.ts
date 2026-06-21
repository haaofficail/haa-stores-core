import { Context, MiddlewareHandler } from 'hono';

// Secrets that must NEVER appear in logs
const REDACTED_KEYS = new Set([
  'password', 'token', 'secret', 'authorization',
  'x-api-key', 'api_key', 'apiKey',
  'access_token', 'refresh_token',
  'jwt', 'encryption_key', 'encryptionKey',
]);

function redactHeaders(headers: Record<string, string | string[]>): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(headers)) {
    result[key] = REDACTED_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : value;
  }
  return result;
}

function _shouldLogBody(c: Context): boolean {
  const path = c.req.path;
  // Skip binary / large bodies
  if (c.req.header('content-type')?.includes('multipart/form-data')) return false;
  if (path.startsWith('/merchant/')) return true;
  return true;
}

export function structuredLogger(): MiddlewareHandler {
  return async (c, next) => {
    const start = Date.now();
    const requestId = c.get('requestId') || '-';

    const _reqLog: Record<string, unknown> = {
      ts: new Date().toISOString(),
      level: 'info',
      msg: 'incoming request',
      requestId,
      method: c.req.method,
      path: c.req.path,
      query: c.req.queries(),
      headers: redactHeaders(Object.fromEntries(c.req.raw.headers)),
    };

    const logFn = (level: string, msg: string, extra?: Record<string, unknown>) => {
      const entry = JSON.stringify({ ts: new Date().toISOString(), level, msg, requestId, ...extra });
      if (level === 'error') {
        console.error(entry);
      } else if (level === 'warn') {
        console.warn(entry);
      } else {
        console.log(entry);
      }
    };

    logFn('info', 'incoming request', { method: c.req.method, path: c.req.path });

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    logFn(level, 'response sent', {
      method: c.req.method,
      path: c.req.path,
      status,
      duration,
    });
  };
}
