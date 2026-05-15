"use client";

import * as React from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue, 
  DatePicker,
  Button,
  GoniaFilter,
  Badge,
  gonia
} from "@/ui";
import { Calendar as CalendarIcon, ArrowRight, FilterX, Search, SlidersHorizontal, ListFilter } from "lucide-react";
import { subDays, startOfMonth, endOfMonth, format } from "date-fns";
import { fetchClient } from "@/core/api";
import { Vendor, ServiceDefinition } from "@/core/types";
import { cn } from "@/lib/utils";

interface FinanceFiltersProps {
  onFilterChange: (filters: Record<string, any>) => void;
  showService?: boolean;
  showVendor?: boolean;
  showVendorType?: boolean;
  showPaymentMethod?: boolean;
  showStatus?: boolean;
  showType?: boolean; // INCOME/EXPENSE or PURCHASE/PAYMENT
  statusOptions?: { label: string; value: string }[];
  typeOptions?: { label: string; value: string }[];
  initialFilters?: Record<string, any>;
}

export function FinanceFilters({ 
  onFilterChange, 
  showService = false, 
  showVendor = false, 
  showVendorType = false,
  showPaymentMethod = false, 
  showStatus = false,
  showType = false,
  statusOptions = [],
  typeOptions = [],
  initialFilters = {}
}: FinanceFiltersProps) {
  const [range, setRange] = React.useState("all");
  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined);
  
  const [serviceId, setServiceId] = React.useState<string>("all");
  const [vendorId, setVendorId] = React.useState<string>("all");
  const [vendorType, setVendorType] = React.useState<string>("all");
  const [paymentMethod, setPaymentMethod] = React.useState<string>("all");
  const [status, setStatus] = React.useState<string>(initialFilters.status || "all");
  const [type, setType] = React.useState<string>("all");

  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [services, setServices] = React.useState<ServiceDefinition[]>([]);
  const lastFiltersRef = React.useRef<string>("");
  const isInitialMount = React.useRef(true);

  // Memoized filtered vendors based on relationship type
  const filteredVendors = React.useMemo(() => {
    if (vendorType === "all") return vendors;
    return vendors.filter(v => v.type === vendorType);
  }, [vendors, vendorType]);

  // Reset vendor selection if it doesn't match the new relationship type
  React.useEffect(() => {
    if (vendorType !== "all" && vendorId !== "all") {
      const exists = vendors.some(v => v.id.toString() === vendorId && v.type === vendorType);
      if (!exists) setVendorId("all");
    }
  }, [vendorType, vendorId, vendors]);

  React.useEffect(() => {
    const fetchData = async () => {
      if (showVendor || showVendorType) {
        try {
          const res = await fetchClient<{ items: Vendor[] }>("/api/v1/vendors/");
          setVendors(res.items);
        } catch (e) { console.error(e); }
      }
      if (showService) {
        try {
          const res = await fetchClient<{ items: ServiceDefinition[] }>("/api/v1/services/");
          setServices(res.items);
        } catch (e) { console.error(e); }
      }
    };
    fetchData();
  }, [showVendor, showVendorType, showService]);

  const applyFilters = React.useCallback(() => {
    const filters: Record<string, any> = {};
    
    if (startDate) filters.start_date = format(startDate, "yyyy-MM-dd");
    if (endDate) filters.end_date = format(endDate, "yyyy-MM-dd");
    
    if (showService && serviceId !== "all") filters.service_def_id = serviceId;
    if (showVendor && vendorId !== "all") filters.vendor_id = vendorId;
    if (showVendorType && vendorType !== "all") filters.vendor_type = vendorType;
    if (showPaymentMethod && paymentMethod !== "all") filters.payment_method = paymentMethod;
    if (showStatus && status !== "all") filters.status = status;
    if (showType && type !== "all") filters.transaction_type = type;
    
    const filtersString = JSON.stringify(filters);
    
    // Prevent firing on mount if filters are empty/default
    if (isInitialMount.current) {
        isInitialMount.current = false;
        lastFiltersRef.current = filtersString;
        return;
    }

    if (filtersString !== lastFiltersRef.current) {
        lastFiltersRef.current = filtersString;
        onFilterChange(filters);
    }
  }, [startDate, endDate, serviceId, vendorId, vendorType, paymentMethod, status, type, showService, showVendor, showVendorType, showPaymentMethod, showStatus, showType, onFilterChange]);

  // Debounced effect to apply filters
  React.useEffect(() => {
    const timer = setTimeout(() => {
      applyFilters();
    }, 150); 
    return () => clearTimeout(timer);
  }, [applyFilters]);

  const activeCount = React.useMemo(() => {
    let count = 0;
    if (range !== "all") count++;
    if (showService && serviceId !== "all") count++;
    if (showVendor && vendorId !== "all") count++;
    if (showVendorType && vendorType !== "all") count++;
    if (showPaymentMethod && paymentMethod !== "all") count++;
    if (showStatus && status !== "all") count++;
    if (showType && type !== "all") count++;
    return count;
  }, [range, serviceId, vendorId, vendorType, paymentMethod, status, type, showService, showVendor, showVendorType, showPaymentMethod, showStatus, showType]);

  const resetFilters = () => {
    setRange("all");
    setStartDate(undefined);
    setEndDate(undefined);
    setServiceId("all");
    setVendorId("all");
    setVendorType("all");
    setPaymentMethod("all");
    setStatus("all");
    setType("all");
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
        title="Filter Records"
        contentClassName="w-[calc(100vw-32px)] sm:w-[450px]"
    >
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Row 1: Period & Flow Type */}
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

            {showType && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-muted-foreground">Flow Type</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-10 rounded-none border-primary/20 bg-white text-xs font-bold uppercase">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-2">
                    <SelectItem value="all" className="text-[10px] font-bold uppercase">All Types</SelectItem>
                    {typeOptions.map(o => (
                      <SelectItem key={o.value} value={o.value} className="text-[10px] font-bold uppercase">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Row 2: Vendor Relationship & Vendor */}
            {showVendorType && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-muted-foreground">Vendor Relationship</label>
                <Select value={vendorType} onValueChange={setVendorType}>
                  <SelectTrigger className="h-10 rounded-none border-primary/20 bg-white text-xs font-bold uppercase">
                    <SelectValue placeholder="All Relations" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-2">
                    <SelectItem value="all" className="text-[10px] font-bold uppercase">All Relations</SelectItem>
                    <SelectItem value="EXTERNAL" className="text-[10px] font-bold uppercase">External (Supplier)</SelectItem>
                    <SelectItem value="INTERNAL" className="text-[10px] font-bold uppercase">Internal (Staff/Cash)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {showVendor && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-muted-foreground">Vendor</label>
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger className="h-10 rounded-none border-primary/20 bg-white text-xs font-bold uppercase">
                    <SelectValue placeholder="All Vendors" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-2">
                    <SelectItem value="all" className="text-[10px] font-bold uppercase">All Vendors</SelectItem>
                    {filteredVendors.map(v => (
                      <SelectItem key={v.id} value={v.id.toString()} className="text-[10px] font-bold uppercase">{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Remaining Rows: Service, Method, Status */}
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

            {showPaymentMethod && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-muted-foreground">Method</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-10 rounded-none border-primary/20 bg-white text-xs font-bold uppercase">
                    <SelectValue placeholder="All Methods" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-2">
                    <SelectItem value="all" className="text-[10px] font-bold uppercase">All Methods</SelectItem>
                    <SelectItem value="Cash" className="text-[10px] font-bold uppercase">Cash</SelectItem>
                    <SelectItem value="Bank Transfer" className="text-[10px] font-bold uppercase">Bank Transfer</SelectItem>
                    <SelectItem value="bKash" className="text-[10px] font-bold uppercase">bKash</SelectItem>
                    <SelectItem value="STC Pay" className="text-[10px] font-bold uppercase">STC Pay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {showStatus && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-muted-foreground">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-10 rounded-none border-primary/20 bg-white text-xs font-bold uppercase">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-2">
                    <SelectItem value="all" className="text-[10px] font-bold uppercase">All Status</SelectItem>
                    {statusOptions.map(o => (
                      <SelectItem key={o.value} value={o.value} className="text-[10px] font-bold uppercase">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-primary/10">
            {/* Start Date */}
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

            {/* End Date */}
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