"use client";

import { useEffect, useState } from "react";
import { 
  Card, 
  Button, 
  gonia, 
  Badge,
  Tabs, TabsContent, TabsList, TabsTrigger,
  GoniaPageShell
} from "@/ui";

import Link from "next/link";
import { 
  Briefcase, 
  Globe, 
  Lock,
  ArrowRight,
  TrendingUp,
  Activity
} from "lucide-react";
import { DashboardDateFilter } from "@/components/shared/dashboard-date-filter";

import { getAnalyticsSummary, AnalyticsSummary } from "@/lib/analytics";
import { subDays } from "date-fns";
import { useCurrency } from "@/core/currency-context";
import { formatCompactNumber } from "@/core/formatters";
import { cn } from "@/lib/utils";

export default function PerformancePage() {
  const { formatCompactCurrency } = useCurrency();
  const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const summary = await getAnalyticsSummary(startDate, endDate);
      setData(summary);
    } catch (error) {
      console.error("Failed to fetch performance data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const handleDateChange = (start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  const ServiceCard = ({ stat }: { stat: any }) => (
    <Link href={`/services/${stat.service_id}`} className="block group">
        <Card className={cn(gonia.layout.card, "bg-white border-primary/20 p-4 flex flex-col h-full justify-between shadow-none group-hover:border-primary/60 transition-all relative overflow-hidden")}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-0">
                    <h3 className={cn(gonia.text.h2, "text-base group-hover:text-primary transition-colors leading-tight")}>{stat.name}</h3>
                    <p className={cn(gonia.text.caption, "text-[9px] tracking-wider font-black opacity-60")}>{stat.request_count} Files</p>
                </div>
                <Badge variant="outline" className={cn(
                    "text-[7px] uppercase font-black px-1.5 py-0 rounded-none border-2 shrink-0",
                    stat.is_public ? "border-emerald-500/40 text-emerald-700 bg-emerald-50" : "border-amber-500/40 text-amber-700 bg-amber-50"
                )}>
                    {stat.is_public ? "External" : "Internal"}
                </Badge>
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
                        <div className="h-px bg-primary/5 w-full" />
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Processing</span>
                            <span className={cn(gonia.text.mono, "text-lg font-black opacity-60")}>{stat.processing_count}</span>
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
                        <div className="h-px bg-primary/5 w-full" />
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase text-muted-foreground tracking-wider">Processing</span>
                            <span className={cn(gonia.text.mono, "text-xl font-black text-[var(--gonia-info)]")}>{stat.processing_count}</span>
                        </div>
                        <div className="h-px bg-primary/5 w-full" />
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
                            stat.staff_in_charge.slice(0, 4).map((name: string, i: number) => (
                                <div key={i} className="w-6 h-6 rounded-none bg-primary/10 border border-primary/20 flex items-center justify-center text-[8px] font-black text-primary" title={name}>
                                    {name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </div>
                            ))
                        ) : (
                            <span className="text-[8px] text-muted-foreground italic font-bold opacity-40 uppercase">Unassigned</span>
                        )}
                    </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-primary opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>

            <div className="absolute bottom-0 left-0 h-1 bg-primary/5 w-full">
                <div 
                    className="h-full bg-primary transition-all duration-1000" 
                    style={{ width: `${Math.min(100, (stat.request_count / (data?.total_requests_count || 1)) * 100)}%` }} 
                />
            </div>
        </Card>
    </Link>
  );

  return (
    <GoniaPageShell
        title="Service Performance"
        subtitle="Operational Efficiency & Operational Profitability per Service"
        icon={<Activity className="h-8 w-8" />}
        actions={
            <div className="w-full sm:w-auto overflow-hidden">
                <DashboardDateFilter onFilterChange={handleDateChange} />
            </div>
        }
    >
      <div className="space-y-8">
        <Tabs defaultValue="external" className="w-full">
            <div className="w-full overflow-x-auto pb-2 mb-6 scrollbar-none">
                <TabsList className="mb-0 w-full sm:w-auto min-w-max">
                    <TabsTrigger value="external" className="gap-2">
                        <Globe className="h-3.5 w-3.5" /> External Services
                    </TabsTrigger>
                    <TabsTrigger value="internal" className="gap-2">
                        <Lock className="h-3.5 w-3.5" /> Internal Services
                    </TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="external" className="mt-0 outline-none">
                <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 px-1">
                    {loading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                            <Card key={i} className={cn(gonia.layout.card, "bg-white border-primary/10 p-4 h-48 animate-pulse")} />
                        ))
                    ) : (
                        data?.service_stats?.filter(s => s.is_public).map((stat) => (
                            <ServiceCard key={stat.service_id} stat={stat} />
                        ))
                    )}
                </div>
            </TabsContent>
            
            <TabsContent value="internal" className="mt-0 outline-none">
                <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 px-1">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <Card key={i} className={cn(gonia.layout.card, "bg-white border-primary/10 p-4 h-48 animate-pulse")} />
                        ))
                    ) : (
                        data?.service_stats?.filter(s => !s.is_public).map((stat) => (
                            <ServiceCard key={stat.service_id} stat={stat} />
                        ))
                    )}
                </div>
            </TabsContent>
        </Tabs>
      </div>
    </GoniaPageShell>
  );
}
