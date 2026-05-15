"use client";

import * as React from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue, 
  GoniaFilter,
  Badge,
  DatePicker
} from "@/ui";
import { fetchClient } from "@/core/api";
import { useTranslations } from "next-intl";
import { Calendar as CalendarIcon } from "lucide-react";
import { subDays, startOfMonth, endOfMonth, format } from "date-fns";

// Minimal types for client-side usage
interface ServiceDefinition {
    id: number;
    name: string;
    is_public?: boolean;
}

interface RequestFiltersProps {
  onFilterChange: (filters: Record<string, any>) => void;
  showService?: boolean;
  showStatus?: boolean;
}

export function RequestFilters({ 
  onFilterChange, 
  showService = true, 
  showStatus = true
}: RequestFiltersProps) {
  const t = useTranslations('Services');
  const [range, setRange] = React.useState("all");
  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined);
  
  const [serviceId, setServiceId] = React.useState<string>("all");
  const [status, setStatus] = React.useState<string>("all");
  
  const [services, setServices] = React.useState<ServiceDefinition[]>([]);
  const lastFiltersRef = React.useRef<string>("");

  React.useEffect(() => {
    const fetchData = async () => {
      if (showService) {
        try {
          const res = await fetchClient<{ items: ServiceDefinition[] }>("/api/v1/services/?limit=100");
          const publicServices = res.items.filter(s => s.is_public !== false);
          setServices(publicServices);
        } catch (e) { console.error(e); }
      }
    };
    fetchData();
  }, [showService]);

  const applyFilters = React.useCallback(() => {
    const filters: Record<string, any> = {};
    
    if (startDate) filters.start_date = format(startDate, "yyyy-MM-dd'T'HH:mm:ss");
    if (endDate) filters.end_date = format(endDate, "yyyy-MM-dd'T'23:59:59");

    if (showService && serviceId !== "all") filters.service_def_id = serviceId;
    if (showStatus && status !== "all") {
        filters.status = [status];
    }
    
    const filtersString = JSON.stringify(filters);
    if (filtersString !== lastFiltersRef.current) {
        lastFiltersRef.current = filtersString;
        onFilterChange(filters);
    }
  }, [startDate, endDate, serviceId, status, showService, showStatus, onFilterChange]);

  // Debounce filter application
  React.useEffect(() => {
    const timer = setTimeout(() => {
      applyFilters();
    }, 300);
    return () => clearTimeout(timer);
  }, [applyFilters]);

  const activeCount = React.useMemo(() => {
    let count = 0;
    if (range !== "all") count++;
    if (showService && serviceId !== "all") count++;
    if (showStatus && status !== "all") count++;
    return count;
  }, [range, serviceId, status, showService, showStatus]);

  const resetFilters = () => {
    setRange("all");
    setStartDate(undefined);
    setEndDate(undefined);
    setServiceId("all");
    setStatus("all");
  };

  const handleRangeChange = (val: string) => {
    setRange(val);
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = now;

    switch (val) {
        case "7d": start = subDays(now, 7); break;
        case "30d": start = subDays(now, 30); break;
        case "90d": start = subDays(now, 90); break;
        case "month": start = startOfMonth(now); end = endOfMonth(now); break;
        case "all": start = null; end = null; break;
        case "custom": return;
    }
    
    setStartDate(start || undefined);
    setEndDate(end || undefined);
  };

  return (
    <div className="flex items-center gap-2">
      <GoniaFilter
        activeCount={activeCount}
        onReset={resetFilters}
        title="Filter Requests"
        contentClassName="w-[calc(100vw-32px)] sm:w-[450px]"
      >
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Period */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-muted-foreground">Period</label>
                  <Select value={range} onValueChange={handleRangeChange}>
                    <SelectTrigger className="h-10 rounded-none border-primary/20 bg-primary/5 text-xs font-bold uppercase">
                      <SelectValue placeholder="Range" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-2">
                      <SelectItem value="7d" className="text-[10px] font-bold uppercase">Last 7 Days</SelectItem>
                      <SelectItem value="30d" className="text-[10px] font-bold uppercase">Last 30 Days</SelectItem>
                      <SelectItem value="90d" className="text-[10px] font-bold uppercase">Last 3 Months</SelectItem>
                      <SelectItem value="month" className="text-[10px] font-bold uppercase">This Month</SelectItem>
                      <SelectItem value="all" className="text-[10px] font-bold uppercase">All Time</SelectItem>
                      <SelectItem value="custom" className="text-[10px] font-bold uppercase">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                {showStatus && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-muted-foreground">Status</label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="h-10 rounded-none border-primary/20 bg-white text-xs font-bold uppercase">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-2">
                        <SelectItem value="all" className="text-[10px] font-bold uppercase">All Status</SelectItem>
                        <SelectItem value="Pending" className="text-[10px] font-bold uppercase">Pending</SelectItem>
                        <SelectItem value="Approved" className="text-[10px] font-bold uppercase">Approved</SelectItem>
                        <SelectItem value="Processing" className="text-[10px] font-bold uppercase">Processing</SelectItem>
                        <SelectItem value="Completed" className="text-[10px] font-bold uppercase">Completed</SelectItem>
                        <SelectItem value="Cancelled" className="text-[10px] font-bold uppercase">Cancelled</SelectItem>
                        <SelectItem value="Rejected" className="text-[10px] font-bold uppercase">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Service */}
                {showService && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-muted-foreground">Service</label>
                    <Select value={serviceId} onValueChange={setServiceId}>
                      <SelectTrigger className="h-10 rounded-none border-primary/20 bg-white text-xs font-bold uppercase">
                        <SelectValue placeholder="All Services" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-2">
                        <SelectItem value="all" className="text-[10px] font-bold uppercase">All Services</SelectItem>
                        {services.map(s => (
                          <SelectItem key={s.id} value={s.id.toString()} className="text-[10px] font-bold uppercase">{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-primary/10">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" /> From
                  </label>
                  <DatePicker 
                    date={startDate} 
                    setDate={(d) => { setStartDate(d); setRange("custom"); }} 
                    className="h-10 rounded-none border-primary/20 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" /> To
                  </label>
                  <DatePicker 
                    date={endDate} 
                    setDate={(d) => { setEndDate(d); setRange("custom"); }} 
                    className="h-10 rounded-none border-primary/20 bg-white"
                  />
                </div>
            </div>
        </div>
      </GoniaFilter>

      {activeCount > 0 && (
        <Badge variant="outline" className="h-9 border-2 border-primary/10 px-3 rounded-none bg-white hidden md:flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase text-primary/60 tracking-tighter">Active:</span>
          <span className="text-[10px] font-black uppercase text-primary">{activeCount}</span>
        </Badge>
      )}
    </div>
  );
}