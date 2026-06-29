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

import { getAccountantInboxReadModel } from '../../services/accountant-inbox.js';

export const accountantInboxRoutes = {
  list: async (c: any) => {
    const inbox = await getAccountantInboxReadModel();
    return c.json({ success: true, data: inbox });
  },
};
