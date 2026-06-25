// SANCTIONED REGISTRY — ISSUE-0009 (merchant-dashboard).
//
// Mirror of apps/storefront/src/components/ui/icon-registry.ts. Holds every
// lucide icon used in merchant-dashboard, keyed by PascalCase name. Feature
// code no longer imports `lucide-react` directly — it passes a string name to
// `<Icon name="Bell" />` from `@/components/ui/icon`. The registry is the
// only file (besides the Icon wrapper) that touches lucide.
//
// Adding a new icon? Import it from lucide-react here and add it to the
// map. The exported `IconName` union picks up the keys automatically, so
// TypeScript will fail if a feature file uses an unregistered name.
//
// Bundle note: every icon in this registry is bundled wherever the Icon
// component is loaded. Keep the list scoped to icons actually used.

import {
  Activity, AlertTriangle, ArrowLeft, ArrowLeftRight, ArrowRight, BarChart3, Bell,
  Bot, Building2, CheckCircle2, Clock, Coins, Crown, Download, Edit, FileSpreadsheet,
  FileText, Headphones, History, Key, LayoutDashboard, Loader2, Lock, LogOut,
  Mail, MapPin, MessageSquare, Package, Palette, Percent, Phone, Plus, Rocket, Search,
  Settings as SettingsIcon, Shield, ShoppingBag, ShoppingCart, Smartphone, Sparkles,
  Store, Tag, Tags, TicketPercent, Trash2, TrendingUp, Truck, User, UserCog, Users, Wallet,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

export const MERCHANT_ICON_REGISTRY = {
  Activity, AlertTriangle, ArrowLeft, ArrowLeftRight, ArrowRight, BarChart3, Bell,
  Bot, Building2, CheckCircle2, Clock, Coins, Crown, Download, Edit, FileSpreadsheet,
  FileText, Headphones, History, Key, LayoutDashboard, Loader2, Lock, LogOut,
  Mail, MapPin, MessageSquare, Package, Palette, Percent, Phone, Plus, Rocket, Search,
  SettingsIcon, Shield, ShoppingBag, ShoppingCart, Smartphone, Sparkles,
  Store, Tag, Tags, TicketPercent, Trash2, TrendingUp, Truck, User, UserCog, Users, Wallet,
  XCircle,
} as const satisfies Record<string, LucideIcon>;

export type MerchantIconName = keyof typeof MERCHANT_ICON_REGISTRY;
