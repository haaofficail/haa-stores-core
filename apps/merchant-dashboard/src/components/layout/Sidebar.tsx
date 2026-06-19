import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { usePermissions } from '@/lib/permissions';
import {
  LayoutDashboard, Package, Tags, ShoppingCart, Users, Truck, Wallet, TicketPercent, Percent, FileText, ShoppingBag, Download, BarChart3, FileSpreadsheet, Shield, Crown, Bell, Key, ArrowLeftRight, Bot, Palette, Settings, Store, Building2, Tag, ChevronDown, History, Headphones, BookOpen, UserCog, TrendingUp, Activity, ExternalLink, AlertTriangle,
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: any;
  label: string;
  fallback: string;
  permission?: string;
}

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
    titleKey: 'sidebar.operations',
    title: 'التشغيل',
    items: [
      { to: '/products', icon: Package, label: 'nav.products', fallback: 'المنتجات', permission: 'products:read' },
      { to: '/categories', icon: Tags, label: 'nav.categories', fallback: 'التصنيفات', permission: 'categories:manage' },
      { to: '/brands', icon: Building2, label: 'nav.brands', fallback: 'الماركات', permission: 'brands:manage' },
      { to: '/tags', icon: Tag, label: 'nav.tags', fallback: 'التاجات', permission: 'tags:manage' },
      { to: '/orders', icon: ShoppingCart, label: 'nav.orders', fallback: 'الطلبات', permission: 'orders:read' },
      { to: '/customers', icon: Users, label: 'nav.customers', fallback: 'العملاء', permission: 'customers:read' },
      { to: '/channels', icon: Store, label: 'nav.channels', fallback: 'قنوات البيع', permission: 'settings:read' },
    ],
  },
  {
    titleKey: 'sidebar.financial',
    title: 'المالية',
    items: [
      { to: '/shipping', icon: Truck, label: 'nav.shipping', fallback: 'الشحن', permission: 'shipping:manage' },
      { to: '/wallet', icon: Wallet, label: 'nav.wallet', fallback: 'المحفظة', permission: 'wallet:read' },
      { to: '/coupons', icon: TicketPercent, label: 'nav.coupons', fallback: 'الكوبونات', permission: 'coupons:read' },
    ],
  },
  {
    titleKey: 'sidebar.marketing',
    title: 'التسويق',
    items: [
      { to: '/promotions', icon: Percent, label: 'nav.promotions', fallback: 'العروض', permission: 'promotions:read' },
      { to: '/abandoned-carts', icon: ShoppingBag, label: 'nav.abandonedCarts', fallback: 'العربات المتروكة', permission: 'orders:read' },
      { to: '/policies', icon: FileText, label: 'nav.policies', fallback: 'الصفحات والسياسات', permission: 'settings:read' },
    ],
  },
  {
    titleKey: 'sidebar.analytics',
    title: 'التحليلات',
    items: [
      { to: '/reports', icon: BarChart3, label: 'nav.reports', fallback: 'التقارير', permission: 'reports:read' },
      { to: '/growth', icon: TrendingUp, label: 'nav.growth', fallback: 'مؤشرات النمو', permission: 'reports:read' },
      { to: '/live', icon: Activity, label: 'nav.liveRadar', fallback: 'الرادار الحي', permission: 'reports:read' },
      { to: '/exports', icon: Download, label: 'nav.exports', fallback: 'التصدير', permission: 'exports:create' },
      { to: '/imports', icon: FileSpreadsheet, label: 'nav.imports', fallback: 'الاستيراد', permission: 'imports:create' },
    ],
  },
  {
    titleKey: 'sidebar.support',
    title: 'الدعم',
    items: [
      { to: '/support/tickets', icon: Headphones, label: 'nav.supportTickets', fallback: 'تذاكر الدعم', permission: 'support:read' },
      { to: '/support/kb', icon: BookOpen, label: 'nav.supportKb', fallback: 'قاعدة المعرفة', permission: 'support:read' },
    ],
  },
  {
    titleKey: 'sidebar.settings',
    title: 'الإعدادات',
    items: [
      { to: '/employees', icon: UserCog, label: 'nav.employees', fallback: 'الموظفين', permission: 'employees:view' },
      { to: '/compliance', icon: Shield, label: 'nav.compliance', fallback: 'التحقق والامتثال', permission: 'compliance:read' },
      { to: '/audit-logs', icon: History, label: 'nav.auditLogs', fallback: 'سجل التغييرات', permission: 'stores:read' },
      { to: '/subscriptions', icon: Crown, label: 'nav.subscriptions', fallback: 'الاشتراكات', permission: 'subscriptions:view' },
      { to: '/notifications', icon: Bell, label: 'nav.notifications', fallback: 'الإشعارات', permission: 'notifications:view' },
      { to: '/theme-store', icon: Palette, label: 'nav.themeStore', fallback: 'متجر الثيمات', permission: 'theme:view' },
      { to: '/theme', icon: Palette, label: 'nav.themeEditor', fallback: 'تخصيص الثيم', permission: 'theme:view' },
      { to: '/settings', icon: Settings, label: 'nav.settings', fallback: 'الإعدادات', permission: 'settings:read' },
    ],
  },
  {
    titleKey: 'sidebar.developers',
    title: 'المطورين',
    items: [
      { to: '/api-keys', icon: Key, label: 'nav.apiKeys', fallback: 'مفاتيح API', permission: 'api_keys:view' },
      { to: '/migration', icon: ArrowLeftRight, label: 'nav.migration', fallback: 'الهجرة والتسويق', permission: 'settings:read' },
      { to: '/ai-assistant', icon: Bot, label: 'nav.aiAssistant', fallback: 'المساعد الذكي', permission: 'settings:read' },
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

        'fixed inset-y-0 z-50 transition-transform duration-300',
        isRTL ? 'left-0' : 'right-0',
        'lg:relative lg:inset-auto lg:z-auto lg:translate-x-0',
        open ? 'translate-x-0' : isRTL ? '-translate-x-full' : 'translate-x-full',
      )}>
      <div className="h-16 px-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-primary-500/25">
          {t('sidebar.logoLetter', 'ه')}
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-base text-neutral-900 leading-tight">{t('app.title', 'ها ستورز')}</span>
          <span className="text-xs text-neutral-500 leading-tight">{t('app.subtitle', 'لوحة التحكم')}</span>
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
