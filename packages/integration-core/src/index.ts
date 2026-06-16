export const INTEGRATION_CORE_VERSION = '0.1.0';

export { WebhookOutboxService } from './webhook.js';
export { AuditLogService } from './audit.js';
export { ApiKeyService } from './api-keys.js';
export { HealthCheckService } from './health.js';
export { BasicHealthService, basicHealthService } from './basic-health-service.js';
export type { BasicHealthPingResult } from './basic-health-service.js';
export { deduplicateWebhook, resolveIdempotencyKey, IDEMPOTENCY_KEY_HEADER } from './webhook-dedup.js';
export type { DedupeResult } from './webhook-dedup.js';
