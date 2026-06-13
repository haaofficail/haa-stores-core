# Error Code Taxonomy

> Hierarchical classification of error codes used across the system.

---

## Taxonomy

| Prefix | Category | Example |
|--------|----------|---------|
| `AUTH` | Authentication | AUTH-001: Login failed |
| `RBAC` | Permissions / Roles | RBAC-001: Unauthorized action |
| `STORE` | Storefront | STORE-001: Page load failure |
| `THEME` | Themes | THEME-001: Theme not found |
| `DASH` | Merchant Dashboard | DASH-001: Dashboard error |
| `ORDER` | Orders | ORDER-001: Invalid state transition |
| `PAY` | Payments | PAY-001: Payment provider error |
| `SHIP` | Shipping | SHIP-001: Label generation failed |
| `CART` | Cart | CART-001: Add to cart failure |
| `CHECK` | Checkout | CHECK-001: Checkout blocked |
| `API` | General API | API-001: Internal server error |
| `DB` | Database | DB-001: Connection refused |
| `EXT` | External Service | EXT-001: Third-party timeout |
| `SYS` | System / Environment | SYS-001: Config missing |
| `WEBHOOK` | Webhooks | WEBHOOK-001: Delivery failed |
| `JOB` | Background Jobs | JOB-001: Queue failure |
| `NOTIFY` | Notifications | NOTIFY-001: Email send failed |
| `IMPORT` | Data Import | IMPORT-001: Import parse error |
| `EXPORT` | Data Export | EXPORT-001: Export generation failed |
| `WALLET` | Wallet | WALLET-001: Balance error |
| `SUBSCRIPTION` | Subscriptions | SUBSCRIPTION-001: Plan expired |
| `COMPLIANCE` | Compliance | COMPLIANCE-001: VAT validation failed |
