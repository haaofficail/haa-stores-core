# Trademark Filing Prep — TASK-0038 G5

> **Engineering-side preparation for the SAIP trademark filing.**
> Owner can use this as a checklist + starting point.

## Brand Marks to File

### 1. Haa Logo (combined word + image mark)

- **Type:** Combined mark (wordmark + figure)
- **Brand name:** هاء (Haa)
- **Latin transliteration:** Haa
- **Tagline (optional):** متاجر (Mataajer) — "stores"
- **Goods/services class:** Class 35 (Advertising; business management; business administration; office functions; online retail)
- **Owner:** Haa Stores (legal entity name TBD after G1 Commercial Registration)

### 2. "سوق هاء" Word Mark

- **Type:** Word mark only
- **Brand name:** سوق هاء (Haa Marketplace)
- **Goods/services class:** Class 35 (online marketplace services)

### 3. "Haa Stores" Latin Word Mark

- **Type:** Word mark (Latin script)
- **Brand name:** Haa Stores
- **Goods/services class:** Class 35 + Class 9 (computer software for e-commerce)

## Logo Files Required for Filing

The owner needs the following files in `apps/storefront/public/assets/branding/`:

```
haa-logo-primary.svg       # main logo (combined mark)
haa-logo-monochrome.svg    # B&W version
haa-logo-mono-dark.svg     # white-on-dark version
haa-wordmark-ar.svg        # Arabic wordmark only
haa-wordmark-en.svg        # English wordmark only
```

Engineering will generate these from the current `assets/haa-logo.png` source. The SVG versions are required by SAIP for vector reproduction.

## Filing Process Outline (Owner Action)

1. **Pre-filing search** (1-2 weeks)
   - Search SAIP database for similar marks
   - Search class 35 (online retail) for prior "Haa" or similar marks
   - Document any conflicting marks

2. **Prepare application** (1-2 weeks)
   - Get the legal entity name from G1 (Commercial Registration)
   - Use the brand assets above
   - Fill SAIP form for each mark

3. **File application** (online via SAIP portal)
   - Fee: SAR 1,000 per class per mark
   - Total estimated: SAR 3,000-6,000 for 3 marks × 1-2 classes

4. **Examination** (3-6 months)
   - SAIP examiner reviews for similarity + descriptiveness
   - Respond to any objections within 30 days

5. **Publication** (2 months)
   - Published in the Official Gazette
   - 60-day opposition window for third parties

6. **Registration** (1-2 months)
   - Certificate issued
   - Valid for 10 years (renewable)

**Total time: 6-12 months from filing to registration.**

## Engineering Deliverables (this session)

- [x] `docs/ops/TRADEMARK_FILING_MATERIALS.md` — this file
- [ ] (deferred) Generate proper SVG logo variants
- [ ] (deferred) Trademark search script for similar marks (optional)

## References

- SAIP: https://saip.gov.sa/
- Trademark fees: https://saip.gov.sa/en/services/67/
- Nice Classification: https://www.wipo.int/classifications/nice/en/
