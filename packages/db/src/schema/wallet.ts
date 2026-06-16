import { pgTable, serial, varchar, integer, timestamp, decimal, jsonb, text, index, boolean } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';
import { users } from './users.js';

export const walletAccounts = pgTable('wallet_accounts', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id).unique(),
  balance: decimal('balance', { precision: 14, scale: 2 }).notNull().default('0'),
  pendingBalance: decimal('pending_balance', { precision: 14, scale: 2 }).notNull().default('0'),
  availableBalance: decimal('available_balance', { precision: 14, scale: 2 }).notNull().default('0'),
  totalSales: decimal('total_sales', { precision: 14, scale: 2 }).notNull().default('0'),
  totalFees: decimal('total_fees', { precision: 14, scale: 2 }).notNull().default('0'),
  totalPayouts: decimal('total_payouts', { precision: 14, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  storeIdx: index('wallet_accounts_store_idx').on(table.storeId),
}));

export const walletEntries = pgTable('wallet_entries', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  walletAccountId: integer('wallet_account_id').notNull().references(() => walletAccounts.id),
  type: varchar('type', { length: 30 }).notNull(),
  direction: varchar('direction', { length: 10 }).notNull(),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  balanceBefore: decimal('balance_before', { precision: 14, scale: 2 }).notNull(),
  balanceAfter: decimal('balance_after', { precision: 14, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  referenceType: varchar('reference_type', { length: 50 }),
  referenceId: integer('reference_id'),
  description: text('description'),
  // Fee-snapshot fields (nullable for non-fee entries).
  // These capture the exact rate and fixed amount that produced this entry,
  // so historical fee entries are immutable and traceable even if the store's
  // billing policy changes later.
  feeRatePct: decimal('fee_rate_pct', { precision: 8, scale: 6 }),
  feeFixed: decimal('fee_fixed', { precision: 12, scale: 2 }),
  feeSource: varchar('fee_source', { length: 30 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  storeCreatedAtIdx: index('wallet_entries_store_created_at_idx').on(table.storeId, table.createdAt),
  storeStatusCreatedAtIdx: index('wallet_entries_store_status_created_at_idx').on(table.storeId, table.status, table.createdAt),
  walletAccountCreatedAtIdx: index('wallet_entries_account_created_at_idx').on(table.walletAccountId, table.createdAt),
  referenceIdx: index('wallet_entries_reference_idx').on(table.referenceType, table.referenceId),
}));

export const settlementBatches = pgTable('settlement_batches', {
  id: serial('id').primaryKey(),
  provider: varchar('provider', { length: 50 }).notNull().default('geidea'),
  providerBatchId: varchar('provider_batch_id', { length: 255 }),
  currency: varchar('currency', { length: 3 }).notNull().default('SAR'),
  grossAmount: decimal('gross_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  gatewayFees: decimal('gateway_fees', { precision: 14, scale: 2 }).notNull().default('0'),
  platformFees: decimal('platform_fees', { precision: 14, scale: 2 }).notNull().default('0'),
  merchantPayable: decimal('merchant_payable', { precision: 14, scale: 2 }).notNull().default('0'),
  status: varchar('status', { length: 30 }).notNull().default('pending'),
  reconciledAt: timestamp('reconciled_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  providerBatchIdx: index('settlement_batches_provider_batch_idx').on(table.provider, table.providerBatchId),
  statusIdx: index('settlement_batches_status_idx').on(table.status),
}));

export const paymentProviderTransactions = pgTable('payment_provider_transactions', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  settlementBatchId: integer('settlement_batch_id').references(() => settlementBatches.id),
  provider: varchar('provider', { length: 50 }).notNull().default('geidea'),
  providerTransactionId: varchar('provider_transaction_id', { length: 255 }).notNull(),
  orderId: integer('order_id'),
  orderNumber: varchar('order_number', { length: 50 }),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('SAR'),
  gatewayFees: decimal('gateway_fees', { precision: 14, scale: 2 }).notNull().default('0'),
  platformFees: decimal('platform_fees', { precision: 14, scale: 2 }).notNull().default('0'),
  merchantPayable: decimal('merchant_payable', { precision: 14, scale: 2 }).notNull().default('0'),
  status: varchar('status', { length: 30 }).notNull().default('pending'),
  reconciliationStatus: varchar('reconciliation_status', { length: 30 }).notNull().default('unmatched'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  storeProviderTransactionIdx: index('payment_provider_transactions_store_provider_idx').on(table.storeId, table.provider, table.providerTransactionId),
  storeReconciliationIdx: index('payment_provider_transactions_store_reconciliation_idx').on(table.storeId, table.reconciliationStatus),
}));

export const payoutRequests = pgTable('payout_requests', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  walletAccountId: integer('wallet_account_id').notNull().references(() => walletAccounts.id),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('SAR'),
  status: varchar('status', { length: 30 }).notNull().default('requested'),
  reference: varchar('reference', { length: 100 }).notNull(),
  bankAccountId: integer('bank_account_id'),
  requestedByUserId: integer('requested_by_user_id').references(() => users.id),
  reviewedByUserId: integer('reviewed_by_user_id').references(() => users.id),
  approvedByUserId: integer('approved_by_user_id').references(() => users.id),
  transferredByUserId: integer('transferred_by_user_id').references(() => users.id),
  verifiedByUserId: integer('verified_by_user_id').references(() => users.id),
  rejectedByUserId: integer('rejected_by_user_id').references(() => users.id),
  rejectionReason: text('rejection_reason'),
  failureReason: text('failure_reason'),
  internalNotes: text('internal_notes'),
  publicNotes: text('public_notes'),
  metadata: jsonb('metadata'),
  requestedAt: timestamp('requested_at').notNull().defaultNow(),
  reviewedAt: timestamp('reviewed_at'),
  approvedAt: timestamp('approved_at'),
  processedAt: timestamp('processed_at'),
  transferredAt: timestamp('transferred_at'),
  verifiedAt: timestamp('verified_at'),
  paidAt: timestamp('paid_at'),
  failedAt: timestamp('failed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  storeStatusIdx: index('payout_requests_store_status_idx').on(table.storeId, table.status),
  referenceIdx: index('payout_requests_reference_idx').on(table.reference),
}));

export const payoutTransferProofs = pgTable('payout_transfer_proofs', {
  id: serial('id').primaryKey(),
  payoutRequestId: integer('payout_request_id').notNull().references(() => payoutRequests.id),
  bankReference: varchar('bank_reference', { length: 120 }).notNull(),
  bankName: varchar('bank_name', { length: 100 }).notNull(),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('SAR'),
  transferredAt: timestamp('transferred_at').notNull(),
  transferredByUserId: integer('transferred_by_user_id').notNull().references(() => users.id),
  beneficiaryName: varchar('beneficiary_name', { length: 255 }).notNull(),
  beneficiaryIbanMasked: varchar('beneficiary_iban_masked', { length: 40 }).notNull(),
  proofFileKey: varchar('proof_file_key', { length: 500 }),
  notes: text('notes'),
  verificationStatus: varchar('verification_status', { length: 30 }).notNull().default('pending'),
  verifiedByUserId: integer('verified_by_user_id').references(() => users.id),
  verifiedAt: timestamp('verified_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  payoutIdx: index('payout_transfer_proofs_payout_idx').on(table.payoutRequestId),
}));

export const payoutEvents = pgTable('payout_events', {
  id: serial('id').primaryKey(),
  payoutRequestId: integer('payout_request_id').notNull().references(() => payoutRequests.id),
  storeId: integer('store_id').notNull().references(() => stores.id),
  actorUserId: integer('actor_user_id').references(() => users.id),
  actorRole: varchar('actor_role', { length: 80 }),
  eventType: varchar('event_type', { length: 80 }).notNull(),
  fromStatus: varchar('from_status', { length: 30 }),
  toStatus: varchar('to_status', { length: 30 }),
  amount: decimal('amount', { precision: 14, scale: 2 }),
  reason: text('reason'),
  metadata: jsonb('metadata'),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  payoutCreatedAtIdx: index('payout_events_payout_created_at_idx').on(table.payoutRequestId, table.createdAt),
  storeCreatedAtIdx: index('payout_events_store_created_at_idx').on(table.storeId, table.createdAt),
}));

export const walletSettlementReadiness = pgTable('wallet_settlement_readiness', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').references(() => stores.id),
  fundsModel: varchar('funds_model', { length: 80 }).notNull().default('platform_collects_and_settles'),
  safeguardedAccountConfigured: boolean('safeguarded_account_configured').notNull().default(false),
  pspSettlementPartnerConfirmed: boolean('psp_settlement_partner_confirmed').notNull().default(false),
  merchantOfRecordConfirmed: boolean('merchant_of_record_confirmed').notNull().default(false),
  samaComplianceStatus: varchar('sama_compliance_status', { length: 40 }).notNull().default('unconfirmed'),
  livePayoutEnabled: boolean('live_payout_enabled').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  storeIdx: index('wallet_settlement_readiness_store_idx').on(table.storeId),
}));
