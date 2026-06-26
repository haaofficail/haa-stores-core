// SANCTIONED REGISTRY — ISSUE-0009 (admin-dashboard).
//
// Mirror of apps/merchant-dashboard/src/components/ui/icon-registry.ts
// and apps/storefront/src/components/ui/icon-registry.ts. Holds every
// lucide icon used in admin-dashboard, keyed by PascalCase name.
//
// Going forward, new admin-dashboard files MUST use this registry via
// the Icon wrapper instead of importing `lucide-react` directly. The
// `tests/lucide-migration-progress.test.ts` ceiling excludes this file
// from the count (WRAPPER_FILES set).
//
// Adding a new icon? Import it from lucide-react here and add it to
// the map. The exported `AdminIconName` union picks up the keys
// automatically, so TypeScript fails on unregistered names.

import {
  Eye, FileText, Inbox, Mail, Plus, X,
  type LucideIcon,
} from 'lucide-react';

export const ADMIN_ICON_REGISTRY = {
  Eye, FileText, Inbox, Mail, Plus, X,
} as const satisfies Record<string, LucideIcon>;

export type AdminIconName = keyof typeof ADMIN_ICON_REGISTRY;
