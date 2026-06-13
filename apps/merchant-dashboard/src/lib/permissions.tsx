import { useAuth } from '@/hooks/useAuth';
import type { ReactNode } from 'react';

export function usePermissions() {
  const { user } = useAuth();
  const permissions: string[] = (user as any)?.permissions ?? [];

  function can(permission: string): boolean {
    return permissions.includes(permission);
  }

  function canAny(...perms: string[]): boolean {
    return perms.some(p => permissions.includes(p));
  }

  function canAll(...perms: string[]): boolean {
    return perms.every(p => permissions.includes(p));
  }

  return { can, canAny, canAll, permissions };
}

export function PermissionGate({
  permission,
  permissions: anyPerms,
  allPermissions,
  fallback = null,
  children,
}: {
  permission?: string;
  permissions?: string[];
  allPermissions?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const perms = usePermissions();

  if (permission && !perms.can(permission)) return fallback;
  if (anyPerms && !perms.canAny(...anyPerms)) return fallback;
  if (allPermissions && !perms.canAll(...allPermissions)) return fallback;

  return <>{children}</>;
}
