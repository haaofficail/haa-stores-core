import { pgTable, serial, varchar, integer, timestamp, boolean, text } from 'drizzle-orm/pg-core';
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
