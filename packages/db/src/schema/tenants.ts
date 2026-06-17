import { pgTable, serial, varchar, timestamp, boolean, text } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  logoUrl: varchar('logo_url', { length: 500 }),
  faviconUrl: varchar('favicon_url', { length: 500 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  taxNumber: varchar('tax_number', { length: 50 }),
  isTaxRegistered: boolean('is_tax_registered').default(false),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  // TASK-0038 G1-G10 — compliance fields. See docs/ops/OWNER_ACTION_G*.md
  // Migration: packages/db/src/migrations/0061_tenant_compliance_fields.sql
  // Each field tracks one owner-action item. All nullable — owner fills
  // them as they progress through G1 → G10.
  // G1 — Commercial Registration (MoCI)
  commercialRegistrationNumber: varchar('commercial_registration_number', { length: 20 }),
  commercialRegistrationIssuedAt: timestamp('commercial_registration_issued_at'),
  // G2 — VAT Registration (ZATCA)
  vatNumber: varchar('vat_number', { length: 20 }),
  vatRegisteredAt: timestamp('vat_registered_at'),
  // G3 — E-commerce License (MoCI)
  ecommerceLicenseNumber: varchar('ecommerce_license_number', { length: 30 }),
  ecommerceLicenseIssuedAt: timestamp('ecommerce_license_issued_at'),
  ecommerceLicenseExpiresAt: timestamp('ecommerce_license_expires_at'),
  // G4 — Data Protection Officer (PDPL Art. 22)
  dpoEmail: varchar('dpo_email', { length: 255 }),
  dpoPhone: varchar('dpo_phone', { length: 20 }),
  dpoAppointedAt: timestamp('dpo_appointed_at'),
  // G5 — Trademark (SAIP)
  trademarkNumber: varchar('trademark_number', { length: 30 }),
  trademarkRegisteredAt: timestamp('trademark_registered_at'),
  trademarkExpiresAt: timestamp('trademark_expires_at'),
  // G6 — PCI-DSS ASV (quarterly scan)
  asvLastScanAt: timestamp('asv_last_scan_at'),
  asvVendor: varchar('asv_vendor', { length: 100 }),
  asvCertificateUrl: varchar('asv_certificate_url', { length: 500 }),
  // G7 — Pen-test firm
  pentestLastScanAt: timestamp('pentest_last_scan_at'),
  pentestVendor: varchar('pentest_vendor', { length: 100 }),
  pentestReportUrl: varchar('pentest_report_url', { length: 500 }),
  pentestPass: boolean('pentest_pass'),
  // G8 — Hosting region decision
  hostingRegion: varchar('hosting_region', { length: 50 }),
  hostingProvider: varchar('hosting_provider', { length: 100 }),
  hostingKsaResidency: boolean('hosting_ksa_residency').notNull().default(false),
  // G9 — Tabby Data Processing Agreement
  tabbyDpaSignedAt: timestamp('tabby_dpa_signed_at'),
  tabbyDpaUrl: varchar('tabby_dpa_url', { length: 500 }),
  // G10 — Disaster Recovery Plan
  drPlanDocumentedAt: timestamp('dr_plan_documented_at'),
  drLastTabletopAt: timestamp('dr_last_tabletop_at'),
  drNextTabletopAt: timestamp('dr_next_tabletop_at'),
});
