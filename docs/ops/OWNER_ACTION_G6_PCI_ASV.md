# G6 — PCI-DSS ASV Scan Checklist

> **Owner action required.** G6 of TASK-0038. **Depends on G1 (CR)**.

## What is PCI-DSS ASV?

**PCI-DSS** (Payment Card Industry Data Security Standard) is the global standard for protecting cardholder data. **ASV** (Approved Scanning Vendor) is the quarterly external vulnerability scan required by PCI-DSS.

For Haa: applicable if we store, process, or transmit cardholder data. Even if we use a payment gateway (Moyasar/Geidea/Tabby/Tamara), **PCI scope exists** because the page that collects card data is technically under our control.

## Prerequisites

- [ ] **G1 CR received**
- [ ] **G2 VAT cert** (some ASVs require it)
- [ ] **Production HTTPS** deployed with valid certificate
- [ ] **WAF** (Web Application Firewall) — optional but recommended
- [ ] **No cardholder data stored** in Haa DB (use gateway tokenization)

## Engagement process (1-2 weeks setup + quarterly scans)

### Step 1: Select an ASV

PCI SSC maintains a list of approved ASVs:
https://www.pcisecuritystandards.org/assessors_and_solutions/approved_scanning_vendors

**Popular options for KSA/MENA:**
- **Trustwave** (global, has KSA presence)
- **Qualys** (cloud-based, popular)
- **SecurityMetrics** (PCI-focused)
- **Coalfire** (US-based, enterprise-grade)

### Step 2: Get quotes

- Cost: USD 200-500/quarter (SAR 750-1,875/quarter)
- Annual contract: USD 800-2,000/year (save 20%)
- Setup fee: typically waived

### Step 3: Scope the scan

**Scan targets:**
- `haastores.sa` (production)
- `*.haastores.sa` (subdomains — admin, api, storefront)
- Staging environment (optional)

**Exclusions:**
- Third-party payment gateway domains (Moyasar, etc.) — they have their own PCI
- Internal admin VPN

### Step 4: Run initial scan (1-2 days)

- ASV performs external vulnerability scan
- Results: pass / fail per vulnerability
- Critical findings must be fixed within 30 days

### Step 5: Fix + re-scan (if needed)

If scan fails:
- Fix all Critical/High vulnerabilities
- Re-run scan (typically free)
- Pass = compliance for that quarter

### Step 6: Quarterly scans (ongoing)

- ASV scans your environment every 90 days
- Maintain passing status
- Keep certificates for 1 year (audit evidence)

## Cost

- **Quarterly scan:** USD 200-500 (~SAR 750-1,875)
- **Annual contract:** USD 800-2,000 (~SAR 3,000-7,500)
- **Fix labor:** varies based on findings (typically 1-5 days engineering/year)

## Timeline

- Vendor selection + contract: 1 week
- First scan: 1-2 days
- First fix (if needed): 1-2 weeks
- Ongoing: quarterly scans

## Engineering integration (1-2 hours)

- Add ASV scan certificate to security docs (`docs/security/`)
- Configure automated scan trigger (quarterly cron)
- Document remediation procedures
- Add WAF rules if needed

## References

- PCI SSC ASV list: https://www.pcisecuritystandards.org/assessors_and_solutions/approved_scanning_vendors
- PCI-DSS v4.0: https://www.pcisecuritystandards.org/document_library

---

**Last Updated:** 2026-06-17 (TASK-0038 G6 brief)
**Owner Action:** Engage ASV after G1+G2
**Engineering Effort:** 1-2 hours setup + quarterly remediation
