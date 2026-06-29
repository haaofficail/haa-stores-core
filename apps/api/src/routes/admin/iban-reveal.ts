/* eslint-disable @typescript-eslint/no-explicit-any */
// IBAN reveal for payout execution (Batch 4D).
//
// This is the ONLY endpoint that returns a merchant's full IBAN, and only:
//   - to an admin holding `merchant.bank_accounts.reveal_iban_for_payout`
//     (applied by the aggregator in ./index.ts),
//   - for an operational payout tied to its store's bank account,
//   - with every view/copy written to the audit log (last 4 only — the full
//     IBAN is NEVER stored in the audit record).

import { revealPayoutIban } from '../../services/iban-reveal.js';

export const ibanRevealRoutes = {
  reveal: async (c: any) => {
    const payoutId = Number(c.req.param('payoutId'));
    const { action } = c.req.valid('json') as { action: 'view' | 'copy' };
    const adminAuth = c.get('adminAuth') as { userId: number; role?: string } | undefined;
    const result = await revealPayoutIban({
      payoutId,
      action,
      actor: adminAuth,
      ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    if (!result.ok) {
      return c.json({ success: false, error: { code: result.code, message: result.code } }, result.status);
    }

    return c.json({ success: true, data: result.data });
  },
};
