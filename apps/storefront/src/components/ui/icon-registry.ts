/**
 * Central registry of every lucide icon used in the storefront, keyed by
 * PascalCase name. Resolves ISSUE-0009 (TODO: P1-#5): feature code no
 * longer imports `lucide-react` directly — it passes a string name to
 * `<Icon name="ArrowLeft" />`, and the registry is the only file that
 * touches lucide.
 *
 * Adding a new icon? Import it from lucide-react here and add it to the
 * map. The exported `IconName` union picks up the keys automatically, so
 * TypeScript will fail if a feature file uses an unregistered name.
 *
 * Bundle note: every icon in this registry is bundled wherever the Icon
 * component is loaded. Keep the list scoped to icons that are actually
 * used somewhere in the storefront.
 */
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- ISSUE-0009: the registry is the single canonical entry point that's allowed to touch lucide.
import {
  AlertTriangle, ArrowLeft, ArrowRight, ArrowUp, BadgeCheck, Banknote, BarChart3, Bell, Box,
  Building, Building2, Calendar, Check, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, Clock,
  Coins, CreditCard, ExternalLink, Eye, FileText, Gift, Heart, Link as LinkIcon, Loader2, Lock, Mail, MapPin, Menu,
  Minus, Package, Phone, Plus, RefreshCcw, RefreshCw, Ruler, Search, Share2,
  Shield, ShieldCheck, ShoppingBag, ShoppingCart, Sparkles, Star, Store, Tag,
  Trash2, TrendingDown, TrendingUp, Truck, User, Users, Weight, X,
  type LucideIcon,
} from 'lucide-react';

export const ICON_REGISTRY = {
  AlertTriangle, ArrowLeft, ArrowRight, ArrowUp, BadgeCheck, Banknote, BarChart3, Bell, Box,
  Building, Building2, Calendar, Check, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, Clock,
  Coins, CreditCard, ExternalLink, Eye, FileText, Gift, Heart, LinkIcon, Loader2, Lock, Mail, MapPin, Menu,
  Minus, Package, Phone, Plus, RefreshCcw, RefreshCw, Ruler, Search, Share2,
  Shield, ShieldCheck, ShoppingBag, ShoppingCart, Sparkles, Star, Store, Tag,
  Trash2, TrendingDown, TrendingUp, Truck, User, Users, Weight, X,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICON_REGISTRY;
