"use client";

import { useAuth } from "@/lib/auth-context";
import { useNotifications, LoadingSpinner } from "@/ui";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";


interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string | string[];
}

const EMPTY_ARRAY: string[] = [];

export function ProtectedRoute({ children, requiredRoles = EMPTY_ARRAY, requiredPermissions }: ProtectedRouteProps) {
  const { user, loading, hasPermission } = useAuth();
  const { toast } = useNotifications();
  const router = useRouter();

  const memoizedRoles = useMemo(() => requiredRoles, [requiredRoles]);
  const memoizedPermissions = useMemo(() => {
      if (!requiredPermissions) return null;
      return Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  }, [requiredPermissions]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth");
      } else {
        const hasRole = memoizedRoles.length === 0 || user.is_superuser || user.roles.some(r => memoizedRoles.includes(r.name));
        
        // Check if ANY required permission is held
        const hasPerm = !memoizedPermissions || memoizedPermissions.length === 0 || memoizedPermissions.some(p => hasPermission(p));
        
        if (!hasRole || !hasPerm) {
             toast.error("You do not have permission to access this page.");
             router.push("/"); 
        }
      }
    }
  }, [user, loading, router, memoizedRoles, memoizedPermissions, hasPermission, toast]);

  if (loading || !user) {
    return <LoadingSpinner full />;
  }
  
  const hasRole = memoizedRoles.length === 0 || user.is_superuser || user.roles.some(r => memoizedRoles.includes(r.name));
  const hasPerm = !memoizedPermissions || memoizedPermissions.length === 0 || memoizedPermissions.some(p => hasPermission(p));
  
  if (!hasRole || !hasPerm) return null;

  return <>{children}</>;
}