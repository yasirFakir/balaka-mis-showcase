"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { RequestList } from "@/components/requests/request-list";
import { 
  Card, CardContent, CardHeader, CardTitle, 
  Button, NotificationBell, useNotifications, 
  gonia, Badge,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/ui";

import Link from "next/link";
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, 
  ShieldAlert, Activity, BarChart3, ArrowRight,
  Clock, CheckCircle2, RefreshCw, AlertCircle,
  Users, Briefcase
} from "lucide-react";
import { DashboardDateFilter } from "@/components/shared/dashboard-date-filter";

import { RevenueTrendChart, ServiceDistributionChart, VendorDebtChart } from "@/components/finance/analytics-charts";
import { getAnalyticsSummary, AnalyticsSummary } from "@/lib/analytics";

import { subDays } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { useCurrency } from "@/core/currency-context";
import { CurrencySwitcher } from "@/components/shared/currency-switcher";
import { formatCompactNumber } from "@/core/formatters";

import { cn } from "@/lib/utils";
import { User } from "@/core/types";


export default function AdminDashboard() {
  const { hasPermission } = useAuth();
  const { toast } = useNotifications();
  const { formatCurrency, formatCompactCurrency } = useCurrency();
  const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [selectedVertical, setSelectedVertical] = useState<string>("all");
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  
  const canViewReports = hasPermission("analytics.view_dashboard");

  useEffect(() => {
      const fetchData = async () => {
          if (!canViewReports) {
              setLoading(false);
              return;
          }
          
          try {
              setLoading(true);
              
              // Map vertical to category and is_public
              let category: string | null = null;
              let isPublic: boolean | null = null;

              if (selectedVertical === "ticket") category = "Ticket Service";
              else if (selectedVertical === "cargo") category = "Cargo Service";
              else if (selectedVertical === "hajj-umrah") category = "Hajj & Umrah";
              else if (selectedVertical === "general") category = "General Service";
              else if (selectedVertical === "private") isPublic = false;

              const result = await getAnalyticsSummary(startDate, endDate, null, null, category, isPublic);
              setData(result);
          } catch (error: any) {
              if (error.message !== "SESSION_EXPIRED") {
                toast.error("Failed to load analytics");
              }
          } finally {
              setLoading(false);
          }
      };
      
      fetchData();
  }, [startDate, endDate, selectedVertical, canViewReports]);

  const handleDateChange = (start: Date | null, end: Date | null) => {
      setStartDate(start);
      setEndDate(end);
  };

  if (!canViewReports) {
      return (
        <ProtectedRoute>
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-6">
                <div className="bg-muted p-4 border-2 border-primary/20">
                    <ShieldAlert className="h-12 w-12 text-primary/40" />
                </div>
                <h1 className={gonia.text.h1}>Access Restricted</h1>
                <p className={cn(gonia.text.body, "max-w-md text-muted-foreground")}>
                    Your account does not have sufficient permissions to view the Executive Dashboard.
                </p>
            </div>
        </ProtectedRoute>
      );
  }

  return (
    <ProtectedRoute>
        <div className="overflow-x-hidden space-y-10 pb-10">
            {/* Gonia v1.5 Anchored Header - Standard Alignment */}
            <div className={gonia.layout.pageHeader}>
                <div className="flex-1">
                    <h1 className={gonia.text.h1}>Admin Dashboard</h1>
                    <p className={gonia.text.caption}>Detailed overview of financial and activity summary.</p>
                </div>
                <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-2">
                        <Select value={selectedVertical} onValueChange={setSelectedVertical}>
                            <SelectTrigger className="h-10 border-2 border-primary/10 rounded-none font-black uppercase text-[10px] bg-white min-w-[120px]">
                                <SelectValue placeholder="All Services" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none border-2">
                                <SelectItem value="all" className="font-black uppercase text-[10px]">All Services</SelectItem>
                                <SelectItem value="ticket" className="font-black uppercase text-[10px]">Ticket Desk</SelectItem>
                                <SelectItem value="cargo" className="font-black uppercase text-[10px]">Cargo Hub</SelectItem>
                                <SelectItem value="hajj-umrah" className="font-black uppercase text-[10px]">Hajj & Umrah</SelectItem>
                                <SelectItem value="general" className="font-black uppercase text-[10px]">General Services</SelectItem>
                                <SelectItem value="private" className="font-black uppercase text-[10px]">Private Operations</SelectItem>
                            </SelectContent>
                        </Select>
                        <CurrencySwitcher />
                        <div className="bg-white border-2 border-primary/10 h-10 flex items-center px-2 hover:border-primary/40 transition-colors cursor-pointer">
                            <NotificationBell />
                        </div>
                    </div>
                    <div className="flex-1">
                        <DashboardDateFilter onFilterChange={handleDateChange} />
                    </div>
                </div>
            </div>

            <TooltipProvider>
            
            {/* PRIMARY HIGHLIGHT: Unified Saturated KPI Grid */}
            <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 px-1">
            {/* Revenue - Primary Forest */}
            <Link href="/finance/records?view=revenue" className="group h-full">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Card className={cn(gonia.layout.cardSaturated, "h-full p-5 md:p-6 relative overflow-hidden flex flex-col justify-between transition-all")}>
                            <div className={gonia.layout.marker} />
                            <div className="relative z-20 space-y-3 md:space-y-4">
                                <div className="flex justify-between items-center w-full">
                                    <h3 className={cn(gonia.text.caption, "text-white group-hover:text-primary group-hover:opacity-100 transition-all")}>Total Revenue</h3>
                                    <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </div>
                                <div className={cn(gonia.text.mono, "text-xl sm:text-2xl md:text-4xl text-white group-hover:text-primary transition-colors truncate")}>
                                    {loading ? "..." : formatCompactCurrency(data?.total_revenue ?? 0)}
                                </div>
                            </div>
                            <div className="relative z-20 mt-4 md:mt-6 flex items-center gap-3">
                                <Badge className={cn(gonia.badge.base, "bg-white/20 text-white border-none group-hover:bg-primary/10 group-hover:text-primary transition-all uppercase px-3 py-1.5 whitespace-nowrap")}>Liquidity Verified</Badge>
                                <TrendingUp className="h-5 w-5 text-white/60 group-hover:text-primary group-hover:opacity-100 transition-all shrink-0" />
                            </div>
                        </Card>
                    </TooltipTrigger>
                    <TooltipContent className="bg-primary text-white font-mono border-none py-2 px-4 shadow-xl">
                        {formatCurrency(data?.total_revenue ?? 0)}
                    </TooltipContent>
                </Tooltip>
            </Link>

                {/* Profit - Moss Green */}
                <Link href="/finance/records?view=profit" className="group h-full">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Card className={cn(gonia.layout.cardSaturated, "h-full p-5 md:p-6 relative overflow-hidden flex flex-col justify-between bg-[var(--gonia-secondary)] border-[var(--gonia-secondary)] shadow-[var(--gonia-primary)]/30 group-hover:border-[var(--gonia-secondary)] hover:bg-transparent transition-all")}>
                                <div className="absolute top-0 left-0 w-1 h-0 bg-[var(--gonia-secondary)] group-hover:h-full transition-all duration-300" />
                                                                                                            <div className="relative z-20 space-y-3 md:space-y-4">
                                                                                                            <div className="flex justify-between items-center w-full">
                                                                                                                <h3 className={cn(gonia.text.caption, "text-white group-hover:text-[var(--gonia-secondary)] group-hover:opacity-100 transition-all")}>Net Profit</h3>
                                                                                                                <ArrowRight className="h-4 w-4 text-[var(--gonia-secondary)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                                                                                            </div>                                                        <div className={cn(gonia.text.mono, "text-xl sm:text-2xl md:text-4xl text-white group-hover:text-[var(--gonia-secondary)] transition-colors truncate")}>
                                                            {loading ? "..." : formatCompactCurrency(data?.net_profit ?? 0)}
                                                        </div>
                                                    </div>
                                                    <div className="relative z-20 mt-4 md:mt-6 flex items-center gap-3">
                                                        <Badge className={cn(gonia.badge.base, "bg-white/20 text-white border-none group-hover:bg-[var(--gonia-secondary)]/10 group-hover:text-[var(--gonia-secondary)] transition-all uppercase px-3 py-1.5 whitespace-nowrap")}>Post-Cost Profit</Badge>
                                                        <TrendingUp className="h-5 w-5 text-white/60 group-hover:text-[var(--gonia-secondary)] group-hover:opacity-100 transition-all shrink-0" />
                                                    </div>                    </Card>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[var(--gonia-secondary)] text-white font-mono border-none py-2 px-4 shadow-xl">
                            {formatCurrency(data?.net_profit ?? 0)}
                        </TooltipContent>
                    </Tooltip>
                </Link>

                            {/* Expense - Leaf Gold */}            <Link href="/finance/records?view=expenses" className="group h-full">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Card className={cn(gonia.layout.cardSaturated, "h-full p-5 md:p-6 relative overflow-hidden flex flex-col justify-between bg-[var(--gonia-warning)] border-[var(--gonia-warning)] shadow-[var(--gonia-primary)]/20 group-hover:border-[var(--gonia-warning)] hover:bg-transparent transition-all")}>
                            <div className="absolute top-0 left-0 w-1 h-0 bg-[var(--gonia-warning)] group-hover:h-full transition-all duration-300" />
                            <div className="relative z-20 space-y-3 md:space-y-4">
                                <div className="flex justify-between items-center w-full">
                                    <h3 className={cn(gonia.text.caption, "text-white group-hover:text-[var(--gonia-warning)] group-hover:opacity-100 transition-all")}>Vendor Expense</h3>
                                    <ArrowRight className="h-4 w-4 text-[var(--gonia-warning)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </div>
                                <div className={cn(gonia.text.mono, "text-xl sm:text-2xl md:text-4xl text-white group-hover:text-[var(--gonia-warning)] transition-colors truncate")}>
                                    {loading ? "..." : formatCompactCurrency(data?.total_cost ?? 0)}
                                </div>
                            </div>
                            <div className="relative z-20 mt-4 md:mt-6 flex items-center gap-3">
                                <Badge className={cn(gonia.badge.base, "bg-white/20 text-white border-none group-hover:bg-[var(--gonia-warning)]/20 group-hover:text-[var(--gonia-warning)] transition-all uppercase px-3 py-1.5 whitespace-nowrap")}>Settled Payables</Badge>
                                <TrendingDown className="h-5 w-5 text-white/60 group-hover:text-[var(--gonia-warning)] group-hover:opacity-100 transition-all shrink-0" />
                            </div>
                        </Card>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[var(--gonia-warning)] text-white font-mono border-none py-2 px-4 shadow-xl">
                        {formatCurrency(data?.total_cost ?? 0)}
                    </TooltipContent>
                </Tooltip>
            </Link>

                {/* Debt - Brick Red */}
                <Link href="/finance/vendors" className="group h-full">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Card className={cn(gonia.layout.cardSaturated, "h-full p-5 md:p-6 relative overflow-hidden flex flex-col justify-between bg-[var(--gonia-error)] border-[var(--gonia-error)] shadow-primary/20 group-hover:border-[var(--gonia-error)] hover:bg-transparent transition-all")}>
                                <div className="absolute top-0 left-0 w-1 h-0 bg-[var(--gonia-error)] group-hover:h-full transition-all duration-300" />
                            <div className="relative z-20 space-y-3 md:space-y-4">
                                <div className="flex justify-between items-center w-full">
                                    <h3 className={cn(gonia.text.caption, "text-white group-hover:text-[var(--gonia-error)] group-hover:opacity-100 transition-all")}>Current Debt</h3>
                                    <ArrowRight className="h-4 w-4 text-[var(--gonia-error)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </div>
                                <div className={cn(gonia.text.mono, "text-xl sm:text-2xl md:text-4xl text-white group-hover:text-[var(--gonia-error)] transition-colors truncate")}>
                                    {loading ? "..." : formatCompactCurrency(data?.total_debt ?? 0)}
                                </div>
                            </div>
                            <div className="relative z-20 mt-4 md:mt-6 flex items-center gap-3">
                                <Badge className={cn(gonia.badge.base, "bg-white/20 text-white border-none group-hover:bg-[var(--gonia-error)]/10 group-hover:text-[var(--gonia-error)] transition-all uppercase px-3 py-1.5 whitespace-nowrap")}>Exposure Limit</Badge>
                                <TrendingUp className="h-5 w-5 text-white/60 group-hover:text-[var(--gonia-error)] group-hover:opacity-100 transition-all shrink-0" />
                            </div>
                            </Card>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[var(--gonia-error)] text-white font-mono border-none py-2 px-4 shadow-xl">
                            {formatCurrency(data?.total_debt ?? 0)}
                        </TooltipContent>
                    </Tooltip>
                </Link>
            </div>

            {/* WORKLOAD STATS: Operational KPI Row */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-3 px-1">
                    <Activity className="h-4 w-4 text-primary" />
                    <h2 className={cn(gonia.text.label, "m-0 uppercase tracking-normal text-[10px]")}>Workload & Operations</h2>
                </div>
                
                <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4 px-1">
                    {/* Pending Requests */}
                    <Link href="/requests?status=Pending" className="block h-full group">
                        <Card className={cn(gonia.layout.card, "bg-white border-primary/10 p-3 md:p-5 flex flex-col h-full justify-between shadow-none hover:border-primary/30 transition-all relative overflow-hidden")}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-1.5 md:p-2 bg-[var(--gonia-warning)]/10 border border-[var(--gonia-warning)]/20 group-hover:bg-[var(--gonia-warning)]/20 transition-colors">
                                    <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-[var(--gonia-warning)]" />
                                </div>
                                <Badge variant="outline" className="text-[7px] md:text-[8px] uppercase font-black border-[var(--gonia-warning)]/20 text-[var(--gonia-warning)] bg-[var(--gonia-warning)]/5 px-1 md:px-2">Immediate</Badge>
                            </div>
                            <div>
                                <p className={cn(gonia.text.caption, "text-muted-foreground text-[8px] md:text-[10px] uppercase truncate")}>Pending Requests</p>
                                <h3 className={cn(gonia.text.mono, "text-lg md:text-2xl font-black group-hover:text-primary transition-colors")}>
                                    {loading ? "..." : formatCompactNumber(data?.pending_requests_count ?? 0)}
                                </h3>
                            </div>
                        </Card>
                    </Link>

                    {/* Completed Requests */}
                    <Link href="/requests?status=Completed" className="block h-full group">
                        <Card className={cn(gonia.layout.card, "bg-white border-primary/10 p-3 md:p-5 flex flex-col h-full justify-between shadow-none hover:border-primary/30 transition-all relative overflow-hidden")}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-1.5 md:p-2 bg-[var(--gonia-success)]/10 border border-[var(--gonia-success)]/20 group-hover:bg-[var(--gonia-success)]/20 transition-colors">
                                    <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-[var(--gonia-success)]" />
                                </div>
                                <Badge variant="outline" className="text-[7px] md:text-[8px] uppercase font-black border-[var(--gonia-success)]/20 text-[var(--gonia-success)] bg-[var(--gonia-success)]/5 px-1 md:px-2">Done</Badge>
                            </div>
                            <div>
                                <p className={cn(gonia.text.caption, "text-muted-foreground text-[8px] md:text-[10px] uppercase truncate")}>Completed Requests</p>
                                <h3 className={cn(gonia.text.mono, "text-lg md:text-2xl font-black group-hover:text-primary transition-colors")}>
                                    {loading ? "..." : formatCompactNumber(data?.completed_requests_count ?? 0)}
                                </h3>
                            </div>
                        </Card>
                    </Link>

                    {/* Active Processing */}
                    <Link href="/requests?status=Processing&status=In%20Transit&status=Received%20at%20Warehouse&status=Out%20for%20Delivery" className="block h-full group">
                        <Card className={cn(gonia.layout.card, "bg-white border-primary/10 p-3 md:p-5 flex flex-col h-full justify-between shadow-none hover:border-primary/30 transition-all relative overflow-hidden")}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-1.5 md:p-2 bg-[var(--gonia-info)]/10 border border-[var(--gonia-info)]/20 group-hover:bg-[var(--gonia-info)]/20 transition-colors">
                                    <RefreshCw className="h-3.5 w-3.5 md:h-4 md:w-4 text-[var(--gonia-info)] animate-spin-slow" />
                                </div>
                                <Badge variant="outline" className="text-[7px] md:text-[8px] uppercase font-black border-[var(--gonia-info)]/20 text-[var(--gonia-info)] bg-[var(--gonia-info)]/5 px-1 md:px-2">In Progress</Badge>
                            </div>
                            <div>
                                <p className={cn(gonia.text.caption, "text-muted-foreground text-[8px] md:text-[10px] uppercase truncate")}>Processing Requests</p>
                                <h3 className={cn(gonia.text.mono, "text-lg md:text-2xl font-black group-hover:text-primary transition-colors")}>
                                    {loading ? "..." : formatCompactNumber(data?.processing_requests_count ?? 0)}
                                </h3>
                            </div>
                        </Card>
                    </Link>

                    {/* Pending Verifications */}
                    <Link href="/finance/records?view=verification" className="block h-full group">
                        <Card className={cn(gonia.layout.card, "bg-white border-primary/10 p-3 md:p-5 flex flex-col h-full justify-between shadow-none hover:border-primary/30 transition-all relative overflow-hidden")}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-1.5 md:p-2 bg-[var(--gonia-error)]/10 border border-[var(--gonia-error)]/20 group-hover:bg-[var(--gonia-error)]/20 transition-colors">
                                    <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-[var(--gonia-error)]" />
                                </div>
                                <Badge variant="outline" className="text-[7px] md:text-[8px] uppercase font-black border-[var(--gonia-error)]/20 text-[var(--gonia-error)] bg-[var(--gonia-error)]/5 px-1 md:px-2">Financial Audit</Badge>
                            </div>
                            <div>
                                <p className={cn(gonia.text.caption, "text-muted-foreground text-[8px] md:text-[10px] uppercase truncate")}>Pending Verifications</p>
                                <h3 className={cn(gonia.text.mono, "text-lg md:text-2xl font-black group-hover:text-primary transition-colors")}>
                                    {loading ? "..." : formatCompactNumber(data?.pending_verifications_count ?? 0)}
                                </h3>
                            </div>
                        </Card>
                    </Link>
                </div>
            </div>

            </TooltipProvider>

            {/* SERVICE PERFORMANCE: Per-Service KPI Grid */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-3">
                        <Briefcase className="h-4 w-4 text-primary" />
                        <h2 className={cn(gonia.text.label, "m-0 uppercase tracking-normal text-[10px]")}>Service Performance</h2>
                    </div>
                    <Link href="/operations/performance" className="text-[10px] font-black uppercase text-primary hover:underline flex items-center gap-1">
                        View All <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>
                
                <div className="grid gap-3 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 px-1">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <Card key={i} className={cn(gonia.layout.card, "bg-white border-primary/10 p-4 h-32 animate-pulse")} />
                        ))
                    ) : (
                        (() => {
                            let filtered = data?.service_stats || [];
                            
                            // If "Private" vertical, show all internal services
                            if (selectedVertical === "private") {
                                filtered = filtered.filter(s => !s.is_public);
                            } else if (selectedVertical !== "all") {
                                // For specific verticals (ticket, cargo, etc.), we show services in that category
                                const catMap: Record<string, string> = {
                                    "ticket": "Ticket Service",
                                    "cargo": "Cargo Service",
                                    "hajj-umrah": "Hajj & Umrah",
                                    "general": "General Service"
                                };
                                const targetCat = catMap[selectedVertical];
                                filtered = filtered.filter(s => s.category === targetCat);
                            } else {
                                // Default "All" view: show top 3 active public services
                                filtered = filtered.filter(s => s.is_public && s.is_available);
                                const ticketStat = filtered.find(s => s.name.toLowerCase().includes('ticket'));
                                const others = filtered.filter(s => !s.name.toLowerCase().includes('ticket'));
                                filtered = ticketStat ? [ticketStat, ...others].slice(0, 3) : others.slice(0, 3);
                            }
                            
                            return filtered.map((stat) => (
                                <Link href={`/services/${stat.service_id}`} key={stat.service_id} className="block group">
                                    <Card className={cn(gonia.layout.card, "bg-white border-primary/20 p-4 flex flex-col h-full justify-between shadow-none group-hover:border-primary/40 transition-all relative overflow-hidden")}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex flex-col gap-0">
                                                <h3 className={cn(gonia.text.h2, "text-base group-hover:text-primary transition-colors leading-tight")}>{stat.name}</h3>
                                                <p className={cn(gonia.text.caption, "text-[9px] tracking-wider font-black opacity-60")}>{stat.request_count} Files</p>
                                            </div>
                                            <Badge variant="outline" className="text-[7px] uppercase font-black border-primary/30 text-primary bg-primary/5 px-1.5 py-0 rounded-none border-2 shrink-0">Active</Badge>
                                        </div>

                                        <div className="space-y-1.5 mb-3">
                                            {stat.name.toLowerCase().includes("cargo") ? (
                                                <>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Pending (KG)</span>
                                                        <span className={cn(gonia.text.mono, "text-xl font-black text-[var(--gonia-warning)]")}>{stat.pending_weight}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Pending Carton</span>
                                                        <span className={cn(gonia.text.mono, "text-xl font-black text-[var(--gonia-info)]")}>{stat.pending_cartons}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between opacity-60">
                                                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Processing</span>
                                                        <span className={cn(gonia.text.mono, "text-sm font-black")}>{stat.processing_count}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Complete (KG)</span>
                                                        <span className={cn(gonia.text.mono, "text-xl font-black text-[var(--gonia-success)]")}>{stat.completed_weight}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-black uppercase text-muted-foreground tracking-wider">Pending</span>
                                                        <span className={cn(gonia.text.mono, "text-xl font-black text-[var(--gonia-warning)]")}>{stat.pending_count}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-black uppercase text-muted-foreground tracking-wider">Processing</span>
                                                        <span className={cn(gonia.text.mono, "text-xl font-black text-[var(--gonia-info)]")}>{stat.processing_count}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-black uppercase text-muted-foreground tracking-wider">Complete</span>
                                                        <span className={cn(gonia.text.mono, "text-xl font-black text-[var(--gonia-success)]")}>{stat.completed_count}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-primary/5">
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-wrap gap-1">
                                                    {stat.staff_in_charge.length > 0 ? (
                                                        stat.staff_in_charge.slice(0, 3).map((name, i) => (
                                                            <div key={i} className="w-6 h-6 rounded-none bg-primary/10 border border-primary/20 flex items-center justify-center text-[8px] font-black text-primary" title={name}>
                                                                {name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="text-[8px] text-muted-foreground italic font-bold opacity-40 uppercase">N/A</span>
                                                    )}
                                                </div>
                                            </div>
                                            <ArrowRight className="h-3.5 w-3.5 text-primary opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                        </div>

                                        <div className="absolute bottom-0 left-0 h-1 bg-primary/5 w-full">
                                            <div 
                                                className="h-full bg-primary transition-all duration-700" 
                                                style={{ width: `${Math.min(100, (stat.request_count / (data?.total_requests_count || 1)) * 100)}%` }} 
                                            />
                                        </div>
                                    </Card>
                                </Link>
                            ));
                        })()
                    )}
                </div>
            </div>

            {/* Activity Overview (Charts moved to bottom) */}
            <div className="grid gap-8 grid-cols-1 lg:grid-cols-12">
                <div className="lg:col-span-8">
                    <Card className={cn(gonia.layout.card, "h-full overflow-hidden p-0 bg-white")}>
                        <div className="bg-primary/5 border-b border-primary/10 py-3 px-6">
                            <h2 className={cn(gonia.text.label, "m-0")}>Financial Trajectory</h2>
                        </div>
                        <CardContent className="p-6 overflow-hidden">
                            <RevenueTrendChart data={data?.revenue_trend || []} />
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-4">
                    <Card className={cn(gonia.layout.card, "h-full overflow-hidden p-0 bg-white")}>
                        <div className="bg-secondary/5 border-b border-secondary/10 py-3 px-6">
                            <h2 className={cn(gonia.text.label, "m-0")}>Service Distribution</h2>
                        </div>
                        <CardContent className="p-6 overflow-hidden">
                            <ServiceDistributionChart data={data?.revenue_by_service || []} />
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="grid gap-8 grid-cols-1 lg:grid-cols-12 pb-10">
                 <div className="lg:col-span-4">
                    <Card className={cn(gonia.layout.card, "h-full overflow-hidden p-0 bg-white")}>
                        <div className="bg-[var(--gonia-ink)]/5 border-b border-[var(--gonia-ink)]/10 py-3 px-6">
                            <h2 className={cn(gonia.text.label, "m-0")}>Vendor Exposure</h2>
                        </div>
                        <CardContent className="p-6 overflow-hidden">
                            <VendorDebtChart data={data?.debt_by_vendor || []} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    </ProtectedRoute>
  );
}