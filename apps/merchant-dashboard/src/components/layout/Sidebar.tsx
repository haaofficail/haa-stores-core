import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { usePermissions } from '@/lib/permissions';
import {
  LayoutDashboard, Package, Tags, ShoppingCart, Users, Truck, Wallet, TicketPercent, Percent, FileText, ShoppingBag, Download, BarChart3, FileSpreadsheet, Shield, Crown, Bell, Key, ArrowLeftRight, Bot, Palette, Settings, Store, Building2, Tag, ChevronDown, History, Headphones, UserCog, TrendingUp, Activity, ExternalLink, AlertTriangle, MessageSquare, Coins, Sparkles,
} from 'lucide-react';

type NavIcon = React.ComponentType<{ className?: string }>;

interface NavItem {
  to: string;
  icon: NavIcon;
  label: string;
  fallback: string;
  permission?: string;
}

// IA W1 (2026-06-25): groups reorganised to verb-noun, items moved to the
// section they actually belong to (shipping→sales, coupons→marketing,
// policies/ai→settings, etc.). Routes unchanged — pure label/grouping
// pass so deep links and bookmarks keep working. See HAA_TASK_LEDGER §IA.
const navGroups: Array<{
  titleKey: string;
  title: string;
  items: NavItem[];
}> = [
  {
    titleKey: 'sidebar.main',
    title: 'الرئيسية',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'nav.dashboard', fallback: 'لوحة التحكم', permission: 'dashboard:view' },
    ],
  },
  {
    titleKey: 'sidebar.catalog',
    title: 'الكتالوج',
    items: [
      { to: '/products', icon: Package, label: 'nav.products', fallback: 'إدارة المنتجات', permission: 'products:read' },
      { to: '/categories', icon: Tags, label: 'nav.categories', fallback: 'التصنيفات', permission: 'categories:manage' },
      { to: '/brands', icon: Building2, label: 'nav.brands', fallback: 'الماركات', permission: 'brands:manage' },
      { to: '/tags', icon: Tag, label: 'nav.tags', fallback: 'الوسوم', permission: 'tags:manage' },
    ],
  },
  {
    titleKey: 'sidebar.sales',
    title: 'البيع',
    items: [
      { to: '/orders', icon: ShoppingCart, label: 'nav.orders', fallback: 'معالجة الطلبات', permission: 'orders:read' },
      { to: '/customers', icon: Users, label: 'nav.customers', fallback: 'إدارة العملاء', permission: 'customers:read' },
      { to: '/abandoned-carts', icon: ShoppingBag, label: 'nav.abandonedCarts', fallback: 'العربات المتروكة', permission: 'orders:read' },
      { to: '/shipping', icon: Truck, label: 'nav.shipping', fallback: 'إدارة الشحن', permission: 'shipping:manage' },
      { to: '/channels', icon: Store, label: 'nav.channels', fallback: 'ربط قنوات البيع', permission: 'settings:read' },
    ],
  },
  {
    titleKey: 'sidebar.marketing',
    title: 'التسويق',
    items: [
      { to: '/marketing', icon: Sparkles, label: 'nav.marketingHub', fallback: 'مركز التسويق', permission: 'promotions:read' },
      { to: '/promotions', icon: Percent, label: 'nav.promotions', fallback: 'إدارة العروض', permission: 'promotions:read' },
      { to: '/coupons', icon: TicketPercent, label: 'nav.coupons', fallback: 'إدارة الكوبونات', permission: 'coupons:read' },
      { to: '/loyalty', icon: Coins, label: 'nav.loyalty', fallback: 'إدارة الولاء', permission: 'promotions:read' },
      { to: '/whatsapp', icon: MessageSquare, label: 'nav.whatsapp', fallback: 'حملات الواتساب', permission: 'settings:read' },
    ],
  },
  {
    titleKey: 'sidebar.finance',
    title: 'المالية',
    items: [
      { to: '/wallet', icon: Wallet, label: 'nav.wallet', fallback: 'المحفظة والتسويات', permission: 'wallet:read' },
      { to: '/subscriptions', icon: Crown, label: 'nav.subscriptions', fallback: 'الاشتراك والفواتير', permission: 'subscriptions:view' },
      { to: '/compliance', icon: Shield, label: 'nav.compliance', fallback: 'التحقق والامتثال', permission: 'compliance:read' },
    ],
  },
  {
    titleKey: 'sidebar.insights',
    title: 'التحليلات',
    items: [
      { to: '/reports', icon: BarChart3, label: 'nav.reports', fallback: 'التقارير التشغيلية', permission: 'reports:read' },
      { to: '/growth', icon: TrendingUp, label: 'nav.growth', fallback: 'مؤشرات النمو', permission: 'reports:read' },
      { to: '/live', icon: Activity, label: 'nav.liveRadar', fallback: 'النشاط الحي', permission: 'reports:read' },
      { to: '/exports', icon: Download, label: 'nav.exports', fallback: 'تصدير البيانات', permission: 'exports:create' },
      { to: '/imports', icon: FileSpreadsheet, label: 'nav.imports', fallback: 'استيراد البيانات', permission: 'imports:create' },
    ],
  },
  {
    titleKey: 'sidebar.support',
    title: 'الدعم',
    items: [
      { to: '/support', icon: Headphones, label: 'nav.support', fallback: 'مركز الدعم', permission: 'support:read' },
    ],
  },
  {
    titleKey: 'sidebar.settings',
    title: 'الإعدادات',
    items: [
      { to: '/settings', icon: Settings, label: 'nav.settings', fallback: 'إعدادات المتجر', permission: 'settings:read' },
      { to: '/employees', icon: UserCog, label: 'nav.employees', fallback: 'الموظفون والصلاحيات', permission: 'employees:view' },
      { to: '/policies', icon: FileText, label: 'nav.policies', fallback: 'السياسات والصفحات', permission: 'settings:read' },
      { to: '/notifications', icon: Bell, label: 'nav.notifications', fallback: 'تفضيلات الإشعارات', permission: 'notifications:view' },
      { to: '/ai-assistant', icon: Bot, label: 'nav.aiAssistant', fallback: 'المساعد الذكي', permission: 'settings:read' },
      { to: '/theme', icon: Palette, label: 'nav.themeEditor', fallback: 'تخصيص الثيم', permission: 'theme:view' },
      { to: '/theme-store', icon: Palette, label: 'nav.themeStore', fallback: 'متجر الثيمات', permission: 'theme:view' },
      { to: '/audit-logs', icon: History, label: 'nav.auditLogs', fallback: 'سجل التغييرات', permission: 'stores:read' },
    ],
  },
  {
    titleKey: 'sidebar.developers',
    title: 'المطوّرون',
    items: [
      { to: '/api-keys', icon: Key, label: 'nav.apiKeys', fallback: 'مفاتيح API', permission: 'api_keys:view' },
      { to: '/migration', icon: ArrowLeftRight, label: 'nav.migration', fallback: 'استيراد وهجرة المتجر', permission: 'settings:read' },
    ],
  },
];

function NavGroup({ titleKey, title, items }: { titleKey: string; title: string; items: NavItem[] }) {
  const [open, setOpen] = useState(() => localStorage.getItem('sidebar_group_'+title) !== 'false');
  const { t } = useTranslation();
  const { can } = usePermissions();

  const visible = useMemo(() => items.filter(item => !item.permission || can(item.permission)), [items, can]);

  if (visible.length === 0) return null;

  return (
    <div className="mb-2">
      <button
        onClick={() => { const next = !open; setOpen(next); localStorage.setItem('sidebar_group_'+title, String(next)); }}
        className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider hover:text-neutral-700 transition-colors"
      >
        {t(titleKey, title)}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')} />
      </button>
      {open && (
        <div className="space-y-0.5 px-2">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
                    : 'text-neutral-700 hover:bg-surface-1 hover:shadow-sm',
                )
              }

            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{t(item.label, item.fallback)}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const { t } = useTranslation();
  const [isRTL] = useState(() => document.dir === 'rtl');
  const storefrontBase = import.meta.env.VITE_STOREFRONT_URL || 'http://localhost:5174';

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      <aside className={cn(
        'w-64 bg-surface-1/50 backdrop-blur-xl flex flex-col shrink-0 shadow-xl',

        'fixed inset-y-0 z-50 transition-transform duration-200 ease-timing',
        isRTL ? 'left-0' : 'right-0',
        'lg:relative lg:inset-auto lg:z-auto lg:translate-x-0',
        open ? 'translate-x-0' : isRTL ? '-translate-x-full' : 'translate-x-full',
      )}>
      <div className="h-16 px-4 flex items-center gap-3">
        {/* Platform logo. Same white-on-ring container as Login.tsx so the
            brand mark stays visible (the logo PNG is rendered in the brand
            blue; placing it on a blue gradient hides it). Decorative alt=""
            because the brand name is announced by the span below — RTL
            screen readers would otherwise say "هاء متاجر هاء". */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md shadow-primary-500/20 ring-1 ring-primary-100 shrink-0">
          <img
            src="/haa-logo-192.png"
            srcSet="/haa-logo-64.png 64w, /haa-logo-192.png 192w, /haa-logo-512.png 512w"
            sizes="40px"
            alt=""
            width={40}
            height={40}
            decoding="async"
            className="h-10 w-10"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              (e.currentTarget.nextElementSibling as HTMLElement | null)?.classList.remove('hidden');
            }}
          />
          {/* Fallback when the asset fails (offline, CDN miss). The "ه"
              monogram preserves brand identity without blocking layout. */}
          <span
            aria-hidden="true"
            className="hidden text-sm font-bold text-primary-600"
          >
            {t('sidebar.logoLetter', 'ه')}
          </span>
        </div>
        <div className="flex flex-col min-w-0">
          {/* Brand name unified to "متاجر هاء" (matches login + landing).
              whitespace-nowrap stops the title from wrapping to two lines
              inside the 64-rem sidebar (audit P0-#5). */}
          <span className="font-bold text-base text-neutral-900 leading-tight whitespace-nowrap">{t('app.title', 'متاجر هاء')}</span>
          <span className="text-xs text-neutral-500 leading-tight whitespace-nowrap">{t('app.subtitle', 'لوحة التاجر')}</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4" aria-label={t('sidebar.navAria', 'التنقل الرئيسي')}>
        {navGroups.map((group) => (
          <NavGroup key={group.titleKey} titleKey={group.titleKey} title={group.title} items={group.items} />
        ))}
      </nav>
      <div className="p-4">
        <a
          href={`${storefrontBase}/marketplace`}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100"
        >
          <Store className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">{t('nav.haaMarketplace', 'سوق هاء العام')}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        </a>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-xs font-semibold">{t('sidebar.demoLabel', 'متجر تجريبي')}</p>
          </div>
          <p className="text-xs text-amber-600 mt-1">{t('sidebar.demoVersion', 'جميع الخصائص مفعلة للتجربة')}</p>
        </div>
      </div>
    </aside>
    </>
  );
}
