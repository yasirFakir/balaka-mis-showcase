"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from "@/ui";

import { ArrowUpCircle, ArrowDownCircle, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { FinancialItem, Vendor, VendorSummary } from "@/core/types";
import { useCurrency } from "@/core/currency-context";

interface PricingBreakdownProps {
    breakdown: FinancialItem[];
    vendors?: (Vendor | VendorSummary)[];
}

export function PricingBreakdown({ breakdown, vendors = [] }: PricingBreakdownProps) {
    const { formatCurrency } = useCurrency();

    if (!breakdown || breakdown.length === 0) {
        return (
            <div className="py-10 border-2 border-dashed border-primary/10 flex flex-col items-center justify-center text-center">
                <Wallet className="h-8 w-8 text-primary/20 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-normal text-muted-foreground/40 italic">
                    No financial breakdown defined yet
                </p>
            </div>
        );
    }

    const getSourceLabel = (item: FinancialItem) => {
        if (item.source === "CLIENT") return "Client Account";
        
        const vId = item.vendor_id || item.source_id;
        if (vId) {
            const vendor = vendors.find(v => v.id.toString() === vId.toString());
            if (vendor) return vendor.name;
        }
        
        return item.source; // Fallback to EXTERNAL/INTERNAL
    };

    return (
        <div className="border-2 border-primary/10 overflow-hidden bg-white">
            <Table>
                <TableHeader className="bg-muted/5">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[9px] font-black uppercase tracking-normal">Item Description</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-normal">Type / Source</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-normal text-right">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {breakdown.map((item, idx) => (
                        <React.Fragment key={idx}>
                            <TableRow className="group hover:bg-muted/5 transition-colors border-border/20">
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold text-primary uppercase tracking-tight">{item.label}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5">
                                            {item.type === "INCOME" ? (
                                                <ArrowUpCircle className="h-3 w-3 text-emerald-600" />
                                            ) : (
                                                <ArrowDownCircle className="h-3 w-3 text-destructive" />
                                            )}
                                            <span className={cn(
                                                "text-[9px] font-black uppercase tracking-tighter",
                                                item.type === "INCOME" ? "text-emerald-700" : "text-destructive"
                                            )}>
                                                {item.type}
                                            </span>
                                        </div>
                                        <span className="text-[8px] font-mono text-muted-foreground uppercase opacity-80 bg-muted/30 px-1 w-fit">
                                            Account: {getSourceLabel(item)}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className={cn(
                                        "font-mono text-xs font-black",
                                        item.type === "INCOME" ? "text-emerald-600" : "text-destructive"
                                    )}>
                                        {item.type === "EXPENSE" ? "-" : "+"}{formatCurrency(item.amount)}
                                    </span>
                                </TableCell>
                            </TableRow>
                            {/* Render Sub-items if any */}
                            {item.sub_items && item.sub_items.length > 0 && item.sub_items.map((sub, sIdx) => (
                                <TableRow key={`${idx}-sub-${sIdx}`} className="bg-muted/5 border-none h-8">
                                    <TableCell className="pl-12 py-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary/20" />
                                            <span className="text-[9px] font-bold text-primary/60 uppercase">{sub.label}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-1">
                                        <span className="text-[8px] font-mono text-muted-foreground uppercase">Itemized Detail</span>
                                    </TableCell>
                                    <TableCell className="text-right py-1">
                                        <span className="text-[10px] font-mono font-bold text-primary/60">
                                            {formatCurrency(sub.amount)}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
