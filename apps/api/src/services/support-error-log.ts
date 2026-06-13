import { appendFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  generateCorrelationId,
  generateEventId,
  generateFingerprint,
  getErrorDef,
  ErrorSeverity,
  ErrorSource,
  ErrorOrigin,
} from '@haa/shared'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..', '..', '..')
const EVENTS_FILE = join(ROOT, 'storage', 'support-error-events.ndjson')

const SENSITIVE_FIELDS = [
  'password', 'token', 'authorization', 'cookie', 'secret',
  'apiKey', 'accessToken', 'refreshToken', 'card', 'cvv', 'iban', 'env',
]

export interface SupportErrorEvent {
  eventId: string
  timestamp: string
  errorCode: string
  severity: ErrorSeverity
  source: ErrorSource
  area: string
  message: string
  safeMessage: string
  correlationId: string
  fingerprint: string
  route?: string
  method?: string
  statusCode?: number
  app: string
  environment: string
  origin: ErrorOrigin
  handled: boolean
  merchantId?: number
  storeId?: number
  userId?: number
  employeeId?: number
  customerId?: number
  orderId?: number
  cartId?: number
  provider?: string
  tags?: string[]
}

export interface SupportErrorInput {
  errorCode?: string
  severity?: ErrorSeverity
  source?: ErrorSource
  area?: string
  message?: string
  safeMessage?: string
  correlationId?: string
  route?: string
  method?: string
  statusCode?: number
  app?: string
  origin?: ErrorOrigin
  handled?: boolean
  merchantId?: number
  storeId?: number
  userId?: number
  employeeId?: number
  customerId?: number
  orderId?: number
  cartId?: number
  provider?: string
  tags?: string[]
  [key: string]: unknown
}

export function sanitizePayload(input: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    const keyLower = key.toLowerCase()
    if (SENSITIVE_FIELDS.some(f => keyLower.includes(f))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizePayload(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

export function createSupportErrorEvent(input: SupportErrorInput): SupportErrorEvent {
  const errorDef = input.errorCode ? getErrorDef(input.errorCode) : null
  const correlationId = input.correlationId || generateCorrelationId()
  const eventId = generateEventId()
  const normalizedMessage = (input.message || '').slice(0, 200)

  const event: SupportErrorEvent = {
    eventId,
    timestamp: new Date().toISOString(),
    errorCode: errorDef?.code || input.errorCode || 'SYS-001',
    severity: errorDef?.severity || input.severity || 'P2',
    source: errorDef?.source || input.source || 'unknown',
    area: input.area || (errorDef ? errorDef.code.split('-')[0].toLowerCase() : 'system'),
    message: normalizedMessage,
    safeMessage: input.safeMessage || errorDef?.safeMessage || 'حدث خطأ غير متوقع.',
    correlationId,
    fingerprint: generateFingerprint(
      errorDef?.code || input.errorCode || 'SYS-001',
      input.source || 'unknown',
      input.route,
      normalizedMessage,
    ),
    route: input.route,
    method: input.method,
    statusCode: input.statusCode,
    app: input.app || 'system',
    environment: process.env.NODE_ENV || 'development',
    origin: input.origin || 'api',
    handled: input.handled ?? true,
    merchantId: input.merchantId,
    storeId: input.storeId,
    userId: input.userId,
    employeeId: input.employeeId,
    customerId: input.customerId,
    orderId: input.orderId,
    cartId: input.cartId,
    provider: input.provider,
    tags: input.tags,
  }

  return event
}

export function appendSupportErrorEvent(event: SupportErrorEvent): void {
  try {
    const dir = dirname(EVENTS_FILE)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n', 'utf-8')
  } catch (err) {
    console.warn('[support-error-log] failed to write event:', err)
  }
}

export async function reportSupportError(input: SupportErrorInput): Promise<{ correlationId: string; eventId: string }> {
  const sanitized = sanitizePayload(input as unknown as Record<string, unknown>)
  const event = createSupportErrorEvent(sanitized as unknown as SupportErrorInput)
  appendSupportErrorEvent(event)
  return { correlationId: event.correlationId, eventId: event.eventId }
}

export function normalizeUnknownError(error: unknown, defaultCode = 'SYS-001'): { message: string; statusCode: number; errorCode: string } {
  if (error instanceof Error) {
    const statusCode = (error as any).statusCode || (error as any).status || 500
    return { message: error.message, statusCode, errorCode: (error as any).code || defaultCode }
  }
  return { message: String(error), statusCode: 500, errorCode: defaultCode }
}
