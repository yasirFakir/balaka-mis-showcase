"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchClient } from "@/core/api";
import { useNotifications, Button, GoniaCard, GoniaCardHeader, H2, GoniaDataTable, Column, LoadingSpinner, gonia, Badge } from "@/ui";
import { format } from "date-fns";
import { ShieldCheck, ShieldAlert, UserX, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface BannedUser {
  id: number;
  full_name: string;
  email: string;
  support_banned_until: string | null;
  is_support_banned_permanently: boolean;
  support_violation_count: number;
}

export function BannedUsersList() {
  const { toast } = useNotifications();
  const [users, setUsers] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBannedUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchClient<{ items: BannedUser[] }>("/api/v1/tickets/admin/banned-users");
      setUsers(response.items || []);
    } catch (error) {
      toast.error("Failed to load banned users");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadBannedUsers();
  }, [loadBannedUsers]);

  const handleLiftBan = async (userId: number) => {
    try {
      await fetchClient(`/api/v1/tickets/admin/lift-ban/${userId}`, { method: "POST" });
      toast.success("Support access restored for user");
      loadBannedUsers();
    } catch (error) {
      toast.error("Failed to lift ban");
    }
  };

  const columns: Column<BannedUser>[] = [
    {
      id: "user",
      header: "User",
      cell: (u: BannedUser) => (
        <div className="flex flex-col pl-8">
          <span className="font-bold text-sm text-primary uppercase tracking-tight">{u.full_name || "Unknown"}</span>
          <span className="text-[10px] opacity-40 lowercase font-mono">{u.email}</span>
        </div>
      )
    },
    {
        id: "violations",
        header: "Violations",
        className: "text-center",
        cell: (u: BannedUser) => (
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-black text-primary">{u.support_violation_count}</span>
            <span className="text-[8px] font-black uppercase tracking-normal opacity-40">Strikes</span>
          </div>
        )
    },
    {
      id: "status",
      header: "Ban Status",
      cell: (u: BannedUser) => {
        if (u.is_support_banned_permanently) {
            return (
                <Badge className="bg-destructive text-white border-none rounded-none text-[9px] font-black uppercase tracking-normal flex gap-1.5 h-6">
                    <ShieldAlert className="h-3 w-3" /> Permanent Ban
                </Badge>
            );
        }
        
        const now = new Date();
        const bannedUntil = u.support_banned_until ? new Date(u.support_banned_until) : null;
        
        if (bannedUntil && bannedUntil > now) {
            return (
                <Badge className="bg-amber-600 text-white border-none rounded-none text-[9px] font-black uppercase tracking-normal flex gap-1.5 h-6">
                    <Clock className="h-3 w-3" /> Cooldown: {format(bannedUntil, "HH:mm")}
                </Badge>
            );
        }

        return (
            <Badge className="bg-emerald-600 text-white border-none rounded-none text-[9px] font-black uppercase tracking-normal flex gap-1.5 h-6">
                <ShieldCheck className="h-3 w-3" /> Clean Record
            </Badge>
        );
      }
    },
    {
      id: "actions",
      header: "Actions",
      className: "text-right pr-8",
      cell: (u: BannedUser) => (
        <Button 
            onClick={() => handleLiftBan(u.id)}
            variant="outline" 
            className={cn(gonia.button.base, gonia.button.outline, "h-7 text-[9px] border-emerald-600/20 text-emerald-700 hover:bg-emerald-50")}
            disabled={!u.is_support_banned_permanently && (!u.support_banned_until || new Date(u.support_banned_until) < new Date())}
        >
          Lift Restrictions
        </Button>
      )
    }
  ];

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center border border-dashed border-primary/20 bg-white">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <GoniaCard>
      <GoniaCardHeader className="flex flex-row items-center justify-between">
        <H2 className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-destructive" /> Support Restrictions & Bans
        </H2>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-normal">
            {users.length} Restricted Users
        </p>
      </GoniaCardHeader>
      <div className="p-0">
        <GoniaDataTable 
          data={users} 
          columns={columns} 
          searchKey="full_name"
          searchPlaceholder="Search by Name..."
          isLoading={loading}
        />
      </div>
    </GoniaCard>
  );
}