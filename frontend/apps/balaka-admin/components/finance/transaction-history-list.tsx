"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useGoniaDirectory } from "@/core/hooks/use-gonia-directory";
import { 
  LoadingSpinner, 
  GoniaCard, 
  GoniaCardHeader, 
  H2, 
  GoniaDataTable, 
  Column, 
  Badge,
  Button,
  Input,
  GoniaIcons,
  gonia
} from "@/ui";
import { useCurrency } from "@/core/currency-context";
import { format } from "date-fns";
import { ReconcileDialog } from "./reconcile-dialog";
import { FlagTransactionDialog } from "./flag-transaction-dialog";
import { TrendingUp, TrendingDown, Eye, Printer, ShieldCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { UnifiedTransaction, AnalyticsSummary, Transaction } from "@/core/types";
import { UnifiedTransactionDetailModal } from "./unified-transaction-detail-modal";
import { FinanceFilters } from "./finance-filters";
import { summaryStore } from "@/lib/summary-store";

interface TransactionHistoryListProps {
  initialFilters?: Record<string, any>;
  viewMode?: "default" | "verification";
  limit?: number;
}

export function TransactionHistoryList({ initialFilters = {}, viewMode = "default", limit: propLimit }: TransactionHistoryListProps) {
  const { formatCurrency } = useCurrency();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>(initialFilters);

  const isVerification = viewMode === "verification";

  // Enforce pending status for verification view
  useEffect(() => {
    if (isVerification) {
        setActiveFilters(prev => ({ ...prev, status: "Pending" }));
    }
  }, [isVerification]);

  const typeOptions = useMemo(() => [
    { label: "Income (Client)", value: "INCOME" },
    { label: "Expense (Vendor)", value: "EXPENSE" }
  ], []);

  const statusOptions = useMemo(() => [
    { label: "Verified", value: "Verified" },
    { label: "Pending", value: "Pending" },
    { label: "Flagged", value: "Flagged" }
  ], []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: history, loading, total, page, setPage, limit, summary, refresh } = useGoniaDirectory<UnifiedTransaction, AnalyticsSummary>({
    endpoint: "/api/v1/analytics/all-history",
    filters: useMemo(() => isVerification ? { ...activeFilters, status: "Pending" } : activeFilters, [activeFilters, isVerification]),
    search: debouncedSearch,
    limit: propLimit || 10
  });

  // Persist summary to prevent flicker on re-mount
  useEffect(() => {
    if (summary) summaryStore.set("history_summary", summary);
  }, [summary]);

  const activeSummary = summary || summaryStore.get("history_summary");
  const netProfit = activeSummary?.net_profit ?? 0;
  const localNetBalance = history.reduce((sum, t) => {
    const isRevenue = t.type === "INCOME" || (t as any).transaction_type === "REVENUE";
    return sum + (isRevenue ? t.amount : -t.amount);
  }, 0);

  const displayProfit = activeSummary ? netProfit : localNetBalance;

  // Helper to convert UnifiedTransaction to Transaction for dialogs
  const getTransactionObj = (item: UnifiedTransaction): Transaction => {
      return {
          id: parseInt(item.id.split('-')[1]) || 0,
          transaction_id: item.reference,
          amount: item.amount,
          claimed_amount: item.claimed_amount,
          claimed_currency: item.claimed_currency,
          exchange_rate: item.exchange_rate || 1,
          payment_method: item.payment_method || "",
          status: item.status as any,
          client_reference_id: item.external_reference, // Map external ref to client ref
          user_id: 0, 
          base_price: 0,
          discount: 0,
          created_at: item.date,
          created_by_id: 0,
          user: { // Mock user for display context if needed
              id: 0, 
              full_name: item.actor_name || "Unknown", 
              email: "", 
              is_active: true, 
              is_superuser: false, 
              roles: [] 
          }
      };
  };

  // Dynamic columns based on viewMode
  const columns: Column<UnifiedTransaction>[] = useMemo(() => {
    if (isVerification) {
        return [
            {
                id: "service_request_id",
                header: "Service ID",
                cell: (item: UnifiedTransaction) => (
                    <span className="font-mono text-[12px] text-primary/60 font-bold">
                        {item.service_request_id ? `#${item.service_request_id}` : "N/A"}
                    </span>
                )
            },
            {
                id: "originator",
                header: "Originator",
                cell: (item: UnifiedTransaction) => (
                    <div className="flex flex-col">
                        <span className="font-bold text-sm text-primary">{item.actor_name || "Unknown"}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{item.type}</span>
                    </div>
                )
            },
            {
                id: "category",
                header: "Category",
                accessorKey: "category",
                cell: (item: UnifiedTransaction) => <span className="font-bold text-xs text-primary uppercase">{item.category}</span>
            },
            {
                id: "amount",
                header: "Price",
                cell: (item: UnifiedTransaction) => (
                    <div className="flex flex-col">
                        <span className={cn("font-mono text-[12px] font-bold", item.amount < 0 ? "text-red-600" : "text-emerald-600")}>
                            {formatCurrency(Math.abs(item.amount))}
                        </span>
                         {item.claimed_amount && (
                             <span className="text-[9px] text-muted-foreground font-mono">
                                ({item.claimed_currency} {item.claimed_amount})
                             </span>
                         )}
                    </div>
                )
            },
            {
                id: "method",
                header: "Method",
                cell: (item: UnifiedTransaction) => (
                    <span className="text-[10px] font-bold uppercase text-primary/80">{item.payment_method || "N/A"}</span>
                )
            },
            {
                id: "reference",
                header: "TXN ID",
                cell: (item: UnifiedTransaction) => (
                    <span className="font-mono text-[11px] text-primary/40 font-bold">{item.reference || "N/A"}</span>
                )
            },
            {
                id: "date",
                header: "Date",
                cell: (item: UnifiedTransaction) => {
                    const date = item.date ? new Date(item.date) : null;
                    return (
                    <span className="font-mono text-[11px] text-primary/60 font-bold whitespace-nowrap">
                        {date ? format(date, "dd MMM yyyy") : "N/A"}
                    </span>
                    );
                }
            },
            {
                id: "actions",
                header: "Action",
                className: "text-right pr-4",
                cell: (item: UnifiedTransaction) => {
                    const isClientTxn = item.type === "INCOME";
                    const isPending = item.status === "Pending";
                    const txnObj = isClientTxn ? getTransactionObj(item) : null;

                    return (
                        <div className="flex items-center justify-end gap-2">
                            <UnifiedTransactionDetailModal 
                                transaction={item}
                                trigger={
                                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-primary/60 hover:text-primary border-primary/10 rounded-none shadow-none">
                                        <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                }
                            />

                            {isPending && isClientTxn && txnObj && (
                                <>
                                    <ReconcileDialog 
                                        transaction={txnObj}
                                        onReconciled={refresh}
                                        trigger={
                                            <Button variant="outline" size="sm" className="h-7 rounded-none text-[9px] uppercase font-black hover:text-primary border-primary/10">
                                                Verify
                                            </Button>
                                        }
                                    />
                                    <FlagTransactionDialog 
                                        transactionId={txnObj.id}
                                        onFlagged={refresh}
                                        trigger={
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700">
                                                <AlertTriangle className="h-3.5 w-3.5" />
                                            </Button>
                                        }
                                    />
                                </>
                            )}
                            
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => window.print()}
                                className="h-7 rounded-none text-[9px] uppercase font-black hover:text-primary border-primary/10"
                            >
                                Print
                            </Button>
                        </div>
                    );
                }
            }
        ];
    }

    return [
    {
      id: "date",
      header: "Date",
      className: "pl-8",
      cell: (item: UnifiedTransaction) => {
        const date = item.date ? new Date(item.date) : null;
        const isValidDate = date && !isNaN(date.getTime());
        return (
          <span className="font-mono text-[12px] text-primary/40 font-bold whitespace-nowrap">
            {isValidDate ? format(date!, "MMM d, HH:mm") : "N/A"}
          </span>
        );
      }
    },
    {
      id: "type",
      header: "Type",
      cell: (item: UnifiedTransaction) => (
        item.type === "INCOME" ? (
          <span className="flex items-center text-[11px] text-emerald-600 font-black uppercase tracking-normal">
            <TrendingUp className="mr-1 h-3.5 w-3.5" /> IN
          </span>
        ) : (
          <span className="flex items-center text-[11px] text-red-600 font-black uppercase tracking-normal">
            <TrendingDown className="mr-1 h-3.5 w-3.5" /> OUT
          </span>
        )
      )
    },
    {
      id: "category",
      header: "Description / Category",
      accessorKey: "category",
      cell: (item: UnifiedTransaction) => <span className="font-bold text-sm text-primary uppercase">{item.category}</span>
    },
    {
      id: "reference",
      header: "Ref ID",
      cell: (item: UnifiedTransaction) => <span className="font-mono text-[11px] text-primary/40 font-bold">{item.reference || "N/A"}</span>
    },
    {
      id: "exchange_rate",
      header: "Ex. Rate",
      cell: (item: UnifiedTransaction) => (
        <div className="flex flex-col">
          <span className="font-mono text-[11px] font-bold text-primary">
            {item.exchange_rate ? item.exchange_rate.toFixed(2) : "1.00"}
          </span>
          <span className="text-[9px] text-muted-foreground font-bold">
             SAR/{item.claimed_currency || "SAR"}
          </span>
        </div>
      )
    },
    {
      id: "amount",
      header: "Amount",
      className: "text-right",
      cell: (item: UnifiedTransaction) => (
        <div className="flex flex-col">
            <span className={cn("font-mono text-[14px] font-bold", item.amount < 0 ? "text-red-600" : "text-emerald-600")}>
            {item.amount < 0 ? "-" : "+"}{formatCurrency(Math.abs(item.amount))}
            </span>
            {item.claimed_currency && item.claimed_currency !== "SAR" && item.claimed_amount && (
                <span className="text-[10px] text-muted-foreground font-mono">
                    ({item.claimed_currency} {item.claimed_amount})
                </span>
            )}
        </div>
      )
    },
    {
      id: "status",
      header: "Status",
      cell: (item: UnifiedTransaction) => (
        <Badge variant={item.status === "Verified" ? "success" : "warning"} className="text-[10px] font-black uppercase rounded-none">
          {item.status}
        </Badge>
      )
    },
    {
      id: "actions",
      header: "Action",
      className: "text-right pr-8",
      cell: (item: UnifiedTransaction) => (
        <UnifiedTransactionDetailModal 
          transaction={item}
          trigger={
            <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-primary/60 hover:text-primary border-primary/10 rounded-none shadow-none">
              <Eye className="h-3.5 w-3.5" />
            </Button>
          }
        />
      )
    }
  ];
  }, [isVerification, formatCurrency]);

  return (
    <div className="space-y-4">
      <GoniaCard>
        <GoniaCardHeader className="p-4 md:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <GoniaIcons.History className="h-5 w-5 text-primary opacity-40" />
                <H2 className="whitespace-nowrap">{isVerification ? "Pending Verifications" : "Combined History"}</H2>
            </div>
            
            {!isVerification && (
                <div className="hidden sm:flex flex-col items-end">
                <span className="text-[9px] uppercase font-black text-muted-foreground tracking-normal opacity-60">Net Profit</span>
                <span className={cn(gonia.text.mono, "text-2xl font-black", displayProfit >= 0 ? "text-primary" : "text-destructive")}>
                    {loading && !activeSummary ? "..." : formatCurrency(displayProfit)}
                </span>
                </div>
            )}
          </div>

          <div className="flex items-center gap-2 w-full">
            <div className="relative flex-1 min-w-0">
                <GoniaIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                    placeholder={isVerification ? "Search by ID or name..." : "Search history..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 text-xs rounded-none border-primary/20 focus:border-primary/40 bg-white shadow-sm w-full"
                />
            </div>
            
            <FinanceFilters 
                onFilterChange={setActiveFilters}
                showType={!isVerification}
                showStatus={!isVerification}
                showPaymentMethod={isVerification} // Enable payment method filter for verification
                typeOptions={typeOptions}
                statusOptions={statusOptions}
                initialFilters={initialFilters}
            />
          </div>

          {!isVerification && (
            <div className="flex sm:hidden items-center justify-between border-t border-primary/10 pt-3 mt-1">
                <span className="text-[10px] uppercase font-black text-muted-foreground">Net Profit</span>
                <span className={cn("text-lg font-black font-mono", displayProfit >= 0 ? "text-primary" : "text-destructive")}>
                {loading && !activeSummary ? "..." : formatCurrency(displayProfit)}
                </span>
            </div>
          )}
        </div>
      </GoniaCardHeader>
      <div className="p-0">
        <GoniaDataTable 
          data={history} 
          columns={columns} 
          total={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
          searchable={false}
          isLoading={loading}
          renderMobileCard={(item) => (
            <div className="flex flex-col gap-3 relative">
              <div className="flex justify-between items-start gap-3">
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.service_request_id && (
                        <span className="font-mono font-black text-primary text-[10px] bg-primary/10 px-1.5 py-0.5 border border-primary/10">
                            #{item.service_request_id}
                        </span>
                    )}
                    <span className="font-mono font-bold text-primary/40 text-[9px] bg-primary/5 px-1 py-0.5 rounded-none truncate">
                      {item.reference}
                    </span>
                    {isVerification && (
                        <span className="text-[10px] font-bold text-primary truncate max-w-[120px]">{item.actor_name}</span>
                    )}
                    {!isVerification && (
                         <Badge variant={item.status === "Verified" ? "success" : "warning"} className="h-4 text-[8px] px-1 py-0 shrink-0">
                            {item.status}
                         </Badge>
                    )}
                  </div>
                  
                  {isVerification ? (
                      <div className="flex flex-col gap-0.5 mt-1">
                          <span className="font-bold text-xs text-primary uppercase leading-tight truncate">
                            {item.category}
                          </span>
                          <span className="text-[9px] text-muted-foreground uppercase">{item.payment_method || "N/A"}</span>
                      </div>
                  ) : (
                     <span className="font-bold text-xs text-primary uppercase leading-tight truncate">
                        {item.category}
                     </span>
                  )}

                  {isVerification && (
                      <div className="flex flex-col mt-1">
                          <span className="font-mono text-sm font-black text-primary">
                             {formatCurrency(Math.abs(item.amount))}
                          </span>
                           {item.claimed_amount && (
                             <span className="text-[9px] text-muted-foreground font-mono">
                                ({item.claimed_currency} {item.claimed_amount})
                             </span>
                         )}
                      </div>
                  )}
                </div>
                
                {isVerification && (
                    <div className="flex items-center gap-2">
                         {item.type === "INCOME" && (
                             <>
                                <ReconcileDialog 
                                    transaction={getTransactionObj(item)}
                                    onReconciled={refresh}
                                    trigger={
                                        <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-primary/60 hover:bg-emerald-600 hover:text-white border-primary/10 rounded-none shadow-none transition-all">
                                            <ShieldCheck className="h-3.5 w-3.5" />
                                        </Button>
                                    }
                                />
                                <FlagTransactionDialog 
                                    transactionId={getTransactionObj(item).id}
                                    onFlagged={refresh}
                                    trigger={
                                        <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-primary/60 hover:bg-red-600 hover:text-white border-primary/10 rounded-none shadow-none transition-all">
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                        </Button>
                                    }
                                />
                             </>
                         )}
                         <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => window.print()}
                            className="h-7 w-7 p-0 text-primary/60 hover:bg-primary hover:text-white border-primary/10 rounded-none shadow-none transition-all"
                        >
                            <Printer className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                )}
              </div>
              
              {!isVerification && (
                <div className="flex justify-between items-end border-t border-primary/5 pt-2">
                    <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-primary/40 font-bold">
                        {item.date ? format(new Date(item.date), "dd MMM, hh:mm a") : "N/A"}
                    </span>
                    <span className={cn("text-sm font-black font-mono", item.amount < 0 ? "text-red-600" : "text-emerald-600")}>
                        {item.amount < 0 ? "-" : "+"}{formatCurrency(Math.abs(item.amount))}
                    </span>
                    {item.claimed_currency && item.claimed_currency !== "SAR" && item.claimed_amount && (
                        <span className="text-[9px] text-muted-foreground font-mono">
                            ({item.claimed_currency} {item.claimed_amount})
                        </span>
                    )}
                    </div>
                    <div className="shrink-0">
                    <UnifiedTransactionDetailModal transaction={item} />
                    </div>
                </div>
              )}
            </div>
          )}
        />
      </div>
    </GoniaCard>
    </div>
  );
}
