import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from '@/components/Layout';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const Home = lazy(() => import('@/pages/Home'));
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const AuthSignup = lazy(() => import('@/pages/Auth').then((m) => ({ default: m.SignupPage })));
const AuthWaitlist = lazy(() => import('@/pages/Auth').then((m) => ({ default: m.WaitlistPage })));
const Category = lazy(() => import('@/pages/Category'));
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));
const Cart = lazy(() => import('@/pages/Cart'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const OrderSuccess = lazy(() => import('@/pages/OrderSuccess'));
const TrackOrder = lazy(() => import('@/pages/TrackOrder'));
const TrackOrderResult = lazy(() => import('@/pages/TrackOrderResult'));
const About = lazy(() => import('@/pages/About'));
const Contact = lazy(() => import('@/pages/Contact'));
const PolicyPage = lazy(() => import('@/pages/PolicyPage'));
const LegalPage = lazy(() => import('@/pages/LegalPage'));
const StoreNotFound = lazy(() => import('@/pages/StoreNotFound'));
// TASK-0035 sub-item 5: dev-only fake 3-D Secure challenge page
// Renders a bank-style challenge UI for the FakePaymentProvider's
// `fake_3ds_challenge` flow. Real providers (Moyasar/Geidea) redirect
// to their own hosted challenge pages instead.
const Fake3DSChallenge = lazy(() => import('@/pages/Fake3DSChallenge'));
const Support = lazy(() => import('@/pages/Support'));
const SupportTicket = lazy(() => import('@/pages/SupportTicket'));
const KnowledgeBase = lazy(() => import('@/pages/KnowledgeBase'));
const HaaMarketplace = lazy(() => import('@/pages/HaaMarketplace'));
const MarketplaceCart = lazy(() => import('@/pages/MarketplaceCart'));
const MarketplaceCheckout = lazy(() => import('@/pages/MarketplaceCheckout'));
const MarketplaceOrderTrack = lazy(() => import('@/pages/MarketplaceOrderTrack'));
const MarketplaceSeller = lazy(() => import('@/pages/MarketplaceSeller'));
const MarketplaceSellers = lazy(() => import('@/pages/MarketplaceSellers'));
const MarketplaceProductDetail = lazy(() => import('@/pages/marketplace/MarketplaceProductDetail'));

function PageSkeleton() {
  return (
    <div className="container-store py-8 space-y-6">
      <div className="space-y-4">
        <div className="h-10 w-3/4 bg-surface-2 rounded-2xl animate-pulse" />
        <div className="h-6 w-1/2 bg-surface-2 rounded-xl animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-square bg-surface-2 rounded-2xl animate-pulse" />
            <div className="h-4 w-3/4 bg-surface-2 rounded animate-pulse" />
            <div className="h-4 w-1/3 bg-surface-2 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Toaster position="top-right" richColors dir="rtl" />
      <ErrorBoundary>
        <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<AuthSignup />} />
          <Route path="/waitlist" element={<AuthWaitlist />} />
          <Route path="/s/:slug" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="c/:categorySlug" element={<Category />} />
            <Route path="p/:productSlug" element={<ProductDetail />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="order/:orderNumber" element={<OrderSuccess />} />
            <Route path="track" element={<TrackOrder />} />
            <Route path="track/:orderNumber" element={<TrackOrderResult />} />
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
            <Route path="policies/:policyType" element={<PolicyPage />} />
            <Route path="support" element={<Support />} />
            <Route path="support/tickets/:ticketId" element={<SupportTicket />} />
            <Route path="support/kb" element={<KnowledgeBase />} />
            <Route path="support/kb/:articleSlug" element={<KnowledgeBase />} />
            <Route path="*" element={<StoreNotFound />} />
          </Route>
          <Route path="/marketplace" element={<HaaMarketplace />} />
          {/* /about على مستوى المنصة: لا متجر/slug — وجّه للّاندينق بدل صفحة المتجر التي تعلّق على skeleton */}
          <Route path="/about" element={<Navigate to="/" replace />} />
          <Route path="/marketplace/cart" element={<MarketplaceCart />} />
          <Route path="/marketplace/checkout" element={<MarketplaceCheckout />} />
          <Route path="/marketplace/orders" element={<MarketplaceOrderTrack />} />
          <Route path="/marketplace/order/:orderNumber" element={<MarketplaceOrderTrack />} />
          <Route path="/marketplace/products/:storeSlug/:productSlug" element={<MarketplaceProductDetail />} />
          <Route path="/marketplace/sellers" element={<MarketplaceSellers />} />
          <Route path="/marketplace/sellers/:storeSlug" element={<MarketplaceSeller />} />
          {/* TASK-0035 sub-item 5: Fake 3-D Secure challenge (dev-only).
              Real providers (Moyasar/Geidea) redirect to their own hosted
              challenge pages; the fake provider redirects here. */}
          {import.meta.env.DEV && (
            <Route path="/fake-3ds-challenge" element={<Fake3DSChallenge />} />
          )}
          <Route path="/legal/:legalSlug" element={<LegalPage />} />
          <Route path="*" element={<StoreNotFound />} />
        </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
