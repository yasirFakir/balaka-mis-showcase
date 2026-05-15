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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleCurrency}
            className={cn(
              "h-10 w-10 flex items-center justify-center transition-colors hover:bg-primary/5 group",
              currency === "BDT" ? "text-[var(--gonia-success)]" : "text-primary"
            )}
          >
            {currency === "SAR" ? (
              <div className="relative">
                <GoniaIcons.Riyal className="h-5 w-5 transition-transform group-hover:scale-110" />
                <span className="absolute -bottom-1 -right-1 text-[7px] font-black bg-primary text-white px-0.5 rounded-[1px] leading-none">
                    SAR
                </span>
              </div>
            ) : (
              <div className="relative">
                <span className="text-lg font-black leading-none transition-transform group-hover:scale-110 block">৳</span>
                <span className="absolute -bottom-1 -right-1 text-[7px] font-black bg-[var(--gonia-success)] text-white px-0.5 rounded-[1px] leading-none">
                    BDT
                </span>
              </div>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent className="bg-primary text-white rounded-none border-none text-[9px] font-bold uppercase py-2 px-3">
          {loading ? "Syncing rates..." : `Exchange Rate: 1 SR = ৳${rate.toFixed(2)}`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
