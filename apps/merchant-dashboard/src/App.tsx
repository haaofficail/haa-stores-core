import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useParams } from 'react-router-dom';
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
// IntegrationHub.tsx was a duplicate of Marketplaces.tsx with an
// older sync-all toast handler that lied about partial failures. The
// route `/settings/integrations` now redirects to the canonical
// `/channels`. See audit P0 #31 (2026-06-25).
const MarketingActions = lazy(() => import('@/pages/MarketingActions'));
const MarketingHub = lazy(() => import('@/pages/MarketingHub'));
const CatalogHub = lazy(() => import('@/pages/CatalogHub'));
const SalesHub = lazy(() => import('@/pages/SalesHub'));
const FinanceHub = lazy(() => import('@/pages/FinanceHub'));
const WhatsAppPage = lazy(() => import('@/pages/WhatsApp'));
const LoyaltyPage = lazy(() => import('@/pages/Loyalty'));
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

/**
 * Redirect to `template`, substituting `:param` placeholders with the
 * current URL params. Used by the IA W3 backwards-compat redirects so
 * e.g. `/orders/12345` correctly forwards to `/sales/orders/12345`
 * instead of literally `/sales/orders/:orderId`.
 */
function NavWithParams({ template }: { template: string }) {
  const params = useParams();
  let path = template;
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) path = path.replace(`:${key}`, value);
  }
  return <Navigate to={path} replace />;
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
              {/* IA W3 (2026-06-25): canonical paths are now namespaced
                  under their section hub (/catalog, /sales, /marketing,
                  /finance). Old top-level paths remain as <Navigate>
                  redirects so bookmarks, email links, and any external
                  reference keep working. The leaf pages still ship
                  under their existing component imports — only the
                  URL changed. */}

              {/* Home */}
              <Route path="/dashboard" element={<GuardedRoute permission="dashboard:view"><DashboardHome /></GuardedRoute>} />

              {/* ── Catalog ─────────────────────────────────────── */}
              <Route path="/catalog" element={<GuardedRoute permission="products:read"><CatalogHub /></GuardedRoute>} />
              <Route path="/catalog/products" element={<GuardedRoute permission="products:read"><Products /></GuardedRoute>} />
              <Route path="/catalog/categories" element={<GuardedRoute permission="categories:manage"><Categories /></GuardedRoute>} />
              <Route path="/catalog/brands" element={<GuardedRoute permission="brands:manage"><Brands /></GuardedRoute>} />
              <Route path="/catalog/tags" element={<GuardedRoute permission="tags:manage"><Tags /></GuardedRoute>} />

              {/* ── Sales ───────────────────────────────────────── */}
              <Route path="/sales" element={<GuardedRoute permission="orders:read"><SalesHub /></GuardedRoute>} />
              <Route path="/sales/orders" element={<GuardedRoute permission="orders:read"><Orders /></GuardedRoute>} />
              <Route path="/sales/orders/:orderId" element={<GuardedRoute permission="orders:read"><Orders /></GuardedRoute>} />
              <Route path="/sales/customers" element={<GuardedRoute permission="customers:read"><Customers /></GuardedRoute>} />
              <Route path="/sales/customers/segments" element={<GuardedRoute permission="customers:read"><CustomerSegments /></GuardedRoute>} />
              <Route path="/sales/abandoned-carts" element={<GuardedRoute permission="orders:read"><AbandonedCarts /></GuardedRoute>} />
              <Route path="/sales/shipping" element={<GuardedRoute permission="shipping:manage"><Shipping /></GuardedRoute>} />
              <Route path="/sales/channels" element={<GuardedRoute permission="settings:read"><Marketplaces /></GuardedRoute>} />
              <Route path="/sales/channels/sync-logs" element={<GuardedRoute permission="settings:read"><SyncLogs /></GuardedRoute>} />
              <Route path="/sales/channels/guide" element={<GuardedRoute permission="settings:read"><MarketplaceGuide /></GuardedRoute>} />
              <Route path="/sales/channels/listings" element={<GuardedRoute permission="settings:read"><MarketplaceListings /></GuardedRoute>} />
              <Route path="/sales/channels/:provider" element={<GuardedRoute permission="settings:read"><MarketplaceDetail /></GuardedRoute>} />

              {/* ── Marketing ───────────────────────────────────── */}
              <Route path="/marketing" element={<GuardedRoute permission="promotions:read"><MarketingHub /></GuardedRoute>} />
              <Route path="/marketing/promotions" element={<GuardedRoute permission="promotions:read"><Promotions /></GuardedRoute>} />
              <Route path="/marketing/coupons" element={<GuardedRoute permission="coupons:read"><Coupons /></GuardedRoute>} />
              <Route path="/marketing/loyalty" element={<GuardedRoute permission="promotions:read"><LoyaltyPage /></GuardedRoute>} />
              <Route path="/marketing/whatsapp" element={<GuardedRoute permission="settings:read"><WhatsAppPage /></GuardedRoute>} />
              <Route path="/marketing/actions" element={<GuardedRoute permission="promotions:read"><MarketingActions /></GuardedRoute>} />

              {/* ── Finance ─────────────────────────────────────── */}
              <Route path="/finance" element={<GuardedRoute permission="wallet:read"><FinanceHub /></GuardedRoute>} />
              <Route path="/finance/wallet" element={<GuardedRoute permission="wallet:read"><WalletPage /></GuardedRoute>} />
              <Route path="/finance/settlements" element={<GuardedRoute permission="wallet:read"><SettlementOverview /></GuardedRoute>} />
              <Route path="/finance/settlements/:batchId" element={<GuardedRoute permission="wallet:read"><SettlementDetail /></GuardedRoute>} />
              <Route path="/finance/subscriptions" element={<GuardedRoute permission="subscriptions:view"><Subscriptions /></GuardedRoute>} />
              <Route path="/finance/compliance" element={<GuardedRoute permission="compliance:read"><Compliance /></GuardedRoute>} />

              {/* ── Insights ────────────────────────────────────── */}
              <Route path="/reports" element={<GuardedRoute permission="reports:read"><Reports /></GuardedRoute>} />
              <Route path="/growth" element={<GuardedRoute permission="reports:read"><GrowthInsights /></GuardedRoute>} />
              <Route path="/live" element={<GuardedRoute permission="reports:read"><LiveRadar /></GuardedRoute>} />
              <Route path="/imports" element={<GuardedRoute permission="imports:create"><Imports /></GuardedRoute>} />
              <Route path="/exports" element={<GuardedRoute permission="exports:create"><Exports /></GuardedRoute>} />

              {/* ── Settings + dev + content ─────────────────────── */}
              <Route path="/settings" element={<GuardedRoute permission="settings:read"><Settings /></GuardedRoute>} />
              <Route path="/employees" element={<GuardedRoute permission="employees:view"><Employees /></GuardedRoute>} />
              <Route path="/policies" element={<GuardedRoute permission="settings:read"><Policies /></GuardedRoute>} />
              <Route path="/notifications" element={<GuardedRoute permission="notifications:view"><Notifications /></GuardedRoute>} />
              <Route path="/ai-assistant" element={<GuardedRoute permission="settings:read"><AiAssistant /></GuardedRoute>} />
              <Route path="/theme" element={<GuardedRoute permission="theme:view"><ThemeEditor /></GuardedRoute>} />
              <Route path="/theme-store" element={<GuardedRoute permission="theme:view"><ThemeStore /></GuardedRoute>} />
              <Route path="/audit-logs" element={<GuardedRoute permission="stores:read"><AuditLogs /></GuardedRoute>} />
              <Route path="/api-keys" element={<GuardedRoute permission="api_keys:view"><ApiKeys /></GuardedRoute>} />
              <Route path="/migration" element={<GuardedRoute permission="settings:read"><MigrationHub /></GuardedRoute>} />

              {/* ── Support ─────────────────────────────────────── */}
              <Route path="/support" element={<GuardedRoute permission="support:read"><Support /></GuardedRoute>} />
              <Route path="/support/tickets/:ticketId" element={<GuardedRoute permission="support:read"><SupportTicketDetail /></GuardedRoute>} />
              <Route path="/support/tickets" element={<Navigate to="/support" replace />} />
              <Route path="/support/kb" element={<Navigate to="/support" replace />} />

              {/* ── Backwards-compat redirects (old top-level paths
                  ↦ new namespaced canonical). Every Navigate uses
                  `replace` so the back button skips the old URL. */}
              <Route path="/products" element={<Navigate to="/catalog/products" replace />} />
              <Route path="/categories" element={<Navigate to="/catalog/categories" replace />} />
              <Route path="/brands" element={<Navigate to="/catalog/brands" replace />} />
              <Route path="/tags" element={<Navigate to="/catalog/tags" replace />} />
              <Route path="/orders" element={<Navigate to="/sales/orders" replace />} />
              <Route path="/orders/:orderId" element={<NavWithParams template="/sales/orders/:orderId" />} />
              <Route path="/customers" element={<Navigate to="/sales/customers" replace />} />
              <Route path="/customers/segments" element={<Navigate to="/sales/customers/segments" replace />} />
              <Route path="/abandoned-carts" element={<Navigate to="/sales/abandoned-carts" replace />} />
              <Route path="/shipping" element={<Navigate to="/sales/shipping" replace />} />
              <Route path="/channels" element={<Navigate to="/sales/channels" replace />} />
              <Route path="/channels/sync-logs" element={<Navigate to="/sales/channels/sync-logs" replace />} />
              <Route path="/channels/guide" element={<Navigate to="/sales/channels/guide" replace />} />
              <Route path="/channels/listings" element={<Navigate to="/sales/channels/listings" replace />} />
              <Route path="/channels/hub" element={<Navigate to="/sales/channels" replace />} />
              <Route path="/channels/:provider" element={<NavWithParams template="/sales/channels/:provider" />} />
              <Route path="/promotions" element={<Navigate to="/marketing/promotions" replace />} />
              <Route path="/coupons" element={<Navigate to="/marketing/coupons" replace />} />
              <Route path="/loyalty" element={<Navigate to="/marketing/loyalty" replace />} />
              <Route path="/whatsapp" element={<Navigate to="/marketing/whatsapp" replace />} />
              <Route path="/wallet" element={<Navigate to="/finance/wallet" replace />} />
              <Route path="/wallet/settlements" element={<Navigate to="/finance/settlements" replace />} />
              <Route path="/wallet/settlements/:batchId" element={<NavWithParams template="/finance/settlements/:batchId" />} />
              <Route path="/subscriptions" element={<Navigate to="/finance/subscriptions" replace />} />
              <Route path="/compliance" element={<Navigate to="/finance/compliance" replace />} />
              <Route path="/settings/integrations" element={<Navigate to="/sales/channels" replace />} />
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
