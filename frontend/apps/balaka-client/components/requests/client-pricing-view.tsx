"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, Button, Label } from "@/ui";


import { Calculator, Receipt, ArrowRight, ArrowUpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancialItem {
    label: string;
    type: "INCOME" | "EXPENSE";
    amount: number;
}

interface ClientPricingViewProps {
    breakdown: FinancialItem[];
    total: number;
    trigger?: React.ReactNode;
}

export function ClientPricingView({ breakdown, total, trigger }: ClientPricingViewProps) {
    // SECURITY FILTER: Only show INCOME items to clients
    const publicItems = breakdown.filter(item => item.type === "INCOME");

    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2 rounded-none font-bold uppercase text-[10px] tracking-normal border-primary/20 hover:bg-primary hover:text-white transition-all">
                        <Calculator className="h-3.5 w-3.5" /> View Pricing
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-none border-2">
                <DialogHeader className="p-6 bg-primary/5 border-b border-primary/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary text-white"><Receipt className="h-5 w-5" /></div>
                        <div>
                            <DialogTitle className="text-xl font-black uppercase tracking-tight text-primary">Price Breakdown</DialogTitle>
                            <DialogDescription className="text-[10px] font-black uppercase tracking-normal opacity-60">
                                Detailed breakdown of your service costs
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-6 bg-brand-canvas/30">
                    <div className="space-y-3">
                        {publicItems.length > 0 ? (
                            publicItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-white border border-border/40 rounded-none shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-normal text-muted-foreground/60">Service Item</span>
                                        <span className="text-xs font-bold uppercase text-primary">{item.label}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] font-black uppercase tracking-normal text-muted-foreground/60">Charge</span>
                                        <span className="text-sm font-black font-mono text-primary">${(parseFloat(item.amount as any) || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 border-2 border-dashed border-primary/10 text-muted-foreground text-[10px] font-black uppercase tracking-normal">
                                Standard base price applied
                            </div>
                        )}
                    </div>

                    <div className="pt-6 border-t-2 border-primary/10 flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Final Total Amount</span>
                            <span className="text-3xl font-black text-primary">${total.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-[var(--gonia-success)]/10 border border-[var(--gonia-success)]/20 text-[9px] font-black text-[var(--gonia-success)] uppercase tracking-normal">
                            <ArrowUpCircle className="h-3 w-3" /> Confirmed
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
