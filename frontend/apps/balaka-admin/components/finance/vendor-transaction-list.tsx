"use client";

import { useEffect, useState, useMemo } from "react";
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
import { cn } from "@/lib/utils";
import { VendorTransaction, VendorTransactionSummary, UnifiedTransaction } from "@/core/types";
import { UnifiedTransactionDetailModal } from "./unified-transaction-detail-modal";
import { Eye, ReceiptText } from "lucide-react";
import { FinanceFilters } from "./finance-filters";
import { summaryStore } from "@/lib/summary-store";

export function VendorTransactionList() {
  const { formatCurrency } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  const typeOptions = useMemo(() => [
    { label: "Purchase (Debt)", value: "PURCHASE" },
    { label: "Payment (Settled)", value: "PAYMENT" }
  ], []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: transactions, summary, loading, total, page, setPage, limit } = useGoniaDirectory<VendorTransaction, VendorTransactionSummary>({
    endpoint: "/api/v1/vendors/transactions",
    filters: useMemo(() => activeFilters, [JSON.stringify(activeFilters)]),
    search: debouncedSearch,
    limit: 10
  });

  // Persist summary to prevent flicker on re-mount
  useEffect(() => {
    if (summary) summaryStore.set("vendor_summary", summary);
  }, [summary]);

  const activeSummary = summary || summaryStore.get("vendor_summary");
  const totalExpense = activeSummary?.net_liability ?? 0;

  const getTypeColor = (type: string) => {
    return type === "PAYMENT" ? "bg-emerald-600" : "bg-destructive"; 
  };

  const columns: Column<VendorTransaction>[] = [
    {
      id: "id",
      header: "TXN ID",
      accessorKey: "transaction_id",
      className: "pl-8 font-mono text-[10px] text-muted-foreground w-[120px]",
      cell: (t: VendorTransaction) => (
        <span className="font-mono font-bold text-primary/40 group-hover:text-primary transition-colors">
          #{t.transaction_id.split('-').pop()}
        </span>
      )
    },
    {
      id: "date",
      header: "Date",
      className: "w-[120px]",
      cell: (t: VendorTransaction) => {
        const date = t.created_at ? new Date(t.created_at) : null;
        const isValidDate = date && !isNaN(date.getTime());
        return (
          <span className="font-mono text-[12px] text-primary/40 font-bold">
            {isValidDate ? format(date!, "dd MMM yyyy") : "N/A"}
          </span>
        );
      }
    },
    {
      id: "vendor",
      header: "Vendor",
      cell: (t: VendorTransaction) => <span className="font-bold text-sm text-primary uppercase">{t.vendor?.name || "N/A"}</span>
    },
    {
      id: "type",
      header: "Type",
      cell: (t: VendorTransaction) => (
        <Badge className={cn("text-[9px] font-black uppercase rounded-none text-white", getTypeColor(t.transaction_type))}>
          {t.transaction_type}
        </Badge>
      )
    },
    {
      id: "amount",
      header: "Amount",
      className: "text-right",
      cell: (t: VendorTransaction) => (
        <span className={cn("font-mono text-[14px] font-bold", t.transaction_type === "PAYMENT" ? "text-emerald-600" : "text-destructive")}>
          {t.transaction_type === "PAYMENT" ? "-" : "+"}{formatCurrency(t.amount)}
        </span>
      )
    },
    {
      id: "notes",
      header: "Notes",
      accessorKey: "notes",
      className: "max-w-[250px]",
      cell: (t: VendorTransaction) => <p className="text-xs text-muted-foreground truncate font-medium">{t.notes || "-"}</p>
    },
    {
      id: "actions",
      header: "Action",
      className: "text-right pr-8",
      cell: (t: VendorTransaction) => {
        const unified: UnifiedTransaction = {
            id: `V-${t.id}`,
            date: t.created_at,
            type: t.transaction_type === "PAYMENT" ? "EXPENSE" : "LIABILITY",
            category: t.vendor?.name || "Vendor Transaction",
            reference: t.transaction_id,
            external_reference: t.reference_id,
            amount: t.transaction_type === "PAYMENT" ? -t.amount : t.amount,
            status: "Verified",
            claimed_amount: t.claimed_amount,
            claimed_currency: t.currency,
            exchange_rate: t.exchange_rate,
            proof_url: t.proof_url,
            notes: t.notes,
            actor_name: t.created_by?.full_name
        };
        
        return (
          <UnifiedTransactionDetailModal 
            transaction={unified}
            trigger={
              <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-primary/60 hover:bg-primary hover:text-white border-primary/10 rounded-none shadow-none transition-all">
                <Eye className="h-3.5 w-3.5" />
              </Button>
            }
          />
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      <GoniaCard>
        <GoniaCardHeader className="p-4 md:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <ReceiptText className="h-5 w-5 text-primary opacity-40" />
                <H2 className="whitespace-nowrap">Vendor Settlements</H2>
            </div>
            
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[9px] uppercase font-black text-muted-foreground tracking-normal opacity-60">Total Liability</span>
              <span className={cn(gonia.text.mono, "text-2xl font-black", totalExpense <= 0 ? "text-primary" : "text-destructive")}>
                {formatCurrency(totalExpense)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full">
            <div className="relative flex-1 min-w-0">
                <GoniaIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                    placeholder="Search settlements..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 text-xs rounded-none border-primary/20 focus:border-primary/40 bg-white shadow-sm w-full"
                />
            </div>
            <FinanceFilters 
              onFilterChange={setActiveFilters}
              showVendor
              showVendorType
              showType
              typeOptions={typeOptions}
            />
          </div>

          <div className="flex sm:hidden items-center justify-between border-t border-primary/10 pt-3 mt-1">
            <span className="text-[10px] uppercase font-black text-muted-foreground">Total Liability</span>
            <span className={cn("text-lg font-black font-mono", totalExpense <= 0 ? "text-primary" : "text-destructive")}>
              {loading && !activeSummary ? "..." : formatCurrency(totalExpense)}
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
          renderMobileCard={(t) => (
            <div className="flex flex-col gap-3 relative">
              <div className="flex justify-between items-start gap-3">
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary/40 text-[9px] bg-primary/5 px-1 py-0.5 rounded-sm truncate">
                      #{t.transaction_id.split('-').pop()}
                    </span>
                    <Badge className={cn("h-4 text-[8px] px-1 py-0 shrink-0", getTypeColor(t.transaction_type))}>{t.transaction_type}</Badge>
                  </div>
                  <span className="font-bold text-xs text-primary uppercase leading-tight truncate">
                    {t.vendor?.name}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-end border-t border-primary/5 pt-2">
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono text-primary/40 font-bold">
                    {t.created_at ? format(new Date(t.created_at), "dd MMM, hh:mm a") : "N/A"}
                  </span>
                  <span className={cn("text-sm font-black font-mono", t.transaction_type === "PAYMENT" ? "text-emerald-600" : "text-destructive")}>
                    {t.transaction_type === "PAYMENT" ? "-" : "+"}{formatCurrency(t.amount)}
                  </span>
                </div>
                <div className="shrink-0">
                  <UnifiedTransactionDetailModal 
                    transaction={{
                        id: `V-${t.id}`,
                        date: t.created_at,
                        type: t.transaction_type === "PAYMENT" ? "EXPENSE" : "LIABILITY",
                        category: t.vendor?.name || "Vendor Transaction",
                        reference: t.transaction_id,
                        external_reference: t.reference_id,
                        amount: t.transaction_type === "PAYMENT" ? -t.amount : t.amount,
                        status: "Verified",
                        claimed_amount: t.claimed_amount,
                        claimed_currency: t.currency,
                        exchange_rate: t.exchange_rate,
                        proof_url: t.proof_url,
                        notes: t.notes,
                        actor_name: t.created_by?.full_name
                    }}
                  />
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
