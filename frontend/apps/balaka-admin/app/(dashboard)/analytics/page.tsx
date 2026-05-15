"use client";

import { ProtectedRoute } from "@/components/shared/protected-route";
import { useState, useEffect } from "react";
import { fetchClient } from "@/core/api";
import { Card, CardContent, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, gonia } from "@/ui";



import { 
    TrendingUp, 
    Users, 
    Globe, 
    Lock, 
    ArrowUpRight, 
    ArrowDownRight,
    Activity,
    Calendar,
    Briefcase,
    LayoutGrid,
    ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";


import { CategorizedReport, StaffPerformance } from "@/core/types";

export default function AnalyticsPage() {
    const currentDate = new Date();
    const currentMonthName = currentDate.toLocaleString('default', { month: 'long' });
    const currentYear = currentDate.getFullYear().toString();

    const [report, setReport] = useState<CategorizedReport | null>(null);
    const [month, setMonth] = useState(currentMonthName);
    const [year, setYear] = useState(currentYear);
    const [loading, setLoading] = useState(true);

    const years = Array.from({ length: currentDate.getFullYear() - 2024 + 5 }, (_, i) => (2024 + i).toString());
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    useEffect(() => {
        const loadReport = async () => {
            setLoading(true);
            try {
                const data = await fetchClient<CategorizedReport>(`/api/v1/analytics/report?month=${month}&year=${year}`);
                setReport(data);
            } catch (error) {
                console.error("Failed to load report", error);
            } finally {
                setLoading(false);
            }
        };

        loadReport();
    }, [month, year]);

    interface StatCardProps {
        title: string;
        value: number;
        sub: string;
        icon: React.ElementType;
        variant?: "default" | "success" | "primary";
    }

    const StatCard = ({ title, value, sub, icon: Icon, variant = "default" }: StatCardProps) => (
        <Card className={cn(gonia.layout.card, "p-0 overflow-hidden bg-white")}>
            <div className={cn(
                "py-3 px-6 border-b flex justify-between items-center",
                variant === "success" ? "bg-[var(--gonia-success)]/5 border-[var(--gonia-success)]/10" : 
                variant === "primary" ? "bg-primary/5 border-primary/10" : 
                "bg-muted/30 border-primary/10"
            )}>
                <span className={gonia.text.label}>{title}</span>
                <Icon className={cn("h-4 w-4 opacity-40", variant === "success" ? "text-[var(--gonia-success)]" : "text-primary")} />
            </div>
            <CardContent className="p-6">
                <div className="space-y-1">
                    <h3 className={cn(gonia.text.mono, "text-3xl text-primary")}>${value.toLocaleString()}</h3>
                    <p className={gonia.text.caption}>{sub}</p>
                </div>
            </CardContent>
        </Card>
    );

    const categoryRevenue = report?.staff_performance.reduce((acc: Record<string, number>, curr) => {
        curr.category_breakdown.forEach(cat => {
            acc[cat.category] = (acc[cat.category] || 0) + cat.revenue;
        });
        return acc;
    }, {}) || {};

    return (
        <ProtectedRoute>
            <div className="space-y-10">
                {/* Gonia v1.5 Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex-1">
                    <h1 className={gonia.text.h1}>Market Performance</h1>
                    <p className={gonia.text.caption}>Performance indicators and financial verification reports.</p>
                </div>

                    <div className="flex gap-3">
                        <Select value={month} onValueChange={setMonth}>
                            <SelectTrigger className="w-40 h-10 rounded-none bg-white border-2 border-primary/10 font-bold text-xs">
                                <Calendar className="h-3.5 w-3.5 mr-2 text-primary/40" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-none border-2">
                                {months.map(m => (
                                    <SelectItem key={m} value={m} className="text-xs font-bold">{m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={year} onValueChange={setYear}>
                            <SelectTrigger className="w-32 h-10 rounded-none bg-white border-2 border-primary/10 font-bold text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-none border-2">
                                {years.map(y => (
                                    <SelectItem key={y} value={y} className="text-xs font-bold">{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {report && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <StatCard 
                            title="Net Monthly Profit" 
                            value={report.global_stats.net_profit} 
                            sub="Total revenue after direct costs."
                            icon={TrendingUp}
                            variant="success"
                        />
                        <StatCard 
                            title="Internal Trading" 
                            value={report.internal_affairs_pnl} 
                            sub="Sourcing, resale, and pricing totals."
                            icon={Lock}
                            variant="primary"
                        />
                        <StatCard 
                            title="External Services" 
                            value={report.external_affairs_pnl} 
                            sub="Combined client-facing service profit."
                            icon={Globe}
                        />
                    </div>
                )}

                <Tabs defaultValue="staff" className="w-full">
                    <TabsList className="mb-8">
                        <TabsTrigger value="staff" className="gap-2">
                            <Users className="h-3.5 w-3.5" /> Staff Performance
                        </TabsTrigger>
                        <TabsTrigger value="categories" className="gap-2">
                            <Briefcase className="h-3.5 w-3.5" /> Category Analysis
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="staff" className="outline-none">
                        <div className={cn(gonia.layout.card, "bg-white overflow-hidden p-0")}>
                            <Table>
                                <TableHeader className="bg-primary/5">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className={cn(gonia.text.label, "py-4 pl-8")}>Agent Name</TableHead>
                                        <TableHead className={gonia.text.label}>Role / Office</TableHead>
                                        <TableHead className={gonia.text.label}>File Count</TableHead>
                                        <TableHead className={cn(gonia.text.label, "text-right")}>Revenue</TableHead>
                                        <TableHead className={cn(gonia.text.label, "text-right")}>Ticket Costs</TableHead>
                                        <TableHead className={cn(gonia.text.label, "text-right pr-8")}>Target %</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {report?.staff_performance.map((staff: StaffPerformance) => (
                                        <TableRow key={staff.staff_id} className="group hover:bg-primary/5 transition-colors">
                                            <TableCell className="pl-8 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                                                        {staff.full_name.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-primary">{staff.full_name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-primary/60 uppercase">{staff.staff_category}</span>
                                                    <span className={cn(gonia.text.mono, "text-[10px] opacity-40 uppercase")}>{staff.work_office}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm font-bold text-primary/80">{staff.operation_count} Orders</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={cn(gonia.text.mono, "text-emerald-600 font-bold")}>+${staff.revenue_generated.toFixed(2)}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={cn(gonia.text.mono, "text-destructive font-bold")}>-${staff.travel_ticket_costs.toFixed(2)}</span>
                                            </TableCell>
                                            <TableCell className="text-right pr-8">
                                                <div className="flex justify-end items-center gap-3">
                                                    <div className="w-20 h-1.5 bg-muted/30 overflow-hidden">
                                                        <div 
                                                            className="h-full bg-primary transition-all duration-1000" 
                                                            style={{ width: `${Math.min(100, (staff.revenue_generated / 5000) * 100)}%` }} 
                                                        />
                                                    </div>
                                                    <span className={cn(gonia.text.mono, "text-[11px] text-primary")}>{(staff.revenue_generated / 5000 * 100).toFixed(0)}%</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="categories" className="outline-none">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <Card className={cn(gonia.layout.card, "p-0 overflow-hidden bg-white")}>
                                <div className="bg-primary/5 border-b border-primary/10 py-3 px-6">
                                    <h2 className={gonia.text.label}>Revenue by Service Type</h2>
                                </div>
                                <CardContent className="p-0">
                                    {Object.entries(categoryRevenue).map(([name, val]) => (
                                        <div key={name} className="flex justify-between items-center p-5 border-b border-primary/5 group hover:bg-primary/5 transition-all">
                                            <span className="text-xs font-bold uppercase text-primary tracking-tight">{name}</span>
                                            <span className={cn(gonia.text.mono, "text-emerald-600")}>${val.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            <Card className={cn(gonia.layout.card, "p-0 overflow-hidden bg-white")}>
                                <div className="bg-primary/5 border-b border-primary/10 py-3 px-6">
                                    <h2 className={gonia.text.label}>Service Volume</h2>
                                </div>
                                <CardContent className="p-10 space-y-10">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <span className={gonia.text.caption}>Total Files Processed</span>
                                            <p className={cn(gonia.text.mono, "text-3xl text-primary")}>{report?.global_stats.total_requests}</p>
                                        </div>
                                        <div className="h-12 w-12 bg-primary/5 flex items-center justify-center border border-primary/10">
                                            <ClipboardList className="h-6 w-6 text-primary/40" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <span className={gonia.text.caption}>Combined Revenue</span>
                                            <p className={cn(gonia.text.mono, "text-3xl text-emerald-600")}>+${report?.global_stats.net_revenue.toLocaleString()}</p>
                                        </div>
                                        <div className="h-12 w-12 bg-emerald-600/5 flex items-center justify-center border border-emerald-600/10">
                                            <TrendingUp className="h-6 w-6 text-emerald-600/40" />
                                        </div>
                                    </div>
                                    <div className="pt-6 border-t border-primary/5">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed">
                                            * Monthly volume is calculated based on verified and active service requests within the selected period.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </ProtectedRoute>
    );
}