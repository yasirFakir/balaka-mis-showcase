"use client";

import { useAuth } from "@/lib/auth-context";
import { useNotifications, LoadingSpinner } from "@/ui";
import { useRouter, usePathname } from "@/i18n/navigation";

import { useEffect, useMemo } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

const EMPTY_ARRAY: string[] = [];

export function ProtectedRoute({ children, requiredRoles = EMPTY_ARRAY }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { toast } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();

  const memoizedRoles = useMemo(() => requiredRoles, [requiredRoles]);

    useEffect(() => {
      if (!loading && !user) {
        const returnUrl = encodeURIComponent(pathname);
        router.push(`/auth?returnUrl=${returnUrl}`);
      } else if (!loading && user && memoizedRoles.length > 0) {
      const hasRequiredRole = user.roles.some((role) =>
        memoizedRoles.includes(role.name)
      );
      if (!hasRequiredRole) {
        toast.error("You do not have permission to access this page.");
        router.push("/");
      }
    }
  }, [user, loading, router, pathname, memoizedRoles, toast]);

  if (loading || !user) {
    return <LoadingSpinner size="lg" full />;
  }
  
  if (memoizedRoles.length > 0) {
     const hasRequiredRole = user.roles.some((role) =>
          memoizedRoles.includes(role.name)
     );
     if (!hasRequiredRole) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p>You do not have permission to view this page.</p>
            </div>
        )
     };
  }

  return <>{children}</>;
}
