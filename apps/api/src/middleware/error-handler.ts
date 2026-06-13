import { Context, ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { AppError, getUserFriendlyMessage } from '@haa/shared'
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

const IS_LOCAL = !process.env.NODE_ENV || process.env.NODE_ENV === 'development'

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

    return c.json(body, err.statusCode as any)
  }

  if (err instanceof HTTPException) {
    const res = err.getResponse()
    try {
      const json = await res.clone().json()
      return c.json(json, res.status as any)
    } catch {
      return c.json({
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: isProduction ? getUserFriendlyMessage('INTERNAL_ERROR', 'An unexpected error occurred') : err.message,
        },
      }, (err.status || 500) as any)
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
        ? getUserFriendlyMessage('INTERNAL_ERROR', 'تعذر تنفيذ العملية حاليًا.')
        : err.message,
      correlationId: requestId,
    },
  }, 500)
}

export { errorHandler }
