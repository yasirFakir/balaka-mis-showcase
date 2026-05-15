"use client";

import { useState, useEffect } from "react";
import { fetchClient } from "@/core/api";
import { useNotifications, Card, CardContent, CardHeader, CardTitle, CardDescription, LoadingSpinner, Badge } from "@/ui";
import { cn } from "@/lib/utils";
import { Banknote, Globe, Clock } from "lucide-react";
import { format } from "date-fns";

export function CurrencyManagementCard() {
  const { toast } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [rateData, setRateData] = useState<any>(null);

  useEffect(() => {
    loadRate();
  }, []);

  async function loadRate() {
    try {
      const data = await fetchClient<any>("/api/v1/system/currency-rate");
      setRateData(data);
    } catch (e) {
      toast.error("Failed to fetch real-time market rate");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-primary/10"><LoadingSpinner /></div>;

  return (
    <Card className="rounded-none border-2 border-primary/20 shadow-none bg-white h-full flex flex-col">
      <CardHeader className="bg-primary/5 border-b border-primary/10">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2.5 shadow-[3px_3px_0_0_var(--gonia-accent)] text-white">
            <Banknote className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base uppercase font-black tracking-tight">Market Intelligence</CardTitle>
            <CardDescription className="text-[9px] uppercase font-bold tracking-normal opacity-60 text-primary">Live SAR / BDT Exchange Rate</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 space-y-8 flex-1">
        <div className="text-center space-y-2 py-6 bg-primary/5 border border-primary/10">
            <p className="text-[10px] font-black uppercase text-primary/40 tracking-widest">Current Conversion</p>
            <div className="text-4xl font-black text-primary font-mono tracking-tighter">
                1 SR = ৳{rateData?.rate?.toFixed(2) || "32.00"}
            </div>
            <Badge variant="outline" className="rounded-none text-[8px] font-black uppercase border-primary/20">
                Live Data Feed
            </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-primary/5 space-y-1">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase text-primary/40">
                    <Globe className="h-3 w-3" /> Provider
                </div>
                <p className="text-[10px] font-bold text-primary truncate uppercase">{rateData?.provider || "N/A"}</p>
            </div>
            <div className="p-4 border border-primary/5 space-y-1">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase text-primary/40">
                    <Clock className="h-3 w-3" /> Last Synced
                </div>
                <p className="text-[10px] font-bold text-primary uppercase">
                    {rateData?.last_updated ? format(new Date(rateData.last_updated), "HH:mm:ss") : "Just now"}
                </p>
            </div>
        </div>

        <div className="bg-amber-50 p-4 border border-amber-200">
            <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                <strong>Policy:</strong> Global manual overrides have been retired. Exchange rates are now <strong>locked per service request</strong> during the pricing phase to ensure absolute financial precision and protection against inflation.
            </p>
        </div>
      </CardContent>
    </Card>
  );
}