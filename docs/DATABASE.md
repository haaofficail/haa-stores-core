# Database Schema

## Overview

44 tables defined in `packages/db/src/schema/`. Of these, **25 are dormant** (defined but not used in MVP). The active tables support core commerce, shipping, wallet, and auth.

## Active Tables (19)

### Core Commerce
- `stores` — tenant stores, each with slug, status, config
- `products` — store products with pricing, inventory, SEO
- `product_categories` — many-to-many product/category join
- `categories` — product categories per store
- `customers` — customer records per store
- `carts` — shopping carts per store
- `cart_items` — items in carts
- `orders` — customer orders
- `order_items` — line items per order
- `order_status_history` — status change audit trail

### Checkout & Payment
- `checkout_sessions` — checkout sessions with idempotency
- `payments` — payment records (fake)

### Shipping
- `shipping_methods` — available shipping methods
- `shipping_zones` — delivery zones
- `shipping_rates` — pricing per method/zone
- `shipments` — order shipments with tracking

### Wallet
- `wallet_ledger` — financial entries (credit/debit)

### Auth & Integration
- `user_store_access` — user-to-store permissions
- `audit_logs` — mutation audit trail
- `webhook_events` — outbox for webhook delivery
- `coupons` — discount coupons (basic)

## Dormant Tables (25)

These are schema-defined but not used in MVP:
- `users`, `roles`, `role_permissions`, `user_roles`
- `stores` extensions (theme, SEO, social)
- `product_variants`, `product_option_types`, `product_option_values`, `product_option_groups`
- `inventory_logs`, `suppliers`, `purchase_orders`, `purchase_order_items`
- `gift_cards`, `gift_card_transactions`
- `refunds`, `refund_items`
- `tax_rates`, `tax_categories`
- `store_social_links`
- `content_pages`, `content_blocks`
- `email_templates`

See `docs/DATABASE_SCOPE.md` for the full dormant analysis.

## Relationships

```txt
stores ──┬── products ──┬── product_categories ──┬── categories
         │              └── order_items ──── orders
         ├── carts ──── cart_items ──── products
         ├── customers ── orders
         ├── checkout_sessions ── orders
         ├── shipping_methods ─── shipping_rates ── shipping_zones
         ├── shipments ── orders
         ├── wallet_ledger
         ├── coupons
         ├── user_store_access ── users
         └── audit_logs
```

## Key Constraints

- All business entities carry `storeId` (multi-tenant isolation)
- `orders.orderNumber` is unique per store
- `checkout_sessions.idempotencyKey` is unique
- `cart_items.productId` references `products.id`
- `wallet_ledger.referenceId` references entity ID + `referenceType`
