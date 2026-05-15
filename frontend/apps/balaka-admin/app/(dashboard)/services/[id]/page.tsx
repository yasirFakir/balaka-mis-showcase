"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
    useNotifications, 
    Button, 
    Card, 
    CardContent, 
    CardHeader,
    CardTitle,
    CardDescription,
    Badge, 
    LoadingSpinner,
    Separator,
    GoniaPageShell
} from "@/ui";
import { fetchClient } from "@/core/api";

import { 
    ArrowLeft, 
    Pencil,
    Package,
    Users as UsersIcon,
    Mail,
    Phone,
    Image as ImageIcon,
    Layout,
    Globe,
    Lock,
    Tag as TagIcon,
    Activity,
    BarChart3,
    TrendingUp,
    DollarSign,
    Clock,
    RefreshCw,
    CheckCircle2
} from "lucide-react";

import { SecureImage } from "@/components/shared/secure-image";
import { RequestList } from "@/components/requests/request-list";
import { CurrencySwitcher } from "@/components/shared/currency-switcher";
import { User } from "@/core/types";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/core/currency-context";
import { getAnalyticsSummary, AnalyticsSummary } from "@/lib/analytics";
import { formatCompactNumber } from "@/core/formatters";
import { subDays } from "date-fns";
import { DashboardDateFilter } from "@/components/shared/dashboard-date-filter";

interface ServiceDefinition {
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
  assigned_staff?: User[];
}

export default function ServiceDetailsPage() {
    const { toast } = useNotifications();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    
    const [service, setService] = useState<ServiceDefinition | null>(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 30));
    const [endDate, setEndDate] = useState<Date | null>(new Date());
    const [stats, setStats] = useState<AnalyticsSummary | null>(null);
    const [serviceStat, setServiceStat] = useState<any>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const { currency, formatCurrency, formatCompactCurrency, convertToBDT } = useCurrency();

    useEffect(() => {
        async function loadData() {
            try {
                const svcData = await fetchClient<ServiceDefinition>(`/api/v1/services/${id}`);
                setService(svcData);
            } catch (error) {
                toast.error("Failed to load service data");
                router.push("/services");
            } finally {
                setLoading(false);
            }
        }
        
        loadData();
    }, [id, router]);

    useEffect(() => {
        async function loadStats() {
            setStatsLoading(true);
            try {
                // Fetch stats for this service with period filtering
                const result = await getAnalyticsSummary(startDate, endDate, null, parseInt(id));
                setStats(result);
                
                // Extract the specific service stat from the array
                if (result.service_stats && result.service_stats.length > 0) {
                    const specificStat = result.service_stats.find(s => s.service_id === parseInt(id));
                    setServiceStat(specificStat);
                }
            } catch (error) {
                console.error("Failed to load service stats", error);
            } finally {
                setStatsLoading(false);
            }
        }

        loadStats();
    }, [id, startDate, endDate]);

    if (loading) return <LoadingSpinner size="lg" className="py-10" full />;
    if (!service) return null;

    const handleDateChange = (start: Date | null, end: Date | null) => {
        setStartDate(start);
        setEndDate(end);
    };

    return (
        <GoniaPageShell
            title={service.name}
            subtitle="Service Profile & Active Personnel"
            icon={<Package className="h-8 w-8" />}
            actions={
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => router.push("/services")} 
                        className="h-9 px-3 rounded-none border-primary/20 text-primary uppercase font-black text-[10px]"
                    >
                        <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back
                    </Button>
                    <Link href={`/services/${id}/edit`}>
                        <Button className="h-9 px-4 rounded-none font-black uppercase text-[10px] shadow-[3px_3px_0_0_var(--gonia-accent)] hover:shadow-none transition-all">
                            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                        </Button>
                    </Link>
                </div>
            }
        >
            {/* Performance KPI Row - All Time Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 mb-4 sm:mb-8">
                <Card className="rounded-none border-2 border-primary shadow-none bg-primary/[0.02] p-3 sm:p-4 flex flex-col justify-between overflow-hidden relative">
                    <p className="text-[9px] font-black uppercase text-primary/60 mb-1 flex items-center gap-2">
                        <TrendingUp className="h-3 w-3" /> Revenue
                    </p>
                    <h3 className="text-lg sm:text-xl font-black font-mono text-primary truncate">
                        {statsLoading ? "..." : formatCompactCurrency(stats?.total_revenue ?? 0)}
                    </h3>
                </Card>

                <Card className="rounded-none border-2 border-[var(--gonia-secondary)] shadow-none bg-[var(--gonia-secondary)]/[0.02] p-3 sm:p-4 flex flex-col justify-between overflow-hidden relative">
                    <p className="text-[9px] font-black uppercase text-[var(--gonia-secondary)]/60 mb-1 flex items-center gap-2">
                        <BarChart3 className="h-3 w-3" /> Net Profit
                    </p>
                    <h3 className="text-lg sm:text-xl font-black font-mono text-[var(--gonia-secondary)] truncate">
                        {statsLoading ? "..." : formatCompactCurrency(stats?.net_profit ?? 0)}
                    </h3>
                </Card>

                <Card className="rounded-none border-2 border-primary/20 shadow-none bg-white p-3 sm:p-4 flex flex-col justify-between overflow-hidden relative">
                    <p className="text-[9px] font-black uppercase text-muted-foreground mb-1 flex items-center gap-2">
                        <Package className="h-3 w-3" /> Total
                    </p>
                    <h3 className="text-lg sm:text-xl font-black font-mono text-primary truncate">
                        {statsLoading ? "..." : formatCompactNumber(stats?.total_requests_count ?? 0)}
                    </h3>
                </Card>

                <Card className="rounded-none border-2 border-[var(--gonia-warning)] shadow-none bg-[var(--gonia-warning)]/[0.02] p-3 sm:p-4 flex flex-col justify-between overflow-hidden relative">
                    <p className="text-[9px] font-black uppercase text-[var(--gonia-warning)]/60 mb-1 flex items-center gap-2">
                        <Clock className="h-3 w-3" /> Pending
                    </p>
                    <h3 className="text-lg sm:text-xl font-black font-mono text-[var(--gonia-warning)] truncate">
                        {statsLoading ? "..." : formatCompactNumber(serviceStat?.pending_count ?? 0)}
                    </h3>
                </Card>

                <Card className="rounded-none border-2 border-[var(--gonia-info)] shadow-none bg-[var(--gonia-info)]/[0.02] p-3 sm:p-4 flex flex-col justify-between overflow-hidden relative">
                    <p className="text-[9px] font-black uppercase text-[var(--gonia-info)]/60 mb-1 flex items-center gap-2">
                        <RefreshCw className="h-3 w-3" /> Processing
                    </p>
                    <h3 className="text-lg sm:text-xl font-black font-mono text-[var(--gonia-info)] truncate">
                        {statsLoading ? "..." : formatCompactNumber(serviceStat?.processing_count ?? 0)}
                    </h3>
                </Card>

                <Card className="rounded-none border-2 border-[var(--gonia-success)] shadow-none bg-[var(--gonia-success)]/[0.02] p-3 sm:p-4 flex flex-col justify-between overflow-hidden relative">
                    <p className="text-[9px] font-black uppercase text-[var(--gonia-success)]/60 mb-1 flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3" /> Processed
                    </p>
                    <h3 className="text-lg sm:text-xl font-black font-mono text-[var(--gonia-success)] truncate">
                        {statsLoading ? "..." : formatCompactNumber(serviceStat?.completed_count ?? 0)}
                    </h3>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8">
                {/* Left: Basic Info */}
                <div className="lg:col-span-8 space-y-4 lg:space-y-8">
                    <Card className="rounded-none border-2 border-primary shadow-none overflow-hidden">
                        <CardHeader className="bg-primary/5 border-b-2 border-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6">
                            <div>
                                <CardTitle className="text-sm font-black uppercase tracking-tight text-primary flex items-center gap-2">
                                    <Layout className="h-4 w-4" /> Service Identity
                                </CardTitle>
                                <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground/60">Core metadata and public appearance</CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {service.is_public ? (
                                    <Badge className="bg-emerald-600 text-white rounded-none uppercase text-[8px] font-black"><Globe className="h-2 w-2 mr-1" /> Public</Badge>
                                ) : (
                                    <Badge variant="destructive" className="rounded-none uppercase text-[8px] font-black"><Lock className="h-2 w-2 mr-1" /> Internal</Badge>
                                )}
                                {!service.is_active && (
                                    <Badge variant="secondary" className="rounded-none uppercase text-[8px] font-black">Archived</Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-8">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-10">
                                <div className="md:col-span-4">
                                    <div className="aspect-video md:aspect-[4/3] border-2 border-primary/10 relative group overflow-hidden">
                                        <SecureImage 
                                            serviceSlug={service.slug}
                                            src={service.image_url} 
                                            className="w-full h-full object-cover"
                                            fallback={
                                                <div className="flex flex-col items-center justify-center w-full h-full bg-muted/10 text-muted-foreground/30">
                                                    <ImageIcon className="h-12 w-12" />
                                                    <span className="text-[10px] font-black uppercase mt-2">No Image</span>
                                                </div>
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-8 space-y-6">
                                    <div>
                                        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-primary break-words">{service.name}</h2>
                                        <p className="font-mono text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest mt-1">SLUG: {service.slug}</p>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2">
                                        {service.tags?.map(tag => (
                                            <Badge key={tag} variant="outline" className="rounded-none border-primary/20 text-primary uppercase text-[9px] font-black px-2 py-1">
                                                <TagIcon className="h-2.5 w-2.5 mr-1" /> {tag}
                                            </Badge>
                                        ))}
                                    </div>

                                    <div className="bg-primary/5 p-4 border-l-4 border-primary">
                                        <p className="text-sm leading-relaxed text-foreground/80 font-medium">
                                            {service.description || "No description provided for this service."}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="border-2 border-primary/5 p-4">
                                            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Base Price</p>
                                            <div className="flex flex-col">
                                                <p className="text-lg sm:text-xl font-black font-mono text-primary leading-tight">
                                                    {formatCurrency(service.base_price)}
                                                </p>
                                                <p className="text-[10px] font-bold font-mono text-muted-foreground opacity-60">
                                                    {currency === "SAR" 
                                                        ? `≈ ৳${convertToBDT(service.base_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                                        : `≈ SR ${service.base_price.toFixed(2)}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="border-2 border-primary/5 p-4">
                                            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Display Currency</p>
                                            <p className="text-lg sm:text-xl font-black font-mono text-primary uppercase">{currency}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Staff List */}
                <div className="lg:col-span-4 space-y-4 lg:space-y-6">
                    <Card className="rounded-none border-2 border-primary shadow-none overflow-hidden h-full">
                        <CardHeader className="bg-primary/5 border-b-2 border-primary/10 p-4 sm:p-6">
                            <CardTitle className="text-sm font-black uppercase tracking-tight text-primary flex items-center gap-2">
                                <UsersIcon className="h-4 w-4" /> Personnel in Charge
                            </CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground/60">Agents authorized to process requests</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {(!service.assigned_staff || service.assigned_staff.length === 0) ? (
                                <div className="p-12 text-center text-muted-foreground/40 italic uppercase font-black text-[10px]">
                                    No specific staff assigned to this service
                                </div>
                            ) : (
                                <div className="divide-y divide-primary/5">
                                    {service.assigned_staff.map((user) => (
                                        <div key={user.id} className="p-3 sm:p-4 flex items-start gap-3 sm:gap-4 hover:bg-primary/5 transition-colors group">
                                            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/20 overflow-hidden shrink-0">
                                                {user.profile_picture ? (
                                                    <img src={`${process.env.NEXT_PUBLIC_API_URL}${user.profile_picture}`} alt="" className="h-full w-full object-cover" />
                                                ) : user.full_name.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                    <p className="font-black text-xs uppercase tracking-tight text-primary group-hover:text-primary transition-colors truncate">{user.full_name}</p>
                                                    <Badge className="w-fit rounded-none bg-primary/10 text-primary border-none font-black text-[7px] sm:text-[8px] uppercase px-1 py-0 sm:px-2 sm:py-0.5">Agent</Badge>
                                                </div>
                                                <div className="flex flex-col gap-0.5 mt-1">
                                                    <span className="text-[8px] sm:text-[9px] font-bold text-muted-foreground flex items-center gap-1 uppercase truncate">
                                                        <Mail className="h-2.5 w-2.5 shrink-0" /> <span className="truncate">{user.email}</span>
                                                    </span>
                                                    {user.phone_number && (
                                                        <span className="text-[8px] sm:text-[9px] font-bold text-muted-foreground flex items-center gap-1 uppercase truncate">
                                                            <Phone className="h-2.5 w-2.5 shrink-0" /> {user.phone_number}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Operations Log: Requests for this service */}
            <div className="mt-12 space-y-6">
                <div className="flex items-center gap-3 px-1">
                    <Activity className="h-4 w-4 text-primary" />
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary/40 m-0">Operations Log</h2>
                </div>
                
                <RequestList 
                    isInternal={!service.is_public}
                    initialFilters={{ service_def_id: parseInt(id) }}
                    showServiceFilter={false}
                    className="border-2 border-primary shadow-none rounded-none"
                />
            </div>
        </GoniaPageShell>
    );
}