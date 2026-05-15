"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { RevenueList } from "@/components/finance/revenue-list";
import { VendorTransactionList } from "@/components/finance/vendor-transaction-list";
import { ProfitList } from "@/components/finance/profit-list";
import { TransactionHistoryList } from "@/components/finance/transaction-history-list";
import { gonia, Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui";
import { CurrencySwitcher } from "@/components/shared/currency-switcher";
import { ExportLedgerDialog } from "@/components/finance/export-ledger-dialog";

import { Wallet } from "lucide-react";

import { cn } from "@/lib/utils";

export default function FinancePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(searchParams.get("view") || "revenue");

  useEffect(() => {
    const view = searchParams.get("view");
    if (view && view !== activeTab) {
      setActiveTab(view);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (value: string) => {
      setActiveTab(value);
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", value);
      router.replace(`/finance/records?${params.toString()}`, { scroll: false });
  };

  return (
    <ProtectedRoute requiredPermissions={["finance.view_ledger"]}>
      <div className="space-y-8">
        {/* Gonia v1.5 Anchored Header */}
        <div className={gonia.layout.pageHeader}>
            <div className="space-y-1">
                <h1 className={cn(gonia.text.h1, "flex items-center gap-3")}>
                    <Wallet className="h-8 w-8" /> Financial Record
                </h1>
                <p className={gonia.text.caption}>
                    Manage and audit all system revenue, vendor obligations, and profit analysis.
                </p>
            </div>
            <div className="flex items-center gap-3">
                <CurrencySwitcher />
                <ExportLedgerDialog />
            </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="w-full overflow-x-auto pb-2 mb-6 scrollbar-none">
                <TabsList className="mb-0 w-full sm:w-auto min-w-max">
                    <TabsTrigger value="revenue" className="gap-2">Sales Revenue</TabsTrigger>
                    <TabsTrigger value="expenses" className="gap-2">Vendor Payments</TabsTrigger>
                    <TabsTrigger value="profit" className="gap-2">Profitability</TabsTrigger>
                    <TabsTrigger value="verification" className="gap-2">Pending Verifications</TabsTrigger>
                    <TabsTrigger value="history" className="gap-2">Transaction Log</TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="revenue" className="mt-0 outline-none">
                <div className="space-y-6">
                    <RevenueList />
                </div>
            </TabsContent>
            
            <TabsContent value="expenses" className="mt-0 outline-none">
                <div className="space-y-6">
                    <VendorTransactionList />
                </div>
            </TabsContent>
            
            <TabsContent value="profit" className="mt-0 outline-none">
                <div className="space-y-6">
                    <ProfitList />
                </div>
            </TabsContent>

            <TabsContent value="verification" className="mt-0 outline-none">
                <div className="space-y-6">
                    <TransactionHistoryList initialFilters={{ status: "Pending" }} viewMode="verification" />
                </div>
            </TabsContent>

            <TabsContent value="history" className="mt-0 outline-none">
                <div className="space-y-6">
                    <TransactionHistoryList />
                </div>
            </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}