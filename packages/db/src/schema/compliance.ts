import { pgTable, serial, varchar, integer, timestamp, boolean, text, uniqueIndex, index, char } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';
import { tenants } from './tenants.js';
import { users } from './users.js';

export const kycProfiles = pgTable('kyc_profiles', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id).unique(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  businessType: varchar('business_type', { length: 30 }).notNull().default('individual'),
  legalName: varchar('legal_name', { length: 255 }),
  commercialName: varchar('commercial_name', { length: 255 }),
  nationalIdOrIqama: varchar('national_id_or_iqama', { length: 20 }),
  commercialRegistrationNumber: varchar('commercial_registration_number', { length: 50 }),
  freelanceDocumentNumber: varchar('freelance_document_number', { length: 50 }),
  vatNumber: varchar('vat_number', { length: 50 }),
  country: varchar('country', { length: 100 }).default('SA'),
  city: varchar('city', { length: 100 }),
  address: text('address'),
  status: varchar('status', { length: 30 }).notNull().default('not_started'),
  submittedAt: timestamp('submitted_at'),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: integer('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const merchantBankAccounts = pgTable('merchant_bank_accounts', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  accountHolderName: varchar('account_holder_name', { length: 255 }).notNull(),
  bankName: varchar('bank_name', { length: 100 }).notNull(),
  iban: varchar('iban', { length: 34 }).notNull(),
  ibanLast4: varchar('iban_last4', { length: 4 }),
  status: varchar('status', { length: 30 }).notNull().default('submitted'),
  isDefault: boolean('is_default').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const kycDocuments = pgTable('kyc_documents', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  profileId: integer('profile_id').notNull().references(() => kycProfiles.id),
  type: varchar('type', { length: 50 }).notNull(),
  fileUrl: varchar('file_url', { length: 500 }).notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  status: varchar('status', { length: 30 }).notNull().default('uploaded'),
  rejectionReason: text('rejection_reason'),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
  reviewedAt: timestamp('reviewed_at'),
});

// PROBLEM-015: ZATCA invoice hash chain (tamper-evidence per Phase 2).
//
// Each invoice generated for a store gets one row here. `previousHash`
// links to the prior invoice in the same store; `currentHash` =
// sha256(canonical_xml || previousHash). The chain genesis (very
// first invoice for a store) uses a fixed all-zero previousHash.
//
// Concurrency: when the route records a new entry it MUST hold a
// row-level lock on the chain head (`SELECT ... FOR UPDATE` on the
// last row WHERE storeId=?). Two concurrent invoice mints for the
// same store will serialize on that lock, preventing two rows from
// pointing at the same previousHash (chain fork).
//
// This table is implementation-ready but requires ZATCA sandbox
// validation before it's considered Phase 2 compliant. The schema is
// intentionally minimal — Phase 2 onboarding may require additional
// signature/chain fields that we'll add by migration when validated.
export const zatcaInvoiceChain = pgTable(
  'zatca_invoice_chain',
  {
    id: serial('id').primaryKey(),
    storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
    // Optional reference to the order this invoice was issued for.
    // We store it for traceability but the chain identity is the
    // `invoiceUuid` — an order can theoretically be re-invoiced
    // (e.g. credit note) and each issuance gets its own UUID + row.
    orderId: integer('order_id'),
    invoiceUuid: char('invoice_uuid', { length: 36 }).notNull(),
    // Display number (e.g. "INV-42"). Not the chain identity.
    invoiceNumber: varchar('invoice_number', { length: 80 }).notNull(),
    // 64 hex chars = sha256 hex-encoded.
    previousHash: char('previous_hash', { length: 64 }).notNull(),
    currentHash: char('current_hash', { length: 64 }).notNull(),
    xmlHash: char('xml_hash', { length: 64 }).notNull(),
    sequence: integer('sequence').notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // The UUID is the canonical chain identity — globally unique.
    uniqInvoiceUuid: uniqueIndex('zatca_chain_invoice_uuid_uq').on(t.invoiceUuid),
    // No two rows in the same store can share a previousHash —
    // enforced at the DB level so a race cannot fork the chain.
    uniqStorePrev: uniqueIndex('zatca_chain_store_previous_uq').on(t.storeId, t.previousHash),
    // Fast head lookup: "give me the most recent chain entry for
    // store=X" → index on (storeId, sequence DESC).
    storeSeqIdx: index('zatca_chain_store_seq_idx').on(t.storeId, t.sequence),
  }),
);

export type ZatcaInvoiceChainRow = typeof zatcaInvoiceChain.$inferSelect;
export type NewZatcaInvoiceChainRow = typeof zatcaInvoiceChain.$inferInsert;
