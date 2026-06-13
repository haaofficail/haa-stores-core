# Storefront Flow — LC3 MEGA

## Customer Journey

```
Home → Category → Product Detail → Cart → Checkout → Order Success → Tracking
```

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/s/:slug` | Home | Hero, trust strip, categories, featured products |
| `/s/:slug/c/:categorySlug` | Category | Products with search, sort, filters |
| `/s/:slug/c/all` | All Products | All active products |
| `/s/:slug/p/:productSlug` | Product Detail | Gallery, info, purchase, related |
| `/s/:slug/cart` | Cart | Items, quantity, summary |
| `/s/:slug/checkout` | Checkout | 5-step checkout flow |
| `/s/:slug/order/:orderNumber` | Order Success | Confirmation, summary, tracking |
| `/s/:slug/track` | Tracking Input | Order number + phone form |
| `/s/:slug/track/:orderNumber` | Tracking Result | Timeline, status, items |
| `/s/:slug/about` | About | Store info, trust cards |
| `/s/:slug/contact` | Contact | Email, phone, hours, location |

## Design System

### Components (`src/components/ui/index.tsx`)

| Component | Description |
|-----------|-------------|
| `StoreContainer` | Max-width wrapper with responsive padding |
| `StoreCard` | White rounded card with border |
| `StoreButton` | Button with 5 variants (primary/secondary/outline/ghost/destructive) and 3 sizes (sm/md/lg) |
| `StoreInput` | Input with label, error, hint |
| `StoreTextarea` | Textarea with label, error |
| `StoreSelect` | Select with label, error, options |
| `StoreBadge` | Badge with 6 variants (default/success/warning/destructive/outline/primary) |
| `StoreSkeleton` | Animated loading placeholder |
| `StoreEmptyState` | Empty state with icon, title, description, action |
| `StoreErrorState` | Error state with retry and back actions |
| `StorePrice` | Price display with discount calculation |
| `StoreBreadcrumbs` | Navigation breadcrumbs |
| `StoreStepIndicator` | Checkout step progress indicator |
| `StoreQuantitySelector` | Quantity +/- selector with min/max |
| `StoreProductCard` | Product card with image, name, price, badges |
| `StoreSearchInput` | Search input with icon |
| `StoreSectionHeader` | Section title with optional action |

### Visual Direction
- Modern Saudi Commerce SaaS aesthetic
- IBM Plex Sans Arabic font
- Primary color: Blue (#0c8ee9)
- Accent color: Amber (#e89313)
- RTL-first design
- Responsive: mobile, tablet, desktop

## Home Page (LC3A)

### Layout
1. **Header** — Modern sticky header with logo, nav links, search, track order, cart badge, mobile menu
2. **Hero Section** — Store name/description, CTA buttons, gradient background with blur effects
3. **Trust Strip** — 4 trust indicators: secure payment, shipping, tracking, support
4. **Categories** — Visual category cards (up to 6), with icons/images, links to category pages
5. **Featured Products** — Product grid (up to 8), modern cards with images, prices, badges
6. **Footer** — Store info, quick links, customer service, contact, copyright

## Category Page (LC3 MEGA)

### Features
- **Search** — Filter products by name or SKU
- **Sort** — Newest, Price (low/high), Name
- **Availability Filter** — All / In stock only
- **Breadcrumbs** — Home → Categories → Category name
- **Product Grid** — Responsive 2/3/4 columns
- **Empty State** — When no products match filters
- **Clear Filters** — Reset all filters button

## Product Detail Page (LC3B)

### Layout
1. **Breadcrumb** — Home → Category → Product name
2. **Product Gallery** — Large main image + thumbnail strip for multiple images, fallback icon when no images
3. **Product Info** — Category link, name, price, compare-at price, discount badge, stock status, SKU
4. **Description** — Formatted description in a card
5. **Purchase Box** — Quantity selector (min/max), add-to-cart button, back button
6. **Trust Indicators** — 4 cards: secure, tracking, support, returns
7. **Product Meta** — Weight, dimensions, fragile, requires shipping
8. **Related Products** — Up to 4 products from same category, excludes current/draft/archived

### Stock Behavior
- Active + in stock → add-to-cart enabled
- trackInventory=true + stock=0 → "غير متوفر" badge, button disabled
- trackInventory=true + stock≤5 → "كمية محدودة" warning
- Draft/archived → returns null, shows "not found" page

## Cart Page (LC3 MEGA)

### Layout
- **Cart Items** — Image, name, price, quantity selector, subtotal, remove button
- **Summary Sidebar** — Items list, subtotal, checkout button
- **Empty State** — When cart is empty
- **Responsive** — Sidebar stacks below items on mobile

### Features
- Quantity validation (min 1, max stock)
- Loading states during updates
- Toast notifications for success/error
- Continue shopping link

## Checkout Page (LC3 MEGA)

### 5-Step Flow
1. **Customer Info** — Name (required), Phone (required), Email (optional)
2. **Address** — City (required), District, Street, Details
3. **Shipping** — Select from available rates based on city
4. **Payment** — Fake card success, Bank transfer, Cash on delivery
5. **Review** — Summary of all info before confirmation

### Features
- Step indicator with progress
- Validation at each step
- Shipping rates auto-fetch on city change
- Payment method selection
- Order summary sidebar
- Idempotency key prevents double submit
- Loading state during confirmation
- Error handling with toast notifications

## Order Success Page (LC3 MEGA)

### Layout
- Success icon and message
- Order number
- Status badges (order, payment, fulfillment)
- Items list with totals
- Track order button
- Back to store button

### Phone Verification
- Requires phone to view order details
- Phone stored in sessionStorage per order

## Tracking Pages (LC3 MEGA)

### TrackOrder (Input)
- Order number input
- Phone input
- Submit button
- Back to store link

### TrackOrderResult
- Order number display
- Status badges
- Items list
- Status history timeline
- Track another order link

## About Page (LC3 MEGA)

### Layout
- Hero section with store name
- Trust cards (4): Secure, Quality, Support, Satisfaction
- Store description card

## Contact Page (LC3 MEGA)

### Layout
- Hero section
- Contact cards (4): Email, Phone, Hours, Location
- Support message card

## API Consumption

All storefront pages use the public API client (`src/lib/api.ts`) which:
- Uses no JWT/Bearer token
- Base URL from `VITE_API_URL` env (defaults to `/api`)
- Handles loading/error states
- Never stores sensitive data

## Cart Storage

- Cart IDs are saved in `localStorage` with key `storefront_cart_{slug}`
- Each store slug has its own cart
- On order success, the cart for that slug is cleared from localStorage
- The cart persists across browser sessions (until order completion or manual clear)

## Checkout Idempotency

- Each checkout session creates a UUID `idempotencyKey`
- If the same key is reused, the API returns the existing session (not a new one)
- The confirm endpoint checks for existing orders by `checkoutSessionId`
- Double-click on confirm button does not create duplicate orders

## Tracking Phone Verification

- Orders can only be viewed with a matching phone number
- Phone is stored in `sessionStorage` per order number
- If the wrong phone is entered, the order is not returned
- The tracking endpoint checks both store slug and phone before returning data

## Public Safety

### toPublicProduct strips:
- `cost` — internal pricing
- `storeId` — internal ID
- `createdAt` / `updatedAt` — timestamps
- `seoTitle` / `seoDescription` — SEO metadata
- `barcode` — internal identifier
- Image `key` — storage path (images reduced to URL strings)

### toPublicOrder strips:
- `id`, `storeId` — internal IDs
- `checkoutSessionId`, `idempotencyKey` — session data
- `walletEntry`, `paymentIntentRaw` — payment internals
- `auditLogs`, `platformFee` — internal data
- `customerId` — internal customer reference
- `createdAt`, `updatedAt` — timestamps
- `metadata`, `couponCode`, `couponDiscount` — internal data
- `billingAddress`, `notes` — sensitive data

### toPublicCart strips:
- `sessionToken` — cart session secret
- `isAbandoned`, `expiresAt` — internal state
- `createdAt`, `updatedAt` — timestamps
- Product `cost`, `createdAt`, `updatedAt` — internal data

### General rules:
- Inactive/suspended stores return 404 with Arabic message
- Draft/archived products are not shown in listings
- Out-of-stock products cannot be purchased
- Cross-store products cannot be added to cart

## Mobile-First Design

- Responsive grids: 2 columns (mobile), 3 columns (tablet), 4 columns (desktop)
- Hidden labels on mobile (step indicator)
- Stacked layouts on mobile
- Touch-friendly buttons (min 44px)
- Hamburger menu for mobile navigation

## Accessibility

- `aria-label` on icon buttons
- Labels on all inputs
- Alt text on images
- Focus states with ring indicators
- Keyboard navigation support
- Color not used as sole indicator

## Performance

- Lazy loading on product images
- Skeleton loading states
- Limited product counts (8 on home, 4 related)
- Image error fallbacks
- No unnecessary re-renders
