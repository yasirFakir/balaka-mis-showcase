"use client";

import React, { useMemo } from "react";
import { Button, Input, Label, Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue, Badge } from "@/ui";

import { Trash2, Plus, ArrowUpCircle, ArrowDownCircle, Hash, TrendingUp, AlertTriangle, ListPlus, ChevronRight, MinusCircle, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/core/currency-context";
import { GoniaCurrencyInput } from "@/ui";
import { FinancialItem, Vendor, VendorSummary } from "@/core/types";

export { type FinancialItem };

export interface SubItem {
    label: string;
    amount: number;
}

interface FinancialBreakdownEditorProps {
    items: FinancialItem[];
    onChange: (items: FinancialItem[]) => void;
    vendors?: { items: Vendor[] } | (Vendor | VendorSummary)[]; 
    mode?: "template" | "actual";
    showTotal?: boolean;
    currency?: string;
    onCurrencyChange?: (currency: string) => void;
    exchangeRate?: number | string;
    onExchangeRateChange?: (rate: number) => void;
}

const GONIA_INPUT_CLASSES = "h-10 rounded-none bg-muted/10 border border-border/40 focus:bg-background transition-all font-bold";

export function FinancialBreakdownEditor({ 
    items, 
    onChange, 
    vendors: vendorsRaw = [], 
    mode = "actual",
    showTotal = true,
    currency: activeCurrency = "SAR", // Default to SAR if not provided
    onCurrencyChange,
    exchangeRate,
    onExchangeRateChange
}: FinancialBreakdownEditorProps) {
    const { rate: currentSystemRate } = useCurrency();
    // Handle both flat array and enveloped response { items, total }
    const vendors = Array.isArray(vendorsRaw) ? vendorsRaw : (vendorsRaw.items || []);

    // Sanitized rate for all internal math
    const numericRate = useMemo(() => {
        const r = typeof exchangeRate === 'string' ? parseFloat(exchangeRate) : (exchangeRate || currentSystemRate);
        return isNaN(r) || r <= 0 ? currentSystemRate : r;
    }, [exchangeRate, currentSystemRate]);

    const addItem = () => {
        const newItem: FinancialItem = { 
            label: "", 
            type: "EXPENSE", 
            amount: 0, 
            source: "EXTERNAL" 
        };
        if (mode === "template") {
            newItem.key = `item_${items.length + 1}`;
        }
        onChange([...items, newItem]);
    };

    const removeItem = (idx: number) => {
        if (items[idx].key === "base_price") return;
        onChange(items.filter((_, i) => i !== idx));
    };

    const addSubItem = (itemIdx: number) => {
        const newItems = [...items];
        if (!newItems[itemIdx].sub_items) newItems[itemIdx].sub_items = [];
        newItems[itemIdx].sub_items!.push({ label: "", amount: 0 });
        onChange(newItems);
    };

    const removeSubItem = (itemIdx: number, subIdx: number) => {
        const newItems = [...items];
        newItems[itemIdx].sub_items = newItems[itemIdx].sub_items!.filter((_, i) => i !== subIdx);
        // Recalculate parent amount
        newItems[itemIdx].amount = newItems[itemIdx].sub_items.reduce((sum, si) => sum + (Number(si.amount) || 0), 0);
        onChange(newItems);
    };

    const updateItem = (index: number, field: keyof FinancialItem, val: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: val };
        
        if (mode === "template" && field === "label") {
             let baseKey = val.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^\w]/g, "").substring(0, 30);
             if (!baseKey) baseKey = "item";
             let finalKey = baseKey;
             let count = 1;
             while (newItems.some((item, i) => i !== index && item.key === finalKey)) {
                 finalKey = `${baseKey}_${count}`;
                 count++;
             }
             newItems[index].key = finalKey;
        }

        if (field === "source") {
            newItems[index].source_id = undefined;
            newItems[index].vendor_id = undefined;
        }
        if (field === "source_id") {
            // EXPLICIT SYNC: Backend looks for 'vendor_id' in breakdown items
            if (val === "dynamic" || val === "") {
                newItems[index].vendor_id = undefined;
                newItems[index].source_id = undefined;
            } else if (["CLIENT", "EXTERNAL", "INTERNAL"].includes(val)) {
                // If it's a hardcoded system account
                newItems[index].source = val as any;
                newItems[index].vendor_id = undefined;
                newItems[index].source_id = undefined;
            } else {
                const numericId = parseInt(val);
                if (isNaN(numericId)) {
                    newItems[index].vendor_id = undefined;
                    newItems[index].source_id = undefined;
                } else {
                    newItems[index].vendor_id = numericId;
                    newItems[index].source_id = numericId;
                    // Find vendor to set the source type automatically
                    const vendor = vendors.find(v => v.id === numericId);
                    if (vendor) {
                        newItems[index].source = vendor.type as any;
                    }
                }
            }
        }
        
        onChange(newItems);
    };

    /**
     * Recalculates all items based on a new exchange rate.
     * Prevents 'frozen' prices when the rate is adjusted.
     */
    const handleRateChange = (newRate: number) => {
        if (!onExchangeRateChange) return;
        onExchangeRateChange(newRate);
        
        // No automatic SAR recalculation here to avoid data corruption. 
        // We rely on the dual-display to let admin manually adjust if needed, 
        // OR we could optionally recalculate everything.
        // For Balaka, SAR is the LEDGER truth. 
    };

    const updateSubItem = (itemIdx: number, subIdx: number, field: keyof SubItem, val: any) => {
        const newItems = [...items];
        const subItem = newItems[itemIdx].sub_items![subIdx];
        newItems[itemIdx].sub_items![subIdx] = { ...subItem, [field]: val };
        
        // Auto-calculate parent amount
        const sum = newItems[itemIdx].sub_items!.reduce((sum, si) => sum + (Number(si.amount) || 0), 0);
        newItems[itemIdx].amount = Math.round(sum * 100) / 100;
        
        onChange(newItems);
    };

    const stats = useMemo(() => {
        const income = items.filter(i => i.type === "INCOME").reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        const expense = items.filter(i => i.type === "EXPENSE").reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        const discount = items.filter(i => i.type === "DISCOUNT").reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        
        const finalSellingPrice = Math.max(0, income - discount);
        const profit = finalSellingPrice - expense;
        const isLoss = profit < 0.01;
        
        return { 
            income: Math.round(income * 100) / 100, 
            expense: Math.round(expense * 100) / 100, 
            discount: Math.round(discount * 100) / 100,
            profit: Math.round(profit * 100) / 100, 
            sellingPrice: Math.round(finalSellingPrice * 100) / 100,
            isLoss 
        };
    }, [items]);

    // Local formatter for the previews (opposite of base)
    const formatPreview = (amountInSAR: number) => {
        if (activeCurrency === "SAR") {
            // Base is SAR -> Preview is BDT
            const bdt = amountInSAR * numericRate;
            return `৳${bdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        // Base is BDT -> Preview is SAR
        return `SR ${amountInSAR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Helper to get value for the input box based on base currency
    const getInputValue = (amountInSAR: number) => {
        if (activeCurrency === "BDT") {
            return Math.round(amountInSAR * numericRate * 100) / 100;
        }
        return amountInSAR;
    };

    // Helper to handle input change and convert back to SAR
    const handleValueChange = (index: number, val: number) => {
        if (activeCurrency === "BDT") {
            // Convert input BDT back to SAR for the ledger
            const sarVal = val / numericRate;
            updateItem(index, "amount", Math.round(sarVal * 100) / 100);
        } else {
            updateItem(index, "amount", val);
        }
    };

    // Sub-item version of the above
    const handleSubValueChange = (itemIdx: number, subIdx: number, val: number) => {
        if (activeCurrency === "BDT") {
            const sarVal = val / numericRate;
            updateSubItem(itemIdx, subIdx, "amount", Math.round(sarVal * 100) / 100);
        } else {
            updateSubItem(itemIdx, subIdx, "amount", val);
        }
    };

    const getBaseSymbol = () => activeCurrency === "BDT" ? "৳" : "SR";

    return (
        <div className="space-y-6">
            {/* CURRENCY & RATE LOCK (For Actual mode) */}
            {mode === "actual" && onCurrencyChange && onExchangeRateChange && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-primary/5 p-4 border border-primary/10 mb-6">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-normal text-primary">Input Base Currency</Label>
                        <Select value={activeCurrency} onValueChange={onCurrencyChange}>
                            <SelectTrigger className={GONIA_INPUT_CLASSES}>
                                <SelectValue placeholder="Select Currency" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none border-2">
                                <SelectItem value="SAR" className="font-bold uppercase text-xs">Saudi Riyal (SAR)</SelectItem>
                                <SelectItem value="BDT" className="font-bold uppercase text-xs">Bangladeshi Taka (BDT)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[9px] font-medium text-muted-foreground italic">All fields below will be treated as {activeCurrency}.</p>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-normal text-primary">Exchange Rate (1 SAR = X BDT)</Label>
                        <div className="flex gap-2">
                            <Input 
                                type="text" 
                                value={exchangeRate} 
                                onChange={(e) => {
                                    const val = e.target.value;
                                    // Allow empty string or numeric with decimal
                                    if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                        onExchangeRateChange(val as any);
                                    }
                                }}
                                onBlur={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    onExchangeRateChange(Math.max(0, val));
                                }}
                                className={cn(GONIA_INPUT_CLASSES, "font-mono")}
                            />
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => onExchangeRateChange(currentSystemRate)}
                                className="h-10 rounded-none text-[9px] font-black uppercase shrink-0"
                            >
                                Use Market Rate ({currentSystemRate.toFixed(2)})
                            </Button>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                            <p className="text-[9px] font-medium text-muted-foreground italic">Conversion factor for {activeCurrency === "SAR" ? "BDT Previews" : "SAR Ledger"}.</p>
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-none border border-emerald-100">
                                Current: 1 SR = ৳{numericRate.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

                        <div className="flex items-center justify-between border-b-2 border-primary/10 pb-2">
                            <h3 className="text-[10px] font-black uppercase tracking-normal text-primary">
                                {mode === "template" ? "Template Definition" : `Pricing Line Items (Base: ${activeCurrency})`}
                            </h3>
                            <Button type="button" onClick={addItem} size="sm" className="h-8 rounded-none bg-primary text-white font-black uppercase text-[9px] tracking-normal shadow-[3px_3px_0_0_var(--gonia-accent)] hover:shadow-none transition-all">
                                <Plus className="h-3 w-3 mr-1" /> Add Entry
                            </Button>
                        </div>
            
                                    <div className="space-y-4">
                                        {items.map((item, idx) => {
                                            const displayAmount = getInputValue(item.amount || 0);
                                            
                                            const getTypeIcon = () => {
                                                if (item.type === "INCOME") return <ArrowUpCircle className="h-2.5 w-2.5 text-emerald-600" />;
                                                if (item.type === "EXPENSE") return <ArrowDownCircle className="h-2.5 w-2.5 text-destructive" />;
                                                if (item.type === "PAYMENT") return <ArrowDownCircle className="h-2.5 w-2.5 text-blue-600" />;
                                                return <MinusCircle className="h-2.5 w-2.5 text-orange-500" />;
                                            };

                                            return (
                                            <div key={idx} className="bg-white border-2 border-border/40 p-4 rounded-none hover:border-primary/30 transition-all group relative">                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
                                        <div className="sm:col-span-2 lg:col-span-4 space-y-1.5">
                                            <Label className="text-[9px] font-black uppercase tracking-normal text-muted-foreground">Item Category / Description</Label>
                                            <Input 
                                                value={item.label} 
                                                onChange={(e) => updateItem(idx, "label", e.target.value)} 
                                                className={GONIA_INPUT_CLASSES}
                                            />
                                            <div className="flex items-center gap-4">
                                                {mode === "template" && (
                                                    <div className="flex items-center gap-1.5 opacity-40">
                                                        <Hash className="h-3 w-3" />
                                                        <span className="text-[8px] font-mono font-bold lowercase tracking-tighter">{item.key}</span>
                                                    </div>
                                                )}
                                                <button 
                                                    type="button" 
                                                    onClick={() => addSubItem(idx)}
                                                    className="flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter text-primary hover:underline"
                                                >
                                                    <ListPlus className="h-3 w-3" /> Add Item
                                                </button>
                                            </div>
                                        </div>
            
                                        <div className="lg:col-span-2 space-y-1.5">
                                            <Label className="text-[9px] font-black uppercase tracking-normal text-muted-foreground flex items-center gap-1">
                                                {getTypeIcon()}
                                                Type
                                            </Label>
                                            <Select value={item.type} onValueChange={(v) => updateItem(idx, "type", v as any)}>
                                                <SelectTrigger className={cn(GONIA_INPUT_CLASSES, "text-[10px] uppercase")}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-none border-2">
                                                    <SelectItem value="INCOME" className="text-[10px] font-bold uppercase">Income</SelectItem>
                                                    <SelectItem value="EXPENSE" className="text-[10px] font-bold uppercase">Expense</SelectItem>
                                                    <SelectItem value="PAYMENT" className="text-[10px] font-bold uppercase text-blue-600">Payment</SelectItem>
                                                    <SelectItem value="DISCOUNT" className="text-[10px] font-bold uppercase text-orange-600">Discount</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
            
                                        <div className="lg:col-span-2 space-y-1.5">
                                            <Label className="text-[9px] font-black uppercase tracking-normal text-muted-foreground">Account</Label>
                                            <Select 
                                                value={item.source_id?.toString() || item.vendor_id?.toString() || item.source || (mode === "template" ? "dynamic" : "")}
                                                onValueChange={(v) => updateItem(idx, "source_id", v)}
                                            >
                                                <SelectTrigger className={cn(GONIA_INPUT_CLASSES, "text-[10px] uppercase overflow-hidden")}>
                                                    <SelectValue placeholder={mode === "template" ? "Dynamic" : "Select..."} />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-none border-2">
                                                    <SelectGroup>
                                                        <SelectLabel className="text-[8px] font-black uppercase text-muted-foreground bg-muted/20 px-2 py-1">System Accounts</SelectLabel>
                                                        <SelectItem value="CLIENT" className="text-[10px] font-bold uppercase">Customer Account</SelectItem>
                                                        <SelectItem value="EXTERNAL" className="text-[10px] font-bold uppercase">External Account</SelectItem>
                                                        <SelectItem value="INTERNAL" className="text-[10px] font-bold uppercase">Internal Office</SelectItem>
                                                    </SelectGroup>
                                                    
                                                    {vendors.some(v => v.type === "INTERNAL") && (
                                                        <>
                                                            <SelectSeparator />
                                                            <SelectGroup>
                                                                <SelectLabel className="text-[8px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1">Internal Vendors / Offices</SelectLabel>
                                                                {vendors.filter(v => v.type === "INTERNAL").map((v: any) => (
                                                                    <SelectItem key={v.id} value={v.id.toString()} className="text-[10px] font-bold uppercase">{v.name}</SelectItem>
                                                                ))}
                                                            </SelectGroup>
                                                        </>
                                                    )}

                                                    {vendors.some(v => v.type === "EXTERNAL") && (
                                                        <>
                                                            <SelectSeparator />
                                                            <SelectGroup>
                                                                <SelectLabel className="text-[8px] font-black uppercase text-primary bg-primary/5 px-2 py-1">External Vendors / Suppliers</SelectLabel>
                                                                {vendors.filter(v => v.type === "EXTERNAL").map((v: any) => (
                                                                    <SelectItem key={v.id} value={v.id.toString()} className="text-[10px] font-bold uppercase">{v.name}</SelectItem>
                                                                ))}
                                                            </SelectGroup>
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
            
                                                                                                <div className="sm:col-span-2 lg:col-span-2 space-y-1.5 relative">
            
                                                                                                    <Label className="text-[9px] font-black uppercase tracking-normal text-muted-foreground">Amount ({activeCurrency})</Label>
            
                                                                                                    <div className="relative">
            
                                                                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary/40">{getBaseSymbol()}</span>
            
                                                                                                        {item.sub_items && item.sub_items.length > 0 ? (
            
                                                                                                            <Input 
            
                                                                                                                key={`main-readonly-${activeCurrency}-${idx}`}
            
                                                                                                                value={displayAmount}
            
                                                                                                                readOnly
            
                                                                                                                className={cn(GONIA_INPUT_CLASSES, "pl-8 font-mono text-sm bg-muted/30")}
            
                                                                                                            />
            
                                                                                                        ) : (
            
                                                                                                            <GoniaCurrencyInput 
            
                                                                                                                key={`main-input-${activeCurrency}-${idx}`}
            
                                                                                                                value={item.amount || 0} 
            
                                                                                                                exchangeRate={numericRate}
            
                                                                                                                symbol={getBaseSymbol()}
            
                                                                                                                onChange={(val) => handleValueChange(idx, val)} 
            
                                                                                                                className={cn(GONIA_INPUT_CLASSES, "pl-8 font-mono text-sm")}
            
                                                                                                            />
            
                                                                                                        )}
            
                                                                                                    </div>
            
                                                                                                    <div className="flex items-center justify-between mt-1 px-1">
            
                                                                                                        <span className="text-[10px] font-mono text-muted-foreground font-bold">{formatPreview(item.amount || 0)}</span>
            
                                                                                                        <Button 
            
                                                                                                            type="button" 
            
                                                                                                            onClick={() => removeItem(idx)} 
            
                                                                                                            size="icon" 
            
                                                                                                            variant="ghost" 
            
                                                                                                            className="h-5 w-5 text-destructive hover:bg-destructive/10 rounded-none transition-all"
            
                                                                                                            disabled={item.key === "base_price"}
            
                                                                                                        >
            
                                                                                                            <Trash2 className="h-3 w-3" />
            
                                                                                                        </Button>
            
                                                                                                    </div>
            
                                                                                                </div>
            
                                                                                            </div>
            
                                                                    
            
                                                                                            {/* NESTED SUB-ITEMS (The Goods List) */}
            
                                                                                            {item.sub_items && item.sub_items.length > 0 && (
            
                                                                                                <div className="mt-4 ml-4 md:ml-8 pl-4 md:pl-6 border-l-2 border-primary/10 space-y-3 pt-2">
            
                                                                                                    <div className="flex items-center gap-2 mb-2">
            
                                                                                                        <span className="text-[8px] font-black uppercase tracking-normal text-primary/40">Itemized Goods Breakdown ({activeCurrency})</span>
            
                                                                                                    </div>
            
                                                                                                    {item.sub_items.map((sub, sIdx) => {
            
                                                                                                        return (
            
                                                                                                        <div key={sIdx} className="grid grid-cols-12 gap-3 md:gap-4 items-center animate-in fade-in slide-in-from-left-1">
            
                                                                                                            <div className="col-span-1 flex justify-center">
            
                                                                                                                <ChevronRight className="h-3 w-3 text-primary/30" />
            
                                                                                                            </div>
            
                                                                                                            <div className="col-span-6 md:col-span-6">
            
                                                                                                                <Input 
            
                                                                                                                    placeholder="e.g. Rice (5kg)"
            
                                                                                                                    value={sub.label}
            
                                                                                                                    onChange={(e) => updateSubItem(idx, sIdx, "label", e.target.value)}
            
                                                                                                                    className="h-8 rounded-none bg-muted/5 border-dashed border-border/60 text-xs font-bold"
            
                                                                                                                />
            
                                                                                                            </div>
            
                                                                                                            <div className="col-span-4 md:col-span-4 space-y-1">
            
                                                                                                                <div className="relative">
            
                                                                                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground/40">{getBaseSymbol()}</span>
            
                                                                                                                    <GoniaCurrencyInput 
            
                                                                                                                        key={`sub-input-${activeCurrency}-${idx}-${sIdx}`}
            
                                                                                                                        value={sub.amount || 0}
            
                                                                                                                        exchangeRate={numericRate}
            
                                                                                                                        symbol={getBaseSymbol()}
            
                                                                                                                        onChange={(val) => handleSubValueChange(idx, sIdx, val)}
            
                                                                                                                        className="h-8 rounded-none bg-muted/5 border-dashed border-border/60 pl-6 font-mono text-xs"
            
                                                                                                                    />
            
                                                                                                                </div>
            
                                                                                                                <div className="text-[8px] font-bold text-muted-foreground px-1 italic">{formatPreview(sub.amount || 0)}</div>
            
                                                                                                            </div>
            
                                                                                                            <div className="col-span-1">
            
                                                                                                                <Button type="button" onClick={() => removeSubItem(idx, sIdx)} variant="ghost" size="icon" className="h-6 w-6 text-destructive/40 hover:text-destructive">
            
                                                                                                                    <Trash2 className="h-3.5 w-3.5" />
            
                                                                                                                </Button>
            
                                                                                                            </div>
            
                                                                                                        </div>
            
                                                                                                    )})}                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                onClick={() => addSubItem(idx)}
                                                className="h-7 px-3 text-[8px] font-black uppercase tracking-normal border-primary/5 hover:bg-primary/5"
                                            >
                                                <Plus className="h-3 w-3 mr-1" /> Add Another Goods Row
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )})}            </div>

            {showTotal && (
                <div className="bg-primary/5 border-2 border-primary/10 p-4 md:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-primary/5 pb-3 gap-2">
                        <h3 className="text-[10px] font-black uppercase tracking-normal text-primary flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Live Financial Projection
                        </h3>
                        <Badge variant={stats.isLoss ? "destructive" : "success"} className="rounded-none h-6 px-3 text-[10px] font-black uppercase w-fit">
                            {stats.isLoss ? "Loss Detected" : "Profitable Operation"}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                        <div className="space-y-1 bg-white/40 p-3 lg:p-0 lg:bg-transparent lg:border-none border border-primary/5">
                            <span className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-normal flex items-center gap-1">
                                <ArrowUpCircle className="h-2.5 w-2.5 text-emerald-500" /> Gross Income
                            </span>
                            <div className="flex flex-col">
                                <p className="text-base md:text-lg font-black font-mono text-primary">{getBaseSymbol()} {getInputValue(stats.income).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                <span className="text-[10px] font-bold text-muted-foreground opacity-60">{formatPreview(stats.income)}</span>
                            </div>
                        </div>
                        <div className="space-y-1 bg-white/40 p-3 lg:p-0 lg:bg-transparent lg:border-none border border-primary/5">
                            <span className="text-[8px] font-black uppercase text-orange-500/60 tracking-normal flex items-center gap-1">
                                <Tag className="h-2.5 w-2.5 text-orange-500" /> Discounts
                            </span>
                            <div className="flex flex-col">
                                <p className="text-base md:text-lg font-black font-mono text-orange-600">-{getBaseSymbol()} {getInputValue(stats.discount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                <span className="text-[10px] font-bold text-orange-400 opacity-60">{formatPreview(stats.discount)}</span>
                            </div>
                        </div>
                        <div className="space-y-1 bg-white/40 p-3 lg:p-0 lg:bg-transparent lg:border-none border border-primary/5">
                            <span className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-normal flex items-center gap-1">
                                <ArrowDownCircle className="h-2.5 w-2.5 text-destructive" /> Gross Expenses
                            </span>
                            <div className="flex flex-col">
                                <p className="text-base md:text-lg font-black font-mono text-destructive">{getBaseSymbol()} {getInputValue(stats.expense).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                <span className="text-[10px] font-bold text-muted-foreground opacity-60">{formatPreview(stats.expense)}</span>
                            </div>
                        </div>
                        <div className="space-y-1 bg-white p-3 border-l-4 border-primary shadow-sm">
                            <span className="text-[8px] font-black uppercase text-primary/60 tracking-normal flex items-center gap-1">
                                <TrendingUp className="h-2.5 w-2.5 text-primary" /> Projected Profit
                            </span>
                            <div className="flex flex-col">
                                <p className={cn("text-xl md:text-2xl font-black font-mono", stats.isLoss ? "text-destructive" : "text-primary")}>
                                    {getBaseSymbol()} {getInputValue(stats.profit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                                <span className="text-[10px] font-bold text-primary opacity-40">{formatPreview(stats.profit)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-primary/5 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-primary/40">Final Quote Value:</span>
                        <Badge className="bg-primary text-white rounded-none font-mono text-lg px-4 h-10">
                            {getBaseSymbol()} {getInputValue(stats.sellingPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Badge>
                    </div>

                    {stats.isLoss && (
                        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 text-destructive animate-pulse">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-normal">Financial Risk Warning</span>
                                <span className="text-[9px] font-bold uppercase tracking-tight opacity-80">This configuration results in a negative margin. Please review costs or income.</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}