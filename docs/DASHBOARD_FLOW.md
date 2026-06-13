# Dashboard Flow — Merchant Journey

## Apps
- **Dashboard**: `http://localhost:5173`
- **API (internal proxy)**: `/api/*` → `http://localhost:3000`

## Auth Flow

1. Open `/login`
2. Enter email + password
3. JWT returned, stored in `localStorage` as `auth_token`
4. Redirected to `/dashboard`
5. 401 responses auto-redirect to `/login`

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | Email + password form |
| `/dashboard` | Dashboard Home | Stats, alerts, recent orders |
| `/products` | Products | CRUD, status filter, category filter, search |
| `/categories` | Categories | CRUD |
| `/orders` | Orders | List, detail dialog, status transitions |
| `/customers` | Customers | List, CRUD |
| `/shipping` | Shipping | Tabs: methods, zones, rates, shipments + provider status cards + label/return actions |
| `/wallet` | Wallet | Balance, ledger entries, withdraw (disabled) |
| `/compliance` | Compliance | KYC verification: profile, documents, bank account, status |
| `/settings` | Settings | Store setup checklist, 6 tabs: info, contact, general, payment, shipping, wallet |

## Features by Page

### Dashboard Home
- Total sales, orders, products, low-stock count, net balance
- Recent orders table
- Alerts: low stock, no shipping methods, no products
- Links to affected pages
- **Store Setup Checklist widget** (shown when readiness < 100%):
  - Progress bar with percentage
  - Quick action links for incomplete items
  - Link to full checklist in Settings
- Green "store ready" banner when readiness = 100%

### Products
- Table with thumbnail, name, SKU, status badge, price, stock, category
- Status filter: all / active / draft / archived
- Category filter dropdown
- Search by name or SKU
- Create / Edit dialog with **sectioned form**:
  - Basic Info (name, slug, description, status, type)
  - Pricing & Inventory (price, compareAtPrice, cost, SKU, barcode, stock, trackInventory)
  - Shipping & Dimensions (requiresShipping, isFragile, weight, dimensions)
  - Categories (multi-select toggle buttons)
  - Images (upload, preview, delete — edit mode only)
  - SEO (title with char counter, description with char counter)
- **Slug auto-generation** from product name (only on create, stops when manually edited)
- **Client-side validation** with inline Arabic error messages
- **Warnings** for missing weight when shipping required, zero stock
- **Image upload UX**: loading spinner, file type/size validation, error messages
- Archive (soft delete)
- Empty state with create button, error state with retry button
- Loading skeleton

### Orders
- Table with order number, customer name, phone, city, status, payment status, fulfillment status, total, date
- Search by order number, customer name, or phone
- Status filter: all / draft / pending_payment / confirmed / processing / ready_to_ship / shipped / delivered / completed / cancelled / returned / refunded
- Payment status filter: all / unpaid / paid / refunded
- Fulfillment status filter: all / unfulfilled / partial / fulfilled
- Date range filter (from / to)
- Reset filters button
- Order detail dialog with sections:
  - Summary (status, payment, fulfillment badges)
  - Customer info (name, phone, email, shipping address)
  - Items table with subtotal, shipping, coupon discount, total
  - Tracking info (carrier, tracking number, tracking URL, shipment status)
  - Notes
  - Status history timeline (visual timeline with icons)
  - Status transition buttons (allowed transitions only, Arabic labels)
- Click row to open detail
- Pagination with page info
- Empty state, error state with retry, loading skeleton

### Shipping
- 8 overview cards: active methods, zones, rates, shipments, no-tracking, in-transit, delivered, last updated
- Explanation box for merchants (Arabic, non-technical)
- 4 tabs: Methods, Zones, Rates, Shipments
- Methods tab: name, type (manual/local_delivery/pickup), delivery days, active badge, toggle enable/disable
- Zones tab: name, cities as badges, active badge, toggle enable/disable
- Rates tab: method, zone, base rate, per-kg rate, free above, delivery days
- Shipments tab: order number, city, status badge with icon, carrier, tracking number, date
- Shipment filters: status, no-tracking-only, city search, date range
- Tracking dialog: tracking number (required), carrier name, tracking URL (validated)
- Empty/Error/Loading states for each tab

### Wallet
- 10 summary cards: total sales, platform fees, payment fees, shipping fees, net balance, available, pending, total payouts, refunds, entry count
- Computed from wallet_entries (not cached balance)
- Explanation box for merchants (Arabic, non-accounting language)
- Entries table with: date, type (with icon), direction (credit/debit badge), amount (colored), status, description, reference
- Filters: type, direction, status, date range, search
- Order link when referenceType=order
- Disabled payout with tooltip explanation
- Pagination
- Empty state, error state with retry, loading skeleton
- Last updated timestamp

### Settings
- **Store Setup Checklist** with 12 readiness items:
  - Store name, description, logo, color, contact info
  - At least 1 category, 1 active product, 1 product with image
  - At least 1 shipping method, 1 zone, 1 rate
  - At least 1 test order
  - Progress bar with percentage, direct action links
- 6 tabs: Store Info, Contact, General, Payment, Shipping, Wallet
- Store Info: name, slug, description, status, logo URL, primary color (color picker), SEO fields
- Contact: phone, email, social/address placeholders
- General: welcome message, prep time, min order (placeholders for future)
- Payment: info card (real payment disabled), fake payment explanation
- Shipping: info card with link to shipping page
- Wallet: info card (withdraw disabled) with link to wallet page
- Client-side validation: name required, slug format, email format, color hex (#RRGGBB), SEO lengths
- Save with loading state, success/error toasts, sticky save bar
- Reset button to revert unsaved changes

## API Client

Defined in `src/lib/api.ts`. Typed functions for every endpoint. Auto-handles:
- Bearer token injection
- 401 → redirect to login
- Error extraction from API responses
