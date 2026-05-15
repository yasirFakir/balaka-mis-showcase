"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchClient } from "@/core/api";
import { useGoniaDirectory } from "@/core/hooks/use-gonia-directory";
import { 
  Badge, Button, Card, CardContent, Input, useNotifications, gonia, 
  LoadingSpinner, GoniaCard, GoniaCardHeader, H2, GoniaDataTable, Column,
  Popover, PopoverTrigger, PopoverContent, GoniaIcons,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/ui";
import { Filter, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { DynamicForm } from "@/components/shared/dynamic-form";



import { 
    Box, 
    Search, 
    ArrowRight, 
    ArrowUpRight,
    Truck, 
    MapPin, 
    Scale, 
    Package as PackageIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { format } from "date-fns";

import { ServiceRequest } from "@/core/types";

interface ServiceDefinition {
  id: number;
  name: string;
  slug: string;
  form_schema: any;
}

export default function CargoLogisticsPage() {
  const { user } = useAuth();
  const { toast } = useNotifications();
  const router = useRouter();
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["All"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cargoDefinition, setCargoDefinition] = useState<ServiceDefinition | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Cargo Definition
  useEffect(() => {
      async function loadDefinition() {
          try {
              const res = await fetchClient<any>("/api/v1/services/?include_private=true");
              const services = Array.isArray(res) ? res : (res.items || []);
              const def = services.find((s: any) => s.slug === "cargo-service" || s.slug === "cargo-shipment");
              if (def) setCargoDefinition(def);
          } catch (e) {
              console.error("Failed to load cargo definition", e);
          }
      }
      loadDefinition();
  }, []);

  const filters = useMemo(() => ({
    category: "cargo",
    status: selectedStatuses.includes("All") ? undefined : selectedStatuses
  }), [selectedStatuses]);

  const { data: requests, loading, refresh, total, summary, page, setPage, limit } = useGoniaDirectory<ServiceRequest, { stats: any }>({
    endpoint: "/api/v1/service-requests/",
    onError: () => toast.error("Failed to load cargo data"),
    search: debouncedSearch,
    filters
  });

  const handleCreateShipment = async (formData: any) => {
    if (!cargoDefinition) return;
    try {
      await fetchClient("/api/v1/service-requests/", {
        method: "POST",
        body: JSON.stringify({
          service_def_id: cargoDefinition.id,
          form_data: formData,
          quantity: 1
        })
      });
      toast.success("Shipment created successfully");
      setIsCreateOpen(false);
      refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to create shipment");
    }
  };
  
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

  const FilterCheckbox = ({ label, value }: { label: string, value: string }) => {
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
        </label>
    );
  };
  
  const hasActiveFilters = !selectedStatuses.includes("All");

  const columns: Column<ServiceRequest>[] = [
    {
      id: "sl_number",
      header: "Shipment SL#",
      className: "pl-8",
      cell: (cargo: ServiceRequest) => (
          <div className="flex items-center gap-3">
              <Box className="h-4 w-4 text-primary/40" />
              <span className={cn(gonia.text.mono, "font-bold")}>
                  {cargo.form_data.sl_number || `CRG-${cargo.id.toString().padStart(4, '0')}`}
              </span>
          </div>
      )
    },
    {
      id: "sender_receiver",
      header: "Sender / Receiver",
      cell: (cargo: ServiceRequest) => (
        <div className="flex flex-col">
            <span className="font-bold text-sm text-primary">
                {cargo.form_data.full_name || cargo.form_data.sender_name || cargo.user?.full_name || "N/A"}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
                <ArrowRight className="h-3 w-3 text-primary/30" />
                <span className="text-[11px] font-bold text-primary/60 uppercase">{cargo.form_data.receiver_name}</span>
            </div>
        </div>
      )
    },
    {
      id: "details",
      header: "Cargo Details",
      cell: (cargo: ServiceRequest) => (
          <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                  <Scale className="h-3.5 w-3.5 text-primary/40" />
                  <span className={cn(gonia.text.mono, "text-[12px]")}>{cargo.form_data.weight_kg || 0} KG</span>
              </div>
              <div className="flex items-center gap-2">
                  <PackageIcon className="h-3.5 w-3.5 text-primary/40" />
                  <span className={cn(gonia.text.mono, "text-[12px]")}>{cargo.form_data.carton_count || 0} CTN</span>
              </div>
          </div>
      )
    },
    {
      id: "destination",
      header: "Destination",
      cell: (cargo: ServiceRequest) => (
          <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-destructive/40" />
              <span className="text-sm font-bold text-primary/80 uppercase">{cargo.form_data.district || "Unassigned"}</span>
          </div>
      )
    },
    {
      id: "status",
      header: "Status",
      cell: (cargo: ServiceRequest) => (
        <Badge className={cn(
            gonia.badge.base, "text-[10px] px-3",
            cargo.status === "Pending" ? "bg-[var(--gonia-warning)] text-[var(--gonia-ink)]" : 
            cargo.status === "Processing" ? "bg-[var(--gonia-primary)] text-white" : 
            "bg-[var(--gonia-secondary)] text-white"
        )}>
          {cargo.status}
        </Badge>
      )
    },
    {
      id: "date",
      header: "Entry Date",
      cell: (cargo: ServiceRequest) => (
        <span className={cn(gonia.text.mono, "text-[12px] opacity-60")}>
            {cargo.created_at ? format(new Date(cargo.created_at), "dd MMM yyyy") : "N/A"}
        </span>
      )
    },
    {
      id: "actions",
      header: "Action",
      className: "text-right pr-8",
      cell: (cargo: ServiceRequest) => (
        <Button 
            variant="outline" 
            size="icon" 
            className={cn(gonia.button.base, gonia.button.outline, "h-7 w-7 shadow-none border-primary/20 hover:border-primary transition-all")}
            onClick={() => router.push(`/requests/${cargo.id}`)}
        >
            <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      )
    }
  ];

  if (loading && !requests.length) {
      return <LoadingSpinner size="lg" full />;
  }

  return (
    <div className="space-y-10 px-0">
      {/* Gonia Header */}
      <div className={gonia.layout.pageHeader}>
        <div className="space-y-1">
            <h1 className={cn(gonia.text.h1, "flex items-center gap-3")}>
                <Truck className="h-8 w-8" /> Cargo Management
            </h1>
            <p className={gonia.text.caption}>
                Tracking door-to-door shipments, weight verification, and delivery status.
            </p>
        </div>
        <div className="flex gap-3">
            <Badge className={cn(gonia.badge.base, "bg-primary text-white px-4 py-1.5")}>
                Total Records: {total}
            </Badge>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className={cn(gonia.layout.card, "bg-white overflow-hidden p-0 rounded-none border-none shadow-none")}>
        <CardContent className="p-0">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="relative w-full max-w-sm">
                    {/* Create Button */}
                    {cargoDefinition && (
                        <Button 
                            className={cn(gonia.button.base, gonia.button.primary)}
                            onClick={() => setIsCreateOpen(true)}
                        >
                            <Plus className="h-4 w-4 mr-2" /> Create Shipment
                        </Button>
                    )}
                </div>
                
                <div className="flex items-center gap-2">
                     {/* Search Input */}
                    <div className="relative w-full md:w-64">
                        <GoniaIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search SL# or Customer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-xs rounded-none border-primary/20 focus:border-primary/40 bg-white shadow-none w-full"
                        />
                    </div>

                    {/* Filter Button (Popover) */}
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
                                <FilterCheckbox label="All" value="All" />
                                <div className="h-px bg-primary/10 my-1" />
                                <FilterCheckbox label="Pending" value="Pending" />
                                <FilterCheckbox label="Processing" value="Processing" />
                                <FilterCheckbox label="In Transit" value="In Transit" />
                                <FilterCheckbox label="Completed" value="Completed" />
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <GoniaDataTable 
                data={requests} 
                columns={columns} 
                total={total}
                page={page}
                limit={limit}
                onPageChange={setPage}
                searchable={false}
                emptyMessage="No shipment records detected."
                isLoading={loading}
            />
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[700px] rounded-none border-2 border-primary p-0 overflow-hidden bg-white">
          <DialogHeader className="p-6 bg-primary/5 border-b border-primary/10">
            <DialogTitle className={gonia.text.h2}>
                Create New Shipment
            </DialogTitle>
            <DialogDescription className={gonia.text.caption}>
                Log a new cargo shipment manually.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-8 bg-[var(--gonia-canvas)] overflow-y-auto max-h-[70vh]">
            {cargoDefinition?.form_schema && (
                <DynamicForm 
                    schema={cargoDefinition.form_schema} 
                    onSubmit={handleCreateShipment}
                    submitLabel={`Create Shipment Record`}
                    context={{
                        user_identifier: user?.id.toString() || "system",
                        service_name: cargoDefinition.slug,
                        service_id: cargoDefinition.id
                    }}
                />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}