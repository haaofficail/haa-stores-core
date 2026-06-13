# Logo Sources

> Generated: 2026-06-09
> Purpose: Document sources for all payment and trust logo assets used in PaymentTrustSection.
> Policy: Only official or highly-trusted sources accepted. No hand-drawn approximations.

---

## Payment Logos

### mada

| Field | Value |
|-------|-------|
| **File** | `public/assets/payment-logos/mada.svg` |
| **Source URL** | `https://commons.wikimedia.org/wiki/File:Mada_Logo.svg` |
| **Source Type** | Official (Wikimedia Commons, sourced from SAIB Bank) |
| **Format** | SVG |
| **Download Date** | 2026-06-09 |
| **Usage Notes** | mada brand managed by Saudi Payments (SAMA). Standard payment method indicator usage. |
| **Requires Authorization** | No |
| **Enabled in UI** | Yes |

### Visa

| Field | Value |
|-------|-------|
| **File** | `public/assets/payment-logos/visa.svg` |
| **Source URL** | `https://commons.wikimedia.org/wiki/File:Visa_Inc._logo_(2021%E2%80%93present).svg` |
| **Source Type** | Official (Wikimedia Commons, traced from visa.com) |
| **Format** | SVG |
| **Download Date** | 2026-06-09 |
| **Usage Notes** | 2021-present Visa logo. Standard payment network indicator usage. |
| **Requires Authorization** | No |
| **Enabled in UI** | Yes |

### Mastercard

| Field | Value |
|-------|-------|
| **File** | `public/assets/payment-logos/mastercard.svg` |
| **Source URL** | `https://commons.wikimedia.org/wiki/File:Mastercard-logo.svg` |
| **Source Type** | Official (Wikimedia Commons, matches Mastercard Brand Center) |
| **Format** | SVG |
| **Download Date** | 2026-06-09 |
| **Usage Notes** | Standard payment network indicator usage. |
| **Requires Authorization** | No |
| **Enabled in UI** | Yes |

### Apple Pay

| Field | Value |
|-------|-------|
| **File** | `public/assets/payment-logos/apple-pay.svg` |
| **Source URL** | `https://commons.wikimedia.org/wiki/File:Apple_Pay_logo.svg` |
| **Source Type** | Official (Wikimedia Commons, matches Apple Developer marketing guidelines) |
| **Format** | SVG |
| **Download Date** | 2026-06-09 |
| **Usage Notes** | Apple Developer marketing guidelines provide the official mark. |
| **Requires Authorization** | No |
| **Enabled in UI** | Yes |

### STC Pay

| Field | Value |
|-------|-------|
| **File** | `public/assets/payment-logos/stc-pay.svg` |
| **Source URL** | `https://commons.wikimedia.org/wiki/File:Stc_pay.svg` |
| **Source Type** | Official (Wikimedia Commons, sourced from stcpay.com.sa press release) |
| **Format** | SVG |
| **Download Date** | 2026-06-09 |
| **Usage Notes** | Sourced directly from official STC Pay website press release. |
| **Requires Authorization** | No |
| **Enabled in UI** | Yes |

### Tabby

| Field | Value |
|-------|-------|
| **File** | `public/assets/payment-logos/tabby.svg` |
| **Source URL** | `https://raw.githubusercontent.com/activemerchant/payment_icons/refs/heads/master/app/assets/images/payment_icons/tabby.svg` |
| **Source Type** | Trusted fallback (activemerchant/payment_icons GitHub repo — industry-standard payment icon set) |
| **Format** | SVG |
| **Download Date** | 2026-06-09 |
| **Usage Notes** | Tabby provides official brand assets via docs.tabby.ai/marketing/brand-assets. The activemerchant version is identical to the official badge. |
| **Requires Authorization** | No |
| **Enabled in UI** | Yes |

### Tamara

| Field | Value |
|-------|-------|
| **File** | `public/assets/payment-logos/tamara.svg` |
| **Source URL** | `https://raw.githubusercontent.com/activemerchant/payment_icons/refs/heads/master/app/assets/images/payment_icons/tamara.svg` |
| **Source Type** | Trusted fallback (activemerchant/payment_icons GitHub repo) |
| **Format** | SVG |
| **Download Date** | 2026-06-09 |
| **Usage Notes** | Tamara's official website does not provide direct logo downloads. The activemerchant repo is a well-maintained industry-standard payment icon library used by thousands of merchants. |
| **Requires Authorization** | No |
| **Enabled in UI** | Yes |

---

## Government / Trust Badges

### Maroof / معروف

| Field | Value |
|-------|-------|
| **File** | `public/assets/trust-logos/maroof.png` |
| **Source URL** | `https://apps.apple.com/sa/app/%D9%85%D8%B9%D8%B1%D9%88%D9%81/id1149338980` |
| **Source Type** | Official (Apple App Store — official app icon from Thiqah Business Services Co.) |
| **Format** | PNG (400×400, extracted from Apple CDN) |
| **Download Date** | 2026-06-09 |
| **Usage Notes** | Maroof is a Ministry of Commerce initiative. The official badge/logo is provided to registered merchants via the merchant dashboard. The app icon represents the official brand mark. SVG not publicly available; PNG sourced from Apple's official App Store CDN. |
| **Requires Authorization** | Yes — merchants must register on maroof.sa to receive authorization |
| **Enabled in UI** | Yes (configurable per-store via admin panel) |

### Saudi Business Center / المركز السعودي للأعمال

| Field | Value |
|-------|-------|
| **File** | `public/assets/trust-logos/saudi-business-center.svg` |
| **Source URL** | `https://cdn.saudibusiness.gov.sa/v2/dist//images/headerIcons/Logo.svg` |
| **Source Type** | Official (directly from Saudi Business Center's official CDN — business.sa) |
| **Format** | SVG |
| **Download Date** | 2026-06-09 |
| **Usage Notes** | Sourced directly from the official Saudi Business Center portal CDN. The SVG contains the full logo with both Arabic and English text. |
| **Requires Authorization** | Yes — usage of the Saudi Business Center logo should follow their brand guidelines |
| **Enabled in UI** | Yes (configurable per-store via admin panel) |

### Saudi Made / صنع في السعودية

| Field | Value |
|-------|-------|
| **File** | `public/assets/trust-logos/saudi-made.svg` |
| **Source URL** | `https://commons.wikimedia.org/wiki/File:SAUDI_MADE.svg` (original: `https://api.saudimade.sa/uploads/logo_english_8beed26c44.svg`) |
| **Source Type** | Official (Wikimedia Commons, sourced from saudimade.sa official API) |
| **Format** | SVG |
| **Download Date** | 2026-06-09 |
| **Usage Notes** | The Saudi Made program (by Saudi Export Development Authority) provides the logo for use by registered member companies. The SVG was sourced from the official program API. |
| **Requires Authorization** | Yes — only registered members of the Saudi Made program may use the logo |
| **Enabled in UI** | Yes (configurable per-store via admin panel) |

---

## File Inventory

```
public/assets/payment-logos/
├── mada.svg         (3,553 B)
├── visa.svg         (852 B)
├── mastercard.svg   (4,053 B)
├── apple-pay.svg    (1,609 B)
├── stc-pay.svg      (4,959 B)
├── tabby.svg        (1,965 B)
└── tamara.svg       (651 B)

public/assets/trust-logos/
├── maroof.png                    (50,499 B)
├── saudi-business-center.svg     (51,408 B)
└── saudi-made.svg                (4,598 B)
```

---

## Classification Reference

| Logo | Classification |
|------|---------------|
| mada | `LOCAL_PAYMENT_METHOD` |
| Visa | `CARD_NETWORK` |
| Mastercard | `CARD_NETWORK` |
| Apple Pay | `DIGITAL_WALLET` |
| STC Pay | `DIGITAL_WALLET` / `LOCAL_PAYMENT_METHOD` |
| Tabby | `BNPL_PROVIDER` |
| Tamara | `BNPL_PROVIDER` |
| Maroof | `GOVERNMENT_TRUST` |
| Saudi Business Center | `GOVERNMENT_TRUST` |
| Saudi Made | `GOVERNMENT_TRUST` |

---

## Compliance Notes

- Government/trust badges are **enabled in the global registry** but **individually configurable per-store** via the admin panel.
- Store merchants must confirm they are authorized before enabling each trust badge.
- No CSS-drawn logos or fake security seals are used.
- All visible logos are real SVG/PNG assets from official or trusted sources.
- STC Pay is correctly classified as `DIGITAL_WALLET` — not BNPL.
