// src/components/common/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { ReactNode } from "react";
import type { Permission } from "@/hooks/usePermissions";

interface ProtectedRouteProps {
  permission: Permission;
  children: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ permission, children, redirectTo = "/sala-agil" }: ProtectedRouteProps) {
  const { hasPermission, loading } = useAuth();

  if (loading) return null; // aguarda carregar permissões

  if (!hasPermission(permission)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
