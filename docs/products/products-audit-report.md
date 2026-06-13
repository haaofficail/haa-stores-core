# Products Module — Audit Report

## Scope
Admin Dashboard → Products.tsx (950 lines), Storefront → ProductCard.tsx / ProductDetail.tsx / Category.tsx, Backend → ProductsService, API routes, DB schema.

## Layer 1: Admin Dashboard (Products.tsx)

### Current State
- Monolithic single-file component (950 lines) combining list, create, edit, publish, all in one
- Table layout with 9 columns: thumbnail, name, SKU, status, price, stock, channels, category, actions
- Filters: search, status, category, brand, tag
- Form dialog with collapsible sections: basic info, pricing & inventory, shipping, brand/tags/categories, images (edit only), SEO
- Publish-to-marketplace dialog with channel selection (store, salla, zid, noon, amazon)

### Missing / Issues
1. **No variants/options UI** — schema has `productOptions` + `productVariants` tables and the backend `enrichProduct` eagerly loads them, but the admin form has zero UI for creating/editing variants
2. **Image upload only in edit mode** — cannot add images during product creation (must save first, then open edit)
3. **No bulk actions** — no select-all, batch archive, batch status change, batch publish, batch export
4. **No grid/kanban view** — only table list; no gallery or card layout toggle
5. **No product import/export** — CSV/Excel import for bulk creation, export for backup/migration
6. **No duplicate product** — no "duplicate" action to clone a product as draft
7. **No product preview** — the view-in-store link only appears for active products; no modal preview of how the product card/page looks
8. **No inventory history/log** — stock changes are unlogged in the admin UI
9. **No low-stock threshold config** — stock coloring is hardcoded (0=red, ≤5=amber, ≤20=amber, >20=green)
10. **No sorting in table** — users cannot click column headers to sort (sort only via filter dropdown on the backend)
11. **No column visibility toggle** — all 9 columns always shown; users cannot hide columns
12. **No product activity/audit trail** — no history of status changes, price changes, etc.
13. **Price column shows cost margin** — useful but not configurable (always shown if cost exists)
14. **No digital product file upload UI** — `type: 'digital'` is a selectable option but no file upload/hosting UI
15. **Archived = delete** — `archive()` and `delete()` both call `this.archive()`; no actual hard delete
16. **No trash/recycle bin** — no way to restore archived products
17. **Form lacks image reordering** — no drag-and-drop to reorder product images
18. **No rich text editor** — description uses a plain `<textarea>`, no WYSIWYG
19. **No conditional fields** — e.g., shipping fields shown even for `type: 'digital'` or `type: 'service'`
20. **No product bundles / group products**
21. **No wholesale / tiered pricing**

## Layer 2: Storefront (ProductCard, ProductDetail, Category)

### Current State
- ProductCard: themable (card sizes 1-5), two-image hover, out-of-stock overlay, countdown timer, badges (discount, low-stock, sales count)
- ProductDetail: gallery with lightbox, pricing with compare-at + installment promo, stock indicator (color-coded), add-to-cart/buy-now, gift options, trust badges, related products, SEO meta + JSON-LD
- Category: grid/list toggle, filter sidebar (category, brand, price range), sort (newest, price asc/desc, name), column selector

### Missing / Issues
1. **No wishlist** — no save-for-later / favorites functionality
2. **No back-in-stock notification** — out-of-stock products show an overlay but no email/SMS notify-me form
3. **No variant image switching** — ProductDetail receives options/variants data but selecting a variant does not switch the gallery images
4. **No size guide** — hardcoded dimensions in shipping section; no modal size chart
5. **No recently viewed products** — no tracking or display of recently browsed items
6. **No product comparison** — no compare checkbox / compare page
7. **No social share with image** — share button uses generic `navigator.share` or copy-link; no OG image sharing
8. **No quantity selector on ProductCard** — add-to-cart uses a single click; no inline +/- for quantity
9. **No bulk add-to-cart** — no "add all to cart" from category page
10. **No quick view modal** — clicking a product takes you to ProductDetail page; no lightbox quick-view from category
11. **No stock count display in storefront** — stock shown as indicator dots only; no exact number visible to shoppers
12. **No multiple image upload for variants** — variant images not supported
13. **No product tabs** — description, reviews, shipping info all in one vertical flow; no tabbed layout
14. **No reviews/ratings system** — star display exists but no review submission or moderation UI
15. **No related products personalization** — related products appear to be random; no ML-based recommendations
16. **No infinite scroll** — category page uses standard pagination
17. **No mobile swipe on gallery** — gallery works with thumbnail clicks; no touch swipe

## Layer 3: Backend (Schema, ProductsService, API)

### Current State
- Full schema: `products`, `productImages`, `productOptions`, `productOptionValues`, `productVariants`, `productCategories`, `productTags`, `brands`, `categories`, `tags`
- ProductsService: `list()` with filters (status, categoryId, brandId, tagId, search, minPrice, maxPrice, sort), `getById()`, `getBySlug()`, `create()`, `update()`, `archive()`, `delete()`, `addImage()`, `deleteImage()`
- Redis caching with versioned namespace invalidation
- API routes: `GET /`, `GET /:productId`, `POST /`, `PATCH /:productId`, `DELETE /:productId`, `POST /:productId/images`, `DELETE /:productId/images/:imageId`
- Auto-publish to connected marketplaces on status=active
- Audit logging for image operations (but not for product CRUD)

### Missing / Issues
1. **No bulk operations API** — no batch archive, batch status update, batch publish endpoint
2. **No bulk image upload** — single image upload only
3. **No search by SKU/barcode** — `list()` only searches name + slug
4. **No stock movement logging** — inventory changes are not recorded; no stock_history table or service
5. **No soft delete** — `archive()` sets status='archived'; no separate deleted_at / trashed state
6. **No product import/export service** — no CSV/Excel parsing pipeline
7. **No options/variants CRUD in service** — `enrichProduct()` loads them via raw SQL but there are no `createOption()`, `updateVariant()`, etc. methods; variants can only be set at checkout via cart line items
8. **No variant inventory management** — `stockQuantity` is on the product, not per-variant (schema has variant stock fields but no service logic)
9. **No product type-specific validation** — digital/service products skip shipping validation but nothing enforces it
10. **No SEO validation** — seoTitle length, seoDescription length enforced only in frontend, not in API
11. **No product slug uniqueness check across a store** — update may fail with CONFLICT but there's no pre-check
12. **No price history** — no table tracking price changes over time
13. **No category tree/flatten support in list** — `categoryId` filter is exact; no subcategory inclusion
14. **No tag filtering by multiple tags** — only single tagId filter
15. **No full-text search** — uses `LIKE` with `%term%`; no Postgres tsvector
16. **No export/import endpoints** — routes/imports.ts and routes/exports.ts exist but no product-specific import/export logic

## Layer 4: API Client (Frontend)

### Current State
- `productsApi` in `api.ts` (lines 98-155): `list`, `getById`, `create`, `update`, `archive`, `uploadImage`, `deleteImage`
- All methods use `request()` utility with auth token
- `uploadImage` uses raw `fetch()` + FormData for multipart

### Missing / Issues
1. **No bulk operation functions** — matches backend gap
2. **No import/export API calls** — matches backend gap
3. **No pagination metadata type** — `list()` returns `{ data, total, page, limit, totalPages }` but typed loosely as `any`
4. **No error type refinement** — all errors thrown as `ApiClientError` with generic code/message
5. **No products cache layer** — no client-side cache or stale-while-revalidate pattern
6. **No optimistic updates** — no `useOptimistic` or rollback on failure patterns

---

## Recommendations by Priority

### P0 (Critical — user-facing gaps)
1. **Variants/Options UI** — schema and backend ready, UI missing entirely; merchants cannot create products with variations
2. **Bulk actions (admin)** — select products, batch archive, batch publish; table UX parity with Orders module
3. **Image upload during create** — flow forces save-then-edit; should allow images during creation

### P1 (High — quality-of-life)
4. **Product import/export** — CSV/Excel for bulk creation and backup
5. **Grid/gallery view** — toggle between table and visual card layout
6. **Duplicate product** — clone product as draft with "(copy)" slug
7. **Sortable table columns** — click column headers to sort
8. **Rich text editor** — replace `<textarea>` for description with WYSIWYG

### P2 (Medium — storefront polish)
9. **Variant image switching** — selected option changes gallery images
10. **Quick view modal** — lightbox from category/grid without navigation
11. **Back-in-stock notification** — email/SMS form on out-of-stock
12. **Wishlist / favorites** — save-for-later across sessions
13. **Recently viewed** — tracked and displayed in sidebar/footer

### P3 (Low — nice to have)
14. **Size guide modal** — from product dimensions
15. **Product comparison** — compare up to 4 products side by side
16. **Reviews & ratings** — customer review submission with moderation
17. **Infinite scroll** — category page progressive loading
18. **Social share with OG image** — rich link previews
19. **Stock history log** — backend table tracking changes with reason
20. **Price history graph** — frontend chart showing price changes over time
21. **Full-text search** — migrate from LIKE to tsvector for better results
22. **Wholesale / tiered pricing** — per-customer-group pricing
