"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, LoadingSpinner } from "@/ui";
import { fetchClient } from "@/core/api";
import { 
  Users, 
  Briefcase, 
  Clock, 
  Settings, 
  DollarSign,
  Loader2 
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";


interface Stats {
  total_clients: number;
  total_staff: number;
  pending_requests: number;
  active_services: number;
  total_revenue: number;
}

export function DashboardStats() {
  const { hasPermission } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!hasPermission("analytics.view_dashboard")) {
          setLoading(false);
          return;
      }

      try {
        const data = await fetchClient<Stats>("/api/v1/analytics/stats");
        setStats(data);
      } catch (error) {
        console.error("Failed to load stats", error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [hasPermission]);

  if (!hasPermission("analytics.view_dashboard")) {
      return null;
  }

  if (loading) {
    return (
      <div className="h-32 flex items-center justify-center border-2 border-dashed border-primary/10 bg-primary/5">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      title: "Total Clients",
      value: stats.total_clients,
      icon: Users,
      description: "Registered customers",
      color: "text-blue-600"
    },
    {
      title: "Staff Members",
      value: stats.total_staff,
      icon: Briefcase,
      description: "Internal employees",
      color: "text-purple-600"
    },
    {
      title: "Pending Requests",
      value: stats.pending_requests,
      icon: Clock,
      description: "Applications to process",
      color: "text-orange-600"
    },
    {
      title: "Total Revenue",
      value: `SR ${stats.total_revenue.toLocaleString()}`,
      icon: DollarSign,
      description: "From approved requests",
      color: "text-green-600"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}