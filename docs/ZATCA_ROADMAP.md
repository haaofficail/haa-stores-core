# ZATCA E-Invoicing Roadmap — هاء متاجر (Haa Stores)

> **Created:** 2026-06-17 (TASK-0035 closure + planning session)
> **Owner:** Haa Stores Platform Team
> **Status:** Planning (TASK-0036 candidate)
> **Estimated effort:** 3-4 weeks of focused work (multi-session)
> **Mandatory from:** 2023-01-01 (Phase 2 for high-revenue taxpayers)

---

## 0. Executive Summary

**ZATCA (Zakat, Tax and Customs Authority — هيئة الزكاة والضريبة والجمارك)** has mandated **e-invoicing (الفوترة الإلكترونية / FATOORAH)** for B2B and B2C transactions in Saudi Arabia. The rollout is in two phases:

- **Phase 1 (Generation — مرحلة الإصدار):** Generate e-invoices in a ZATCA-compliant format (XML/JSON + QR + hash + counter). Already mandatory since 2021-12-04 for most businesses.
- **Phase 2 (Integration — مرحلة الربط والتكامل):** Integrate with ZATCA's FATOORAH platform for real-time clearance (B2B) or reporting (B2C). Mandatory since 2023-01-01 for residents with revenue > SAR 40M, expanding yearly.

**Current state in our codebase:**
- VAT computation helpers ✅ (TASK-0035: `vat.ts` with `priceIncVat`, `priceExVat`, `vatAmount`, `formatVatLine`)
- `vatNumber` + `isTaxRegistered` fields ✅ on tenants schema
- `taxAmount` field ✅ on orders schema
- `billingAddress` field ✅ on orders schema
- Order success page ✅ shows order number
- **Missing:** e-invoice generation, ZATCA-format XML/JSON, hash chaining, QR code, cryptographic stamp (CSID), ZATCA integration (FATOORAH API), receipt PDF, retention, audit

**Estimated work:** ~3-4 weeks of focused engineering across 4 phases below.

---

## 1. ZATCA Phase 1 (Generation) — Foundation

### 1.1 What ZATCA requires

For **every** sales transaction (B2B and B2C), the merchant must issue an **e-invoice** (فاتورة إلكترونية) containing:

#### 1.1.1 Mandatory Fields (Simplified Tax Invoice B2C — فاتورة ضريبية مبسطة)

| Field | Arabic | Source in our code |
|-------|--------|---------------------|
| Document type | نوع المستند | New: `invoice_type` ('invoice' / 'credit_note' / 'debit_note') |
| Document number | رقم الفاتورة | New: `invoice_number` per tenant counter |
| Issue date + time | تاريخ ووقت الإصدار | `order.createdAt` |
| Seller name | اسم المورد | `tenant.name` |
| Seller VAT number | الرقم الضريبي للمورد | `tenant.taxNumber` |
| Seller address | عنوان المورد | New: `tenant.address` field |
| Buyer name (B2B) | اسم العميل | `order.customerName` |
| Buyer VAT number (B2B) | الرقم الضريبي للعميل | New: `order.buyerVatNumber` |
| Line items | تفاصيل المنتجات | `order.items` |
| Line item VAT | ضريبة كل منتج | Computed from `vat.ts` |
| Total (ex-VAT) | المجموع قبل الضريبة | Computed |
| VAT amount | مبلغ الضريبة | Computed from `vat.ts` |
| Total (inc-VAT) | المبلغ الإجمالي | `order.total` |
| QR code | رمز الاستجابة السريعة | Generated (TLV-encoded) |
| Cryptographic stamp | الختم الإلكتروني | New: CSID generation |
| Hash | التجزئة | New: SHA-256 of canonical invoice |
| Counter value | رقم العداد | New: monotonic counter per tenant |
| Previous invoice hash | هاش الفاتورة السابقة | New: hash chaining |

#### 1.1.2 QR Code Format (TLV — Tag-Length-Value)

ZATCA requires the QR to contain 5 TLV fields:

```
Tag 1: Seller name (UTF-8)
Tag 2: VAT number
Tag 3: Issue date + time (ISO 8601)
Tag 4: Total (inc-VAT)
Tag 5: VAT amount
Tag 6 (optional): Hash
```

Encoded as Base64. Rendered as QR (Image or PDF).

#### 1.1.3 Invoice Format

ZATCA accepts two formats:
- **XML (UBL 2.1)** — standard format
- **JSON (custom ZATCA schema)** — simpler for tech teams

We will support **both** (XML for compliance depth, JSON for simplicity).

### 1.2 What we need to build

#### 1.2.1 New schema (DB migration 0054)

```typescript
// packages/db/src/schema/invoices.ts (NEW)
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  orderId: integer('order_id').references(() => orders.id), // nullable for credit notes etc.
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),

  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull(),
  invoiceType: varchar('invoice_type', { length: 20 }).notNull(), // 'invoice' | 'credit_note' | 'debit_note'
  previousInvoiceNumber: varchar('previous_invoice_number', { length: 50 }), // for credit/debit notes

  // ZATCA fields
  issueDate: timestamp('issue_date').notNull().defaultNow(),
  supplyDate: timestamp('supply_date'), // separate from issue for future delivery
  invoiceCounter: integer('invoice_counter').notNull(), // monotonic per tenant
  hash: varchar('hash', { length: 64 }).notNull(), // SHA-256
  previousHash: varchar('previous_hash', { length: 64 }), // hash chaining
  qrCodeData: text('qr_code_data').notNull(), // TLV + Base64
  cryptStamp: text('crypt_stamp'), // XML digital signature
  cryptStampAlgorithm: varchar('crypt_stamp_algorithm', { length: 20 }).default('SHA256withRSA'),

  // ZATCA integration (Phase 2)
  zatcaStatus: varchar('zatca_status', { length: 20 }).default('pending'),
  // 'pending' | 'reported' | 'cleared' | 'rejected' | 'failed'
  zatcaClearanceId: varchar('zatca_clearance_id', { length: 100 }),
  zatcaReportedAt: timestamp('zatca_reported_at'),
  zatcaClearedAt: timestamp('zatca_cleared_at'),

  // PDF
  pdfUrl: varchar('pdf_url', { length: 500 }),

  // Currency + totals
  currency: varchar('currency', { length: 3 }).notNull().default('SAR'),
  subtotalExVat: decimal('subtotal_ex_vat', { precision: 12, scale: 2 }).notNull(),
  vatAmount: decimal('vat_amount', { precision: 12, scale: 2 }).notNull(),
  vatRate: decimal('vat_rate', { precision: 5, scale: 4 }).notNull(), // 0.1500
  totalIncVat: decimal('total_inc_vat', { precision: 12, scale: 2 }).notNull(),

  // Buyer (for B2B invoices, optional for B2C)
  buyerName: varchar('buyer_name', { length: 255 }),
  buyerVatNumber: varchar('buyer_vat_number', { length: 50 }),
  buyerAddress: text('buyer_address'),

  // Status
  status: varchar('status', { length: 20 }).notNull().default('issued'),
  // 'draft' | 'issued' | 'cancelled' | 'rejected'
  cancelledAt: timestamp('cancelled_at'),
  cancellationReason: text('cancellation_reason'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniqueTenantInvoiceNumber: unique().on(t.tenantId, t.invoiceNumber),
}));

export const invoiceLineItems = pgTable('invoice_line_items', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  lineNumber: integer('line_number').notNull(),
  productId: integer('product_id').references(() => products.id),
  productName: varchar('product_name', { length: 255 }).notNull(),
  productDescription: text('product_description'),
  quantity: decimal('quantity', { precision: 12, scale: 3 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  unitPriceExVat: decimal('unit_price_ex_vat', { precision: 12, scale: 2 }).notNull(),
  discount: decimal('discount', { precision: 12, scale: 2 }).notNull().default('0'),
  vatRate: decimal('vat_rate', { precision: 5, scale: 4 }).notNull(),
  vatAmount: decimal('vat_amount', { precision: 12, scale: 2 }).notNull(),
  lineTotalExVat: decimal('line_total_ex_vat', { precision: 12, scale: 2 }).notNull(),
  lineTotalIncVat: decimal('line_total_inc_vat', { precision: 12, scale: 2 }).notNull(),
});

export const invoiceCounters = pgTable('invoice_counters', {
  tenantId: integer('tenant_id').primaryKey().references(() => tenants.id),
  nextCounter: integer('next_counter').notNull().default(1),
  lastHash: varchar('last_hash', { length: 64 }), // for hash chaining
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

#### 1.2.2 New service (`packages/commerce-core/src/zatca-invoice-service.ts`)

```typescript
export class ZatcaInvoiceService {
  // Issue a new invoice for an order
  async issueInvoice(orderId: number, type: 'invoice' | 'credit_note'): Promise<Invoice>;

  // Generate the QR code TLV
  generateQrTlv(invoice: Invoice): string; // returns Base64-encoded TLV

  // Compute hash for an invoice
  computeHash(invoice: Invoice, previousHash: string | null): string; // SHA-256

  // Generate XML (UBL 2.1)
  generateXml(invoice: Invoice): string;

  // Generate JSON (ZATCA custom)
  generateJson(invoice: Invoice): object;

  // Apply cryptographic stamp (placeholder until Phase 2)
  applyCryptStamp(xml: string, certId: string): string;

  // Cancel an invoice (issues credit note)
  async cancelInvoice(invoiceId: number, reason: string): Promise<Invoice>;

  // Get invoice PDF URL
  async getInvoicePdf(invoiceId: number): Promise<string>;
}
```

#### 1.2.3 Wiring

- Hook into `CheckoutService.confirm` after order is finalized:
  - If `tenant.isTaxRegistered` → call `ZatcaInvoiceService.issueInvoice(orderId, 'invoice')`
- Add invoice download button to order success page + merchant dashboard
- Add invoice list to merchant dashboard
- Add invoice management to admin dashboard (view all invoices across tenants)

#### 1.2.4 Tests

- `tests/zatca-invoice-service.test.ts` (TDD)
  - Hash computation
  - QR TLV encoding
  - XML generation (well-formed UBL 2.1)
  - JSON generation (ZATCA custom schema)
  - Counter increment + hash chaining
  - Credit note generation (cancel invoice)
- `tests/zatca-invoice-wiring.test.ts` (source-grep)
  - IssueInvoice hook on confirm
  - Invoice schema migration applied
  - PDF generation

### 1.3 Effort estimate

| Sub-task | Effort |
|----------|------:|
| Schema migration + invoice tables | 0.5 day |
| ZatcaInvoiceService (hash + QR + XML + JSON) | 2 days |
| Hook into CheckoutService.confirm | 0.5 day |
| Invoice download endpoint | 0.5 day |
| Merchant dashboard UI (invoice list) | 1 day |
| Admin dashboard UI (all invoices) | 0.5 day |
| TDD tests | 1 day |
| Manual testing with sample data | 0.5 day |
| **Total Phase 1** | **6.5 days** |

---

## 2. ZATCA Phase 2 (Integration) — Real-time clearance

### 2.1 What ZATCA requires

For **high-revenue taxpayers (revenue > SAR 40M initially, expanding yearly)**, invoices must be:

- **B2C (Simplified Tax Invoice — فاتورة ضريبية مبسطة):** Reported to ZATCA within 24 hours (batch or real-time)
- **B2B (Standard Tax Invoice — فاتورة ضريبية):** Real-time clearance per invoice (mandatory)

ZATCA integration endpoints:

| Endpoint | Purpose |
|----------|---------|
| **Compliance API** (compliance.csr.zatca.gov.sa) | Issue certificates (CSR generation) |
| **Reporting API** (reporting.csr.zatca.gov.sa) | B2C reporting |
| **Clearance API** (clearing.csr.zatca.gov.sa) | B2B real-time clearance |

### 2.2 What we need to build

#### 2.2.1 Certificate Management

- Generate **CSR (Certificate Signing Request)** for each tenant
- Receive **CSID (Cryptographic Stamp Identifier)** from ZATCA compliance API
- Store CSID per tenant (encrypted at rest)
- Handle CSID renewal (annual)

#### 2.2.2 Integration Modes

For Phase 2, we support:

| Mode | Trigger | When |
|------|---------|------|
| **Real-time clearance (B2B)** | `ZatcaInvoiceService.issueInvoice('invoice', buyerVatNumber)` | Sync — block on ZATCA response |
| **Batch reporting (B2C)** | Cron job every hour | Async — report batched invoices |

#### 2.2.3 Retry & Failure Handling

- If ZATCA is down, queue invoices locally with `zatcaStatus = 'pending'`
- Retry with exponential backoff
- Surface failures to merchant dashboard with manual retry option
- After 24 hours of failure, alert operations

#### 2.2.4 Updates Needed

```typescript
// packages/commerce-core/src/zatca-integration-service.ts (NEW)
export class ZatcaIntegrationService {
  async generateCsr(tenantId: number): Promise<string>;
  async submitCsr(tenantId: number, csr: string): Promise<{ csid: string; secret: string }>;
  async reportInvoice(invoiceId: number): Promise<void>; // B2C async
  async clearInvoice(invoiceId: number): Promise<void>; // B2B sync
  async batchReportPendingInvoices(): Promise<{ reported: number; failed: number }>;
  async handleZatcaWebhook(payload: ZatcaWebhookPayload): Promise<void>;
}
```

### 2.3 Effort estimate

| Sub-task | Effort |
|----------|------:|
| CSR generation + submission flow | 2 days |
| CSID storage (encrypted) + renewal | 1 day |
| Real-time clearance endpoint (B2B) | 1 day |
| Batch reporting job (B2C) | 1 day |
| Retry queue + failure handling | 1 day |
| Webhook handler | 0.5 day |
| Admin UI for CSID management | 1 day |
| TDD tests | 1.5 days |
| Sandbox testing with ZATCA sandbox | 1 day |
| **Total Phase 2** | **10 days** |

---

## 3. Per-Tenant VAT Configuration (TASK-0035 sub-item 8)

This is a **prerequisite** for ZATCA Phase 1+2. Currently we have global `VAT_RATE` env (0.15). Each tenant needs their own VAT rate for:

- Multi-merchant platform where each merchant has their own VAT registration
- Edge case: zero-rated supplies (export, medical, education)
- Future: Saudi-to-Saudi vs Saudi-to-GCC differential VAT

### 3.1 What we need to build

#### 3.1.1 Schema (migration 0055)

```typescript
// Add to stores table (already has billing_settings)
// OR new table for clarity:
export const storeVatSettings = pgTable('store_vat_settings', {
  storeId: integer('store_id').primaryKey().references(() => stores.id),
  defaultVatRate: decimal('default_vat_rate', { precision: 5, scale: 4 }).notNull().default('0.1500'),
  vatRegistrationNumber: varchar('vat_registration_number', { length: 50 }), // mirror of tenant.taxNumber
  isVatExempt: boolean('is_vat_exempt').notNull().default(false),
  exemptionReason: varchar('exemption_reason', { length: 200 }), // 'export' | 'medical' | 'education' | etc.
  effectiveFrom: timestamp('effective_from').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Add to products table (for product-level VAT override)
export const products = pgTable('products', {
  // ... existing
  vatRateOverride: decimal('vat_rate_override', { precision: 5, scale: 4 }), // null = use store default
  vatCategory: varchar('vat_category', { length: 30 }).default('standard'), // 'standard' | 'zero_rated' | 'exempt'
});
```

#### 3.1.2 Updates

- `vat.ts` already supports per-rate
- `commerce-core/checkout.ts` reads VAT from `store_vat_settings` (not env)
- Merchant dashboard UI for editing VAT settings
- Admin dashboard UI for editing any tenant's VAT settings
- Product UI for product-level VAT override

### 3.2 Effort estimate

| Sub-task | Effort |
|----------|------:|
| Schema migrations (0055 + 0056) | 0.5 day |
| Update CheckoutService to read per-store VAT | 0.5 day |
| Update wallet posting service (postPlatformFee uses per-store VAT) | 0.5 day |
| Merchant dashboard UI for VAT settings | 1 day |
| Admin dashboard UI | 0.5 day |
| Product VAT override UI | 0.5 day |
| TDD tests | 1 day |
| **Total per-tenant VAT** | **4.5 days** |

---

## 4. Receipt PDF Generation

### 4.1 Why we need it

For B2C, customers expect a printable receipt. For B2B, customers expect a professional PDF invoice. PDF must include:
- All ZATCA-required fields
- QR code
- Logo (per tenant)
- RTL Arabic + English

### 4.2 What we need to build

- PDF generation library: `pdfkit` or `puppeteer` (HTML → PDF)
- Recommendation: **HTML → PDF via puppeteer** (full control over RTL + Arabic + branding)
- Store PDFs in Cloudflare R2 (already planned for storage)
- Generate on invoice issue, store URL in `invoices.pdfUrl`

### 4.3 Effort estimate

| Sub-task | Effort |
|----------|------:|
| PDF template (HTML with RTL + Arabic + QR) | 1 day |
| Puppeteer integration | 1 day |
| Storage in Cloudflare R2 | 0.5 day |
| Download endpoint with auth check | 0.5 day |
| TDD tests | 0.5 day |
| **Total PDF** | **3.5 days** |

---

## 5. Retention & Audit (ZATCA Compliance)

### 5.1 What ZATCA requires

- **Invoices retained for 6 years** from issue date
- All modifications/cancellations logged
- Audit trail of who issued / modified / cancelled
- Stored in tamper-evident way (hash chaining provides this)

### 5.2 What we need

- Background job to archive old invoices (after 6 years: anonymize)
- Audit log for invoice operations (already have `audit_logs` table)
- Backup strategy for invoice data (separate from regular backups, encrypted)

### 5.3 Effort estimate

| Sub-task | Effort |
|----------|------:|
| Retention job (6-year archive) | 1 day |
| Invoice audit log integration | 0.5 day |
| Separate backup policy | 0.5 day |
| **Total retention** | **2 days** |

---

## 6. Sequencing (Phase 1+2 Roadmap)

### 6.1 Recommended order

```
Per-tenant VAT (4.5 days)         ← TASK-0036 sub-item 1: prerequisite for everything
         ↓
ZATCA Phase 1 Generation (6.5 days)  ← TASK-0036 sub-item 2: invoice generation + QR + hash
         ↓
Receipt PDF (3.5 days)            ← TASK-0036 sub-item 3: customer-facing delivery
         ↓
Retention & Audit (2 days)        ← TASK-0036 sub-item 4: legal compliance
         ↓
ZATCA Phase 2 Integration (10 days) ← TASK-0036 sub-item 5: live integration with ZATCA
```

**Total: ~26 days of focused engineering work (~3.5 weeks)**

### 6.2 Phased delivery

| Phase | When | Deliverable |
|-------|------|-------------|
| **6.2.1** | Sessions #6-#7 | Per-tenant VAT config |
| **6.2.2** | Sessions #8-#10 | ZATCA Phase 1 (Generation) |
| **6.2.3** | Sessions #11-#12 | Receipt PDF |
| **6.2.4** | Session #13 | Retention & Audit |
| **6.2.5** | Sessions #14-#17 | ZATCA Phase 2 (Integration) |

### 6.3 Parallel work

While ZATCA work is in progress, other work can continue:
- 3DS for Geidea provider (independent)
- Drizzle snapshot chain fix (independent)
- Fake 3DS challenge page UI (dev convenience)
- Marketplace enhancements
- Performance optimization

---

## 7. Risks & Mitigations

### 7.1 Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **ZATCA spec changes** | Medium | High | Abstract behind `ZatcaInvoiceService` interface; spec-agnostic at the integration layer |
| **Multi-tenant complexity** | High | Medium | Tenant-scoped counters + hash chains; isolated per tenant |
| **PDF generation slow** | Medium | Medium | Use queue + CDN-cached PDF; generate on demand for downloads |
| **CSID renewal failure** | Low | High | Alerts at 30 days before expiry; manual renewal UI |
| **ZATCA sandbox instability** | High | Low | Sandbox-only testing in early phases; integration tests against staging only |
| **VAT rate changes mid-flight** | Low | High | Effective-dated rates in DB; never update existing invoices |
| **Performance under load** | Medium | Medium | Counter updates in single transaction; async reporting queue |

### 7.2 Open Questions (Owner Decisions Required)

| Q | Question | Recommendation |
|---|----------|----------------|
| **Q1** | Do we issue **per-merchant CSID** or **platform CSID** for all tenants? | Per-merchant (proper multi-tenant SaaS; matches Saudi legal reality of separate CRs) |
| **Q2** | **Real-time clearance** for all B2B invoices, or batch by default? | Real-time (matches ZATCA expectation; queue handles back-pressure) |
| **Q3** | For **cross-border (export)**, what VAT rate? | 0% with `vatCategory='zero_rated'`; requires manual flag by merchant |
| **Q4** | **Credit note** numbering: separate counter or shared with invoices? | Separate counter per ZATCA spec |
| **Q5** | **Offline mode**: if ZATCA integration is down, can we issue invoices? | Yes, with `zatcaStatus='pending'`; batch report when back online |
| **Q6** | For **testing**, do we need a ZATCA sandbox account? | Yes — request from ZATCA portal (requires Saudi CR) |

---

## 8. Cost Estimate (Live Operation)

| Item | Cost/month | Notes |
|------|-----------|-------|
| ZATCA integration (no fee) | 0 SAR | ZATCA APIs are free |
| Puppeteer service (for PDFs) | ~$5-10/mo | Can run on same Fly.io machine |
| Cloudflare R2 storage (PDFs) | ~$0.015/GB/month | 10K invoices × 100KB = ~1GB = negligible |
| Additional compute for PDF generation | ~$5-15/mo | Bursty workload |
| **Total monthly overhead** | **~$10-25/mo** | (on top of existing hosting) |

---

## 9. Success Criteria

### 9.1 Per-tenant VAT
- [ ] Each merchant can set their own VAT rate (default 15%)
- [ ] Product-level VAT override works
- [ ] VAT exemptions supported (zero-rated, exempt categories)
- [ ] Migration of existing orders unaffected

### 9.2 ZATCA Phase 1 (Generation)
- [ ] Every order creates an invoice with all ZATCA-required fields
- [ ] QR code renders correctly (verified with ZATCA QR reader)
- [ ] Hash chaining verified (manual + automated)
- [ ] XML output validates against ZATCA UBL 2.1 schema
- [ ] Credit notes supported
- [ ] TDD tests pass (hash, QR, XML, JSON, counter, credit note)

### 9.3 Receipt PDF
- [ ] PDF renders correctly in Arabic + English
- [ ] QR code embedded
- [ ] Tenant branding applied (logo, primary color)
- [ ] Download endpoint authenticated

### 9.4 ZATCA Phase 2 (Integration)
- [ ] CSID generated and stored securely
- [ ] B2C invoices reported to ZATCA within 24 hours
- [ ] B2B invoices cleared in real-time
- [ ] Failed clearances retry automatically
- [ ] Sandbox validation passes
- [ ] Production validation passes (with test invoice)

---

## 10. Cross-references

### 10.1 Internal docs
- `docs/SAUDI_COMPLIANCE_CHECKLIST.md` §3 — ZATCA compliance status
- `docs/PRIVACY_POLICY.md` §2.2 — customer data (relevant to invoice buyer info)
- `docs/TERMS_OF_SERVICE.md` §4.4 — refund policy (credit notes)
- `docs/INCIDENT_RESPONSE.md` §5 — security breach (invoice tampering)
- `docs/DEPLOYMENT_RUNBOOK.md` §1.3 — ZATCA secrets in inventory
- TASK-0034 sub-item 8 — PDPL data export (must include invoices)
- TASK-0035 sub-item 6 — VAT helpers (`priceIncVat` / `formatVatLine`)

### 10.2 External references (knowledge cutoff Jan 2026)
- ZATCA E-Invoicing Portal: https://zatca.gov.sa/en/E-Invoicing
- ZATCA Developer Portal: https://sandbox.zatca.gov.sa/Developers
- ZATCA FATOORAH spec (UBL 2.1 + ZATCA custom JSON): see ZATCA docs
- W3C UBL 2.1: http://docs.oasis-open.org/ubl/os-UBL-2.1.html
- TLV encoding standard: ISO 18004 (QR codes)

---

## 11. Next Steps

### 11.1 Immediate (next session)

1. **Owner approves** this roadmap
2. **Register TASK-0036** in `docs/ops/TASK_TRACKER.md`
3. **Start Phase 6.2.1** (per-tenant VAT config — 4.5 days)

### 11.2 Within 2 weeks

- Per-tenant VAT config done
- ZATCA sandbox account requested (if not already)
- ZATCA Phase 1 design finalized

### 11.3 Within 4 weeks

- ZATCA Phase 1 done
- Receipt PDF done
- Demo: full invoice generation flow visible to merchant

### 11.4 Within 6 weeks

- All phases done
- Live integration with ZATCA production
- Merchant can issue compliant invoices

---

**Document version:** 1.0
**Next review:** When owner approves roadmap
**Owner action:** Approve roadmap + register TASK-0036 + schedule Phase 6.2.1
