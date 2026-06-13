import { usePermissions } from '@/lib/permissions';
import { UnauthorizedState } from '@/components/ui/UnauthorizedState';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { ReactNode } from 'react';

export function PermissionRoute({
  permission,
  permissions,
  allPermissions,
  children,
}: {
  permission?: string;
  permissions?: string[];
  allPermissions?: string[];
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const { can, canAny, canAll } = usePermissions();

  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;

  const authorized =
    !permission && !permissions && !allPermissions ||
    (permission !== undefined && can(permission)) ||
    (permissions !== undefined && canAny(...permissions)) ||
    (allPermissions !== undefined && canAll(...allPermissions));

  if (!authorized) return <UnauthorizedState />;

  return <>{children}</>;
}
