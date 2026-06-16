/**
 * Theme Registry — Storefront-side registration.
 *
 * Bridges the runtime component registry in @haa/storefront-themes
 * with the actual React components in this app.
 *
 * This is the ONLY place where app-level components are bound
 * to the abstract theme registry. Each new theme adds a
 * registerStorefrontTheme() call here.
 */

import { registerStorefrontTheme, registerThemeCapsule, baseElegantManifest, luxuryShowcaseCapsule } from '@haa/storefront-themes';
import Header from './components/Header';
import Footer from './components/Footer';
import ProductCard from './components/ProductCard';
import { BaseElegantHomePage, BaseElegantProductPage } from './themes/base-elegant';
import { luxuryShowcaseManifest, LuxuryShowcaseHeader, LuxuryShowcaseFooter, LuxuryShowcaseHomePage, LuxuryShowcaseProductPage, LuxuryProductCard } from './themes/luxury-showcase';

registerThemeCapsule('luxury-showcase', luxuryShowcaseCapsule);

registerStorefrontTheme('base-elegant', {
  manifest: baseElegantManifest,
  components: {
    Header,
    Footer,
    ProductCard,
    HomePage: BaseElegantHomePage,
    ProductPage: BaseElegantProductPage,
  },
});

registerStorefrontTheme('luxury-showcase', {
  manifest: luxuryShowcaseManifest,
  components: {
    Header: LuxuryShowcaseHeader,
    Footer: LuxuryShowcaseFooter,
    ProductCard: LuxuryProductCard,
    HomePage: LuxuryShowcaseHomePage,
    ProductPage: LuxuryShowcaseProductPage,
  },
});
