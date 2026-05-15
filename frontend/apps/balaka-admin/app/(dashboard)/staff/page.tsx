"use client";

import { ProtectedRoute } from "@/components/shared/protected-route";
import { CreateStaffDialog } from "@/components/users/create-staff-dialog";
import { UserList } from "@/components/users/user-list";
import { ShieldCheck, UserPlus } from "lucide-react";
import { gonia } from "@/ui";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function StaffPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleStaffCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <ProtectedRoute requiredPermissions="users.manage">
      <div className="space-y-8">
        {/* Gonia v1.5 Anchored Header */}
        <div className={gonia.layout.pageHeader}>
            <div className="space-y-1">
                <h1 className={cn(gonia.text.h1, "flex items-center gap-3")}>
                    <ShieldCheck className="h-8 w-8" /> Administrative Team
                </h1>
                <p className={gonia.text.caption}>
                    Manage staff accounts, regional office assignments, and system access levels.
                </p>
            </div>
            <CreateStaffDialog onStaffCreated={handleStaffCreated} />
        </div>

        <div className="space-y-6">
            <UserList key={refreshKey} roleFilter="Staff" />
        </div>
      </div>
    </ProtectedRoute>
  );
}