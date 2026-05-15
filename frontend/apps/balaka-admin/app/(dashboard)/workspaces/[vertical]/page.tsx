"use client";

import { use, useEffect, useState, useMemo } from "react";
import { RequestList } from "@/components/requests/request-list";
import { 
  Plane, 
  Truck, 
  Landmark, 
  FileText, 
  Lock,
  TrendingUp,
  BarChart3,
  Package,
  Clock,
  RefreshCw,
  CheckCircle2,
  Users as UsersIcon,
  Mail,
  Phone,
  History,
  CreditCard,
  Building2,
  Wallet,
  ArrowRight
} from "lucide-react";
import { 
    gonia, GoniaPageShell, Card, LoadingSpinner, Badge, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
    Tabs, TabsContent, TabsList, TabsTrigger, GoniaDataTable, Column, Button,
    GoniaCard, GoniaCardHeader
} from "@/ui";
import { cn } from "@/lib/utils";
import { CurrencySwitcher } from "@/components/shared/currency-switcher";
import { getAnalyticsSummary, AnalyticsSummary } from "@/lib/analytics";
import { useCurrency } from "@/core/currency-context";
import { formatCompactNumber } from "@/core/formatters";
import { fetchClient } from "@/core/api";
import { ServiceDefinition, User, Vendor } from "@/core/types";
import { TransactionList } from "@/components/finance/transaction-list";
import { PayVendorDialog } from "@/components/finance/pay-vendor-dialog";
import Link from "next/link";

const VERTICAL_CONFIG: Record<string, { title: string, category?: string, icon: any, isInternal: boolean, color: string }> = {
    "ticket": { 
        title: "Ticket Desk", 
        category: "Ticket Service", 
        icon: Plane, 
        isInternal: false,
        color: "text-blue-600"
    },
    "cargo": { 
        title: "Cargo Hub", 
        category: "Cargo Service", 
        icon: Truck, 
        isInternal: false,
        color: "text-orange-600"
    },
    "hajj-umrah": { 
        title: "Hajj & Umrah", 
        category: "Hajj & Umrah", 
        icon: Landmark, 
        isInternal: false,
        color: "text-emerald-600"
    },
    "general": { 
        title: "General Services", 
        category: "General Service", 
        icon: FileText, 
        isInternal: false,
        color: "text-violet-600"
    },
    "private": { 
        title: "Private Operations", 
        icon: Lock, 
        isInternal: true,
        color: "text-slate-600"
    }
};

export default function WorkspacePage({ params }: { params: Promise<{ vertical: string }> }) {
    const { vertical } = use(params);
    const config = VERTICAL_CONFIG[vertical] || VERTICAL_CONFIG["general"];
    const { formatCompactCurrency, formatCurrency } = useCurrency();
    
    const [stats, setStats] = useState<AnalyticsSummary | null>(null);
    const [services, setServices] = useState<ServiceDefinition[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [loadingVendors, setLoadingVendors] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const initialFilters = config.category ? { category: config.category } : {};

    // 1. Fetch Analytics & Personnel
    useEffect(() => {
        async function loadWorkspaceData() {
            setLoadingStats(true);
            try {
                const isPublicParam = config.isInternal ? false : (config.category ? true : null);
                const summary = await getAnalyticsSummary(null, null, null, null, config.category, isPublicParam);
                setStats(summary);

                const isInternalParam = config.isInternal;
                const sResponse = await fetchClient<{ items: ServiceDefinition[] }>(
                    `/api/v1/services/?${config.category ? `category=${config.category}&` : ""}include_private=${isInternalParam}`
                );
                setServices(sResponse.items || []);
            } catch (error) {
                console.error("Failed to load workspace stats", error);
            } finally {
                setLoadingStats(false);
            }
        }
        loadWorkspaceData();
    }, [config.category, config.isInternal, refreshKey]);

    // 2. Fetch Vendors associated with this vertical
    useEffect(() => {
        async function loadVendors() {
            setLoadingVendors(true);
            try {
                // Fetch vendors BOUND to this category
                const response = await fetchClient<any>(`/api/v1/vendors/?${config.category ? `category=${config.category}` : ""}`);
                const allVendors = Array.isArray(response) ? response : (response.items || []);
                
                // For internal operations, we usually want all internal vendors regardless of balance
                // For public, we might want all associated vendors
                setVendors(allVendors);
            } catch (error) {
                console.error("Failed to load vendors", error);
            } finally {
                setLoadingVendors(false);
            }
        }
        loadVendors();
    }, [config.category, config.isInternal, refreshKey]);

    const assignedStaff = useMemo(() => {
        const staffMap = new Map<number, User>();
        services.forEach(s => {
            s.assigned_staff?.forEach(user => {
                staffMap.set(user.id, user);
            });
        });
        return Array.from(staffMap.values());
    }, [services]);

    const vendorColumns: Column<Vendor>[] = [
        {
            id: "name",
            header: "Vendor/Account",
            accessorKey: "name",
            cell: (v: Vendor) => <span className="font-bold text-xs text-primary uppercase">{v.name}</span>
        },
        {
            id: "balance",
            header: "Balance",
            className: "text-right",
            cell: (v: Vendor) => (
                <span className={cn(
                    "font-mono font-bold text-sm",
                    (v.current_balance ?? 0) > 0 ? "text-rose-600" : "text-emerald-600"
                )}>
                    {formatCurrency(v.current_balance ?? 0)}
                </span>
            )
        },
        {
            id: "actions",
            header: "Action",
            className: "text-right pr-6",
            cell: (v: Vendor) => (
                <div className="flex justify-end gap-2">
                    <PayVendorDialog 
                        vendorId={v.id} 
                        vendorName={v.name} 
                        onPaymentRecorded={() => setRefreshKey(k => k + 1)} 
                        trigger={
                            <Button variant="outline" size="sm" className="h-7 rounded-none text-[9px] uppercase font-black">
                                <Wallet className="h-3 w-3 mr-1.5" /> Settle
                            </Button>
                        }
                    />
                    <Link href={`/finance/vendors/${v.id}`}>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-primary/40 hover:text-primary">
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            )
        }
    ];

    return (
        <GoniaPageShell
            title={config.title}
            subtitle={`Management workspace for ${config.title.toLowerCase()}.`}
            icon={<config.icon className={cn("h-8 w-8", config.color)} />}
            actions={<CurrencySwitcher />}
        >
            <div className="space-y-8 pb-20">
                
                {/* 1. KPI ROW */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatCard label="Revenue" value={stats?.total_revenue} isCurrency loading={loadingStats} icon={TrendingUp} formatter={formatCompactCurrency} />
                    <StatCard label="Profit" value={stats?.net_profit} isCurrency loading={loadingStats} icon={BarChart3} formatter={formatCompactCurrency} color="text-[var(--gonia-secondary)]" />
                    <StatCard label="Total" value={stats?.total_requests_count} loading={loadingStats} icon={Package} />
                    <StatCard label="Pending" value={stats?.pending_requests_count} loading={loadingStats} icon={Clock} color="text-[var(--gonia-warning)]" />
                    <StatCard label="Active" value={stats?.processing_requests_count} loading={loadingStats} icon={RefreshCw} color="text-[var(--gonia-info)]" />
                    <StatCard label="Settled" value={stats?.completed_requests_count} loading={loadingStats} icon={CheckCircle2} color="text-[var(--gonia-success)]" />
                </div>

                {/* 2. PERSONNEL & TABS HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 border-2 border-primary/5 shadow-sm">
                    <div className="space-y-1">
                        <h2 className="text-sm font-black uppercase tracking-tight text-primary flex items-center gap-2">
                            <config.icon className="h-4 w-4" /> Service Control Center
                        </h2>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                            Centralized operations and financial management
                        </p>
                    </div>

                    {assignedStaff.length > 0 && (
                        <div className="flex flex-col items-end gap-2">
                            <span className="text-[9px] font-black uppercase text-muted-foreground/60 mr-2">Active Personnel</span>
                            <div className="flex flex-wrap gap-2 justify-end">
                                {assignedStaff.map((user) => (
                                    <Badge key={user.id} variant="outline" className="rounded-none border-primary/20 text-primary font-black uppercase text-[10px] bg-primary/5 px-3 py-1">
                                        {user.full_name.split(' ')[0]}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. THREE-TAB WORKSPACE */}
                <Tabs defaultValue="history" className="w-full space-y-6">
                    <TabsList className="bg-white border-2 border-primary/5 p-1 h-auto rounded-none w-full md:w-auto overflow-x-auto overflow-y-hidden justify-start">
                        <TabsTrigger value="history" className="rounded-none data-[state=active]:text-white font-black uppercase text-[10px] h-10 px-6 gap-2">
                            <History className="h-3.5 w-3.5" /> History
                        </TabsTrigger>
                        <TabsTrigger value="payments" className="rounded-none data-[state=active]:text-white font-black uppercase text-[10px] h-10 px-6 gap-2">
                            <CreditCard className="h-3.5 w-3.5" /> Payments
                        </TabsTrigger>
                        <TabsTrigger value="vendors" className="rounded-none data-[state=active]:text-white font-black uppercase text-[10px] h-10 px-6 gap-2">
                            <Building2 className="h-3.5 w-3.5" /> Vendors
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="history" className="mt-0 outline-none">
                        <div className={cn(gonia.layout.card, "overflow-hidden p-0 bg-white border-2 border-primary/5 shadow-sm")}>
                            <RequestList 
                                initialFilters={initialFilters} 
                                isInternal={config.isInternal}
                                showServiceFilter={false}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="payments" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-2">
                        <TransactionList 
                            category={config.category}
                            isPublic={!config.isInternal}
                            refreshKey={refreshKey}
                            onTransactionUpdated={() => setRefreshKey(k => k + 1)}
                        />
                    </TabsContent>

                    <TabsContent value="vendors" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-2">
                        <GoniaCard className="border-2 border-primary/5 shadow-sm">
                            <GoniaCardHeader>
                                <div className="flex justify-between items-center">
                                    <h2 className="text-sm font-black uppercase tracking-tight text-primary">Vertical Liabilities</h2>
                                    <Badge variant="outline" className="rounded-none font-mono text-[10px] border-primary/20">
                                        Total Vendors: {vendors.length}
                                    </Badge>
                                </div>
                            </GoniaCardHeader>
                            <div className="p-0">
                                <GoniaDataTable 
                                    data={vendors}
                                    columns={vendorColumns}
                                    isLoading={loadingVendors}
                                    searchable={false}
                                />
                            </div>
                        </GoniaCard>
                    </TabsContent>
                </Tabs>
            </div>
        </GoniaPageShell>
    );
}

function StatCard({ label, value, loading, icon: Icon, isCurrency, formatter, color = "text-primary" }: any) {
    return (
        <Card className="rounded-none border-2 border-primary/10 shadow-none bg-white p-4 flex flex-col justify-between relative overflow-hidden group hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{label}</span>
                <Icon className={cn("h-3.5 w-3.5 opacity-20 group-hover:opacity-100 transition-opacity", color)} />
            </div>
            <h3 className={cn("text-xl font-black font-mono truncate tracking-tighter", color)}>
                {loading ? <LoadingSpinner size="sm" /> : (formatter ? formatter(value ?? 0) : formatCompactNumber(value ?? 0))}
            </h3>
        </Card>
    );
}
