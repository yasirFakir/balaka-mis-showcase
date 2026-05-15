"use client";

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from "recharts";
import { useSidebar } from "@/lib/sidebar-context";

const COLORS = [
    "var(--gonia-primary)", 
    "var(--gonia-secondary)", 
    "var(--gonia-accent)", 
    "var(--gonia-success)", 
    "var(--gonia-ink)"
];

interface TrendData {
    date: string;
    revenue: number;
    cost: number;
    profit: number;
}

export function RevenueTrendChart({ data }: { data: TrendData[] }) {
    const { isTransitioning } = useSidebar();
    if (!data || data.length === 0) return <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data available</div>;

    return (
        <div className="h-[300px] w-full p-2">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="var(--gonia-secondary)" strokeOpacity={0.2} />
                    <XAxis dataKey="date" stroke="var(--gonia-ink)" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                    <YAxis stroke="var(--gonia-ink)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `SR ${value}`} tickMargin={10} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: "var(--gonia-surface)", border: "1px solid var(--gonia-primary)", borderRadius: "0px", fontSize: "12px" }}
                        itemStyle={{ color: "var(--gonia-primary)", fontWeight: "bold" }}
                        cursor={{ stroke: 'var(--gonia-primary)', strokeWidth: 1 }}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="var(--gonia-primary)" 
                        strokeWidth={3} 
                        dot={{ fill: 'var(--gonia-primary)', r: 4 }} 
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        isAnimationActive={!isTransitioning}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

interface DistributionData {
    name: string;
    value: number;
}

export function ServiceDistributionChart({ data }: { data: DistributionData[] }) {
    const { isTransitioning } = useSidebar();
    if (!data || data.length === 0) return <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data available</div>;

    return (
        <div className="h-[300px] w-full p-2">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="2 2" horizontal={true} vertical={false} stroke="var(--gonia-secondary)" strokeOpacity={0.1} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} stroke="var(--gonia-ink)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                        cursor={{fill: 'var(--gonia-secondary)', fillOpacity: 0.05}} 
                        contentStyle={{ backgroundColor: "var(--gonia-surface)", border: "1px solid var(--gonia-secondary)", borderRadius: "0px" }}
                    />
                    <Bar dataKey="value" fill="var(--gonia-secondary)" radius={[0, 0, 0, 0]} barSize={20} isAnimationActive={!isTransitioning}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.9} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

interface DebtData {
    name: string;
    value: number;
}

export function VendorDebtChart({ data }: { data: DebtData[] }) {
    const { isTransitioning } = useSidebar();
    if (!data || data.length === 0) return <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data available</div>;
    
    // Sort by absolute magnitude (most active vendors first)
    const sortedData = [...data].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 5);

    return (
        <div className="h-[300px] w-full p-2">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={sortedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="var(--gonia-primary-deep)" strokeOpacity={0.1} />
                    <XAxis dataKey="name" stroke="var(--gonia-ink)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--gonia-ink)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `SR ${Math.abs(value)}`} />
                    <Tooltip 
                        cursor={{fill: 'var(--gonia-primary-deep)', fillOpacity: 0.05}} 
                        contentStyle={{ backgroundColor: "var(--gonia-canvas)", border: "1px solid var(--gonia-primary-deep)", borderRadius: "0px" }}
                        formatter={(value: any) => [`SR ${Number(value).toFixed(2)}`, "Balance"]}
                    />
                    <Bar dataKey="value" radius={[0, 0, 0, 0]} barSize={40} isAnimationActive={!isTransitioning}>
                        {sortedData.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.value > 0 ? "var(--gonia-error)" : "var(--gonia-primary)"} 
                                fillOpacity={0.9} 
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}