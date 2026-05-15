"use client";

import { useAuth } from "@/lib/auth-context";
import { ForcePasswordChangeDialog, useNotifications } from "@/ui";
import { fetchClient } from "@/core/api";

export function PasswordGuard({ children }: { children: React.ReactNode }) {
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
    <>
      {children}
      {user?.must_change_password && !user.roles.every(r => r.name === "Client") && (
        <ForcePasswordChangeDialog 
          isOpen={true}
          onSubmit={handlePasswordChange}
          onSuccess={() => {
            toast.success("Password updated successfully.");
            refreshUser();
          }}
        />
      )}
    </>
  );
}
