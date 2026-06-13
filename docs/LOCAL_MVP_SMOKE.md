# Local MVP Smoke Test

## Prerequisites
- Postgres running (Homebrew or Docker)
- API running on `:3000`
- Dashboard running on `:5173`
- Storefront running on `:5174`
- Seed data loaded

## Step-by-Step Smoke

### 1. API Health
```bash
curl http://localhost:3000/health
```
Expected: `{ "status": "ok" }`

### 2. Merchant Login
1. Open `http://localhost:5173/login`
2. Enter: `ahmed@example.com` / `Test@123456`
3. ✅ Redirected to Dashboard home
4. ✅ Stats visible (products, orders, wallet)

### 3. Create Product
1. Go to Products page
2. Click "إضافة منتج"
3. Fill: name "منتج تجريبي", slug "test-product", price "150", status "active"
4. Click "حفظ"
5. ✅ Toast success, product appears in list

### 4. Storefront — Home Page
1. Open `http://localhost:5174/s/haa-demo`
2. ✅ Store name visible in header
3. ✅ Categories displayed
4. ✅ Products displayed (including new product)

### 5. Storefront — Product Detail
1. Click on the new product
2. ✅ Title, price visible
3. ✅ Add to cart button enabled
4. ✅ No cost field visible

### 6. Storefront — Add to Cart
1. Click "أضف للسلة"
2. ✅ Toast "تمت الإضافة إلى السلة"
3. ✅ Cart count badge updated

### 7. Storefront — Cart
1. Click cart icon
2. ✅ Product listed with quantity controls
3. ✅ Increase quantity → total updates
4. ✅ Subtotal matches expected
5. ✅ Checkout button visible

### 8. Storefront — Checkout
1. Click "إتمام الطلب"
2. Fill customer name: "أحمد"
3. Fill phone: "0500000000"
4. Fill city: "الرياض"
5. Select a shipping method
6. Select payment: "بطاقة ائتمان" (fake_card_success)
7. Click "تأكيد الطلب"
8. ✅ Redirected to success page
9. ✅ Order number displayed
10. ✅ Status "confirmed"

### 9. Dashboard — Order Visible
1. Go to Dashboard Orders
2. ✅ New order appears
3. ✅ Status "confirmed"
4. ✅ Click eye icon → detail dialog with items

### 10. Dashboard — Wallet
1. Go to Wallet page
2. ✅ Net balance reflects sale amount minus 2% fee
3. ✅ Sale entry visible
4. ✅ Platform fee entry visible

### 11. Dashboard — Change Order Status
1. Go to Orders detail
2. ✅ Allowed transition buttons visible
3. Click "processing" → ✅ Status updated
4. Click "ready_to_ship" → ✅ Status updated

### 12. Dashboard — Add Tracking
1. Go to Shipping → Shipments tab
2. ✅ Shipment exists for the order
3. Click "تتبع" button
4. Enter tracking number: "TRK-001"
5. Enter carrier: "DHL"
6. Click "حفظ"
7. ✅ Toast success

### 13. Storefront — Tracking
1. Open `http://localhost:5174/s/haa-demo/track`
2. Enter order number + phone "0500000000"
3. Click "تتبع"
4. ✅ Order status, payment status displayed
5. ✅ No internal data (tenantId, cost, etc.)

### 14. Negative — Wrong Phone
1. Go to tracking with same order number
2. Enter wrong phone: "0511111111"
3. ✅ Shows "لم يتم العثور على الطلب"

### 15. Negative — fake_card_failed
1. Go back to Storefront, add product to cart
2. Go to checkout, this time select fake_card_failed
3. Confirm order
4. ✅ Error toast "فشلت عملية الدفع"
5. ✅ No paid order created (check Dashboard)

### 16. Negative — Out of Stock
1. If a product exists with stock=0 and trackInventory=true
2. ✅ Add to cart button disabled
3. ✅ Shows "غير متوفر حاليًا"

### 17. Negative — Draft Product
1. Go to Dashboard → Products → edit a product → set status "draft"
2. Open Storefront
3. ✅ Product not visible in listings
4. ✅ Direct URL to product slug returns 404

### 18. Idempotency — Double Click
1. During checkout, press confirm quickly twice
2. ✅ Only one order created (check Dashboard Orders)
3. ✅ Only one wallet entry for the sale

## Full Stack Check

```bash
# All must pass
pnpm -r typecheck
pnpm -r build
pnpm test
```
