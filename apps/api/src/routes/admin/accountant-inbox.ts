/* eslint-disable @typescript-eslint/no-explicit-any */
// Accountant Settlement Inbox — READ-ONLY listing (Batch 3).
//
// Returns the accountant's `ready` queue and the `exceptions` list. This route
// does NOT process anything (no transfer, no ledger mutation, no state change)
// — that is Batch 4+. The aggregator in ./index.ts applies requireAdminAuth()
// and requireAdminPermission('wallet.payout.view_all').
//
// IBAN masking: the service selects only `ibanLast4`, so the full IBAN never
// leaves the server (no React-only masking).

import { z } from 'zod';
import { getAccountantInboxReadModel } from '../../services/accountant-inbox.js';
import { csvResponse, toCsv } from './csv-response.js';

export const accountantInboxExportQuerySchema = z.object({
  segment: z.enum(['ready', 'exceptions']).default('ready'),
  status: z.string().trim().max(80).optional(),
  period: z.string().trim().max(40).optional(),
});

const ACCOUNTANT_INBOX_EXPORT_COLUMNS = [
  'settlementId',
  'reference',
  'merchantName',
  'netAmount',
  'currency',
  'period',
  'ordersCount',
  'status',
  'bankAccountStatus',
  'ibanLast4',
  'dueDate',
  'needsSecondApproval',
  'exceptionReason',
];

export const accountantInboxRoutes = {
  list: async (c: any) => {
    const inbox = await getAccountantInboxReadModel();
    return c.json({ success: true, data: inbox });
  },
  exportCsv: async (c: any) => {
    const { segment, status, period } = c.req.valid('query') as z.infer<typeof accountantInboxExportQuerySchema>;
    const inbox = await getAccountantInboxReadModel();
    const sourceRows = segment === 'ready' ? inbox.ready : inbox.exceptions;
    const rows = sourceRows
      .filter((r) => !status || r.status === status)
      .filter((r) => !period || (r.period ?? '') === period)
      .map((r) => ({
        settlementId: r.settlementId,
        reference: r.reference,
        merchantName: r.merchantName,
        netAmount: r.netAmount,
        currency: r.currency,
        period: r.period ?? '',
        ordersCount: r.ordersCount ?? '',
        status: r.status,
        bankAccountStatus: r.bankAccountStatus,
        ibanLast4: r.ibanLast4 ?? '',
        dueDate: r.dueDate ?? '',
        needsSecondApproval: r.needsSecondApproval ? 'yes' : 'no',
        exceptionReason: r.exceptionReason ?? '',
      }));

    return csvResponse(c, toCsv(ACCOUNTANT_INBOX_EXPORT_COLUMNS, rows), `settlement-${segment}.csv`);
  },
};
