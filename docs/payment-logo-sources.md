# Payment Logo Sources

> Generated: 2026-06-09
> Purpose: Document sources for all payment brand logos used in the storefront.
> Policy: Only official or highly-trusted sources accepted. No hand-drawn approximations.

---

## mada

| Field | Value |
|-------|-------|
| **File** | `public/assets/payment-logos/mada.svg` |
| **Source URL** | `https://commons.wikimedia.org/wiki/File:Mada_Logo.svg` |
| **Source Original** | `https://www.saib.com.sa/sites/default/files/atheer_qa_dl.pdf` (SAIB Bank — Saudi bank partner site) |
| **Source Type** | Official (via bank partner site / Wikimedia Commons) |
| **Format** | SVG |
| **License** | Public domain (simple logo, below threshold of originality) |
| **Legal Review Needed** | No — trademark applies but usage as payment method indicator is standard |
| **Notes** | The SVG was originally extracted from SAIB Bank's Atheer product PDF. The mada brand is managed by Saudi Payments (SAMA). |

---

## Visa

| Field | Value |
|-------|-------|
| **File** | `public/assets/payment-logos/visa.svg` |
| **Source URL** | `https://commons.wikimedia.org/wiki/File:Visa_Inc._logo_(2021%E2%80%93present).svg` |
| **Source Original** | `https://www.visa.com/` (Visa website) |
| **Source Type** | Official brand mark (traced from visa.com / Wikimedia Commons) |
| **Format** | SVG |
| **License** | Public domain (simple logo, below threshold of originality) |
| **Legal Review Needed** | No — trademark applies; standard payment logo usage |
| **Notes** | This is the 2021-present Visa logo. Visa's official brand center at `corporate.visa.com` requires form submission. The Wikimedia version is traced from the official mark on visa.com. |

---

## Mastercard

| Field | Value |
|-------|-------|
| **File** | `public/assets/payment-logos/mastercard.svg` |
| **Source URL** | `https://commons.wikimedia.org/wiki/File:Mastercard-logo.svg` |
| **Source Original** | `https://brand.mastercard.com/content/dam/mccom/brandcenter/assets/mc_brandmark_guidelines_v8,1.pdf` (Mastercard Brand Center) |
| **Source Type** | Official (via Mastercard Brand Center / Wikimedia Commons) |
| **Format** | SVG |
| **License** | Public domain (simple logo, below threshold of originality) |
| **Legal Review Needed** | No — trademark applies; standard payment logo usage |
| **Notes** | Mastercard's official brand center at `mastercard.com/brandcenter` offers direct SVG downloads. The Wikimedia version matches the official brand mark. |

---

## Apple Pay

| Field | Value |
|-------|-------|
| **File** | `public/assets/payment-logos/apple-pay.svg` |
| **Source URL** | `https://commons.wikimedia.org/wiki/File:Apple_Pay_logo.svg` |
| **Source Original** | `https://developer.apple.com/apple-pay/marketing/` (Apple Developer — official) |
| **Source Type** | Official (via Apple Developer marketing guidelines / Wikimedia Commons) |
| **Format** | SVG |
| **License** | Public domain (simple logo, below threshold of originality) |
| **Legal Review Needed** | No — trademark applies; standard payment logo usage |
| **Notes** | Apple's official marketing guidelines at `developer.apple.com/apple-pay/marketing/` provide the Apple Pay mark for download (requires Apple Developer account). The Wikimedia version matches the official mark. |

---

## STC Pay

| Field | Value |
|-------|-------|
| **File** | `public/assets/payment-logos/stc-pay.svg` |
| **Source URL** | `https://commons.wikimedia.org/wiki/File:Stc_pay.svg` |
| **Source Original** | `https://stcpay.com.sa/ar/news-item/signing-an-agreement-with-gasco/` (official STC Pay website) |
| **Source Type** | **OFFICIAL** — sourced directly from stcpay.com.sa |
| **Format** | SVG |
| **License** | Public domain (simple logo, below threshold of originality) |
| **Legal Review Needed** | No — trademark applies; standard payment logo usage |
| **Notes** | ✅ This is the most verified source. The Wikimedia file explicitly links to the official STC Pay press release as the source. |

---

## Tamara

| Field | Value |
|-------|-------|
| **File** | `public/assets/payment-logos/tamara.svg` |
| **Source URL** | `https://raw.githubusercontent.com/activemerchant/payment_icons/refs/heads/master/app/assets/images/payment_icons/tamara.svg` |
| **Source Original** | activemerchant/payment_icons — open-source payment icon set (Ruby, used globally in Rails apps) |
| **Source Type** | Trusted fallback (activemerchant/payment_icons GitHub repo) |
| **Format** | SVG |
| **License** | MIT License (open source) |
| **Legal Review Needed** | Yes — verify Tamara's official trademark usage policy |
| **Notes** | Tamara's official website (`tamara.co`) does not provide direct logo downloads. The brand guidelines exist on Scribd but no public asset URL. The activemerchant repo is a well-maintained, industry-standard payment icon library used by thousands of merchants. |

---

## Tabby

| Field | Value |
|-------|-------|
| **File** | `public/assets/payment-logos/tabby.svg` |
| **Source URL** | `https://docs.tabby.ai/marketing/brand-assets` (Tabby official docs) |
| **Source Original** | `https://3345738593-files.gitbook.io/.../tabby-badge.svg` (Tabby's official GitBook-hosted asset) |
| **Source Type** | **OFFICIAL** — downloaded directly from Tabby's documentation CDN |
| **Format** | SVG |
| **License** | Provided by Tabby for merchant use; subject to Tabby brand guidelines |
| **Legal Review Needed** | Yes — verify brand usage guidelines from docs.tabby.ai |
| **Notes** | ✅ Tabby provides official brand assets via their marketing documentation (`docs.tabby.ai/marketing/brand-assets`). They also have a press kit at `tabby.ai/en-AE/newsroom` with official downloads from their Sanity CDN. |

---

## Classification Reference

| Logo | Classification |
|------|---------------|
| mada | `LOCAL_PAYMENT_METHOD` |
| Visa | `CARD_NETWORK` |
| Mastercard | `CARD_NETWORK` |
| Apple Pay | `DIGITAL_WALLET` |
| STC Pay | `DIGITAL_WALLET` / `LOCAL_PAYMENT_METHOD` |
| Tamara | `BNPL_PROVIDER` |
| Tabby | `BNPL_PROVIDER` |

---

## File Inventory

```
public/assets/payment-logos/
├── mada.svg         (1,994 B)
├── visa.svg         (853 B)
├── mastercard.svg   (537 B)
├── apple-pay.svg    (1,258 B)
├── stc-pay.svg      (4,923 B)
├── tamara.svg       (629 B)
└── tabby.svg        (4,569 B)
```

All files are valid SVG Scalable Vector Graphics.
