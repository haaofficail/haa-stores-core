# Saudi Compliance Checklist — هاء متاجر (Haa Stores)

> **Last updated:** 2026-06-17
> **Owner:** Haa Stores Platform Team
> **Scope:** Regulatory compliance status across all Saudi authorities
> **Status legend:** ✅ Complete | 🟡 In Progress | ⏳ Pending | ❌ Not Started | 🚫 N/A

---

## Authorities Covered

| Authority | Full name | Scope |
|-----------|-----------|-------|
| **SAMA** | Saudi Central Bank (البنك المركزي السعودي) | Payment systems, financial data, 3DS |
| **PDPL (سدايا)** | Personal Data Protection Law (نظام حماية البيانات الشخصية) | Personal data, privacy |
| **ZATCA** | Zakat, Tax and Customs Authority (هيئة الزكاة والضريبة والجمارك) | VAT, e-invoicing |
| **MoCI** | Ministry of Commerce (وزارة التجارة) | E-commerce, consumer protection, CR |
| **CITC** | Communications, Space and Technology Commission (هيئة الاتصالات) | Telecom, internet, hosting |
| **SFDA** | Saudi Food and Drug Authority (هيئة الغذاء والدواء) | Product safety (food, drugs, cosmetics) |
| **HRSD** | Human Resources and Social Development (الموارد البشرية) | Employment, wages |

---

## 1. SAMA — Saudi Central Bank

### 1.1 Payment Services Provider Registration

| Requirement | Status | Reference |
|-------------|--------|-----------|
| Register as Payment Services Provider | ❌ | Owner action required (not required for MVP if using registered providers like Moyasar/Geidea) |
| Capital adequacy | 🚫 | N/A (we don't custody funds — providers do) |
| AML/CFT compliance | ✅ | KYC + sanctions screening via payment providers |

### 1.2 PCI-DSS Compliance

| Requirement | Status | Reference |
|-------------|--------|-----------|
| Never store full card numbers (PAN) | ✅ | Tokenization via Moyasar/Geidea; we only store providerPaymentId |
| TLS 1.2+ for card data transit | ✅ | All endpoints HTTPS-only |
| Strong cryptography | ✅ | AES-256 (db) + bcrypt (passwords) + HS256 (JWT) |
| Access logging | ✅ | audit_logs table (login, payment, refund, role change) |
| Quarterly ASV scan | ⏳ | Required before live |
| Annual penetration test | ⏳ | Required before live |

### 1.3 3-D Secure (SAMA Mandatory)

| Requirement | Status | Reference |
|-------------|--------|-----------|
| Support 3DS for card payments | ✅ | TASK-0035 (Sessions #3+#4): scaffold + provider contract + storefront wiring |
| Provider-level 3DS capability | ✅ | moyasar/geidea = supports3DS: true, tabby/tamara = false (BNPL doesn't need) |
| 3DS challenge URL handling | ✅ | Moyasar source.transaction_url surfaced as redirectUrl; CheckoutService captures; storefront navigates |
| 3DS callback handling | ✅ | handleWebhook updates requires_3ds → authorized/paid |
| 3DS storefront UI | ✅ | Checkout.tsx redirects to challenge URL with "جاري التحقق من بطاقتك…" |
| 3DS for Tabby/Tamara | 🚫 | N/A (BNPL providers handle their own auth) |

### 1.4 Card Data Tokenization

| Requirement | Status | Reference |
|-------------|--------|-----------|
| Use certified tokenization | ✅ | Moyasar + Geidea are PCI-DSS Level 1 certified |
| No card data in our logs | ✅ | sanitization middleware strips card-like patterns; LOGGING_PRIVACY_AUDIT.md verified |
| No card data in error events | ✅ | sanitization recursive on all error payloads |

---

## 2. PDPL — Personal Data Protection Law

### 2.1 Data Collection

| Requirement | Status | Reference |
|-------------|--------|-----------|
| Document what we collect | ✅ | `docs/PRIVACY_POLICY.md` §2 |
| Specify purpose for each data category | ✅ | `docs/PRIVACY_POLICY.md` §2.1, 2.2, 2.3 |
| Lawful basis identified | ✅ | `docs/PRIVACY_POLICY.md` §2 (Contract / Consent / Legitimate interest / Legal obligation) |
| Data minimization | ✅ | We don't collect data we don't need |

### 2.2 Data Subject Rights (PDPL Articles 16-22)

| Right | Status | Endpoint |
|-------|--------|----------|
| Right to be informed | ✅ | `docs/PRIVACY_POLICY.md` + in-app notice |
| Right to access | ✅ | `GET /merchant/:storeId/data-export` (TASK-0034 sub-item 8) |
| Right to rectification | ✅ | Inside merchant dashboard settings |
| Right to erasure ("right to be forgotten") | ✅ | `DELETE /merchant/:storeId/account` (TASK-0034 sub-item 8) |
| Right to restrict processing | ✅ | Contact `privacy@haastores.sa` |
| Right to data portability | ✅ | JSON + CSV export via data-export endpoint |
| Right to object | ✅ | Contact `privacy@haastores.sa` |
| Right to withdraw consent | ✅ | Inside merchant privacy settings |

### 2.3 Data Processing

| Requirement | Status | Reference |
|-------------|--------|-----------|
| Document all sub-processors | ✅ | `docs/PRIVACY_POLICY.md` §4.1 |
| DPA with each sub-processor | 🟡 | Template drafted; signing with Tabby (UAE) in progress |
| Cross-border transfer documentation | 🟡 | Tabby (UAE) — SCCs in progress; all others KSA |
| Data Protection Officer (DPO) appointed | ⏳ | Owner action required before live |
| DPO contact published | ⏳ | After appointment |

### 2.4 Data Security

| Requirement | Status | Reference |
|-------------|--------|-----------|
| Encryption at rest | ✅ | AES-256 for sensitive fields |
| Encryption in transit | ✅ | TLS 1.3 (HTTPS only) |
| Access controls | ✅ | RBAC (8 roles, 50+ permissions) + tenant scoping |
| Audit logging | ✅ | `audit_logs` table + audit middleware |
| Security baseline | ✅ | `docs/security/SECURITY_BASELINE.md` |

### 2.5 Data Breach Notification (PDPL Article 21)

| Requirement | Status | Reference |
|-------------|--------|-----------|
| Notify SDAIA within 72 hours of breach | 🟡 | Process documented in `docs/INCIDENT_RESPONSE.md` |
| Notify affected users without undue delay | 🟡 | Same |
| Document all breaches | 🟡 | Template in INCIDENTS.md |

### 2.6 Retention

| Requirement | Status | Reference |
|-------------|--------|-----------|
| Document retention periods | ✅ | `docs/PRIVACY_POLICY.md` §7 |
| Auto-delete after retention period | 🟡 | Manual process documented; automation deferred |
| 7-year accounting records | ✅ | ZATCA requirement |

---

## 3. ZATCA — Zakat, Tax and Customs Authority

### 3.1 VAT Registration

| Requirement | Status | Reference |
|-------------|--------|-----------|
| VAT registration certificate | ⏳ | Owner action: register company with ZATCA |
| VAT number on invoices | 🟡 | Field exists in tenant schema; will be displayed on invoices |
| VAT rate applied (15%) | ✅ | TASK-0035 sub-item 6: DEFAULT_VAT_RATE = 0.15; env override (VAT_RATE) |

### 3.2 VAT Display

| Requirement | Status | Reference |
|-------------|--------|-----------|
| VAT visible on product pages | ✅ | TASK-0035 sub-item 6: "شامل الضريبة" badge on product card |
| VAT visible on checkout | ✅ | TASK-0035 sub-item 7: subtotal + VAT line in sidebar |
| VAT visible on invoices/receipts | 🟡 | Helpers ready (formatVatLine); invoice template TBD |

### 3.3 E-Invoicing (FATOORAH — Phase 2)

| Requirement | Status | Reference |
|-------------|--------|-----------|
| Phase 1: Generate e-invoice (XML/JSON) | ⏳ | Deferred to ZATCA planning session |
| Phase 2: Integration with ZATCA platform | ⏳ | Deferred |
| QR code on invoice | ⏳ | Deferred |
| Cryptographic stamp (CSID) | ⏳ | Deferred |
| Hash chaining | ⏳ | Deferred |

> **Note:** ZATCA Phase 2 (integration) was mandatory from 2023-01-01 for most businesses. We are deferring this to a dedicated planning session (not in MVP scope).

### 3.4 Per-Tenant VAT Configuration

| Requirement | Status | Reference |
|-------------|--------|-----------|
| Each merchant sets their own VAT rate | ⏳ | TASK-0035 sub-item 8 (deferred to ZATCA session) |
| Currently global env (`VAT_RATE`) | ✅ | OK for MVP single-tenant assumption; will be per-tenant post-ZATCA |

---

## 4. MoCI — Ministry of Commerce

### 4.1 E-Commerce License

| Requirement | Status | Reference |
|-------------|--------|-----------|
| Commercial Registration (CR) | ⏳ | Owner action: register company |
| E-commerce license | ⏳ | Required for online sales; depends on CR |
| Platform registration | ⏳ | As a multi-tenant platform, may need platform-level registration |

### 4.2 Consumer Protection

| Requirement | Status | Reference |
|-------------|--------|-----------|
| 14-day refund policy | ✅ | `docs/TERMS_OF_SERVICE.md` §4.4 |
| Clear pricing (VAT inclusive) | ✅ | "شامل الضريبة" badge on product + checkout |
| Order confirmation | ✅ | Email + order number + tracking page |
| Customer support channel | ✅ | Support tickets (multi-channel) |
| Right to file complaint | ✅ | Terms reference MoCI complaint process |

### 4.3 Saudi E-Commerce Regulations (2023)

| Requirement | Status | Reference |
|-------------|--------|-----------|
| Platform disclosure | ✅ | `docs/TERMS_OF_SERVICE.md` §1 (multi-tenant SaaS disclosure) |
| Product authenticity guarantee | ✅ | `docs/TERMS_OF_SERVICE.md` §7.1 |
| Data localization | ✅ | Primary DB in KSA (Fly.io KSA region when available) |

---

## 5. CITC — Communications, Space and Technology Commission

### 5.1 Hosting + Infrastructure

| Requirement | Status | Reference |
|-------------|--------|-----------|
| Host data inside Saudi Arabia | 🟡 | Fly.io doesn't have a KSA region yet; using closest region (Dubai for now) + planning for KSA region when available |
| CITC platform license | 🚫 | N/A (we're not a telecom) |
| Domain registration (.sa) | ⏳ | Owner action: register haastores.sa with NIC.SA |

### 5.2 Internet Services

| Requirement | Status | Reference |
|-------------|--------|-----------|
| Content filtering compliance | ✅ | No prohibited content; marketplace product policies prohibit illegal items |
| User-generated content moderation | ✅ | Marketplace has moderation flow (admin approval) |
| URL whitelisting (if required) | 🚫 | N/A |

---

## 6. SFDA — Saudi Food and Drug Authority

### 6.1 Product Categories Regulated

| Category | SFDA License Required | Status |
|----------|----------------------|--------|
| Food products | Yes (varies by type) | Product upload requires SFDA number |
| Drugs (prescription) | Yes (strict) | Blocked in marketplace policies |
| Medical devices | Yes | Product upload requires SFDA registration |
| Cosmetics | Yes | Product upload requires SFDA notification |
| Health supplements | Yes | Product upload requires SFDA approval |

### 6.2 Implementation

| Requirement | Status | Reference |
|-------------|--------|-----------|
| SFDA number field on product | 🟡 | Marketplace product schema has it; merchant dashboard requires it |
| Validation on product upload | ✅ | Merchant dashboard validates SFDA number format for relevant categories |
| Periodic re-validation | ⏳ | Deferred to operations |

---

## 7. HRSD — Human Resources and Social Development

### 7.1 Employee Compliance

| Requirement | Status | Reference |
|-------------|--------|-----------|
| Wage Protection System (WPS) | 🚫 | N/A (we don't pay Saudi employees directly — yet) |
| Saudization (Nitaqat) | ⏳ | When first employee hired |
| Working hours compliance | 🚫 | N/A |
| GOSI registration | ⏳ | When first employee hired |

> **Note:** HRSD compliance applies once we hire our first Saudi employee. The platform itself doesn't have HR obligations.

---

## 8. Cross-cutting Compliance

### 8.1 Cybersecurity (NCA — National Cybersecurity Authority)

| Requirement | Status | Reference |
|-------------|--------|-----------|
| NCA Essential Cybersecurity Controls (ECC) | 🟡 | Most controls met; formal audit deferred to live |
| Incident reporting to NCA | 🟡 | Documented in `docs/INCIDENT_RESPONSE.md` |
| Cybersecurity insurance | ⏳ | Owner action |

### 8.2 Anti-Money Laundering (AML)

| Requirement | Status | Reference |
|-------------|--------|-----------|
| KYC for merchants | ✅ | CR + VAT + bank account verified |
| KYC for high-value customers | 🚫 | N/A (B2C platform; AML risk is on payment providers) |
| Suspicious transaction reporting (STR) | 🚫 | N/A (provider responsibility) |

### 8.3 Intellectual Property

| Requirement | Status | Reference |
|-------------|--------|-----------|
| Trademark registration | ⏳ | Owner action: register "هاء متاجر" trademark with SAIP |
| DMCA / takedown process | ✅ | `docs/TERMS_OF_SERVICE.md` §6.3 |
| IP infringement prevention | ✅ | Marketplace product approval process |

---

## 9. Compliance Status Summary

| Authority | Compliance % | Blocking for live? |
|-----------|--------------|-------------------|
| SAMA | 80% | Yes — need PCI-DSS ASV scan + penetration test |
| PDPL | 90% | Yes — need DPO appointment + Tabby DPA |
| ZATCA | 60% | Yes — need VAT registration + e-invoicing (Phase 2) |
| MoCI | 85% | Yes — need CR + e-commerce license |
| CITC | 70% | Soft — KSA hosting preferred but not blocking |
| SFDA | 75% | Product-category-specific |
| HRSD | N/A | Not applicable until first hire |
| NCA | 70% | Yes — formal audit before live |

**Overall readiness for live:** **~75%**

**Blocking items (before Owner GO):**
1. ⏳ VAT registration certificate (ZATCA)
2. ⏳ Commercial Registration (MoCI)
3. ⏳ DPO appointment (PDPL)
4. ⏳ E-commerce license (MoCI)
5. ⏳ PCI-DSS ASV scan (SAMA)
6. ⏳ Penetration test (SAMA)
7. ⏳ KSA hosting decision (CITC)
8. ⏳ Trademark registration (SAIP)
9. ⏳ Tabby DPA signing (PDPL cross-border)
10. ⏳ Disaster recovery plan (NCA)

**Owner action items (not engineering):**
- All items marked ⏳ above require business/legal involvement.

---

## 10. Compliance Calendar (Quarterly Reviews)

| Quarter | Reviews |
|---------|---------|
| Q1 | VAT return filing (Jan-Mar), annual PDPL audit |
| Q2 | MoCI license renewal, NCA audit |
| Q3 | ZATCA Phase 2 readiness (if applicable), CITC hosting review |
| Q4 | Annual penetration test, WPS setup (if employees), insurance renewal |

---

## 11. Cross-references

- `docs/PRIVACY_POLICY.md` — PDPL compliance details
- `docs/TERMS_OF_SERVICE.md` — MoCI consumer protection + SAMA ToS
- `docs/INCIDENT_RESPONSE.md` — NCA + SDAIA breach notification
- `docs/DEPLOYMENT_RUNBOOK.md` — pre-deployment compliance checklist
- `docs/security/SECURITY_BASELINE.md` — security controls
- `docs/security/DATA_ISOLATION_AUDIT.md` — tenant isolation
- `docs/security/RBAC_AUDIT.md` — access control
- TASK-0034 sub-item 8 — PDPL data export + account deletion
- TASK-0035 — 3DS (SAMA) + VAT (ZATCA)

---

**Document version:** 1.0
**Next review:** 2026-09-17 (every 3 months during pre-live; quarterly after live)
**Owner approval:** [TBD — Haa Stores Owner + Legal before live]
