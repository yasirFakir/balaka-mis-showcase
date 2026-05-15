"use client";

import { ProtectedRoute } from "@/components/shared/protected-route";
import { AdminTicketList } from "@/components/support/admin-ticket-list";
import { AdminCreateTicketDialog } from "@/components/support/admin-create-ticket-dialog";
import { BannedUsersList } from "@/components/support/banned-users-list";
import { useState } from "react";
import { TicketIcon, Inbox, ShieldX } from "lucide-react";
import { gonia, Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui";
import { cn } from "@/lib/utils";

export default function SupportInboxPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTicketCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <ProtectedRoute requiredPermissions={["tickets.view_all", "tickets.view_assigned", "tickets.create"]}>
      <div className="space-y-8">
        {/* Gonia v1.5 Anchored Header */}
        <div className={gonia.layout.pageHeader}>
            <div className="space-y-1">
                <h1 className={cn(gonia.text.h1, "flex items-center gap-3")}>
                    <TicketIcon className="h-8 w-8" /> Support Center
                </h1>
                <p className={gonia.text.caption}>
                    Manage customer inquiries, assistance requests, and case resolutions.
                </p>
            </div>
            <AdminCreateTicketDialog onTicketCreated={handleTicketCreated} />
        </div>
        
        <Tabs defaultValue="inbox" className="w-full">
            <TabsList className="mb-6">
                <TabsTrigger value="inbox" className="flex items-center gap-2">
                    <Inbox className="h-4 w-4" /> Active Inbox
                </TabsTrigger>
                <TabsTrigger value="banned" className="flex items-center gap-2">
                    <ShieldX className="h-4 w-4" /> Anti-Spam & Bans
                </TabsTrigger>
            </TabsList>
            
            <TabsContent value="inbox" className="mt-0">
                <div className="space-y-6">
                    <AdminTicketList refreshKey={refreshKey} />
                </div>
            </TabsContent>
            
            <TabsContent value="banned" className="mt-0">
                <BannedUsersList />
            </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}