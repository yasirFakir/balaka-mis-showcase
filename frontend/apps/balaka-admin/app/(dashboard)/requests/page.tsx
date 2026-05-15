"use client";

import { ProtectedRoute } from "@/components/shared/protected-route";
import { RequestList } from "@/components/requests/request-list";
import { Inbox, Briefcase } from "lucide-react";
import { gonia, Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui";
import { cn } from "@/lib/utils";
import { CurrencySwitcher } from "@/components/shared/currency-switcher";
import { useSearchParams } from "next/navigation";

export default function RequestsPage() {
  const searchParams = useSearchParams();
  const initialFilters: Record<string, any> = {};
  
  const statusParams = searchParams.getAll("status");
  if (statusParams && statusParams.length > 0) {
      initialFilters.status = statusParams;
  }

  // Determine default tab based on potential query param or default
  // Ideally, we could add ?view=internal support, but 'client' is a safe default
  const defaultTab = searchParams.get("view") === "internal" ? "internal" : "client";

  return (
    <ProtectedRoute>
      <div className="space-y-8">
        {/* Gonia v1.5 Anchored Header */}
        <div className={gonia.layout.pageHeader}>
            <div className="space-y-1">
                <h1 className={cn(gonia.text.h1, "flex items-center gap-3")}>
                    <Inbox className="h-8 w-8" /> All Requests
                </h1>
                <p className={gonia.text.caption}>
                    Manage and track all service applications and internal operations.
                </p>
            </div>
            <CurrencySwitcher />
        </div>

        <Tabs defaultValue={defaultTab} className="w-full space-y-6">
            <TabsList className={cn(gonia.tabs.list, "bg-[var(--gonia-canvas)]/50")}>
                <TabsTrigger 
                    value="client" 
                    className={cn(
                        gonia.tabs.trigger,
                        "data-[state=active]:text-white"
                    )}
                >
                    <span className="flex items-center gap-2">
                        <Inbox className="h-4 w-4" /> Client Requests
                    </span>
                </TabsTrigger>
                <TabsTrigger 
                    value="internal" 
                    className={cn(
                        gonia.tabs.trigger,
                        "data-[state=active]:text-white"
                    )}
                >
                    <span className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" /> Internal Operations
                    </span>
                </TabsTrigger>
            </TabsList>

            <TabsContent value="client" className="mt-0">
                <div className={cn(gonia.layout.card, "overflow-hidden p-0 bg-white")}>
                    <RequestList initialFilters={initialFilters} isInternal={false} />
                </div>
            </TabsContent>

            <TabsContent value="internal" className="mt-0">
                <div className={cn(gonia.layout.card, "overflow-hidden p-0 bg-white")}>
                    <RequestList initialFilters={initialFilters} isInternal={true} />
                </div>
            </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}