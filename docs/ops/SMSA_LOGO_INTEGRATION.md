# SMSA Express logo — integration runbook

**Status:** Blocked on official brand asset.
**Owner action required:** Provide the official SMSA Express SVG (or vector PDF) before this is mergeable.
**Last reviewed:** 2026-06-26

## Why this doc exists

The storefront's "trust" marquee currently lists six carriers: Aramex,
Redbox, SPL (Saudi Post), Naqel, DHL, and a duplicate Saudi Post mark.
SMSA Express — one of the largest Saudi domestic carriers and an
already-integrated provider in `packages/shipping-core/src/smsa.ts` —
is **not** present in the marquee.

We won't ship a hand-drawn approximation. Saudi trademark law and the
SMSA brand guidelines both treat the wordmark as protected; a traced
copy is a trademark risk _and_ visibly inconsistent with the other
five carriers (all official vector files).

## What's needed

A single asset placed at:

```
apps/storefront/public/assets/shipping-logos/smsa.svg
```

Constraints to match the existing five logos in that directory:

- **Format:** SVG (no rasters; the marquee scales fluidly).
- **viewBox proportions:** roughly `width / height ≈ 6` (Aramex is
  `79.37 × 12.91 mm`; SPL is similar). Anything taller than 1:4 will
  break the marquee row height.
- **Colors:** keep the official brand palette. Don't recolor to match
  the storefront — the marquee uses each carrier's own brand color
  precisely because the row is a _trust signal_.
- **No embedded raster `<image>` tags** — the file should be pure
  `<path>` / `<text>` so it stays crisp at every breakpoint.

## Where to source it

Try, in order:

1. `https://smsaexpress.com` press kit / partner page.
2. SMSA partner portal (requires merchant API credentials — the same
   account used for `SMSA_PASS_KEY`).
3. Email `partner@smsaexpress.com` requesting the partner SVG kit.
4. SMSA brand team via the merchant integration contact on file.

Do **not** trace from a screenshot. Do **not** lift from a third-party
shipping comparison site (those files are usually rasters of rasters
and carry the third party's modifications).

## Wiring it in once the asset is in place

Two files need a one-line addition each. Place the entry alphabetically
or by importance — current order is Aramex → Redbox → SPL → Naqel →
DHL → Saudi Post; SMSA conventionally slots between Aramex and Redbox
(it's the second-largest domestic carrier after SPL).

### 1. `apps/storefront/src/pages/LandingPage.tsx`

Around line 499, inside the `.lp-marquee` block, add:

```tsx
<span className="lp-marquee__item ship">
  <img src="/assets/shipping-logos/smsa.svg" alt="SMSA" />
</span>
```

### 2. `apps/storefront/src/landing/sections/TrustLogos.tsx`

Around line 18, inside the carriers array, add:

```ts
{ src: '/assets/shipping-logos/smsa.svg', alt: 'SMSA', hScale: 1.0 },
```

`hScale` may need a final tweak depending on the asset's intrinsic
viewBox — start at `1.0` and adjust until the visual height matches
Aramex and DHL.

### 3. (optional) Marquee duplicate row

The marquee in `LandingPage.tsx` duplicates the carrier list for the
seamless scroll loop. If the second copy is rendered server-side (it
is, as of this writing), add the same `<span>` to the duplicate block
too. If the marquee was later refactored to render a single source of
truth, ignore this step.

## After the asset lands

- Manual smoke: load `/` on the storefront, confirm the SMSA mark
  appears in the marquee and doesn't overflow the row.
- Manual smoke: load `/` on mobile (≤ 480 px) — the marquee should
  still scroll without clipping.
- Open a PR titled `feat(storefront): add SMSA to shipping trust marquee`.
- Drop this doc once SMSA is present alongside the other five.

## Why we don't placeholder

A grey "SMSA" pill alongside five full-color carrier logos is worse
than the carrier being absent — it reads as "this integration is
broken" to a merchant doing diligence. Better to ship the marquee with
six branded marks now and add SMSA once the official asset is in hand.
