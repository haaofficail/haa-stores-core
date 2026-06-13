# Public API Safety

This document defines what data is allowed/disallowed in public storefront responses.

## Allowed in Public Responses

### Store (GET /s/:slug)
- id, name, slug, description, logoUrl, status
- email, phone
- Not allowed: tenantId, createdAt, updatedAt

### Products (GET /s/:slug/products, GET /s/:slug/products/:slug)
- id, name, slug, description, price, compareAtPrice
- images, status (must be "active"), type, sku
- stockQuantity, trackInventory, weightGrams, requiresShipping
- categoryId, categoryName, categorySlug
- Not allowed: cost

### Categories (GET /s/:slug/categories)
- id, name, slug, description, imageUrl, sortOrder, isActive
- Not allowed: tenantId, internal flags

### Cart (GET/POST/PATCH/DELETE /s/:slug/cart/*)
- id, storeId, subtotal, itemCount, items
- Each item: id, productId, quantity, unitPrice, totalPrice
- Each item.product: same as Product public DTO
- Not allowed: cost (stripped from product inside cart items)

### Shipping Methods (GET /s/:slug/shipping-methods)
- id, name, type, estimatedDeliveryDays, isActive
- Not allowed: internal configuration

### Shipping Rates (POST /s/:slug/checkout/shipping-rates)
- methodId, methodName, estimatedDaysMin, estimatedDaysMax
- baseRate, perKgRate, freeAboveAmount

### Checkout Session (POST /s/:slug/checkout/sessions)
- id, cartId, storeId, status, paymentStatus
- subtotal, shippingCost, taxAmount, total
- paymentMethod, customerName, customerPhone, customerEmail
- idempotent (boolean flag)
- Not allowed: raw payment internals, full card data

### Confirm Result (POST /s/:slug/checkout/sessions/:id/confirm)
- order.orderNumber, order.status, order.paymentStatus
- order.total, order.customerName, order.customerPhone
- paymentStatus, paymentMessage
- Order fields wrapped through `toPublicOrder()` (same restrictions as Order DTO below)
- Not allowed: platform fee details, audit logs, webhook data, id, storeId, checkoutSessionId, idempotencyKey

### Order (GET /s/:slug/order/:orderNumber?phone=, GET /s/:slug/track/:orderNumber?phone=)
- orderNumber, status, paymentStatus, fulfillmentStatus
- customerName, customerPhone, total, subtotal, shippingCost
- paymentMethod, items (name, sku, quantity, unitPrice, totalPrice)
- statusHistory (fromStatus, toStatus, createdAt)
- Not allowed: id, storeId, checkoutSessionId, idempotencyKey, walletEntry, paymentIntentRaw, auditLogs, platformFee, paidAmount, discount, customerEmail

## Implementation

Every public route in `apps/api/src/routes/storefront.ts` uses one of the `toPublic*` DTO functions:

- `toPublicProduct` — strips `cost`, `storeId`, `seoTitle`, `seoDescription`, `barcode`, timestamps
- `toPublicStore` — strips `tenantId`, `createdAt`, `updatedAt`
- `toPublicOrder` — strips `id`, `storeId`, `checkoutSessionId`, `idempotencyKey`, `walletEntry`, `paymentIntentRaw`, `auditLogs`, `platformFee`, `paidAmount`, `discount`, `customerEmail`
- `toPublicCart` — strips `cost` from each item's product
- `toPublicCategory` — strips `storeId`, `tenantId`, `parentId`, `metaDescription`, timestamps
- `toPublicShippingMethod` — strips `storeId`, `providerAccountId`, `config`, `sortOrder`, timestamps
- `toPublicPolicy` — strips `storeId`, `id`, `createdBy`, `updatedBy`, timestamps

All cart endpoints must wrap their response with `toPublicCart()`.
The tracking and order endpoints must wrap with `toPublicOrder()`.
The confirm endpoint must wrap the order object inside the result with `toPublicOrder()`.
Categories, shipping methods, and policies endpoints must wrap with their respective `toPublic*()` functions.
