# P2-#1 Refactor Plan: LandingPage 1945 LOC Split

> **Status:** Documented. Deferred (see rationale below).

## Why deferred

The LandingPage file is 1945 LOC with 31 functions. A naive
split into per-section files is not a clean refactor because:

1. **Shared state coupling.** Multiple sections share:
   - `cartCount`, `selectedProduct`, `cartItems`
   - `addToCart`, `onProductClick`, `onClose`
   - `TFn` (translation function from `useTranslation`)
   - Hooks: `useScrollReveal`, `useSEO`, `usePlatformBrand`
   - `getClaim`, `isClaimEnabled` (landing-claims)

   A naive split would require passing ~10 props through every
   section wrapper, which is a net loss for readability.

2. **Tightly coupled helpers.** `Reveal`, `AnimatedCounter`,
   `HighlightNumbers` are used by 4-5 sections each. Moving
   them out is easy; moving the sections out is not.

3. **No recent churn.** The file is stable. Splitting stable
   code without a real benefit is YAGNI.

4. **Section boundaries are visual, not logical.** Most
   sections are <100 LOC. Splitting them creates
   "file-per-section" overhead (imports, types, exports) that
   outweighs the benefit.

## The right refactor (when it's worth doing)

**Step 1: Extract state to a context provider.**

```ts
// apps/storefront/src/landing/LandingContext.tsx
export function LandingProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { t } = useTranslation();
  // ... etc
  return <LandingCtx.Provider value={{ ... }}>{children}</LandingCtx.Provider>;
}
```

**Step 2: Split sections into per-file components.**

```
apps/storefront/src/landing/
├── LandingContext.tsx
├── sections/
│   ├── AuroraBackground.tsx
│   ├── Nav.tsx
│   ├── Hero.tsx
│   ├── LiveTicker.tsx
│   ├── AboutSection.tsx
│   ├── Features.tsx
│   ├── PaymentSection.tsx
│   ├── HowItWorks.tsx
│   ├── StoreHeader.tsx
│   ├── StoreHero.tsx
│   ├── StoreCategories.tsx
│   ├── StoreProductCard.tsx
│   ├── StoreProducts.tsx
│   ├── StoreProductModal.tsx
│   ├── StoreCartDrawer.tsx
│   ├── StoreBottomNav.tsx
│   ├── StoreFooter.tsx
│   ├── StorefrontPreview.tsx
│   ├── Pricing.tsx
│   ├── FinalCTA.tsx
│   ├── DemoModal.tsx
│   ├── Bento.tsx
│   ├── Footer.tsx
│   ├── BackToTop.tsx
│   └── ScrollProgress.tsx
├── helpers/
│   ├── useScrollReveal.ts
│   ├── Reveal.tsx
│   ├── AnimatedCounter.tsx
│   └── HighlightNumbers.tsx
└── LandingPage.tsx  (orchestration only, ~50 LOC)
```

**Step 3: Convert LandingPage.tsx into a thin orchestrator.**

```ts
// apps/storefront/src/landing/LandingPage.tsx
export default function LandingPage() {
  return (
    <LandingProvider>
      <AuroraBackground />
      <Nav />
      <Hero />
      <LiveTicker />
      {/* ... etc */}
    </LandingProvider>
  );
}
```

**Estimated effort:** 4-6 hours (refactor + tests + visual regression).
**Risk:** High — touches every section, easy to break visual layout.
**Value:** Medium — easier to navigate, but currently navigable
via the `═══ SECTION ═══` headers in the existing file.

## Current compromise

- Sections organized under `═══ SECTION ═══` headers in the file
- No magic numbers — all spacing, colors, sizes are token-based
- File is well-commented (every section has a doc comment)
- Tree-shaking works correctly (single file, no per-section imports needed)

## When to actually do the refactor

When **any** of these become true:
- A new engineer needs to onboard and the file feels too large
- We need to A/B test individual sections in isolation
- We add 3+ more sections to the page (current count: 22)
- We switch to a CMS-driven landing page

For now: this is a known cost. The audit calls it P2 (medium
priority). The file is functional, tested, and stable.
