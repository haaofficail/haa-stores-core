/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuditLogService } from '@haa/integration-core';

type FinancialExportAuditInput = {
  report: string;
  rowCount: number;
  filters?: Record<string, unknown>;
  storeId?: number | null;
};

export async function recordFinancialExportAudit(c: any, input: FinancialExportAuditInput) {
  const adminAuth = c.get('adminAuth') as { userId?: number } | undefined;
  await new AuditLogService().record({
    actorUserId: adminAuth?.userId ?? null,
    storeId: input.storeId ?? null,
    action: 'export_wallet',
    entityType: 'finance_csv_export',
    entityId: null,
    newValue: {
      report: input.report,
      rowCount: input.rowCount,
      filters: input.filters ?? {},
    },
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });
}
