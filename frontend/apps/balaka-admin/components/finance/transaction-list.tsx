"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { fetchClient, API_URL } from "@/core/api";
import { useGoniaDirectory } from "@/core/hooks/use-gonia-directory";
import { 
  Badge, Button, GoniaCard, GoniaCardHeader, H2, 
  LoadingSpinner, useNotifications, 
  Popover, PopoverTrigger, PopoverContent, Input, GoniaIcons,
  GoniaDataTable, Column
} from "@/ui";
import { format } from "date-fns";
import { CheckCircle, AlertTriangle, Filter, Eye } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ReconcileDialog } from "./reconcile-dialog";
import { FlagTransactionDialog } from "./flag-transaction-dialog";
import { TransactionDetailModal } from "./transaction-detail-modal";
import { cn } from "@/lib/utils";
import { useServerEvents } from "@/lib/use-server-events";
import { Transaction } from "@/core/types";
import { useCurrency } from "@/core/currency-context";

interface TransactionListProps {
    serviceRequestId?: number; 
    category?: string;
    isPublic?: boolean;
    refreshKey?: number;
    onTransactionUpdated?: () => void;
    transactions?: Transaction[]; 
}

interface TransactionStats {
  all: number;
  verified: number;
  pending: number;
  flagged: number;
  rejected: number;
}

export function TransactionList({ 
    serviceRequestId, 
    category,
    isPublic,
    refreshKey, 
    onTransactionUpdated, 
    transactions: initialData 
}: TransactionListProps) {
  const { hasPermission } = useAuth();
  const { toast } = useNotifications();
  const { formatCurrency } = useCurrency();
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["All"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const prevRefreshKeyRef = useRef(refreshKey);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const endpoint = useMemo(() => serviceRequestId 
    ? `/api/v1/transactions/request/${serviceRequestId}` 
    : "/api/v1/transactions/"
  , [serviceRequestId]);

  const filters = useMemo(() => ({
    status: selectedStatuses.includes("All") ? undefined : selectedStatuses,
    category: category,
    is_public: isPublic
  }), [selectedStatuses, category, isPublic]);

  const { data: transactions, loading, refresh, total, summary, page, setPage, limit } = useGoniaDirectory<Transaction, { count_stats: TransactionStats }>({
    endpoint,
    search: debouncedSearch,
    filters: serviceRequestId ? undefined : filters, // Only filter main list
    limit: 10
  });
  
  const stats = summary?.count_stats || { all: 0, verified: 0, pending: 0, flagged: 0, rejected: 0 };

  useEffect(() => {
    if (refreshKey !== undefined && refreshKey !== prevRefreshKeyRef.current) {
        refresh();
        prevRefreshKeyRef.current = refreshKey;
    }
  }, [refreshKey, refresh]);

  const forceReload = () => {
    refresh();
  };

  useServerEvents((event, data) => {
     if (typeof data === "object" && (event === "transaction_created" || event === "transaction_updated")) {
         if (serviceRequestId) {
             if (Number(data.service_request_id) === Number(serviceRequestId)) {
                 refresh();
             }
         } else {
             refresh();
         }
     }
  });
  
  const toggleStatus = (status: string) => {
    if (status === "All") {
        setSelectedStatuses(["All"]);
        return;
    }
    
    let newStatuses = [...selectedStatuses];
    if (newStatuses.includes("All")) {
        newStatuses = [];
    }
    
    if (newStatuses.includes(status)) {
        newStatuses = newStatuses.filter(s => s !== status);
    } else {
        newStatuses.push(status);
    }
    
    if (newStatuses.length === 0) {
        setSelectedStatuses(["All"]);
    } else {
        setSelectedStatuses(newStatuses);
    }
  };

  const getStatusColor = (status: string): "success" | "destructive" | "warning" | "default" | "secondary" | "outline" | "processing" | "completed" | "info" => {
    switch (status.toLowerCase()) {
      case "verified": return "success"; 
      case "rejected": return "destructive";
      case "flagged": return "destructive";
      case "pending": return "warning";
      default: return "outline";
    }
  };

  const handleDownloadReceipt = async (txnId: number) => {
      try {
          const token = localStorage.getItem("token");
          const res = await fetch(`${API_URL}/api/v1/transactions/${txnId}/receipt`, {
              headers: { Authorization: `Bearer ${token}` }
          });
          
          if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.detail || "Failed to download receipt");
          }
          
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `receipt_${txnId}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
      } catch (e: any) {
          toast.error("Download Failed", e.message || "Could not generate receipt");
      }
  };

  const columns: Column<Transaction>[] = [
    {
      id: "id",
      header: "TXN ID",
      accessorKey: "transaction_id",
      className: "pl-8 font-mono text-[10px] text-muted-foreground w-[150px]"
    },
    {
      id: "amount",
      header: "Amount",
      cell: (txn: Transaction) => (
        <div className="flex flex-col">
            <span className={cn("font-bold text-sm", txn.amount < 0 ? "text-red-600" : "text-foreground")}>
                {txn.amount < 0 ? "-" : ""}{formatCurrency(Math.abs(txn.amount))}
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
      id: "method",
      header: "Method",
      cell: (txn: Transaction) => <span className="text-xs uppercase font-medium">{txn.payment_method}</span>
    },
    {
      id: "status",
      header: "Status",
      cell: (txn: Transaction) => (
        <div className="flex flex-col gap-1">
            <Badge variant={getStatusColor(txn.status)} className="rounded-none">{txn.status}</Badge>
            {txn.status === "Verified" && txn.verified_by && (
                <span className="text-[9px] text-muted-foreground font-bold uppercase truncate max-w-[80px]">
                    By: {txn.verified_by.full_name.split(' ')[0]}
                </span>
            )}
        </div>
      )
    },
    {
        id: "date",
        header: "Date",
        cell: (txn: Transaction) => <span className="text-[10px] font-mono">{format(new Date(txn.created_at), "MMM d, HH:mm")}</span>
    },
    {
        id: "actions",
        header: "Action",
        className: "text-right pr-8",
        cell: (txn: Transaction) => (
            <div className="flex justify-end gap-2">
        <TransactionDetailModal 
          transaction={txn}
          trigger={
            <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-primary/60 hover:bg-primary hover:text-white border-primary/10 rounded-none shadow-none transition-all">
              <Eye className="h-3.5 w-3.5" />
            </Button>
          }
        />
                {txn.status === "Pending" && hasPermission("finance.manage_transactions") && (
                <>
                    <ReconcileDialog 
                        transaction={txn}
                        onReconciled={forceReload}
                        trigger={
                        <Button size="sm" variant="outline" className="h-7 rounded-none text-[9px] uppercase font-black">
                            Verify
                        </Button>
                        }
                    />
                    <FlagTransactionDialog 
                        transactionId={txn.id}
                        onFlagged={forceReload}
                        trigger={
                            <Button size="sm" variant="ghost" className="h-7 text-amber-600 hover:text-amber-700">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                            </Button>
                        }
                    />
                </>
                )}
                <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 rounded-none text-[9px] uppercase font-black"
                    onClick={() => handleDownloadReceipt(txn.id)}
                >
                    Print
                </Button>
            </div>
        )
    }
  ];
  
  const FilterCheckbox = ({ label, value, count }: { label: string, value: string, count: number }) => {
    const isChecked = selectedStatuses.includes(value);
    return (
        <label className="flex items-center gap-3 cursor-pointer group select-none py-1 hover:bg-primary/5 px-2 -mx-2 rounded-sm transition-colors">
            <div className={cn(
                "w-4 h-4 border transition-colors flex items-center justify-center shrink-0",
                isChecked ? "bg-primary border-primary" : "bg-transparent border-primary/30 group-hover:border-primary"
            )}>
                {isChecked && <div className="w-2 h-2 bg-white" />}
            </div>
            <input 
                type="checkbox" 
                className="hidden" 
                checked={isChecked} 
                onChange={() => toggleStatus(value)} 
            />
            <span className={cn(
                "text-[10px] font-bold uppercase tracking-normal transition-colors flex-1",
                isChecked ? "text-primary" : "text-primary/40 group-hover:text-primary/70"
            )}>
                {label}
            </span>
            <span className="font-mono text-[10px] text-primary/30">{count}</span>
        </label>
    );
  };
  
  const hasActiveFilters = !selectedStatuses.includes("All");

  if (loading && !transactions.length) {
      return <div className="min-h-[400px] flex items-center justify-center relative bg-white border border-dashed border-primary/10"><LoadingSpinner size="lg" /></div>;
  }
  
  if (serviceRequestId) {
     return (
        <GoniaCard>
             <GoniaCardHeader><H2>Payment History</H2></GoniaCardHeader>
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
                 />
             </div>
        </GoniaCard>
     );
  }

  return (
    <GoniaCard>
      <GoniaCardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <H2>Payment History</H2>
            
            <div className="flex items-center gap-2">
                <div className="relative w-full md:w-64">
                    <GoniaIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-none border-primary/20 focus:border-primary/40 bg-white shadow-none w-full"
                    />
                </div>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className={cn(
                                "h-9 w-9 border-primary/20 rounded-none shrink-0", 
                                hasActiveFilters && "border-primary bg-primary/5 text-primary"
                            )}
                        >
                            <Filter className="h-3.5 w-3.5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-56 p-3 rounded-none border-primary/20 shadow-lg">
                        <div className="flex flex-col gap-1">
                            <div className="text-[10px] font-black uppercase text-primary/40 mb-2 px-1">Filter by Status</div>
                            <FilterCheckbox label="All" value="All" count={stats.all || 0} />
                            <div className="h-px bg-primary/10 my-1" />
                            <FilterCheckbox label="Verified" value="Verified" count={stats.verified || 0} />
                            <FilterCheckbox label="Pending" value="Pending" count={stats.pending || 0} />
                            <FilterCheckbox label="Flagged" value="Flagged" count={stats.flagged || 0} />
                            <FilterCheckbox label="Rejected" value="Rejected" count={stats.rejected || 0} />
                        </div>
                    </PopoverContent>
                </Popover>
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
         />
      </div>
    </GoniaCard>
  );
}