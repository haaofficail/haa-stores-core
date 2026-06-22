import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PermissionRoute } from '@/components/auth/PermissionRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/toast';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const Login = lazy(() => import('@/pages/Login'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
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
const Support = lazy(() => import('@/pages/Support'));
const SupportTicketDetail = lazy(() => import('@/pages/SupportTicketDetail'));
const Employees = lazy(() => import('@/pages/Employees'));
const GrowthInsights = lazy(() => import('@/pages/GrowthInsights'));
const LiveRadar = lazy(() => import('@/pages/LiveRadar'));
const CustomerSegments = lazy(() => import('@/pages/CustomerSegments'));
const IntegrationHub = lazy(() => import('@/pages/IntegrationHub'));
const MarketingActions = lazy(() => import('@/pages/MarketingActions'));
const MarketplaceGuide = lazy(() => import('@/pages/MarketplaceGuide'));
const MarketplaceListings = lazy(() => import('@/pages/MarketplaceListings'));

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingSkeleton />}>{children}</Suspense>;
}

function GuardedRoute({
  permission,
  children,
}: {
  permission?: string;
  children: ReactNode;
}) {
  if (!permission) return <Lazy>{children}</Lazy>;
  return (
    <PermissionRoute permission={permission}>
      <Lazy>{children}</Lazy>
    </PermissionRoute>
  );
}

function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-neutral-200">404</h1>
        <p className="text-lg text-neutral-500">{t('notFound.message', 'الصفحة غير موجودة')}</p>
        <Link to="/dashboard" className="text-primary-600 hover:text-primary-800 text-sm">{t('notFound.back', 'العودة للرئيسية')}</Link>
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
          <Route path="/forgot-password" element={<Lazy><ForgotPassword /></Lazy>} />
          <Route element={<AuthGuard />}>
            <Route path="/onboarding" element={<Lazy><OnboardingWizard /></Lazy>} />
            <Route path="/onboarding/success" element={<Lazy><OnboardingSuccess /></Lazy>} />
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<GuardedRoute permission="dashboard:view"><DashboardHome /></GuardedRoute>} />
              <Route path="/products" element={<GuardedRoute permission="products:read"><Products /></GuardedRoute>} />
              <Route path="/categories" element={<GuardedRoute permission="categories:manage"><Categories /></GuardedRoute>} />
              <Route path="/brands" element={<GuardedRoute permission="brands:manage"><Brands /></GuardedRoute>} />
              <Route path="/tags" element={<GuardedRoute permission="tags:manage"><Tags /></GuardedRoute>} />
              <Route path="/orders" element={<GuardedRoute permission="orders:read"><Orders /></GuardedRoute>} />
              <Route path="/orders/:orderId" element={<GuardedRoute permission="orders:read"><Orders /></GuardedRoute>} />
              <Route path="/customers" element={<GuardedRoute permission="customers:read"><Customers /></GuardedRoute>} />
              <Route path="/shipping" element={<GuardedRoute permission="shipping:manage"><Shipping /></GuardedRoute>} />
              <Route path="/wallet" element={<GuardedRoute permission="wallet:read"><WalletPage /></GuardedRoute>} />
              <Route path="/wallet/settlements" element={<GuardedRoute permission="wallet:read"><SettlementOverview /></GuardedRoute>} />
              <Route path="/wallet/settlements/:batchId" element={<GuardedRoute permission="wallet:read"><SettlementDetail /></GuardedRoute>} />
              <Route path="/coupons" element={<GuardedRoute permission="coupons:read"><Coupons /></GuardedRoute>} />
              <Route path="/promotions" element={<GuardedRoute permission="promotions:read"><Promotions /></GuardedRoute>} />
              <Route path="/policies" element={<GuardedRoute permission="settings:read"><Policies /></GuardedRoute>} />
              <Route path="/abandoned-carts" element={<GuardedRoute permission="orders:read"><AbandonedCarts /></GuardedRoute>} />
              <Route path="/exports" element={<GuardedRoute permission="exports:create"><Exports /></GuardedRoute>} />
              <Route path="/reports" element={<GuardedRoute permission="reports:read"><Reports /></GuardedRoute>} />
              <Route path="/growth" element={<GuardedRoute permission="reports:read"><GrowthInsights /></GuardedRoute>} />
              <Route path="/live" element={<GuardedRoute permission="reports:read"><LiveRadar /></GuardedRoute>} />
              <Route path="/imports" element={<GuardedRoute permission="imports:create"><Imports /></GuardedRoute>} />
              <Route path="/settings" element={<GuardedRoute permission="settings:read"><Settings /></GuardedRoute>} />
              <Route path="/theme" element={<GuardedRoute permission="theme:view"><ThemeEditor /></GuardedRoute>} />
              <Route path="/theme-store" element={<GuardedRoute permission="theme:view"><ThemeStore /></GuardedRoute>} />
              <Route path="/employees" element={<GuardedRoute permission="employees:view"><Employees /></GuardedRoute>} />
              <Route path="/compliance" element={<GuardedRoute permission="compliance:read"><Compliance /></GuardedRoute>} />
              <Route path="/subscriptions" element={<GuardedRoute permission="subscriptions:view"><Subscriptions /></GuardedRoute>} />
              <Route path="/notifications" element={<GuardedRoute permission="notifications:view"><Notifications /></GuardedRoute>} />
              <Route path="/api-keys" element={<GuardedRoute permission="api_keys:view"><ApiKeys /></GuardedRoute>} />
              <Route path="/migration" element={<GuardedRoute permission="settings:read"><MigrationHub /></GuardedRoute>} />
              <Route path="/customers/segments" element={<GuardedRoute permission="customers:read"><CustomerSegments /></GuardedRoute>} />
              <Route path="/channels" element={<GuardedRoute permission="settings:read"><Marketplaces /></GuardedRoute>} />
              <Route path="/channels/sync-logs" element={<GuardedRoute permission="settings:read"><SyncLogs /></GuardedRoute>} />
              <Route path="/channels/guide" element={<GuardedRoute permission="settings:read"><MarketplaceGuide /></GuardedRoute>} />
              <Route path="/channels/listings" element={<GuardedRoute permission="settings:read"><MarketplaceListings /></GuardedRoute>} />
              <Route path="/channels/hub" element={<Navigate to="/channels" replace />} />
              <Route path="/channels/:provider" element={<GuardedRoute permission="settings:read"><MarketplaceDetail /></GuardedRoute>} />
              <Route path="/marketing/actions" element={<GuardedRoute permission="promotions:read"><MarketingActions /></GuardedRoute>} />
              <Route path="/settings/integrations" element={<GuardedRoute permission="settings:read"><IntegrationHub /></GuardedRoute>} />
              <Route path="/ai-assistant" element={<GuardedRoute permission="settings:read"><AiAssistant /></GuardedRoute>} />
              <Route path="/audit-logs" element={<GuardedRoute permission="stores:read"><AuditLogs /></GuardedRoute>} />
              <Route path="/support" element={<GuardedRoute permission="support:read"><Support /></GuardedRoute>} />
              <Route path="/support/tickets" element={<Navigate to="/support" replace />} />
              <Route path="/support/tickets/:ticketId" element={<GuardedRoute permission="support:read"><SupportTicketDetail /></GuardedRoute>} />
              <Route path="/support/kb" element={<Navigate to="/support" replace />} />
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
