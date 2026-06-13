import { Context, MiddlewareHandler } from 'hono';
import crypto from 'crypto';

const REQUEST_ID_HEADER = 'X-Request-Id';

export function requestId(): MiddlewareHandler {
  return async (c, next) => {
    const existing = c.req.header(REQUEST_ID_HEADER) || c.req.header(REQUEST_ID_HEADER.toLowerCase());
    const id = existing || crypto.randomUUID();
    c.set('requestId', id);
    c.res.headers.set(REQUEST_ID_HEADER, id);
    await next();
  };
}
