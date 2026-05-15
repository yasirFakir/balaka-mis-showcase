"use client";

import { useEffect, useState, useMemo } from "react";
import { useGoniaDirectory } from "@/core/hooks/use-gonia-directory";
import { 
  GoniaCard, 
  GoniaCardHeader, 
  H2, 
  GoniaDataTable, 
  Column, 
  LoadingSpinner, 
  gonia, 
  GoniaIcons, 
  Input, 
  Button, 
  Badge 
} from "@/ui";
import { useCurrency } from "@/core/currency-context";
import { format } from "date-fns";
import { DollarSign, Eye } from "lucide-react";
import { TransactionDetailModal } from "./transaction-detail-modal";
import { cn } from "@/lib/utils";
import { Transaction, TransactionSummary } from "@/core/types";
import { FinanceFilters } from "./finance-filters";
import { summaryStore } from "@/lib/summary-store";

export function RevenueList() {
  const { formatCurrency } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: transactions, summary, loading, total, page, setPage, limit } = useGoniaDirectory<Transaction, TransactionSummary>({
    endpoint: "/api/v1/transactions/",
    filters: useMemo(() => ({
        ...activeFilters,
        transaction_type: "Payment",
        status: "Verified",
        min_amount: 0
    }), [JSON.stringify(activeFilters)]),
    search: debouncedSearch,
    limit: 10
  });

  // Persist summary to prevent flicker on re-mount
  useEffect(() => {
    if (summary) summaryStore.set("revenue_summary", summary);
  }, [summary]);

  const activeSummary = summary || summaryStore.get("revenue_summary");
  const totalRevenue = activeSummary?.verified_total ?? 0;

  const columns: Column<Transaction>[] = [
    {
      id: "id",
      header: "TXN ID",
      accessorKey: "transaction_id",
      className: "pl-8 font-mono text-[10px] text-muted-foreground w-[120px]",
      cell: (txn: Transaction) => (
        <span className="font-mono font-bold text-primary/40 group-hover:text-primary transition-colors">
          #{txn.transaction_id.split('-').pop()}
        </span>
      )
    },
    {
      id: "date",
      header: "Date",
      className: "w-[120px]",
      cell: (txn: Transaction) => {
        const date = txn.created_at ? new Date(txn.created_at) : null;
        const isValidDate = date && !isNaN(date.getTime());
        return (
          <span className="font-mono text-[12px] text-primary/40 font-bold">
            {isValidDate ? format(date!, "dd MMM yyyy") : "N/A"}
          </span>
        );
      }
    },
    {
      id: "operation",
      header: "Service Operation",
      cell: (txn: Transaction) => (
        <div className="flex flex-col">
          <span className="font-bold text-sm text-primary uppercase">
            {txn.service_request?.service_definition?.name || "Standard Service"}
          </span>
          <span className="font-mono text-[10px] opacity-40 uppercase tracking-tighter">REQ-#{txn.service_request_id}</span>
        </div>
      )
    },
    {
      id: "customer",
      header: "Customer",
      cell: (txn: Transaction) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-primary/80 uppercase">{txn.user?.full_name || txn.service_request?.user?.full_name || "N/A"}</span>
          <span className="font-mono text-[10px] opacity-40 uppercase tracking-tighter truncate max-w-[150px]">{txn.user?.email || txn.service_request?.user?.email}</span>
        </div>
      )
    },
    {
      id: "method",
      header: "Method",
      cell: (txn: Transaction) => <Badge variant="outline" className="text-[9px] uppercase font-bold border-primary/10">{txn.payment_method}</Badge>
    },
    {
      id: "revenue",
      header: "Revenue",
      accessorKey: "amount",
      className: "text-right",
      cell: (txn: Transaction) => (
        <div className="flex flex-col text-right">
            <span className="font-mono text-[14px] text-emerald-600 font-bold">
            +{formatCurrency(txn.amount)}
            </span>
            {txn.claimed_currency && txn.claimed_currency !== "SAR" && txn.claimed_amount && (
                <span className="text-[10px] text-muted-foreground font-mono">
                    ({txn.claimed_currency} {txn.claimed_amount})
                </span>
            )}
        </div>
      )
    },
    {
      id: "actions",
      header: "Action",
      className: "text-right pr-8",
      cell: (txn: Transaction) => (
        <TransactionDetailModal 
          transaction={txn}
          trigger={
            <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-primary/60 hover:text-primary border-primary/10 rounded-none shadow-none">
              <Eye className="h-3.5 w-3.5" />
            </Button>
          }
        />
      )
    }
  ];

  return (
    <div className="space-y-4">
      <GoniaCard>
        <GoniaCardHeader className="p-4 md:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-primary opacity-40" />
                <H2 className="whitespace-nowrap">Revenue Stream</H2>
            </div>
            
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[9px] uppercase font-black text-muted-foreground tracking-normal opacity-60">Verified Liquidity</span>
              <span className={cn(gonia.text.mono, "text-2xl text-primary font-black")}>
                {loading && !activeSummary ? "..." : formatCurrency(totalRevenue)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full">
            <div className="relative flex-1 min-w-0">
                <GoniaIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                    placeholder="Search revenue..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 text-xs rounded-none border-primary/20 focus:border-primary/40 bg-white shadow-sm w-full"
                />
            </div>
            <FinanceFilters 
              onFilterChange={setActiveFilters}
              showService
              showPaymentMethod
            />
          </div>

          <div className="flex sm:hidden items-center justify-between border-t border-primary/10 pt-3 mt-1">
            <span className="text-[10px] uppercase font-black text-muted-foreground">Verified Liquidity</span>
            <span className={cn("text-lg font-black text-primary font-mono")}>
              {loading && !activeSummary ? "..." : formatCurrency(totalRevenue)}
            </span>
          </div>
        </div>
      </GoniaCardHeader>
      <div className="p-0">
        <GoniaDataTable 
          data={transactions} 
          columns={columns} 
          total={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
          searchable={false}
          isLoading={loading}
          renderMobileCard={(txn) => (
            <div className="flex flex-col gap-3 relative">
              <div className="flex justify-between items-start gap-3">
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary/40 text-[9px] bg-primary/5 px-1 py-0.5 rounded-sm truncate">
                      #{txn.transaction_id.split('-').pop()}
                    </span>
                    <Badge variant="success" className="h-4 text-[8px] px-1 py-0 shrink-0">Verified</Badge>
                  </div>
                  <span className="font-bold text-xs text-primary uppercase leading-tight truncate">
                    {txn.service_request?.service_definition?.name || "Payment"}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-end border-t border-primary/5 pt-2">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-primary/60 truncate max-w-[150px]">
                    {txn.user?.full_name || txn.service_request?.user?.full_name}
                  </span>
                  <span className="text-sm font-black text-emerald-600 font-mono">+{formatCurrency(txn.amount)}</span>
                  {txn.claimed_currency && txn.claimed_currency !== "SAR" && txn.claimed_amount && (
                      <span className="text-[9px] text-muted-foreground font-mono">
                          ({txn.claimed_currency} {txn.claimed_amount})
                      </span>
                  )}
                </div>
                <div className="shrink-0">
                  <TransactionDetailModal transaction={txn} />
                </div>
              </div>
            </div>
          )}
        />
      </div>
    </GoniaCard>
    </div>
  );
}