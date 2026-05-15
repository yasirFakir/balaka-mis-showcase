"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/ui/feedback/dialog";
import { Button } from "@/ui/base/button";
import { Label } from "@/ui/forms/label";
import { DatePicker } from "@/ui/forms/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/forms/select";
import { RadioGroup, RadioGroupItem } from "@/ui/forms/radio-group";
import { Switch } from "@/ui/forms/switch";
import { gonia } from "@/ui/lib/gonia-theme";
import { cn } from "@/ui/lib/utils";
import { useNotifications } from "@/ui/lib/notification-context";
import { API_URL, fetchClient } from "@/core/api";
import { Download, FileSpreadsheet, Check, X } from "lucide-react";
import { Badge } from "@/ui/base/badge";

import { ServiceDefinition } from "@/core/types";

export function ExportLedgerDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useNotifications();
  
  // State
  const [dateRange, setDateRange] = useState<{from: Date, to: Date}>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
    to: new Date()
  });
  const [currency, setCurrency] = useState("SAR");
  const [exportFormat, setExportFormat] = useState("excel");
  const [scope, setScope] = useState("both"); // internal, public, both
  const [sortOrder, setSortOrder] = useState("desc");
  const [dateMode, setDateMode] = useState<"custom" | "month">("custom");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthOptions = ["Whole Year (All Months)", ...months];
  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());
  
  // Service Selection
  const [services, setServices] = useState<ServiceDefinition[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  const [components, setComponents] = useState({
    revenue_stream: true,
    vendor_payment: true,
    profitability: true,
    transaction_log: true
  });

  // Fetch all services (including inactive)
  useEffect(() => {
    if (open) {
        setServicesLoading(true);
        fetchClient<{ items: ServiceDefinition[] } | ServiceDefinition[]>("/api/v1/services/?limit=1000&all=true&include_private=true")
            .then((res) => {
                const items = Array.isArray(res) ? res : (res.items || []);
                setServices(items);
            })
            .catch(err => console.error("Failed to load services for export filter", err))
            .finally(() => setServicesLoading(false));
    }
  }, [open]);

  const toggleService = (id: number) => {
      setSelectedServiceIds(prev => 
          prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const selectedComponents = Object.entries(components)
        .filter(([_, checked]) => checked)
        .map(([key]) => key);
        
      if (selectedComponents.length === 0) {
        toast.error("Selection Required", "Please select at least one component to export.");
        return;
      }

      let finalFrom = dateRange.from;
      let finalTo = dateRange.to;

      if (dateMode === "month") {
          if (selectedMonth === "Whole Year (All Months)") {
              finalFrom = new Date(parseInt(selectedYear), 0, 1);
              finalTo = new Date(parseInt(selectedYear), 11, 31, 23, 59, 59, 999);
          } else {
              const monthIdx = months.indexOf(selectedMonth);
              finalFrom = new Date(parseInt(selectedYear), monthIdx, 1);
              finalTo = new Date(parseInt(selectedYear), monthIdx + 1, 0); // Last day of month
              finalTo.setHours(23, 59, 59, 999);
          }
      }

      const token = localStorage.getItem("token")?.replace(/["']/g, "").trim();
      const response = await fetch(`${API_URL}/api/v1/transactions/export-ledger`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          start_date: finalFrom.toISOString(),
          end_date: finalTo.toISOString(),
          format: exportFormat,
          currency: currency,
          components: selectedComponents,
          scope: scope,
          service_ids: selectedServiceIds.length > 0 ? selectedServiceIds : undefined,
          sort_order: sortOrder
        })
      });
      
      if (response.status === 401) {
          window.dispatchEvent(new Event("auth:session-expired"));
          throw new Error("Session expired. Please log in again.");
      }
      
      if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || "Export failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Record_${format(finalFrom, 'yyyy-MM-dd')}_to_${format(finalTo, 'yyyy-MM-dd')}.${exportFormat === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success("Export Complete", "Your record has been downloaded successfully.");
      setOpen(false);
      
    } catch (error: any) {
      console.error(error);
      toast.error("Export Failed", error.message || "Could not generate the record report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn(gonia.button.base, gonia.button.outline, "gap-2")}>
            <Download className="h-4 w-4" /> Export Record
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden rounded-none border-2 border-primary/20 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 bg-[var(--gonia-canvas)] border-b border-primary/10 flex-shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary">
                    <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight text-primary">Export Financial Record</DialogTitle>
                    <DialogDescription className="text-xs font-bold uppercase tracking-normal opacity-60">
                        Generate detailed Excel/PDF reports with filtering
                    </DialogDescription>
                </div>
            </div>
        </DialogHeader>
        
        <div className="p-8 space-y-8 bg-white overflow-y-auto flex-grow">
            {/* Date Selection Mode */}
            <div className="space-y-4">
                <Label className={gonia.text.label}>Date Selection Mode</Label>
                <RadioGroup value={dateMode} onValueChange={(v: any) => setDateMode(v)} className="flex gap-6">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom" id="mode-custom" />
                        <Label htmlFor="mode-custom" className="cursor-pointer font-bold uppercase text-[10px]">Custom Range</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="month" id="mode-month" />
                        <Label htmlFor="mode-month" className="cursor-pointer font-bold uppercase text-[10px]">By Month/Year</Label>
                    </div>
                </RadioGroup>
            </div>

            {/* Date Range or Month/Year Picker */}
            {dateMode === "custom" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className={gonia.text.label}>From Date</Label>
                        <DatePicker date={dateRange.from} setDate={(d) => d && setDateRange({...dateRange, from: d})} />
                    </div>
                    <div className="space-y-2">
                        <Label className={gonia.text.label}>To Date</Label>
                        <DatePicker date={dateRange.to} setDate={(d) => d && setDateRange({...dateRange, to: d})} />
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className={gonia.text.label}>Select Month</Label>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className={gonia.input.base}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {monthOptions.map(m => <SelectItem key={m} value={m} className="font-bold text-xs">{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className={gonia.text.label}>Select Year</Label>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className={gonia.input.base}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(y => <SelectItem key={y} value={y} className="font-bold text-xs">{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Service Scope */}
                <div className="space-y-3">
                    <Label className={gonia.text.label}>Service Scope</Label>
                    <Select value={scope} onValueChange={setScope}>
                        <SelectTrigger className={gonia.input.base}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="both">All Services</SelectItem>
                            <SelectItem value="public">Public Only</SelectItem>
                            <SelectItem value="internal">Internal Only</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Sort Order */}
                <div className="space-y-3">
                    <Label className={gonia.text.label}>Data Sorting (By Date)</Label>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                        <SelectTrigger className={gonia.input.base}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="desc">Descending (Newest First)</SelectItem>
                            <SelectItem value="asc">Ascending (Oldest First)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Currency */}
                <div className="space-y-2">
                    <Label className={gonia.text.label}>Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger className={gonia.input.base}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="SAR">SAR (Saudi Riyal)</SelectItem>
                            <SelectItem value="BDT">BDT (Bangladeshi Taka)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Export Format */}
                <div className="space-y-3">
                    <Label className={gonia.text.label}>Export Format</Label>
                    <RadioGroup value={exportFormat} onValueChange={setExportFormat} className="flex gap-4 pt-2">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="excel" id="excel" />
                            <Label htmlFor="excel" className="cursor-pointer font-medium">Excel</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pdf" id="pdf" />
                            <Label htmlFor="pdf" className="cursor-pointer font-medium">PDF</Label>
                        </div>
                    </RadioGroup>
                </div>
            </div>

            {/* Service Filter */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label className={gonia.text.label}>Filter by Service (Optional)</Label>
                    <div className="flex gap-2">
                         <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-5 text-[10px] uppercase font-bold text-primary/60 hover:text-primary"
                            onClick={() => setSelectedServiceIds(services.map(s => s.id))}
                         >
                            Select All
                         </Button>
                         <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-5 text-[10px] uppercase font-bold text-destructive/60 hover:text-destructive"
                            onClick={() => setSelectedServiceIds([])}
                         >
                            Clear
                         </Button>
                    </div>
                </div>
                <div className="border border-primary/10 bg-[var(--gonia-canvas)] h-[150px] overflow-y-auto p-2 grid grid-cols-2 gap-2">
                    {servicesLoading ? (
                        <div className="col-span-2 text-center py-8 text-xs text-muted-foreground">Loading services...</div>
                    ) : services.map(service => (
                        <div 
                            key={service.id} 
                            onClick={() => toggleService(service.id)}
                            className={cn(
                                "flex items-center gap-2 p-2 border cursor-pointer transition-all hover:bg-primary/5 select-none",
                                selectedServiceIds.includes(service.id) 
                                    ? "bg-primary/10 border-primary/30" 
                                    : "bg-white border-transparent"
                            )}
                        >
                            <div className={cn(
                                "w-4 h-4 border flex items-center justify-center transition-colors",
                                selectedServiceIds.includes(service.id) ? "bg-primary border-primary" : "border-primary/20"
                            )}>
                                {selectedServiceIds.includes(service.id) && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className={cn("text-xs font-medium truncate", !service.is_active && "text-muted-foreground line-through decoration-destructive/30")}>
                                {service.name}
                            </span>
                            {!service.is_active && <Badge variant="destructive" className="ml-auto text-[9px] h-4 px-1">Inactive</Badge>}
                        </div>
                    ))}
                </div>
                <div className="text-[10px] text-muted-foreground text-right">
                    {selectedServiceIds.length === 0 ? "All services included" : `${selectedServiceIds.length} services selected`}
                </div>
            </div>
            
            {/* Components */}
            <div className="space-y-4">
                <Label className={gonia.text.label}>Report Sections</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.keys(components).map((key) => (
                        <div key={key} className="flex items-center justify-between p-3 border border-primary/10 bg-primary/5">
                            <Label htmlFor={key} className="capitalize cursor-pointer flex-1 font-medium">
                                {key.replace('_', ' ')}
                            </Label>
                            <Switch 
                                id={key}
                                checked={components[key as keyof typeof components]}
                                onCheckedChange={(c) => setComponents({...components, [key]: c})}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <DialogFooter className="p-6 bg-[var(--gonia-canvas)] border-t border-primary/10 flex-shrink-0">
            <Button variant="outline" onClick={() => setOpen(false)} className={gonia.button.base}>
                Cancel
            </Button>
            <Button onClick={handleExport} disabled={loading} className={cn(gonia.button.base, gonia.button.primary)}>
                {loading ? "Generating..." : "Download Report"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}