"use client";

import * as React from "react";
import { Input } from "../forms/input";
import { useCurrency } from "../../core/currency-context";
import { cn } from "../lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../feedback/tooltip";
import { Info } from "lucide-react";

interface GoniaCurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number; // Always in base currency (SAR)
  onChange: (value: number) => void; // Always receives base currency (SAR)
  className?: string;
  error?: boolean;
  exchangeRate?: number; // Optional local exchange rate
  symbol?: string; // Optional local symbol override
}

/**
 * A specialized Gonia input for monetary values.
 * Handles automatic conversion between UI currency (SAR/BDT) and base database currency (SAR).
 */
export function GoniaCurrencyInput({
  value,
  onChange,
  className,
  error,
  exchangeRate: localRate,
  symbol: localSymbol,
  ...props
}: GoniaCurrencyInputProps) {
  const { currency, convertToBDT, rate: systemRate } = useCurrency();
  
  const effectiveRate = localRate || systemRate;
  const isBDT = localSymbol === '৳' || (!localSymbol && currency === 'BDT');

  // Local state for the text value to handle typing/decimals smoothly
  const [displayValue, setDisplayValue] = React.useState<string>("");

  // Sync internal display value when the external base value or currency mode changes
  React.useEffect(() => {
    // Ensure value is treated as a number
    const safeValue = typeof value === 'number' ? value : 0;
    const numericValue = isBDT ? (safeValue * effectiveRate) : safeValue;
    
    // Only update display if it's not currently focused or if the numeric mismatch is significant
    // This prevents cursor jumping while typing
    const currentDisplayNumeric = parseFloat(displayValue) || 0;
    if (Math.abs(currentDisplayNumeric - numericValue) > 0.01) {
        setDisplayValue(numericValue === 0 ? "" : numericValue.toFixed(2));
    }
  }, [value, currency, isBDT, effectiveRate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setDisplayValue(rawValue);
    
    const numericValue = parseFloat(rawValue) || 0;
    const baseValue = isBDT ? (numericValue / effectiveRate) : numericValue;
    onChange(baseValue);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <div className="relative w-full group">
          <span className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-normal transition-colors",
            error ? "text-destructive" : "text-primary/40 group-focus-within:text-primary"
          )}>
            {localSymbol || (currency === "BDT" ? "৳" : "SR")}
          </span>
          <Input
            {...props}
            type="number"
            step="0.01"
            value={displayValue}
            onChange={handleChange}
            className={cn(
              "pl-8 font-mono font-bold",
              error && "border-destructive focus-visible:ring-destructive/20",
              className
            )}
          />
          <TooltipTrigger asChild>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-help">
              <Info className="h-3 w-3 text-primary/20 hover:text-primary transition-colors" />
            </div>
          </TooltipTrigger>
        </div>
        <TooltipContent className="bg-primary text-white rounded-none border-none text-[9px] font-bold uppercase py-2 px-3">
          {isBDT 
            ? `Inputting in BDT. Converting to SAR at 1 SR = ৳${effectiveRate.toFixed(2)}`
            : "Inputting in Base Currency (SAR). No conversion applied."}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
