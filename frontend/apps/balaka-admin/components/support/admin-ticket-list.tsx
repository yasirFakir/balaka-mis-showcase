"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { fetchClient } from "@/core/api";
import { useGoniaDirectory } from "@/core/hooks/use-gonia-directory";
import { 
  useNotifications, 
  StatusBadge, 
  Button, 
  GoniaCard, 
  GoniaCardHeader, 
  H2, 
  GoniaDataTable, 
  Column, 
  LoadingSpinner, 
  gonia, 
  Badge,
  Input,
  GoniaIcons,
  GoniaFilter,
  GoniaFilterCheckbox,
  GoniaFilterSection
} from "@/ui";
import Link from "next/link";
import { format } from "date-fns";
import {
    Search,
    UserCircle,
    ArrowUpRight,
} from "lucide-react";
import { useServerEvents } from "@/lib/use-server-events";

import { cn } from "@/lib/utils";

import { SupportTicket } from "@/core/types";

interface AdminTicketListProps {
  refreshKey?: number;
}

export function AdminTicketList({ refreshKey = 0 }: AdminTicketListProps) {
  const { toast } = useNotifications();
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["All"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Use useMemo for filters
  const filters = useMemo(() => ({
    status: selectedStatuses.includes("All") ? undefined : selectedStatuses
  }), [selectedStatuses]);

  const { data: tickets, loading, refresh, total, summary, page, setPage, limit } = useGoniaDirectory<SupportTicket, { stats: any }>({
    endpoint: "/api/v1/tickets/",
    onError: () => toast.error("Failed to load support tickets"),
    search: debouncedSearch,
    filters
  });

  const stats = summary?.stats || { all: 0, active: 0, open: 0, in_progress: 0, escalated: 0, resolved: 0, closed: 0 };

  useEffect(() => {
    if (refreshKey) refresh();
  }, [refreshKey, refresh]);

  useServerEvents((event, data) => {
     if (event === "ticket_created" || event === "ticket_updated" || event === "ticket_message_created") {
         refresh();
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

  const getPriorityConfig = (priority: string) => {
      const p = priority.toLowerCase();
      if (p === "high" || p === "urgent") return "bg-[var(--gonia-error)] text-white border-none";
      if (p === "medium") return "bg-[var(--gonia-warning)] text-white border-none";
      return "bg-[var(--gonia-limestone)] text-[var(--gonia-primary-deep)] border-none";
  };

  const columns: Column<SupportTicket>[] = [
    {
      id: "id",
      header: "ID",
      className: "w-[80px] pl-8 text-primary/40 font-mono",
      cell: (t: SupportTicket) => `#${t.id.toString().padStart(4, '0')}`
    },
    {
      id: "subject",
      header: "Subject",
      accessorKey: "subject",
      cell: (t: SupportTicket) => {
        const date = t.created_at ? new Date(t.created_at) : null;
        const isValidDate = date && !isNaN(date.getTime());
        return (
          <div className="flex flex-col">
            <span className="font-bold text-sm text-primary uppercase tracking-tight">{t.subject}</span>
            <span className="text-[10px] opacity-40 uppercase font-mono">
              {isValidDate ? format(date!, "dd MMM, HH:mm") : "N/A"}
            </span>
          </div>
        );
      }
    },
    {
      id: "customer",
      header: "Opened By",
      cell: (t: SupportTicket) => {
        const isSelf = !t.created_by || t.user_id === t.created_by_id;
        const actorName = t.created_by?.full_name || t.user?.full_name || "Guest";
        
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-primary/40" />
              <span className="text-[11px] font-bold text-primary/80 uppercase">
                  {actorName}
              </span>
              {!isSelf && (
                  <Badge className="h-3.5 px-1 text-[7px] bg-secondary text-white border-none rounded-none">ADMIN OPENED</Badge>
              )}
            </div>
            {!isSelf && (
                <span className="text-[9px] text-muted-foreground font-black uppercase tracking-tighter ml-6">
                    For Client UID: {t.user_id}
                </span>
            )}
          </div>
        );
      }
    },
    {
      id: "category",
      header: "Category",
      cell: (t: SupportTicket) => (
        <Badge className={cn("h-5 border-none shadow-none font-bold", gonia.categoryTheme[t.category] || gonia.categoryTheme["General"])}>
          {t.category || "General"}
        </Badge>
      )
    },
    {
      id: "priority",
      header: "Priority",
      cell: (t: SupportTicket) => (
        <div className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-none border text-[9px] font-black uppercase tracking-tighter",
          getPriorityConfig(t.priority)
        )}>
          {t.priority}
        </div>
      )
    },
    {
      id: "status",
      header: "Status",
      cell: (t: SupportTicket) => <StatusBadge status={t.status} className="h-6" />
    },
    {
      id: "actions",
      header: "Actions",
      className: "text-right pr-8",
      cell: (t: SupportTicket) => (
        <Link href={`/support/${t.id}`}>
          <Button variant="outline" size="icon" className={cn(gonia.button.base, gonia.button.outline, "h-7 w-7 shadow-none border-primary/20")}>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      )
    }
  ];

  if (loading && !tickets.length) {
    return (
      <div className="min-h-[400px] flex items-center justify-center border border-dashed border-primary/20 bg-white">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

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
  const activeCount = hasActiveFilters ? selectedStatuses.length : 0;

  return (
    <GoniaCard>
      <GoniaCardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <H2>Customer Support Tickets</H2>
            
            <div className="flex items-center gap-2">
                 {/* Search Input */}
                <div className="relative w-full md:w-64">
                    <GoniaIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search tickets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-none border-primary/20 focus:border-primary/40 bg-white shadow-none w-full"
                    />
                </div>

                {/* Filter Button (Unified) */}
                <GoniaFilter 
                  activeCount={activeCount}
                  onReset={() => toggleStatus("All")}
                  title="Filter by Status"
                >
                  <GoniaFilterSection title="Active Cases" />
                  <GoniaFilterCheckbox 
                    label="All Tickets" 
                    value="All" 
                    count={stats.all || 0} 
                    checked={selectedStatuses.includes("All")}
                    onChange={toggleStatus}
                  />
                  <div className="h-px bg-primary/10 my-1" />
                  <GoniaFilterCheckbox 
                    label="Active (Open/Prog)" 
                    value="Active" 
                    count={stats.active || 0} 
                    checked={selectedStatuses.includes("Active")}
                    onChange={toggleStatus}
                  />
                  <GoniaFilterCheckbox 
                    label="Open" 
                    value="Open" 
                    count={stats.open || 0} 
                    checked={selectedStatuses.includes("Open")}
                    onChange={toggleStatus}
                  />
                  <GoniaFilterCheckbox 
                    label="In Progress" 
                    value="In Progress" 
                    count={stats.in_progress || 0} 
                    checked={selectedStatuses.includes("In Progress")}
                    onChange={toggleStatus}
                  />
                  <GoniaFilterCheckbox 
                    label="Escalated" 
                    value="Escalated" 
                    count={stats.escalated || 0} 
                    checked={selectedStatuses.includes("Escalated")}
                    onChange={toggleStatus}
                  />
                  <GoniaFilterSection title="Archived" className="mt-2" />
                  <GoniaFilterCheckbox 
                    label="Resolved" 
                    value="Resolved" 
                    count={stats.resolved || 0} 
                    checked={selectedStatuses.includes("Resolved")}
                    onChange={toggleStatus}
                  />
                  <GoniaFilterCheckbox 
                    label="Closed" 
                    value="Closed" 
                    count={stats.closed || 0} 
                    checked={selectedStatuses.includes("Closed")}
                    onChange={toggleStatus}
                  />
                </GoniaFilter>
            </div>
        </div>
      </GoniaCardHeader>
      <div className="p-0">
        <GoniaDataTable 
          data={tickets} 
          columns={columns} 
          total={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
          searchable={false}
          isLoading={loading}
          renderMobileCard={(t) => (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="font-mono font-bold text-primary/40 text-[10px]">#{t.id.toString().padStart(4, '0')}</span>
                  <span className="font-bold text-sm text-primary uppercase">{t.subject}</span>
                </div>
                <StatusBadge status={t.status} className="h-5 text-[8px]" />
              </div>
              <div className="flex justify-between items-end border-t border-primary/5 pt-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-primary/60 uppercase">{t.created_by?.full_name || t.user?.full_name || "Guest"}</span>
                  <span className="text-[9px] font-mono text-primary/40">
                    {t.created_at ? format(new Date(t.created_at), "dd MMM, HH:mm") : "N/A"}
                  </span>
                </div>
                <Link href={`/support/${t.id}`}>
                  <Button variant="outline" size="icon" className={cn(gonia.button.base, gonia.button.outline, "h-8 w-8 shadow-none border-primary/20")}>
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        />
      </div>
    </GoniaCard>
  );
}