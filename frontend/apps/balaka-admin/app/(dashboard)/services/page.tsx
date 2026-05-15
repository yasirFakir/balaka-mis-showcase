"use client";

import { useEffect, useState } from "react";
import { fetchClient } from "@/core/api";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow, 
    Badge, 
    Button, 
    Card, 
    CardContent, 
    Input, 
    Tabs, 
    TabsContent, 
    TabsList, 
    TabsTrigger, 
    LoadingSpinner, 
    useNotifications, 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle,
    GoniaPageShell
} from "@/ui";

import { 
    Trash2, 
    Search, 
    Pencil, 
    Lock, 
    LayoutGrid, 
    Eye, 
    EyeOff,
    List,
    Plane,
    Package,
    MoonStar,
    Grid,
    Briefcase
} from "lucide-react";
import { ServiceDialog } from "@/components/services/service-dialog";
import { ServiceCard } from "@/components/services/service-card";
import { useAuth } from "@/lib/auth-context";
import { useCurrency } from "@/core/currency-context";
import { CurrencySwitcher } from "@/components/shared/currency-switcher";

import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ServiceDefinition {
  id: number;
  name: string;
  slug: string;
  category?: string;
  tags?: string[];
  description: string;
  image_url?: string | null;
  base_price: number;
  is_active: boolean;
  is_public: boolean;
  is_available: boolean;
  assigned_staff?: {
      id: number;
      full_name: string;
      profile_picture?: string | null;
  }[];
}

export default function ServicesPage() {
  const { hasPermission } = useAuth();
  const { toast } = useNotifications();
  const { formatCurrency } = useCurrency();
  const [services, setServices] = useState<ServiceDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filter, setFilter] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    try {
      setLoading(true);
      const response = await fetchClient<any>("/api/v1/services/?include_private=true");
      const data = Array.isArray(response) ? response : (response.items || []);
      setServices(data);
    } catch (error) {
      console.error("Failed to load services", error);
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  }

  const handleToggleVisibility = async (service: ServiceDefinition) => {
      try {
          const updated = await fetchClient<ServiceDefinition>(`/api/v1/services/${service.id}`, {
              method: "PUT",
              body: JSON.stringify({ is_available: !service.is_available })
          });
          setServices(prev => prev.map(s => s.id === updated.id ? updated : s));
          toast.success(`${service.name} is now ${!service.is_available ? 'Visible' : 'Hidden'}`);
      } catch (error) {
          toast.error("Failed to update visibility");
      }
  };

  const filtered = services
    .filter(s => 
        s.name.toLowerCase().includes(filter.toLowerCase()) ||
        s.slug.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
        // 1. Prioritize Public (External) Services
        if (a.is_public !== b.is_public) {
            return a.is_public ? -1 : 1;
        }
        
        // 2. Secondary: Alphabetical by Name
        return a.name.localeCompare(b.name);
    });

  const handleServiceSaved = (savedService: any) => {
    setServices((prev) => {
        const exists = prev.find(s => s.id === savedService.id);
        if (exists) {
            return prev.map(s => s.id === savedService.id ? savedService : s);
        }
        return [...prev, savedService as ServiceDefinition];
    });
  };

  const handleDelete = async () => {
      if (!deleteId) return;
      try {
          await fetchClient(`/api/v1/services/${deleteId}`, { method: "DELETE" });
          toast.success("Service deleted");
          setTimeout(() => {
              loadServices();
          }, 500);
      } catch (error) {
          toast.error("Failed to delete service");
      } finally {
          setDeleteId(null);
      }
  };

  if (loading) {
      return <LoadingSpinner size="lg" full />;
  }

  const categories = {
      all: filtered,
      ticket: filtered.filter(s => getCategory(s) === "ticket"),
      cargo: filtered.filter(s => getCategory(s) === "cargo"),
      hajj: filtered.filter(s => getCategory(s) === "hajj"),
      internal: filtered.filter(s => !s.is_public),
  };

  return (
    <GoniaPageShell
        title="Service Master Catalog"
        subtitle="Configure global service definitions, pricing strategies, and form schemas."
        icon={<Briefcase className="h-8 w-8" />}
        actions={
            <div className="flex items-center gap-3">
                <CurrencySwitcher />
                <div className="flex items-center border-2 border-primary/20 bg-white p-1">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn("h-8 w-10 p-0 rounded-none", viewMode === "grid" ? "bg-primary text-white" : "text-primary hover:bg-primary/10")}
                        onClick={() => setViewMode("grid")}
                    >
                        <Grid className="h-4 w-4" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn("h-8 w-10 p-0 rounded-none", viewMode === "list" ? "bg-primary text-white" : "text-primary hover:bg-primary/10")}
                        onClick={() => setViewMode("list")}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                </div>
                {hasPermission("services.manage_catalog") && (
                    <ServiceDialog onServiceSaved={handleServiceSaved} />
                )}
            </div>
        }
    >
      <div className="space-y-8">
        <Tabs defaultValue="all" className="w-full">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <TabsList className="bg-muted/20 border-2 border-primary/10">
                    <TabsTrigger value="all" className="gap-2"><Grid className="w-3.5 h-3.5" /> All</TabsTrigger>
                    <TabsTrigger value="ticket" className="gap-2"><Plane className="w-3.5 h-3.5" /> Tickets</TabsTrigger>
                    <TabsTrigger value="cargo" className="gap-2"><Package className="w-3.5 h-3.5" /> Cargo</TabsTrigger>
                    <TabsTrigger value="hajj" className="gap-2"><MoonStar className="w-3.5 h-3.5" /> Hajj/Umrah</TabsTrigger>
                    <TabsTrigger 
                        value="internal" 
                        activeClassName="bg-destructive"
                        className="gap-2 data-[state=active]:text-white text-destructive font-black uppercase"
                    >
                        <Lock className="w-3.5 h-3.5" /> Internal
                    </TabsTrigger>
                </TabsList>

                <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                        placeholder="Search catalog..." 
                        className="pl-9 h-10 rounded-none border-2 bg-muted/5 focus:bg-background transition-all text-xs"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
            </div>

            {Object.entries(categories).map(([key, items]) => (
                <TabsContent key={key} value={key} className="mt-0 outline-none">
                    {viewMode === "grid" ? (
                        items.length > 0 ? (
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {items.map(service => (
                                    <ServiceCard 
                                        key={service.id} 
                                        service={service} 
                                        onToggleVisibility={handleToggleVisibility}
                                        onDelete={(id) => setDeleteId(id)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-muted-foreground p-20 border-2 border-dashed text-center font-bold uppercase tracking-normal opacity-40">
                                No services found in this category
                            </div>
                        )
                    ) : (
                        <Card className="rounded-none border-2 shadow-none overflow-hidden">
                            <ServiceTable 
                                data={items} 
                                onToggleVisibility={handleToggleVisibility} 
                                onDelete={(id) => setDeleteId(id)} 
                                hasPermission={hasPermission} 
                            />
                        </Card>
                    )}
                </TabsContent>
            ))}
        </Tabs>

        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
            <AlertDialogContent className="rounded-none border-2">
                <AlertDialogHeader>
                    <AlertDialogTitle className="font-black uppercase tracking-tight">Permanent Deletion</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs font-medium">
                        This action will permanently remove the service definition and all its associated variants. This cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-none border-2">Cancel Operation</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90 rounded-none shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] transition-all">
                        Confirm Deletion
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    </GoniaPageShell>
  );
}

function getCategory(s: ServiceDefinition) {
    const cat = s.category?.toLowerCase() || "";
    const name = s.name.toLowerCase();
    const tags = (s.tags || []).map(t => t.toLowerCase());
    
    if (tags.includes("ticket service") || cat.includes("ticket") || name.includes("ticket") || name.includes("flight") || name.includes("air")) return "ticket";
    if (tags.includes("cargo service") || cat.includes("cargo") || name.includes("cargo") || name.includes("freight") || name.includes("shipping")) return "cargo";
    if (tags.includes("hajj & umrah") || cat.includes("hajj") || cat.includes("umrah") || name.includes("hajj") || name.includes("umrah") || name.includes("pilgrimage")) return "hajj";
    if (tags.includes("passport & visa") || cat.includes("passport") || cat.includes("visa") || name.includes("passport") || name.includes("visa") || name.includes("license") || name.includes("jawazat") || tags.includes("documents") || name.includes("document") || name.includes("malumat")) return "passport";
    
    return "general";
}

function ServiceTable({ data, onToggleVisibility, onDelete, hasPermission }: { data: ServiceDefinition[], onToggleVisibility: (s: ServiceDefinition) => void, onDelete: (id: number) => void, hasPermission: (p: string) => boolean }) {
  const { formatCurrency } = useCurrency();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">ID</TableHead>
          <TableHead>Service</TableHead>
          <TableHead>Price Model</TableHead>
          <TableHead>Assigned Staff</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((service) => (
          <TableRow key={service.id} className={cn(!service.is_public && "bg-destructive/5")}>
            <TableCell className={cn("font-mono text-[10px] text-muted-foreground", !service.is_public && "text-destructive font-bold")}>
                #{service.id}
            </TableCell>
            <TableCell>
                <Link href={`/services/${service.id}`} className="flex flex-col hover:opacity-80 transition-opacity">
                    <span className={cn("font-bold text-sm", !service.is_public && "text-destructive")}>{service.name}</span>
                    <span className={cn("font-mono text-[9px] text-muted-foreground uppercase tracking-tighter", !service.is_public && "text-destructive/70")}>{service.slug}</span>
                </Link>
            </TableCell>
            <TableCell className={cn("font-black text-xs text-primary font-mono", !service.is_public && "text-destructive")}>
                {service.base_price > 0 ? formatCurrency(service.base_price) : "MODULAR"}
            </TableCell>
            <TableCell>
                <div className="flex -space-x-1.5 overflow-hidden">
                    {service.assigned_staff?.slice(0, 5).map((u) => (
                        <div 
                            key={u.id}
                            title={u.full_name}
                            className="h-6 w-6 rounded-none border border-background bg-primary/10 flex items-center justify-center text-[8px] font-black uppercase text-primary overflow-hidden"
                        >
                            {u.profile_picture ? (
                                <img src={`${process.env.NEXT_PUBLIC_API_URL}${u.profile_picture}`} alt="" className="h-full w-full object-cover" />
                            ) : u.full_name.charAt(0)}
                        </div>
                    ))}
                    {(service.assigned_staff?.length || 0) > 5 && (
                        <div className="h-6 w-6 rounded-none border border-background bg-muted flex items-center justify-center text-[8px] font-black text-muted-foreground">
                            +{(service.assigned_staff?.length || 0) - 5}
                        </div>
                    )}
                    {(!service.assigned_staff || service.assigned_staff.length === 0) && (
                        <span className="text-[9px] font-medium text-muted-foreground/40 italic uppercase">None</span>
                    )}
                </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                  <Badge 
                    variant={service.is_active ? (service.is_public ? "success" : "destructive") : "secondary"} 
                    className={cn("text-[9px] h-5 rounded-none font-black uppercase tracking-normal")}
                  >
                    {service.is_active ? "Active" : "Disabled"}
                  </Badge>
                  {!service.is_available && (
                      <Badge variant="outline" className="text-[8px] h-4 rounded-none border-destructive/30 text-destructive uppercase">Hidden</Badge>
                  )}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={cn("h-8 px-2 rounded-none transition-all", service.is_available ? "text-emerald-600 hover:bg-emerald-50" : "text-muted-foreground hover:bg-muted")}
                    onClick={() => onToggleVisibility(service)}
                    title={service.is_available ? "Hide from Catalog" : "Show in Catalog"}
                  >
                      {service.is_available ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>

                  {hasPermission("services.manage_catalog") && (
                      <Link href={`/services/${service.id}/edit`}>
                          <Button variant="outline" size="sm" className="h-8 px-2 rounded-none hover:bg-primary hover:text-white transition-all">
                              <Pencil className="h-3.5 w-3.5" />
                          </Button>
                      </Link>
                  )}
                  {hasPermission("services.manage_catalog") && (
                      <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 px-2 rounded-none border-destructive/30 text-destructive hover:bg-destructive hover:border-destructive hover:text-white transition-all"
                          onClick={() => onDelete(service.id)}
                      >
                          <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                  )}
              </div>
            </TableCell>
          </TableRow>
        ))}
        {data.length === 0 && (
            <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-xs uppercase font-bold tracking-normal italic">
                    No services found in this category.
                </TableCell>
            </TableRow>
        )}
      </TableBody>
    </Table>
  );
}