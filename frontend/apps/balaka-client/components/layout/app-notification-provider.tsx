"use client";

import { useAuth } from "@/lib/auth-context";
import { NotificationProvider, NotificationToast } from "@/ui";

export function AppNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <NotificationProvider user={user}>
      {children}
      <NotificationToast />
    </NotificationProvider>
  );
}
