# SFDA Disclaimer — هاء متاجر (Haa Stores)

> **TASK-0042 Phase 3 — P0-6 SFDA-specific disclaimers.**
> Engineering draft; subject to Data Protection Officer (DPO) and
> legal review before publication.
>
> **Cross-references:**
> - `docs/PRIVACY_POLICY.md §2.4` — marketplace data flows
> - `docs/TERMS_OF_SERVICE.md §8.5.5` — merchant verification scope
> - `docs/ops/MARKETPLACE_HARDENING_PLAN.md` §4 Phase 2.2 — SFDA workflow

---

## 1. What is SFDA?

SFDA (الهيئة العامة للغذاء والدواء — Saudi Food and Drug Authority) is the Saudi government agency that regulates:

| Category | Examples |
|----------|----------|
| Food products | Packaged food, beverages, supplements |
| Drugs | Prescription, OTC medications |
| Medical devices | Equipment, diagnostics, implants |
| Cosmetics | Skincare, makeup, personal care |
| Health supplements | Vitamins, herbal products |

SFDA registration is **mandatory** for any of the above categories sold in Saudi Arabia.

---

## 2. Haa's Role (Limited)

Haa Stores is the **platform operator**, not a regulatory authority. Specifically:

### 2.1 What Haa does
- **Format validation:** Haa validates that the SFDA registration number matches the format `[A-Z0-9-]{5,50}` (regex check only).
- **Category tagging:** Haa tags product categories with `requires_sfda: true` for regulated categories (food, drug, medical_device, cosmetic, supplement).
- **Merchant-side gate:** When a merchant publishes a product in an SFDA-required category, Haa requires them to provide a valid `sfda_number` (format-validated).
- **Admin review:** Haa's admin team reviews the SFDA number **visually** during product approval (`haaMarketplaceReviewStatus='approved'`). The admin confirms the format matches the merchant's KYC package.
- **Display:** Approved SFDA numbers are displayed on product pages for customer transparency.

### 2.2 What Haa does NOT do
- ❌ **Live SFDA API integration.** Haa does not verify SFDA numbers against SFDA's official database. This is documented as a known limitation; live API integration requires Saudi CR + government credentials and is deferred to Phase 7+ (post-MVP).
- ❌ **Verify product compliance.** Haa does not verify that the product itself complies with SFDA regulations (labeling, ingredients, manufacturing, etc.).
- ❌ **Validate health claims.** Haa does not review health claims, ingredient lists, or warnings on product pages.
- ❌ **Check expiry dates.** SFDA expiry dates are stored but not enforced; admin gets a weekly digest (future task).
- ❌ **Detect counterfeit goods.** Haa relies on admin review + merchant KYC + customer reports.

---

## 3. Merchant Responsibility

By listing a regulated product on Haa, the merchant confirms and accepts that:

1. **The merchant is the seller of record** under Saudi law, not Haa. The merchant is solely responsible for SFDA compliance.
2. **The SFDA registration number provided is genuine** and matches the merchant's SFDA certificate. Providing a false or borrowed SFDA number is a violation of Saudi law (Anti-Fraud statute, MoCI).
3. **The product complies with all SFDA regulations**, including but not limited to:
   - Labeling requirements (Arabic mandatory)
   - Ingredient disclosure
   - Manufacturing standards
   - Health claims and warnings
   - Expiry date display
   - Storage and handling
4. **The merchant holds a valid SFDA certificate** at the time of listing and for the duration the product is listed.
5. **The merchant will renew or remove the listing** if the SFDA certificate expires or is revoked.

---

## 4. Customer Responsibility

Before purchasing a regulated product on Haa, the customer is responsible for:

1. **Independently verifying the SFDA registration** through SFDA's official channels if they have concerns.
2. **Reading the product label** (especially for allergens, expiry, warnings).
3. **Consulting a healthcare professional** before using drugs, medical devices, or supplements.
4. **Reporting suspicious products** to Haa via the customer support channel.

---

## 5. Reporting Violations

If you (customer or merchant) suspect a product violates SFDA regulations:

- **Customer-side report:** Use the "report product" link on the product page → routes to Haa admin moderation queue.
- **Merchant-side report:** Email `compliance@haastores.sa` with product details.
- **Direct SFDA report:** Saudi Food & Drug Authority contact: `https://www.sfda.gov.sa/` or call `920000800`.

Haa will investigate all reports within **5 business days** and take action (suspend listing, escalate to SFDA, contact merchant).

---

## 6. Haa's Liability

To the maximum extent permitted by Saudi law:

- **Haa is not liable** for products sold by merchants that violate SFDA regulations, even if the product was approved by Haa's admin team.
- **Haa is not liable** for damages caused by SFDA-non-compliant products (health damage, allergic reactions, etc.).
- **Haa's liability for SFDA workflow errors** (wrong approval, missing SFDA check) is **capped at the platform fee** charged for the affected transaction.

This limitation does not apply to:
- Gross negligence or willful misconduct by Haa.
- PDPL violations (may incur higher penalties).
- Liability that cannot be excluded under Saudi law.

---

## 7. Compliance Roadmap

Haa's commitment to SFDA compliance is incremental:

| Phase | Status | What it adds |
|-------|--------|--------------|
| Phase 2 (current) | ✅ Shipped (TASK-0041 Track 2.2) | Format validation + category tagging + merchant gate + admin visual review |
| Phase 7+ (future) | ⏳ Planned | Live SFDA API integration (requires Saudi CR + government credentials) |
| Phase 7+ (future) | ⏳ Planned | Expiry date enforcement + weekly digest |
| Phase 7+ (future) | ⏳ Planned | Ingredient + label scan via OCR |

---

## 8. Contact

For SFDA-related questions:

- **Haa compliance team:** `compliance@haastores.sa`
- **Haa DPO (when appointed):** `dpo@haastores.sa` (per PDPL Article 22)
- **Saudi Food & Drug Authority:** `https://www.sfda.gov.sa/`
- **SFDA hotline:** `920000800`

---

**Last Updated:** 2026-06-17 (TASK-0042 Phase 3 engineering draft)
**Owner Action Required:** DPO + legal review before publication.
**Plan Reference:** `docs/ops/MARKETPLACE_HARDENING_PLAN.md §4 Phase 2.2`
**Code Reference:** `packages/db/src/schema/products.ts` (sfda_* columns), `apps/api/src/routes/admin/marketplace.ts` (admin verification on review)
