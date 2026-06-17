// Admin audit log — TASK-0038 compliance field updates.
// Writes structured NDJSON to storage/admin-audit-events.ndjson
// for later review and regulatory evidence (NCA, ZATCA, MoCI).
//
// Format: one event per line, fields:
//   eventId: uuid
//   timestamp: ISO 8601
//   adminId: number | null
//   action: string (e.g., 'tenant.compliance.update')
//   tenantId: number
//   changes: { field: { from, to } }
//   ip: string | null
//
// Sanitization: passwords, tokens, secrets, card data are stripped
// before write. Compliance fields are tracked, not sanitized (they
// are the audit subject).

import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import * as path from 'path';

const AUDIT_LOG_PATH = path.resolve(
  process.cwd(),
  'storage/admin-audit-events.ndjson',
);

const SANITIZED_KEYS = /password|token|secret|authorization|card|cvv|cvc|pin/i;

export interface AdminAuditEvent {
  adminId: number | null;
  action: string;
  tenantId: number;
  changes: Record<string, { from: unknown; to: unknown }>;
  ip?: string | null;
}

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    // strip very long values (likely raw data) and detect sensitive keywords
    if (value.length > 500) return '[truncated]';
    return value;
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SANITIZED_KEYS.test(k)) {
        result[k] = '[redacted]';
      } else {
        result[k] = sanitizeValue(v);
      }
    }
    return result;
  }
  return value;
}

function sanitizeChanges(changes: Record<string, { from: unknown; to: unknown }>): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const [key, value] of Object.entries(changes)) {
    if (SANITIZED_KEYS.test(key)) {
      out[key] = { from: '[redacted]', to: '[redacted]' };
    } else {
      out[key] = {
        from: sanitizeValue(value.from),
        to: sanitizeValue(value.to),
      };
    }
  }
  return out;
}

export async function logAdminAction(event: AdminAuditEvent): Promise<void> {
  const record = {
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
    adminId: event.adminId ?? null,
    action: event.action,
    tenantId: event.tenantId,
    changes: sanitizeChanges(event.changes),
    ip: event.ip ?? null,
  };

  // Ensure parent dir exists
  await fs.mkdir(path.dirname(AUDIT_LOG_PATH), { recursive: true });

  // Append as NDJSON (one event per line)
  await fs.appendFile(AUDIT_LOG_PATH, JSON.stringify(record) + '\n', 'utf-8');
}
