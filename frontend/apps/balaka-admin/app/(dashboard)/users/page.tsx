"use client";

import { ProtectedRoute } from "@/components/shared/protected-route";
import { UserList } from "@/components/users/user-list";
import { Users } from "lucide-react";
import { gonia } from "@/ui";
import { cn } from "@/lib/utils";

export default function UsersPage() {
  return (
    <ProtectedRoute>
      <div className="space-y-8">
        {/* Gonia v1.5 Anchored Header */}
        <div className={gonia.layout.pageHeader}>
            <div className="space-y-1">
                <h1 className={cn(gonia.text.h1, "flex items-center gap-3")}>
                    <Users className="h-8 w-8" /> Client Directory
                </h1>
                <p className={gonia.text.caption}>
                    View and manage all registered client accounts and their profiles.
                </p>
            </div>
        </div>

        <div className="space-y-6">
            <UserList roleFilter="Client" />
        </div>
      </div>
    </ProtectedRoute>
  );
}