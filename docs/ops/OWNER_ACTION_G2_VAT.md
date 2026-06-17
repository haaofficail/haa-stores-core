# G2 — VAT Registration (ZATCA) Checklist

> **Owner action required.** G2 of TASK-0038. **Depends on G1 (CR)**.

## What is VAT in KSA?

**ضريبة القيمة المضافة** (Value Added Tax, VAT) is 15% in Saudi Arabia, administered by **ZATCA** (Zakat, Tax and Customs Authority). Mandatory for any business with annual revenue >SAR 375,000.

## Prerequisites

- [ ] **G1 CR received** (السجل التجاري)
- [ ] **Bank account** opened under the CR
- [ ] **National Address** registered with SPL
- [ ] **Maroof account** (معروف) — ZATCA's online portal

## Application process (3-5 days)

### Step 1: Create Maroof account (1 day)

1. Go to https://maroof.sa/ (ZATCA portal)
2. Register with your CR number + national ID
3. Verify email + phone

### Step 2: Submit VAT registration (1-3 days processing)

1. Log in to Maroof
2. Navigate to "VAT Registration" (تسجيل ضريبة القيمة المضافة)
3. Fill in:
   - CR number
   - Business activities (ISIC codes)
   - Expected annual revenue (estimate)
   - Bank account details
4. Upload: CR copy + bank certificate + ID copy
5. Submit

### Step 3: Receive VAT certificate (1-3 days)

- ZATCA issues VAT number (15-digit: 3xxxxxxxxxxxxxxx)
- Update Haa platform: `tenants.vat_number` + `tenants.vat_rate`
- Begin charging 15% VAT on all invoices
- File VAT returns quarterly (within 30 days of quarter end)

## Cost

- Registration: **Free**
- Quarterly filing: Free (DIY via Maroof) or SAR 500-2,000/accountant

## Timeline: 3-5 days

## Engineering integration (30 min)

After receiving VAT number:
- Add `vatNumber` to `tenants` table (varchar 15)
- Update invoice generation to include VAT line
- Update checkout VAT calculation (per TASK-0035)
- ZATCA e-invoicing (FATOORAH) — separate TASK-0036

## References

- ZATCA: https://zatca.gov.sa/
- Maroof: https://maroof.sa/
- VAT regulation: https://zatca.gov.sa/en/pages/VATOverview

---

**Last Updated:** 2026-06-17 (TASK-0038 G2 brief)
**Owner Action:** Apply at Maroof after G1
**Engineering Effort:** 30 min schema + invoice updates
