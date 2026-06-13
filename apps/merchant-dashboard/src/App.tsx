import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/toast';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const Login = lazy(() => import('@/pages/Login'));
const DashboardHome = lazy(() => import('@/pages/DashboardHome'));
const Products = lazy(() => import('@/pages/Products'));
const Categories = lazy(() => import('@/pages/Categories'));
const Brands = lazy(() => import('@/pages/Brands'));
const Tags = lazy(() => import('@/pages/Tags'));
const Orders = lazy(() => import('@/pages/Orders'));
const Customers = lazy(() => import('@/pages/Customers'));
const Shipping = lazy(() => import('@/pages/Shipping'));
const WalletPage = lazy(() => import('@/pages/Wallet'));
const Settings = lazy(() => import('@/pages/Settings'));
const Coupons = lazy(() => import('@/pages/Coupons'));
const Promotions = lazy(() => import('@/pages/Promotions'));
const Policies = lazy(() => import('@/pages/Policies'));
const AbandonedCarts = lazy(() => import('@/pages/AbandonedCarts'));
const Exports = lazy(() => import('@/pages/Exports'));
const Reports = lazy(() => import('@/pages/Reports'));
const Imports = lazy(() => import('@/pages/Imports'));
const Compliance = lazy(() => import('@/pages/Compliance'));
const Subscriptions = lazy(() => import('@/pages/Subscriptions'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const ThemeEditor = lazy(() => import('@/pages/ThemeEditor'));
const ThemeStore = lazy(() => import('@/pages/ThemeStore'));
const ApiKeys = lazy(() => import('@/pages/ApiKeys'));
const MigrationHub = lazy(() => import('@/pages/MigrationHub'));
const AiAssistant = lazy(() => import('@/pages/AiAssistant'));
const Marketplaces = lazy(() => import('@/pages/Marketplaces'));
const MarketplaceDetail = lazy(() => import('@/pages/MarketplaceDetail'));
const SyncLogs = lazy(() => import('@/pages/SyncLogs'));
const OnboardingWizard = lazy(() => import('@/pages/OnboardingWizard'));
const OnboardingSuccess = lazy(() => import('@/pages/OnboardingSuccess'));
const AuditLogs = lazy(() => import('@/pages/AuditLogs'));
const SettlementDetail = lazy(() => import('@/pages/SettlementDetail'));
const SettlementOverview = lazy(() => import('@/pages/SettlementOverview'));
const SupportTickets = lazy(() => import('@/pages/SupportTickets'));
const SupportTicketDetail = lazy(() => import('@/pages/SupportTicketDetail'));
const SupportKb = lazy(() => import('@/pages/SupportKb'));

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingSkeleton />}>{children}</Suspense>;
}

function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-neutral-200">404</h1>
        <p className="text-lg text-neutral-500">{t('notFound.message', 'الصفحة غير موجودة')}</p>
        <Link to="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm">{t('notFound.back', 'العودة للرئيسية')}</Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Lazy><Login /></Lazy>} />
          <Route element={<AuthGuard />}>
            <Route path="/onboarding" element={<Lazy><OnboardingWizard /></Lazy>} />
            <Route path="/onboarding/success" element={<Lazy><OnboardingSuccess /></Lazy>} />
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Lazy><DashboardHome /></Lazy>} />
              <Route path="/products" element={<Lazy><Products /></Lazy>} />
              <Route path="/categories" element={<Lazy><Categories /></Lazy>} />
              <Route path="/brands" element={<Lazy><Brands /></Lazy>} />
              <Route path="/tags" element={<Lazy><Tags /></Lazy>} />
              <Route path="/orders" element={<Lazy><Orders /></Lazy>} />
              <Route path="/orders/:orderId" element={<Lazy><Orders /></Lazy>} />
              <Route path="/customers" element={<Lazy><Customers /></Lazy>} />
              <Route path="/shipping" element={<Lazy><Shipping /></Lazy>} />
              <Route path="/wallet" element={<Lazy><WalletPage /></Lazy>} />
              <Route path="/wallet/settlements" element={<Lazy><SettlementOverview /></Lazy>} />
              <Route path="/wallet/settlements/:batchId" element={<Lazy><SettlementDetail /></Lazy>} />
              <Route path="/coupons" element={<Lazy><Coupons /></Lazy>} />
              <Route path="/promotions" element={<Lazy><Promotions /></Lazy>} />
              <Route path="/policies" element={<Lazy><Policies /></Lazy>} />
              <Route path="/abandoned-carts" element={<Lazy><AbandonedCarts /></Lazy>} />
              <Route path="/exports" element={<Lazy><Exports /></Lazy>} />
              <Route path="/reports" element={<Lazy><Reports /></Lazy>} />
              <Route path="/imports" element={<Lazy><Imports /></Lazy>} />
              <Route path="/settings" element={<Lazy><Settings /></Lazy>} />
              <Route path="/theme" element={<Lazy><ThemeEditor /></Lazy>} />
              <Route path="/theme-store" element={<Lazy><ThemeStore /></Lazy>} />
              <Route path="/compliance" element={<Lazy><Compliance /></Lazy>} />
              <Route path="/subscriptions" element={<Lazy><Subscriptions /></Lazy>} />
              <Route path="/notifications" element={<Lazy><Notifications /></Lazy>} />
              <Route path="/api-keys" element={<Lazy><ApiKeys /></Lazy>} />
              <Route path="/migration" element={<Lazy><MigrationHub /></Lazy>} />
              <Route path="/channels" element={<Lazy><Marketplaces /></Lazy>} />
              <Route path="/channels/sync-logs" element={<Lazy><SyncLogs /></Lazy>} />
              <Route path="/channels/hub" element={<Navigate to="/channels" replace />} />
              <Route path="/channels/guide" element={<Navigate to="/channels" replace />} />
              <Route path="/channels/:provider" element={<Lazy><MarketplaceDetail /></Lazy>} />
              <Route path="/ai-assistant" element={<Lazy><AiAssistant /></Lazy>} />
              <Route path="/audit-logs" element={<Lazy><AuditLogs /></Lazy>} />
              <Route path="/support/tickets" element={<Lazy><SupportTickets /></Lazy>} />
              <Route path="/support/tickets/:ticketId" element={<Lazy><SupportTicketDetail /></Lazy>} />
              <Route path="/support/kb" element={<Lazy><SupportKb /></Lazy>} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
