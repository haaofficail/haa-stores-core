/* eslint-disable @typescript-eslint/no-explicit-any */
// Accountant settlement detail (READ-ONLY, Batch 4E).
//
// Everything the accountant needs to process a transfer. Selects only masked
// bank columns (no full IBAN) and proof metadata (no file key/URL), so a full
// IBAN can never leak here — it is available solely via the audited reveal
// route. Guarded by the finance view permission in ./index.ts.

import { getAccountantSettlementDetailReadModel } from '../../services/accountant-detail.js';

export const accountantDetailRoutes = {
  detail: async (c: any) => {
    const payoutId = Number(c.req.param('payoutId'));
    const adminAuth = c.get('adminAuth') as { userId: number; permissions: string[] } | undefined;
    const detail = await getAccountantSettlementDetailReadModel(payoutId, adminAuth);
    if (!detail) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Payout not found' } }, 404);
    }

    return c.json({ success: true, data: detail });
  },
};
