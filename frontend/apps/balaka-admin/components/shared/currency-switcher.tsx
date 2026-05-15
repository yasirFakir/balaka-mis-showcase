"use client";

import * as React from "react";
import { useCurrency } from "@/core/currency-context";
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, GoniaIcons } from "@/ui";
import { cn } from "@/lib/utils";

/**
 * A standardized Gonia currency switcher.
 * Allows toggling between SAR and BDT with visual rate feedback.
 */
export function CurrencySwitcher() {
  const { currency, setCurrency, rate, loading } = useCurrency();

  const toggleCurrency = () => {
    setCurrency(currency === "SAR" ? "BDT" : "SAR");
  };

  return (
    <div className="flex items-center gap-2">
      <div className="hidden lg:flex flex-col items-end px-2 border-r border-primary/10">
        <span className="text-[8px] font-black uppercase text-primary/40 tracking-tighter">Market Rate</span>
        <span className="text-[10px] font-mono font-bold text-primary/60">1 SR = ৳{rate.toFixed(2)}</span>
      </div>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleCurrency}
              className={cn(
                "h-10 px-3 rounded-none font-black uppercase tracking-normal text-[10px] gap-2 transition-all",
                "border border-primary/10 hover:border-primary/40 bg-white shadow-none",
                currency === "BDT" ? "text-[var(--gonia-success)] border-[var(--gonia-success)]/20" : "text-primary"
              )}
            >
              {currency === "SAR" ? (
                <span className="flex items-center gap-1.5">
                  <GoniaIcons.Riyal className="h-3.5 w-3.5" />
                  SAR
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="text-xs">৳</span>
                  BDT
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-primary text-white rounded-none border-none text-[9px] font-bold uppercase py-2 px-3">
            {loading ? "Syncing rates..." : `Live Conversion: 1 SR = ৳${rate.toFixed(2)}`}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
