/* eslint-disable @typescript-eslint/no-explicit-any */
// Accountant finance reports (READ-ONLY, Batch 6): archive + reconciliation +
// stuck. These reports use the receipt's bank_reference / bank_name — they
// NEVER touch the merchant IBAN column, so a full IBAN can't leak here. Proof
// file keys/URLs are never selected. Guarded by the finance view permission.

import { z } from 'zod';
import { getFinanceReportsReadModel } from '../../services/settlement-reports.js';
import { csvResponse, toCsv } from './csv-response.js';

export const financeReportsExportQuerySchema = z.object({
  tab: z.enum(['archive', 'reconciliation', 'stuck']).default('archive'),
});

const FINANCE_REPORT_EXPORT_COLUMNS = [
  'settlementId',
  'storeName',
  'amount',
  'currency',
  'status',
  'bankReference',
  'bankName',
  'transferDate',
  'receiptId',
  'sha256',
  'accountantId',
  'secondApproverId',
  'reconciliationStatus',
];

export const financeReportsRoutes = {
  list: async (c: any) => {
    return c.json({
      success: true,
      data: await getFinanceReportsReadModel(),
    });
  },
  exportCsv: async (c: any) => {
    const { tab } = c.req.valid('query') as z.infer<typeof financeReportsExportQuerySchema>;
    const reports = await getFinanceReportsReadModel();
    const rows = reports[tab].map((r) => ({
      settlementId: r.settlementId,
      storeName: r.storeName,
      amount: r.amount,
      currency: r.currency,
      status: r.status,
      bankReference: r.bankReference ?? '',
      bankName: r.bankName ?? '',
      transferDate: r.transferDate ?? '',
      receiptId: r.receiptId ?? '',
      sha256: r.sha256 ?? '',
      accountantId: r.accountantId ?? '',
      secondApproverId: r.secondApproverId ?? '',
      reconciliationStatus: r.reconciliationStatus,
    }));

    return csvResponse(c, toCsv(FINANCE_REPORT_EXPORT_COLUMNS, rows), `settlement-${tab}.csv`);
  },
};
