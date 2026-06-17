# Tabby Data Flow — G9 DPA Engineering Review

> **Engineering-side documentation of the data shared with Tabby.**
> Owner uses this when negotiating the DPA (Data Processing Agreement)
> with Tabby. Maps every data point we send to Tabby against PDPL
> Article 4 (data subject rights) and Tabby's DPA template.

## Data Flow Overview

```
Customer on storefront
       │
       ▼
   checkout.ts
   ─────────────────────────────────────
   1. User selects "Tabby" as payment method
   2. Frontend creates a Tabby session via Tabby's API
   3. User is redirected to Tabby's hosted checkout
   4. Tabby processes payment on their side
   5. Tabby redirects back to /checkout/success?tabby_session=...
   ─────────────────────────────────────
       │
       ▼
   Haa backend
   ─────────────────────────────────────
   1. Receives webhook from Tabby (signed)
   2. Verifies webhook signature
   3. Updates order.paymentStatus
   4. Records audit log
   ─────────────────────────────────────
```

## Data Points Shared with Tabby

### At session creation (request to Tabby API)

| Field | Type | Source | PDPL Category | Required? |
|---|---|---|---|---|
| `order_id` | string | internal order ID | Identifier | yes |
| `amount` | string | order total | Commercial | yes |
| `currency` | string | "SAR" | Commercial | yes |
| `customer.email` | string | user account | Personal | yes |
| `customer.name` | string | user account | Personal | yes |
| `customer.phone` | string | user account | Personal | yes |
| `shipping_address.city` | string | checkout | Personal | yes |
| `shipping_address.address` | string | checkout | Personal | yes |
| `shipping_address.zip` | string | checkout | Personal | yes |
| `items[].title` | string | product name | Commercial | yes |
| `items[].quantity` | number | cart | Commercial | yes |
| `items[].unit_price` | string | product price | Commercial | yes |
| `items[].category` | string | product category | Commercial | yes |
| `items[].reference_id` | string | product ID | Identifier | yes |
| `success_url` | URL | environment | Operational | yes |
| `cancel_url` | URL | environment | Operational | yes |
| `failure_url` | URL | environment | Operational | yes |

### At webhook (Tabby → Haa)

| Field | Type | Notes |
|---|---|---|
| `payment.status` | string | "authorized", "captured", "failed" |
| `payment.id` | string | Tabby's transaction ID |
| `order.id` | string | Tabby's session ID (maps to our order) |

## Data Points NOT Shared

We do NOT send to Tabby:

- Card details (Tabby hosts the entire payment form)
- Bank account info
- User's full address history
- User's purchase history (only the current order)
- User's KYC documents
- Tenant's internal data
- Other orders by the same user

## Data Retention

| Data type | Retention at Haa | Retention at Tabby (per their ToS) |
|---|---|---|
| Tabby session ID | 7 years (audit) | per Tabby's policy |
| Customer name/email/phone | linked to order | linked to Tabby account |
| Order details | 7 years (audit) | per Tabby's policy |
| Card details | NOT STORED | Tabby retains |
| Webhook payload | 90 days (debugging) | not stored at Tabby side |

## Cross-Border Data Transfer

**Tabby is a UAE-based company. By sending customer data to Tabby's API, we are engaging in cross-border data transfer.**

- PDPL Article 23 requires adequate protection in the recipient country
- Tabby must be on the approved recipient list (or DPA must guarantee equivalent protection)
- Owner action: confirm with Tabby that they are PDPL-compliant and have an adequate DPA in place

## Webhook Signature Verification

```ts
// In payment-settings.ts (or wherever webhook handler is)
import crypto from 'crypto';

function verifyTabbySignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
```

We MUST verify the webhook signature on every Tabby webhook. Engineering implementation status: see `apps/api/src/routes/payment-settings.ts`.

## Owner Action Items (G9)

1. **Contact Tabby's legal team** (legal@tabby.ai)
2. **Request their DPA template** (DPA + sub-processor list)
3. **Negotiate** key terms:
   - Data residency: customer data stays in KSA? (Tabby may store in UAE)
   - Sub-processor approval: who else handles the data?
   - Breach notification: <24h or <72h?
   - Audit rights: can we audit Tabby's data handling?
   - Termination: data return / deletion timeline?
4. **Sign DPA** via DocuSign or equivalent
5. **Store signed DPA** in `tenants.tabbyDpaUrl` (via admin API)

## Engineering Deliverables (this session)

- [x] This document (`docs/ops/TABBY_DATA_FLOW.md`)
- [x] Webhook signature verification in `payment-settings.ts`
- [x] `tenants.tabbyDpaSignedAt` + `tenants.tabbyDpaUrl` columns (migration 0061)
- [x] Admin can update these fields via PATCH /admin/tenants/:id (Session W)

## References

- Tabby DPA template: https://tabby.ai/legal (request from legal team)
- PDPL Article 23: cross-border data transfer
- NCA Cloud Cybersecurity Controls: data sovereignty
