import { describe } from 'vitest';

describe('Checkout idempotency and transaction safety', () => {
  describe('session creation idempotency', () => {
    test.todo('reuses existing session when idempotencyKey matches');

    test.todo('creates new session for unique idempotencyKey');
  });

  describe('confirm idempotency', () => {
    test.todo('returns existing order when session already processed');

    test.todo('rejects already-paid sessions');

    test.todo('rejects non-pending sessions');
  });

  describe('wallet ledger transaction safety', () => {
    test.todo('wallet entries should be created inside the same transaction as order');

    test.todo('all core operations execute within db.transaction scope');
  });

  describe('payment flow rules', () => {
    test.todo('fake_card_success should mark payment as paid');

    test.todo('bank_transfer should skip payment confirmation');

    test.todo('cash_on_delivery should skip payment confirmation');
  });
});
