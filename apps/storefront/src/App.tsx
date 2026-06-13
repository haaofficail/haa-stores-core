import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from '@/components/Layout';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const Home = lazy(() => import('@/pages/Home'));
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
const Support = lazy(() => import('@/pages/Support'));
const SupportTicket = lazy(() => import('@/pages/SupportTicket'));
const KnowledgeBase = lazy(() => import('@/pages/KnowledgeBase'));

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
          <Route path="/" element={<Navigate to="/s/haa-demo" replace />} />
            <Route path="/legal/:legalSlug" element={<LegalPage />} />
          <Route path="*" element={<StoreNotFound />} />
        </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
