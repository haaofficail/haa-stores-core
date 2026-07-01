import { Context, ErrorHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { HTTPException } from 'hono/http-exception'
import { AppError, getUserFriendlyMessage, getFullErrorMessage } from '@haa/shared'
import { reportSupportError } from '../services/support-error-log.js'

export interface ErrorMonitor {
  captureException(err: Error, context?: Record<string, unknown>): void
  captureMessage(msg: string, context?: Record<string, unknown>): void
}

let monitor: ErrorMonitor | null = null

export function setErrorMonitor(m: ErrorMonitor): void {
  monitor = m
}

export function getErrorMonitor(): ErrorMonitor | null {
  return monitor
}

const CONTENTFUL_STATUS_CODES = new Set<number>([
  100, 102, 103,
  200, 201, 202, 203, 206, 207, 208, 226,
  300, 301, 302, 303, 305, 306, 307, 308,
  400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411,
  412, 413, 414, 415, 416, 417, 418, 421, 422, 423, 424, 425,
  426, 428, 429, 431, 451,
  500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511,
])

function toContentfulStatusCode(status: number | undefined, fallback: ContentfulStatusCode): ContentfulStatusCode {
  return typeof status === 'number' && CONTENTFUL_STATUS_CODES.has(status)
    ? status as ContentfulStatusCode
    : fallback
}


const errorHandler: ErrorHandler = async (err: Error, c: Context) => {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging'
  const requestId = c.get('requestId') || undefined
  const path = c.req.path
  const method = c.req.method

  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      success: false,
      error: {
        code: err.code,
        message: isProduction ? getUserFriendlyMessage(err.code, err.message) : err.message,
      },
    }
    if (err.details) {
      body.error = { ...body.error as object, details: isProduction ? undefined : err.details }
    }

    reportSupportError({
      errorCode: err.code,
      message: err.message,
      correlationId: requestId,
      route: path,
      method,
      statusCode: err.statusCode,
      app: 'api',
      origin: 'api',
      handled: true,
    }).catch(() => {})

    return c.json(body, toContentfulStatusCode(err.statusCode, 500))
  }

  if (err instanceof HTTPException) {
    const res = err.getResponse()
    try {
      const json = await res.clone().json()
      return c.json(json, toContentfulStatusCode(res.status, 500))
    } catch {
      return c.json({
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: isProduction ? getUserFriendlyMessage('INTERNAL_ERROR', 'An unexpected error occurred') : err.message,
        },
      }, toContentfulStatusCode(err.status || 500, 500))
    }
  }

  // Log to local support error log
  reportSupportError({
    errorCode: 'API-001',
    message: err.message || 'Unhandled API error',
    correlationId: requestId,
    route: path,
    method,
    statusCode: 500,
    app: 'api',
    origin: 'api',
    handled: false,
  }).catch(() => {})

  // Report to external monitor if configured
  if (monitor) {
    monitor.captureException(err, { requestId, path, method })
  }

  if (!isProduction) {
    console.error(err)
  }

  return c.json({
    success: false,
    error: {
      code: 'API-001',
      message: isProduction
        ? getFullErrorMessage('API-001', 'تعذر تنفيذ العملية حاليًا.')
        : err.message,
      correlationId: requestId,
    },
  }, 500)
}

export { errorHandler }
