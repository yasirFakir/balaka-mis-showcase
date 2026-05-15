"use client";

import React from "react";
import { Calculator } from "lucide-react";
import { cn } from "../lib/utils";
import { gonia } from "../lib/gonia-theme";
import { Badge } from "../base/badge";
import { GoniaCard } from "../layout/gonia-primitives";
import { useCurrency } from "../../core/currency-context";

interface GoniaFinancialSummaryProps {
  income: number;
  profit: number;
  balance: number;
  isSettled: boolean;
  discount?: number;
  className?: string;
  labels?: {
    income?: string;
    profit?: string;
    balance?: string;
    discount?: string;
  };
}

/**
 * A standardized financial summary card for Gonia.
 * Displays Income, Profit, and Outstanding Balance with semantic coloring.
 */
export function GoniaFinancialSummary({
  income,
  profit,
  balance,
  isSettled,
  discount = 0,
  className,
  labels = {
    income: "Total Income",
    profit: "Net Profit",
    balance: "Outstanding",
    discount: "Discount",
  },
}: GoniaFinancialSummaryProps) {
  const { formatCurrency } = useCurrency();

  return (
    <div className={cn("bg-white border-2 border-primary/10 p-6 space-y-6", className)}>
      <div className="flex items-center justify-between border-b border-primary/5 pb-3">
        <h3 className={cn(gonia.text.label, "flex items-center gap-2 m-0")}>
          <Calculator className="h-4 w-4 opacity-40" /> Financial Summary
        </h3>
        <Badge
          className={cn(
            gonia.badge.base,
            isSettled ? "bg-[var(--gonia-secondary)] text-white" : "bg-primary/5 text-primary"
          )}
        >
          {isSettled ? "Defined" : "Pending Pricing"}
        </Badge>
      </div>

      <div className={cn("grid gap-6", discount > 0 ? "grid-cols-4" : "grid-cols-3")}>
        <div className="space-y-1">
          <span className={gonia.text.caption}>{labels.income}</span>
          <p className={cn(gonia.text.mono, "text-sm text-primary")}>
            {formatCurrency(income)}
          </p>
        </div>
        
        {discount > 0 && (
          <div className="space-y-1">
            <span className={gonia.text.caption}>{labels.discount}</span>
            <p className={cn(gonia.text.mono, "text-sm text-orange-600")}>
              -{formatCurrency(discount)}
            </p>
          </div>
        )}

        <div className="space-y-1">
          <span className={gonia.text.caption}>{labels.profit}</span>
          <p
            className={cn(
              gonia.text.mono,
              "text-sm",
              profit < 0 ? "text-destructive" : "text-emerald-600"
            )}
          >
            {formatCurrency(profit)}
          </p>
        </div>
        <div className="space-y-1 text-right">
          <span className={gonia.text.caption}>{labels.balance}</span>
          <p
            className={cn(
              gonia.text.mono,
              "text-base font-black",
              balance > 0 ? "text-destructive" : "text-emerald-600"
            )}
          >
            {formatCurrency(balance)}
          </p>
        </div>
      </div>
    </div>
  );
}
