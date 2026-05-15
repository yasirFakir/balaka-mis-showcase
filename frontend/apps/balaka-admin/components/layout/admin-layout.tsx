"use client";

import { AdminSidebar } from "./admin-sidebar";
import { MobileHeader } from "./mobile-header";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { ProtectedRoute } from "../shared/protected-route";
import { GoniaContainer, GoniaStack, ForcePasswordChangeDialog, useNotifications } from "@/ui";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context";
import { CurrencyProvider } from "@/core/currency-context";
import { useAuth } from "@/lib/auth-context";
import { fetchClient } from "@/core/api";


interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayoutContent({ children }: AdminLayoutProps) {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const { user, refreshUser } = useAuth();
  const { toast } = useNotifications();

  const handlePasswordChange = async (current: string, next: string) => {
    await fetchClient("/api/v1/users/me", {
      method: "PUT",
      body: JSON.stringify({
        current_password: current,
        password: next
      })
    });
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-background overflow-x-hidden">
        <MobileHeader />
        <AdminSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        <main 
          className={cn(
              "flex-1 transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] min-w-0 pb-28 md:pb-0",
              "will-change-[padding] transform-gpu",
              // Only apply margin on larger screens if sidebar is NOT floating
              isCollapsed ? "md:pl-16" : "md:pl-64"
          )}
        >
          <GoniaContainer size="full" className="py-6 md:py-8">
            <GoniaStack gap="lg">
                {children}
            </GoniaStack>
          </GoniaContainer>
        </main>
        <MobileBottomNav />

        {user?.must_change_password && !user.roles.every(r => r.name === "Client") && (
          <ForcePasswordChangeDialog 
            isOpen={true}
            onSubmit={handlePasswordChange}
            onSuccess={() => {
              toast.success("Password updated. Your account is now secured.");
              refreshUser();
            }}
          />
        )}
    </div>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <ProtectedRoute>
      <CurrencyProvider>
        <SidebarProvider>
          <AdminLayoutContent>{children}</AdminLayoutContent>
        </SidebarProvider>
      </CurrencyProvider>
    </ProtectedRoute>
  );
}
