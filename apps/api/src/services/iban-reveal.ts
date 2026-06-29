import { eq, and } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { AuditLogService } from '@haa/integration-core';
import { assertRevealAllowed } from './iban-reveal-policy.js';

export interface IbanRevealActor {
  userId: number;
  role?: string;
}

export interface IbanRevealRequest {
  payoutId: number;
  action: 'view' | 'copy';
  actor?: IbanRevealActor;
  ipAddress?: string;
  userAgent?: string;
}

export type IbanRevealResult =
  | {
      ok: true;
      data: {
        payoutId: number;
        storeId: number;
        bankName: string;
        accountHolderName: string;
        ibanLast4: string | null;
        iban: string;
      };
    }
  | { ok: false; status: 400 | 404; code: string };

export async function revealPayoutIban(input: IbanRevealRequest): Promise<IbanRevealResult> {
  const db = createDbClient();

  const [payout] = await db.select().from(s.payoutRequests)
    .where(eq(s.payoutRequests.id, input.payoutId)).limit(1);
  if (!payout) {
    return { ok: false, status: 404, code: 'NOT_FOUND' };
  }

  // The bank account linked to the payout (explicit link, else the store's
  // verified default). Ownership is re-checked by assertRevealAllowed.
  let bank;
  if (payout.bankAccountId) {
    [bank] = await db.select().from(s.merchantBankAccounts)
      .where(eq(s.merchantBankAccounts.id, payout.bankAccountId)).limit(1);
  } else {
    [bank] = await db.select().from(s.merchantBankAccounts)
      .where(and(eq(s.merchantBankAccounts.storeId, payout.storeId), eq(s.merchantBankAccounts.status, 'verified')))
      .limit(1);
  }

  try {
    assertRevealAllowed(payout, bank ?? null);
  } catch (e) {
    const code = e instanceof Error ? e.message : 'REVEAL_NOT_ALLOWED';
    const status = code === 'BANK_ACCOUNT_NOT_LINKED' ? 404 : 400;
    return { ok: false, status, code };
  }

  const eventAction = input.action === 'copy'
    ? 'bank_account.iban_copied_for_payout'
    : 'bank_account.iban_revealed_for_payout';

  // Audit — last 4 only. The full IBAN must NEVER appear in the audit record.
  await new AuditLogService().record({
    actorUserId: input.actor?.userId ?? null,
    storeId: payout.storeId,
    action: eventAction,
    entityType: 'bank_account',
    entityId: bank!.id,
    newValue: {
      action: input.action,
      payoutId: input.payoutId,
      storeId: payout.storeId,
      bankAccountId: bank!.id,
      ibanLast4: bank!.ibanLast4,
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  // Full IBAN returned ONLY here, ONLY after route-level permission guard.
  return {
    ok: true,
    data: {
      payoutId: input.payoutId,
      storeId: payout.storeId,
      bankName: bank!.bankName,
      accountHolderName: bank!.accountHolderName,
      ibanLast4: bank!.ibanLast4,
      iban: bank!.iban,
    },
  };
}
