// Command Palette — global cmd+K search (IA W5).
//
// Pre-fix: Topbar exposed a Search button + Cmd+K shortcut that opened
// a text input that did absolutely nothing. Audit (2026-06-25)
// flagged this as a fake feature — a power-user shortcut that
// rendered an empty input is worse than no shortcut at all.
//
// This palette is a real one:
//   - Cmd+K (mac) / Ctrl+K (win/linux) opens it.
//   - Esc closes.
//   - Arrow keys navigate the list; Enter selects.
//   - Type to filter against label + path + keywords.
//   - Recent navigations bubble to the top via localStorage.
//   - Each command carries the W3-canonical route + icon.
//
// Result-set is the merchant sidebar + a few extra "create"-style
// shortcuts (add product, new coupon). No async backend lookup yet —
// pure-client navigation. Future iterations can add fuzzy matching
// against orders/customers via the existing list endpoints, but the
// MVP locks the core feature: type → enter → land on the right page.

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, ArrowRight, ArrowLeft as ArrowLeftIcon,
  LayoutDashboard, Rocket, Package, Tags, Building2, Tag,
  ShoppingCart, Users, ShoppingBag, Truck, Store,
  Percent, TicketPercent, Coins, MessageSquare, Sparkles,
  Wallet, Crown, Shield, BarChart3, TrendingUp, Activity,
  Download, FileSpreadsheet, Headphones, Settings, UserCog,
  FileText, Bell, Bot, Palette, History, Key, ArrowLeftRight,
  Plus,
} from 'lucide-react';

interface Command {
  id: string;
  label: string;
  description?: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string;
  /** Group label shown when no query is active. */
  group: string;
}

// Single source of truth — same set as the sidebar but flat. Order
// here is the order shown when no query is typed.
const COMMANDS: Command[] = [
  // Main
  { id: 'dashboard',         label: 'لوحة التحكم',           path: '/dashboard',              icon: LayoutDashboard, keywords: 'home main overview رئيسية', group: 'الرئيسية' },
  { id: 'getting-started',   label: 'بدء الاستخدام',         path: '/getting-started',        icon: Rocket,         keywords: 'onboarding checklist بداية إعداد', group: 'الرئيسية' },

  // Catalog
  { id: 'catalog-hub',       label: 'مركز الكتالوج',         path: '/catalog',                icon: Package,        keywords: 'catalog hub overview', group: 'الكتالوج' },
  { id: 'products',          label: 'إدارة المنتجات',        path: '/catalog/products',       icon: Package,        keywords: 'products items منتجات', group: 'الكتالوج' },
  { id: 'categories',        label: 'التصنيفات',             path: '/catalog/categories',     icon: Tags,           keywords: 'categories تصنيفات أقسام', group: 'الكتالوج' },
  { id: 'brands',            label: 'الماركات',              path: '/catalog/brands',         icon: Building2,      keywords: 'brands ماركات علامات', group: 'الكتالوج' },
  { id: 'tags',              label: 'الوسوم',                path: '/catalog/tags',           icon: Tag,            keywords: 'tags وسوم labels', group: 'الكتالوج' },

  // Sales
  { id: 'sales-hub',         label: 'مركز البيع',            path: '/sales',                  icon: ShoppingCart,   keywords: 'sales hub overview', group: 'البيع' },
  { id: 'orders',            label: 'معالجة الطلبات',        path: '/sales/orders',           icon: ShoppingCart,   keywords: 'orders طلبات', group: 'البيع' },
  { id: 'customers',         label: 'إدارة العملاء',         path: '/sales/customers',        icon: Users,          keywords: 'customers عملاء', group: 'البيع' },
  { id: 'abandoned',         label: 'العربات المتروكة',      path: '/sales/abandoned-carts',  icon: ShoppingBag,    keywords: 'abandoned carts متروكة سلال', group: 'البيع' },
  { id: 'shipping',          label: 'إدارة الشحن',           path: '/sales/shipping',         icon: Truck,          keywords: 'shipping شحن delivery', group: 'البيع' },
  { id: 'channels',          label: 'ربط قنوات البيع',       path: '/sales/channels',         icon: Store,          keywords: 'channels marketplaces قنوات سلة زد نون', group: 'البيع' },

  // Marketing
  { id: 'marketing-hub',     label: 'مركز التسويق',          path: '/marketing',              icon: Sparkles,       keywords: 'marketing hub', group: 'التسويق' },
  { id: 'promotions',        label: 'إدارة العروض',          path: '/marketing/promotions',   icon: Percent,        keywords: 'promotions عروض sale', group: 'التسويق' },
  { id: 'coupons',           label: 'إدارة الكوبونات',       path: '/marketing/coupons',      icon: TicketPercent,  keywords: 'coupons codes كوبونات', group: 'التسويق' },
  { id: 'loyalty',           label: 'إدارة الولاء',          path: '/marketing/loyalty',      icon: Coins,          keywords: 'loyalty points ولاء نقاط', group: 'التسويق' },
  { id: 'whatsapp',          label: 'حملات الواتساب',        path: '/marketing/whatsapp',     icon: MessageSquare,  keywords: 'whatsapp واتساب', group: 'التسويق' },

  // Finance
  { id: 'finance-hub',       label: 'مركز المالية',          path: '/finance',                icon: Coins,          keywords: 'finance money', group: 'المالية' },
  { id: 'wallet',            label: 'المحفظة والتسويات',     path: '/finance/wallet',         icon: Wallet,         keywords: 'wallet balance محفظة رصيد', group: 'المالية' },
  { id: 'subscription',      label: 'الاشتراك والفواتير',    path: '/finance/subscriptions',  icon: Crown,          keywords: 'subscription billing اشتراك فاتورة', group: 'المالية' },
  { id: 'compliance',        label: 'التحقق والامتثال',      path: '/finance/compliance',     icon: Shield,         keywords: 'kyc zatca compliance ضريبة سجل تجاري', group: 'المالية' },

  // Insights
  { id: 'reports',           label: 'التقارير التشغيلية',    path: '/reports',                icon: BarChart3,      keywords: 'reports تقارير', group: 'التحليلات' },
  { id: 'growth',            label: 'مؤشرات النمو',          path: '/growth',                 icon: TrendingUp,     keywords: 'growth insights نمو', group: 'التحليلات' },
  { id: 'live',              label: 'النشاط الحي',           path: '/live',                   icon: Activity,       keywords: 'live radar حي', group: 'التحليلات' },
  { id: 'exports',           label: 'تصدير البيانات',        path: '/exports',                icon: Download,       keywords: 'exports تصدير', group: 'التحليلات' },
  { id: 'imports',           label: 'استيراد البيانات',      path: '/imports',                icon: FileSpreadsheet,keywords: 'imports استيراد', group: 'التحليلات' },

  // Support
  { id: 'support',           label: 'مركز الدعم',            path: '/support',                icon: Headphones,     keywords: 'support help دعم مساعدة', group: 'الدعم' },

  // Settings
  { id: 'settings',          label: 'إعدادات المتجر',        path: '/settings',               icon: Settings,       keywords: 'settings إعدادات', group: 'الإعدادات' },
  { id: 'employees',         label: 'الموظفون والصلاحيات',   path: '/employees',              icon: UserCog,        keywords: 'employees roles موظفين صلاحيات', group: 'الإعدادات' },
  { id: 'policies',          label: 'السياسات والصفحات',     path: '/policies',               icon: FileText,       keywords: 'policies سياسات', group: 'الإعدادات' },
  { id: 'notifications',     label: 'تفضيلات الإشعارات',     path: '/notifications',          icon: Bell,           keywords: 'notifications إشعارات', group: 'الإعدادات' },
  { id: 'ai',                label: 'المساعد الذكي',         path: '/ai-assistant',           icon: Bot,            keywords: 'ai assistant مساعد', group: 'الإعدادات' },
  { id: 'theme',             label: 'تخصيص الثيم',           path: '/theme',                  icon: Palette,        keywords: 'theme تخصيص ثيم', group: 'الإعدادات' },
  { id: 'theme-store',       label: 'متجر الثيمات',          path: '/theme-store',            icon: Palette,        keywords: 'theme store ثيمات', group: 'الإعدادات' },
  { id: 'audit-logs',        label: 'سجل التغييرات',         path: '/audit-logs',             icon: History,        keywords: 'audit logs سجل', group: 'الإعدادات' },

  // Developers
  { id: 'api-keys',          label: 'مفاتيح API',            path: '/api-keys',               icon: Key,            keywords: 'api keys مفاتيح', group: 'المطوّرون' },
  { id: 'migration',         label: 'استيراد وهجرة المتجر',  path: '/migration',              icon: ArrowLeftRight, keywords: 'migration import هجرة', group: 'المطوّرون' },

  // Quick actions
  { id: 'new-product',       label: 'إضافة منتج جديد',       description: 'افتح نموذج إنشاء منتج', path: '/catalog/products', icon: Plus, keywords: 'create new product منتج جديد', group: 'إنشاء سريع' },
  { id: 'new-coupon',        label: 'إضافة كوبون جديد',      description: 'افتح نموذج إنشاء كوبون', path: '/marketing/coupons', icon: Plus, keywords: 'create new coupon كوبون جديد', group: 'إنشاء سريع' },
];

const RECENT_KEY = 'cmdk.recent.v1';
const MAX_RECENT = 5;

function readRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, MAX_RECENT) : [];
  } catch { return []; }
}

function pushRecent(id: string) {
  try {
    const cur = readRecent().filter((x) => x !== id);
    cur.unshift(id);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, MAX_RECENT)));
  } catch { /* localStorage disabled — ignore */ }
}

function score(cmd: Command, q: string): number {
  if (!q) return 0;
  const haystack = `${cmd.label} ${cmd.keywords} ${cmd.path}`.toLowerCase();
  const needle = q.toLowerCase().trim();
  if (haystack.includes(needle)) return 10;
  // Token AND-match: every token must appear somewhere.
  const tokens = needle.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every((t) => haystack.includes(t))) return 5;
  return 0;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state every time the palette opens. Otherwise the user
  // sees their last query stuck inside.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      // Focus the input on the next paint.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) {
      // No query → recents first, then everything else.
      const recents = readRecent();
      const recent = recents
        .map((id) => COMMANDS.find((c) => c.id === id))
        .filter((c): c is Command => Boolean(c));
      const rest = COMMANDS.filter((c) => !recents.includes(c.id));
      return [...recent, ...rest];
    }
    return COMMANDS
      .map((c) => ({ c, s: score(c, query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c);
  }, [query]);

  const runCommand = useCallback((cmd: Command) => {
    pushRecent(cmd.id);
    onClose();
    navigate(cmd.path);
  }, [navigate, onClose]);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[activeIdx];
      if (target) runCommand(target);
    }
  }, [activeIdx, results, runCommand, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label={t('cmdk.aria', 'بحث سريع')}
      onClick={onClose}
      data-testid="cmdk-overlay"
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-neutral-200"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKey}
      >
        <div className="relative border-b border-neutral-100">
          <Search className="absolute h-4 w-4 text-neutral-400 top-1/2 -translate-y-1/2" style={{ insetInlineStart: '1rem' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            placeholder={t('cmdk.placeholder', 'ابحث عن صفحة، إجراء، أو اختصار...')}
            className="w-full h-14 bg-transparent text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
            style={{ paddingInline: '3rem 1rem' }}
            aria-autocomplete="list"
            aria-controls="cmdk-list"
            data-testid="cmdk-input"
          />
        </div>
        <ul
          id="cmdk-list"
          role="listbox"
          className="max-h-[60vh] overflow-y-auto py-2"
          data-testid="cmdk-list"
        >
          {results.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-neutral-400">
              {t('cmdk.empty', 'لا توجد نتائج')}
            </li>
          )}
          {results.map((cmd, i) => {
            const Icon = cmd.icon;
            const active = i === activeIdx;
            return (
              <li
                key={cmd.id}
                role="option"
                aria-selected={active}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => runCommand(cmd)}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${active ? 'bg-primary-50' : 'hover:bg-neutral-50'}`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${active ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-500'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{cmd.label}</p>
                  {cmd.description && (
                    <p className="text-xs text-neutral-500 truncate">{cmd.description}</p>
                  )}
                </div>
                {!query.trim() && (
                  <span className="text-xs text-neutral-400 shrink-0">{cmd.group}</span>
                )}
                {active && (
                  <span className="flex items-center gap-1 text-xs text-primary-600 shrink-0">
                    {t('cmdk.enter', 'انتقال')}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <div className="px-4 py-2 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <ArrowLeftIcon className="h-3 w-3" /> {t('cmdk.hint.navigate', 'سهم لأعلى/أسفل للتنقل')}
          </span>
          <span>{t('cmdk.hint.close', 'Esc للإغلاق')}</span>
        </div>
      </div>
    </div>
  );
}
