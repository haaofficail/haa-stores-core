/* eslint-disable @typescript-eslint/no-explicit-any */
// Accountant finance reports (READ-ONLY, Batch 6): archive + reconciliation +
// stuck. These reports use the receipt's bank_reference / bank_name — they
// NEVER touch the merchant IBAN column, so a full IBAN can't leak here. Proof
// file keys/URLs are never selected. Guarded by the finance view permission.

import { getFinanceReportsReadModel } from '../../services/settlement-reports.js';

export const financeReportsRoutes = {
  list: async (c: any) => {
    return c.json({
      success: true,
      data: await getFinanceReportsReadModel(),
    });
  },
};
