"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { fetchClient } from "@/core/api";
import { useGoniaDirectory } from "@/core/hooks/use-gonia-directory";
import { GoniaCard, GoniaCardHeader, H2, GoniaDataTable, Column, Badge, Button, LoadingSpinner, gonia, GoniaIcons, Input } from "@/ui";
import { useCurrency } from "@/core/currency-context";
import { format } from "date-fns";
import Link from "next/link";
import { ServiceRequest } from "@/core/types";
import { cn } from "@/lib/utils";
import { Eye, PieChart } from "lucide-react";
import { FinanceFilters } from "./finance-filters";
import { summaryStore } from "@/lib/summary-store";

export function ProfitList() {
  const { formatCurrency } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  
  const statusOptions = useMemo(() => [
    { label: "Completed", value: "Completed" },
    { label: "Processing", value: "Processing" },
    { label: "Approved", value: "Approved" },
    { label: "On Hold", value: "Service on Hold" },
    { label: "Verifying", value: "Verifying Information" }
  ], []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: requests, loading, total, page, setPage, limit, summary } = useGoniaDirectory<ServiceRequest, { total_profit: number }>({
    endpoint: "/api/v1/service-requests/",
    filters: useMemo(() => ({
        ...activeFilters,
        status: activeFilters.status ? [activeFilters.status] : ["Completed"],
        has_financials: true
    }), [JSON.stringify(activeFilters)]),
    search: debouncedSearch,
    limit: 10
  });

  // Persist summary to prevent flicker on re-mount
  useEffect(() => {
    if (summary) summaryStore.set("profit_summary", summary);
  }, [summary]);

  const activeSummary = summary || summaryStore.get("profit_summary");
  const totalProfit = activeSummary?.total_profit ?? 0;

  const columns: Column<ServiceRequest>[] = [
    {
      id: "id",
      header: "ID",
      accessorKey: "id",
      className: "w-[80px] font-mono text-xs text-muted-foreground pl-8",
      cell: (req: ServiceRequest) => `#${req.id}`
    },
    {
      id: "service",
      header: "Service",
      cell: (req: ServiceRequest) => <span className="font-bold text-sm text-primary uppercase">{req.service_definition?.name || "Standard Request"}</span>
    },
    {
      id: "date",
      header: "Date",
      cell: (req: ServiceRequest) => {
        const dateStr = req.updated_at || req.created_at;
        const date = dateStr ? new Date(dateStr) : null;
        const isValidDate = date && !isNaN(date.getTime());
        return <span className="font-mono text-[12px] text-primary/40 font-bold">{isValidDate ? format(date!, "MMM d") : "N/A"}</span>;
      }
    },
    {
      id: "selling",
      header: "Selling",
      cell: (req: ServiceRequest) => <span className="font-mono text-[14px] text-emerald-600 font-bold">{formatCurrency(req.selling_price)}</span>
    },
    {
      id: "cost",
      header: "Cost",
      cell: (req: ServiceRequest) => <span className="font-mono text-[14px] text-destructive font-bold">{formatCurrency(req.cost_price)}</span>
    },
    {
      id: "profit",
      header: "Profit",
      cell: (req: ServiceRequest) => (
        <Badge variant={req.profit >= 0 ? "success" : "destructive"} className="rounded-none font-black text-[10px]">
          {formatCurrency(req.profit)}
        </Badge>
      )
    },
    {
      id: "action",
      header: "Action",
      className: "text-right pr-8",
      cell: (req: ServiceRequest) => (
        <Link href={`/requests/${req.id}`}>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-primary/60 hover:bg-primary hover:text-white border-primary/10 rounded-none shadow-none transition-all">
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </Link>
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
                <PieChart className="h-5 w-5 text-primary opacity-40" />
                <H2 className="whitespace-nowrap">Profit Analysis</H2>
            </div>
            
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[9px] uppercase font-black text-muted-foreground tracking-normal opacity-60">Combined Profit</span>
              <span className={cn(gonia.text.mono, "text-2xl font-black", totalProfit >= 0 ? "text-emerald-600" : "text-destructive")}>
                {loading && !activeSummary ? "..." : formatCurrency(totalProfit)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full">
            <div className="relative flex-1 min-w-0">
                <GoniaIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                    placeholder="Search requests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 text-xs rounded-none border-primary/20 focus:border-primary/40 bg-white shadow-sm w-full"
                />
            </div>
            <FinanceFilters 
              onFilterChange={setActiveFilters}
              showService
              showStatus
              statusOptions={statusOptions}
            />
          </div>

          <div className="flex sm:hidden items-center justify-between border-t border-primary/10 pt-3 mt-1">
            <span className="text-[10px] uppercase font-black text-muted-foreground">Combined Profit</span>
            <span className={cn("text-lg font-black font-mono", totalProfit >= 0 ? "text-emerald-600" : "text-destructive")}>
              {loading && !activeSummary ? "..." : formatCurrency(totalProfit)}
            </span>
          </div>
        </div>
      </GoniaCardHeader>
      <div className="p-0">
        <GoniaDataTable 
          data={requests} 
          columns={columns} 
          total={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
          searchable={false}
          isLoading={loading}
          renderMobileCard={(req) => (
            <div className="flex flex-col gap-3 relative">
              <div className="flex justify-between items-start gap-3">
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary/40 text-[9px] bg-primary/5 px-1 py-0.5 rounded-sm truncate">
                      #{req.id}
                    </span>
                    <Badge variant={req.profit >= 0 ? "success" : "destructive"} className="h-4 text-[8px] px-1 py-0 shrink-0">
                      {formatCurrency(req.profit)}
                    </Badge>
                  </div>
                  <span className="font-bold text-xs text-primary uppercase leading-tight truncate">
                    {req.service_definition?.name || "Service Request"}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-end border-t border-primary/5 pt-2">
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono text-primary/40 font-bold">
                    {req.created_at ? format(new Date(req.created_at), "dd MMM, hh:mm a") : "N/A"}
                  </span>
                  <span className="text-sm font-black text-primary font-mono">
                    {formatCurrency(req.selling_price)}
                  </span>
                </div>
                <div className="shrink-0">
                  <Link href={`/requests/${req.id}`}>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-primary/60 hover:bg-primary hover:text-white border-primary/10 rounded-none shadow-none transition-all">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
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
