"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { fetchClient } from "@/core/api";
import { useGoniaDirectory } from "@/core/hooks/use-gonia-directory";
import { 
  StatusBadge, 
  Badge,
  Button, 
  GoniaCard, 
  GoniaCardHeader, 
  H2, 
  GoniaDataTable, 
  Column, 
  LoadingSpinner, 
  useNotifications, 
  gonia, 
  Popover, 
  PopoverTrigger, 
  PopoverContent, 
  Input, 
  GoniaIcons 
} from "@/ui";


import Link from "next/link";
import { format } from "date-fns";
import { ArrowUpRight } from "lucide-react";


import { useServerEvents } from "@/lib/use-server-events";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/core/currency-context";

import { ServiceRequest } from "@/core/types";
import { RequestFilters } from "./request-filters";

interface RequestListProps {
  limit?: number;
  showViewAll?: boolean;
  className?: string;
  isInternal?: boolean;
  initialFilters?: Record<string, any>;
  showServiceFilter?: boolean;
}

interface RequestStats {
  all: number;
  active: number;
  pending: number;
  completed: number;
  cancelled: number;
}

export function RequestList({ 
  limit, 
  showViewAll, 
  className, 
  isInternal = false, 
  initialFilters = {},
  showServiceFilter = true
}: RequestListProps) {
  const { toast } = useNotifications();
  const { formatCurrency } = useCurrency();
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    initialFilters.status && Array.isArray(initialFilters.status) 
        ? initialFilters.status 
        : ["All"]
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>(initialFilters);
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Use useMemo to prevent infinite loop (object reference stability)
  const filters = useMemo(() => ({
    ...activeFilters,
    status: activeFilters.status || (selectedStatuses.includes("All") ? undefined : selectedStatuses),
    is_public: isInternal ? false : true // Explicitly filter by public/private status
  }), [activeFilters, selectedStatuses, isInternal]);

  const sortFn = useCallback((a: ServiceRequest, b: ServiceRequest) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA;
  }, []);

  const { 
    data: requests, 
    total,
    summary,
    loading, 
    refresh,
    page,
    setPage,
    limit: currentLimit
  } = useGoniaDirectory<ServiceRequest, { stats: RequestStats }>({
    endpoint: "/api/v1/service-requests/",
    sort: sortFn,
    limit,
    onError: () => toast.error("Failed to load operations log"),
    search: debouncedSearch,
    filters
  });

  const stats = summary?.stats || { all: 0, active: 0, pending: 0, completed: 0, cancelled: 0 };

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

  useServerEvents((event) => {
    if (event === "request_created" || event === "request_updated") {
        refresh();
    }
  });

  const columns: Column<ServiceRequest>[] = [
    {
      id: "id",
      header: "ID",
      accessorKey: "readable_id",
      className: "w-[100px] pl-6 py-4",
      cell: (req: ServiceRequest) => (
        <span className="font-mono font-black text-primary/60 group-hover:text-primary transition-colors text-[11px]">
          {req.readable_id || `#${req.id}`}
        </span>
      )
    },
    {
      id: "originator",
      header: "Originator",
      cell: (req: ServiceRequest) => (
        <div className="flex flex-col">
          <span className="font-bold text-[12px] text-primary truncate max-w-[120px]">{req.user?.full_name || "N/A"}</span>
          <span className="text-[10px] font-mono font-bold text-primary/40 uppercase tracking-tighter truncate max-w-[120px]">{req.user?.email}</span>
        </div>
      )
    },
    ...(showServiceFilter ? [{
      id: "category",
      header: "Category",
      cell: (req: ServiceRequest) => {
        const category = req.service_definition?.category || "General";
        return (
          <Badge className={cn("h-5 border-none shadow-none font-bold text-[9px] uppercase", gonia.categoryTheme[category] || gonia.categoryTheme["General"])}>
            {req.service_definition?.name || "Standard"}
          </Badge>
        );
      }
    }] : []),
    {
      id: "price",
      header: "Price",
      accessorKey: "selling_price",
      cell: (req: ServiceRequest) => (
        <span className="font-mono text-[11px] font-black text-primary">
          {req.selling_price > 0 ? formatCurrency(req.selling_price) : "Quote"}
        </span>
      )
    },
    {
      id: "paid",
      header: "Paid",
      cell: (req: ServiceRequest) => (
        <span className="font-mono text-[11px] font-black text-emerald-600">
          {(req as any).paid_amount > 0 ? formatCurrency((req as any).paid_amount) : "—"}
        </span>
      )
    },
    {
      id: "due",
      header: "Due",
      cell: (req: ServiceRequest) => {
        const due = (req as any).balance_due;
        return (
          <span className={cn(
            "font-mono text-[11px] font-black",
            due > 0.01 ? "text-rose-600" : "text-primary/20"
          )}>
            {due > 0.01 ? formatCurrency(due) : "Settle"}
          </span>
        );
      }
    },
    {
      id: "date",
      header: "Date",
      cell: (req: ServiceRequest) => {
        const date = req.created_at ? new Date(req.created_at) : null;
        const isValidDate = date && !isNaN(date.getTime());
        return (
          <span className="font-mono text-[12px] text-primary/60">
            {isValidDate ? format(date!, "dd MMM yyyy") : "N/A"}
          </span>
        );
      }
    },
    {
      id: "status",
      header: "Status",
      cell: (req: ServiceRequest) => <StatusBadge status={req.status} className="h-6" />
    },
    {
      id: "action",
      header: "Action",
      className: "text-right pr-6",
      cell: (req: ServiceRequest) => (
        <Link href={`${isInternal ? "/operations" : "/requests"}/${req.id}`}>
          <Button variant="outline" size="icon" className={cn(gonia.button.base, gonia.button.outline, "h-7 w-7 text-primary/60 hover:bg-primary hover:text-white shadow-none border-primary/20 transition-all")}>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      )
    }
  ];

  if (loading && !requests.length) {
    return (
      <div className="min-h-[400px] flex items-center justify-center border border-dashed border-border/40 bg-white">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const hasActiveFilters = !selectedStatuses.includes("All");

  return (
    <GoniaCard className={className}>
      <GoniaCardHeader>
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <H2>
                    {isInternal ? "Internal Affairs Ledger" : "Client Request List"}
                </H2>
                
                <div className="flex items-center gap-2">
                     {/* Search Input */}
                    <div className="relative w-full md:w-64">
                        <GoniaIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Global reference search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-xs rounded-none border-primary/20 focus:border-primary/40 bg-white shadow-none w-full"
                        />
                    </div>

                    {/* Filter Component */}
                    {!limit && (
                        <RequestFilters 
                            onFilterChange={setActiveFilters}
                            showService={showServiceFilter}
                            showUser={true}
                            showStatus={true}
                            isInternal={isInternal}
                            initialFilters={initialFilters}
                        />
                    )}

                    {showViewAll && (
                        <Link href={isInternal ? "/requests?view=internal" : "/requests"}>
                        <Button variant="outline" className={cn(gonia.button.base, gonia.button.outline, "h-9 w-9 p-0 md:w-auto md:px-4")}>
                             <span className="hidden md:inline">Full List</span>
                             <ArrowUpRight className="h-3.5 w-3.5 md:ml-2" />
                        </Button>
                        </Link>
                    )}
                </div>
            </div>
        </div>
      </GoniaCardHeader>
      <div className="p-0">
        <GoniaDataTable 
          data={requests} 
          columns={columns} 
          total={total}
          page={page}
          limit={currentLimit}
          onPageChange={setPage}
          searchable={false} // Disable internal search
          isLoading={loading}
          renderMobileCard={(req) => (
            <div className="flex flex-col gap-3 relative">
              <div className="flex justify-between items-start gap-3">
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-primary/60 text-[9px] bg-primary/5 px-1.5 py-0.5 rounded-none border border-primary/5">
                      {req.readable_id || `#${req.id}`}
                    </span>
                    <StatusBadge status={req.status} className="h-4 text-[8px] px-1 py-0" />
                    <span className="font-mono font-black text-primary text-[9px] ml-auto">
                      {req.selling_price > 0 ? formatCurrency(req.selling_price) : "Quote"}
                    </span>
                  </div>
                  <span className="font-black text-xs text-primary uppercase leading-tight truncate">
                    {req.service_definition?.name || "Standard Request"}
                  </span>
                </div>
                <Link href={`${isInternal ? "/operations" : "/requests"}/${req.id}`}>
                  <Button variant="outline" size="icon" className={cn(gonia.button.base, gonia.button.outline, "h-8 w-8 text-primary/60 hover:bg-primary hover:text-white shadow-none border-primary/20 shrink-0 transition-all")}>
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              
              <div className="flex justify-between items-end border-t border-primary/5 pt-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-primary/60 uppercase tracking-tight truncate max-w-[150px]">
                    {req.user?.full_name}
                  </span>
                  <span className="text-[9px] font-mono text-primary/30 font-bold">
                    {req.created_at ? format(new Date(req.created_at), "dd MMM, hh:mm a") : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          )}
        />
      </div>
    </GoniaCard>
  );
}
