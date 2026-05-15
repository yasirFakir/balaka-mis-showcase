"use client";

import { useState, useEffect } from "react";
import { 
  Button, 
  GoniaResponsiveDialog, 
  useNotifications, 
  GoniaIcons, 
  Badge, 
  GoniaCurrencyInput,
  Label,
  Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  gonia,
  LoadingSpinner
} from "@/ui";
import { fetchClient } from "@/core/api";
import { Settings2, ShieldCheck, Hash } from "lucide-react";
import { Transaction } from "@/core/types";
import { useCurrency } from "@/core/currency-context";
import { cn } from "@/lib/utils";

interface ReconcileDialogProps {
  transaction: Transaction; 
  onReconciled: () => void;
  trigger: React.ReactNode;
}

export function ReconcileDialog({ transaction, onReconciled, trigger }: ReconcileDialogProps) {
  const { toast } = useNotifications();
  const { formatCurrency, rate: systemRate } = useCurrency();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [internalRef, setInternalRef] = useState("");
  
  // Adjustment State
  const [exchangeRate, setExchangeRate] = useState<number>(transaction.exchange_rate || 1.0);
  const [claimedAmount, setClaimedAmount] = useState<number>(transaction.claimed_amount || transaction.amount);
  const [currency, setCurrency] = useState(transaction.claimed_currency || "SAR");
  const [showAdjustments, setShowAdjustments] = useState(false);

  // Reset logic when dialog opens or adjustments are toggled
  useEffect(() => {
      if (open) {
          const txCurrency = transaction.claimed_currency || "SAR";
          setCurrency(txCurrency);
          
          let rate = transaction.exchange_rate || 1.0;
          const isLegacyBDT = txCurrency === "BDT" && rate <= 1.0;
          
          // If rate is 1.0 but currency is BDT, use system rate (fallback for legacy or manual entry start)
          if (isLegacyBDT) {
              rate = systemRate;
          }
          setExchangeRate(rate);

          let amt = transaction.claimed_amount;
          
          // ROBUST LEGACY FIX: 
          // 1. If claimed_amount is missing
          // 2. OR if it's a legacy BDT record (rate was 1.0)
          // 3. OR if claimed_amount was wrongly saved as SAR value (amt ~= amount but rate > 1)
          const looksLikeSAR = amt && Math.abs(amt - transaction.amount) < 0.01 && rate > 1.1 && txCurrency === "BDT";
          
          if ((!amt || isLegacyBDT || looksLikeSAR) && transaction.amount) {
              // Back-calculate claimed amount from base amount
              if (txCurrency === "BDT") {
                  amt = parseFloat((transaction.amount * rate).toFixed(2));
              } else {
                  amt = transaction.amount;
              }
          }
          setClaimedAmount(amt || 0);
      }
  }, [open, transaction, systemRate]);

  // When currency changes in adjustment mode, auto-fill rate AND convert amount
  const handleCurrencyChange = (newCurrency: string) => {
      if (newCurrency === currency) return;

      const rateToUse = newCurrency === "BDT" ? systemRate : 1.0;
      
      // Convert Amount to maintain value
      if (newCurrency === "BDT") {
          // SAR -> BDT (Multiply)
          setClaimedAmount(prev => parseFloat((prev * systemRate).toFixed(2)));
          setExchangeRate(systemRate);
      } else {
          // BDT -> SAR (Divide)
          // We use current exchangeRate state because we are converting FROM BDT
          setClaimedAmount(prev => parseFloat((prev / exchangeRate).toFixed(2)));
          setExchangeRate(1.0);
      }
      setCurrency(newCurrency);
  };
  
  // Ensure exchange rate updates if system rate loads late and we are in BDT default
  useEffect(() => {
      if (showAdjustments && currency === "BDT" && exchangeRate === 1.0) {
          setExchangeRate(systemRate);
      }
  }, [showAdjustments, currency, exchangeRate, systemRate]);

  const isCash = transaction.payment_method === "Cash";

  const handleReconcile = async () => {
    setLoading(true);
    try {
      await fetchClient(`/api/v1/transactions/${transaction.id}/reconcile`, {
        method: "PUT",
        body: JSON.stringify({ 
            internal_reference_id: isCash ? undefined : internalRef,
            exchange_rate: showAdjustments ? exchangeRate : undefined,
            amount: showAdjustments ? claimedAmount : undefined,
            claimed_currency: showAdjustments ? currency : undefined
            // Note: We are sending amount in CLAIMED CURRENCY. 
            // The backend reconcile endpoint should handle converting this back to base currency using the rate.
        })
      });
      toast.success("Transaction verified and ledger updated");
      onReconciled();
      setOpen(false);
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "Verification failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const calculatedSAR = currency === "BDT" 
    ? (claimedAmount / (exchangeRate || 1)) 
    : claimedAmount;

  return (
    <>
      <div onClick={() => setOpen(true)} className="inline-block">
        {trigger || (
          <Button size="sm" className="gap-2 h-9 px-4 font-black uppercase tracking-normal text-[9px] shadow-[3px_3px_0_0_var(--gonia-accent)] hover:shadow-none transition-all">
            <ShieldCheck className="h-3.5 w-3.5" /> Verify Transaction
          </Button>
        )}
      </div>

      <GoniaResponsiveDialog
        isOpen={open}
        onOpenChange={setOpen}
        title="Financial Verification"
        description="Verify transaction authenticity and save to the permanent ledger."
        maxWidth="xl"
        footer={
          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 sm:flex-none h-11 uppercase font-black text-[10px]">Abort</Button>
            <Button 
                onClick={handleReconcile} 
                disabled={loading} 
                className="flex-1 sm:flex-none h-11 bg-primary text-white font-black uppercase tracking-normal px-8 shadow-[4px_4px_0_0_var(--gonia-accent)]"
            >
                {loading ? <LoadingSpinner size="sm" className="mr-2" /> : <GoniaIcons.Ledger className="mr-2 h-4 w-4" />}
                Verify Transaction
            </Button>
          </div>
        }
      >
        <div className="space-y-6 pb-10 sm:pb-0">
            {/* TRANSACTION SUMMARY */}
            <div className="bg-primary/5 p-4 border-l-4 border-primary space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-normal text-primary/60">Original Claim</span>
                    <span className="text-xl font-mono font-black text-primary">
                        {transaction.claimed_currency === "BDT" ? "৳" : "SR"} {(transaction.claimed_amount || transaction.amount).toLocaleString()}
                    </span>
                </div>
                <div className="flex items-center justify-between border-t border-primary/10 pt-2">
                    <span className="text-[9px] font-black uppercase tracking-normal text-primary/40">Method</span>
                    <Badge variant="outline" className="h-5 px-2 rounded-none border-primary/20 text-primary font-bold uppercase text-[8px]">
                        {transaction.payment_method}
                    </Badge>
                </div>
            </div>

            {/* ADJUSTMENT TOGGLE */}
            <div className="flex items-center justify-between p-4 bg-muted/20 border-2 border-primary/5">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-normal">Manual Correction</span>
                    <span className="text-[8px] text-muted-foreground uppercase">Enable to override currency details</span>
                </div>
                <input 
                    type="checkbox" 
                    checked={showAdjustments} 
                    onChange={(e) => setShowAdjustments(e.target.checked)}
                    className="h-5 w-5 rounded-none border-2 border-primary text-primary focus:ring-primary"
                />
            </div>

            {/* ADJUSTMENT FIELDS */}
            <div className={cn("space-y-4", !showAdjustments && "opacity-50 pointer-events-none")}>
                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-normal text-muted-foreground">Currency</Label>
                        <Select 
                            value={currency} 
                            onValueChange={handleCurrencyChange} 
                            disabled={!showAdjustments}
                        >
                            <SelectTrigger className={gonia.input.base}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-none border-2">
                                <SelectItem value="SAR" className="text-xs font-bold">SAR</SelectItem>
                                <SelectItem value="BDT" className="text-xs font-bold">BDT</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-normal text-muted-foreground">Exchange Rate</Label>
                        <Input 
                            type="number" 
                            value={exchangeRate} 
                            onChange={(e) => setExchangeRate(parseFloat(e.target.value))}
                            className={gonia.input.base}
                            disabled={!showAdjustments || currency === "SAR"} // Lock rate for SAR
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-normal text-muted-foreground">Corrected Amount ({currency})</Label>
                        <Input 
                            type="number"
                            value={claimedAmount} 
                            onChange={(e) => setClaimedAmount(parseFloat(e.target.value))} 
                            className={gonia.input.base}
                            disabled={!showAdjustments}
                        />
                </div>
                
                <div className="p-3 bg-secondary/5 border-l-2 border-secondary flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase text-secondary">Recalculated System Value:</span>
                    <span className="text-sm font-mono font-black text-secondary">SR {calculatedSAR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            </div>

            <div className="space-y-1.5 pt-4 border-t border-primary/5">
                <Label className="text-[10px] font-black uppercase tracking-normal text-muted-foreground flex items-center gap-1.5">
                    <Hash className="h-3 w-3" /> Internal Ledger Reference
                </Label>
                <Input 
                    placeholder="e.g. SLIP-2024-001"
                    value={internalRef} 
                    onChange={(e) => setInternalRef(e.target.value)} 
                    className={gonia.input.base}
                />
            </div>

            <div className="p-4 bg-amber-50 border border-dashed border-amber-200 rounded-none flex items-start gap-3">
                <GoniaIcons.Secure className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-normal text-amber-700">Verification Note</span>
                    <span className="text-[10px] font-bold text-amber-600/80 leading-relaxed">
                        Verification is a finalized administrative action. This transaction will be locked and reflected in the daily revenue summary.
                    </span>
                </div>
            </div>
        </div>
      </GoniaResponsiveDialog>
    </>
  );
}