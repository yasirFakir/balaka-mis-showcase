"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchClient } from "@/core/api";
import { Button, Card, CardHeader, CardTitle, useNotifications, StatusBadge, GoniaDataTable, Column, Input, GoniaIcons } from "@/ui";


import { Link } from "@/i18n/navigation";
import { format } from "date-fns";


import { useServerEvents } from "@/lib/use-server-events";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "next-intl";
import { RequestFilters } from "./request-filters";

interface ServiceRequest {
  id: number;
  status: string;
  created_at: string;
  service_def_id: number;
  user_id: number;
  service_definition?: {
      name: string;
  }
}

interface RequestListResponse {
    items: ServiceRequest[];
    total: number;
}

export function RequestList() {
  const { user } = useAuth();
  const { toast } = useNotifications();
  const t = useTranslations('RequestList');
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadRequests = useCallback(async (pageNum = 1, query = "") => {
    setLoading(true);
    try {
      const skip = (pageNum - 1) * limit;
      let url = `/api/v1/service-requests/me?skip=${skip}&limit=${limit}`;
      
      if (query) {
          url += `&q=${encodeURIComponent(query)}`;
      }

      // Append filters
      if (activeFilters.status && activeFilters.status.length > 0) {
          activeFilters.status.forEach((s: string) => {
              url += `&status=${s}`;
          });
      }
      if (activeFilters.service_def_id) {
          url += `&service_def_id=${activeFilters.service_def_id}`;
      }
      if (activeFilters.start_date) {
          url += `&start_date=${activeFilters.start_date}`;
      }
      if (activeFilters.end_date) {
          url += `&end_date=${activeFilters.end_date}`;
      }
        
      const response = await fetchClient<RequestListResponse | ServiceRequest[]>(url);
      
      let data: ServiceRequest[] = [];
      let totalCount = 0;

      if (Array.isArray(response)) {
          data = response;
          totalCount = response.length;
      } else {
          data = response.items || [];
          totalCount = response.total || 0;
      }
      
      setRequests(data);
      setTotal(totalCount);
      setPage(pageNum);
    } catch (error) {
      console.error("Failed to load requests", error);
    } finally {
      setLoading(false);
    }
  }, [limit, activeFilters]);

  // Load on mount and when filters/search change
  useEffect(() => {
    loadRequests(1, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters, debouncedSearch]);

  const handlePageChange = useCallback((p: number) => {
      loadRequests(p, debouncedSearch);
  }, [loadRequests, debouncedSearch]);

  useServerEvents((event, data) => {
      if (typeof data === "object") {
          if (user && data.user_id === user.id) {
              if (event === "request_updated") {
                  toast.info(`Application #${data.id} status updated: ${data.status}`);
                  loadRequests(page, debouncedSearch);
              } else if (event === "request_created") {
                  loadRequests(1, debouncedSearch);
              }
          } else if (event === "request_updated") {
              const myRequestIds = requests.map(r => r.id);
              if (myRequestIds.includes(data.id)) {
                   toast.info(`Application #${data.id} status updated: ${data.status}`);
                   loadRequests(page, debouncedSearch);
              }
          }
      }
  });

  const columns: Column<ServiceRequest>[] = [
      {
          id: "id",
          header: t('col_id'),
          accessorKey: "id",
          className: "pl-6 py-4",
          cell: (req) => (
              <span className="font-mono text-[11px] font-bold text-primary/40">#REQ-{req.id}</span>
          )
      },
      {
          id: "service",
          header: t('col_service'),
          accessorKey: "service_definition.name",
          cell: (req) => (
              <span className="font-bold text-sm text-primary">
                  {req.service_definition?.name || `Service #${req.service_def_id}`}
              </span>
          )
      },
      {
          id: "date",
          header: t('col_date'),
          accessorKey: "created_at",
          cell: (req) => {
              const date = req.created_at ? new Date(req.created_at) : null;
              const isValidDate = date && !isNaN(date.getTime());
              return <span className="font-mono text-[11px] text-primary/60">{isValidDate ? format(date!, "dd MMM yyyy") : "N/A"}</span>;
          }
      },
      {
          id: "status",
          header: t('col_status'),
          accessorKey: "status",
          cell: (req) => <StatusBadge status={req.status} className="h-6" />
      },
      {
          id: "actions",
          header: t('col_management'),
          className: "text-right pr-6",
          cell: (req) => (
              <div className="flex justify-end">
                  <Link href={`/requests/${req.id}`}>
                    <Button variant="outline" size="sm" className="h-7 text-[9px] uppercase font-black px-4 rounded-none border-primary/20 hover:bg-primary hover:text-white transition-all shadow-none">
                      {t('btn_inspect')}
                    </Button>
                  </Link>
              </div>
          )
      }
  ];

  return (
    <Card className="rounded-none border-primary/10 shadow-none overflow-hidden">
      <CardHeader className="bg-primary/5 border-b border-primary/10">
        <div className="flex flex-col gap-4">
            <CardTitle className="text-sm font-black uppercase tracking-normal text-primary">{t('title')}</CardTitle>
            <div className="flex flex-row items-center gap-2 w-full">
                <div className="relative flex-1">
                    <GoniaIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 text-xs rounded-none border-primary/20 focus:border-primary/40 bg-white shadow-sm w-full"
                    />
                </div>
                <div className="shrink-0">
                    <RequestFilters 
                        onFilterChange={setActiveFilters}
                        showService={true}
                        showStatus={true}
                    />
                </div>
            </div>
        </div>
      </CardHeader>
      <div className="p-0">
        <GoniaDataTable 
            data={requests}
            columns={columns}
            isLoading={loading}
            emptyMessage={t('empty')}
            total={total}
            page={page}
            limit={limit}
            onPageChange={handlePageChange}
            searchable={false}
        />
      </div>
    </Card>
  );
}
