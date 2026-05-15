"use client";

import { useState, useEffect } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useNotifications, gonia, LoadingSpinner } from "@/ui";
import { fetchClient } from "@/core/api";
import { useCurrency } from "@/core/currency-context";
import { RefreshCcw, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";


interface RefundDialogProps {
  serviceRequestId: number;
  maxRefundable: number;
  onRefundRequested: () => void;
  trigger?: React.ReactNode;
}

export function RefundDialog({ serviceRequestId, maxRefundable, onRefundRequested, trigger }: RefundDialogProps) {
  const { toast } = useNotifications();
  const { rate: systemRate } = useCurrency();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [reason, setReason] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [exchangeRate, setExchangeRate] = useState("1.0");

  // Reset/Preset when opening or changing currency
  useEffect(() => {
      if (currency === "BDT") {
          setExchangeRate(systemRate.toString());
      } else {
          setExchangeRate("1.0");
      }
  }, [currency, systemRate]);

  // Calculate dynamic limit based on exchange rate
  const currentRate = parseFloat(exchangeRate) || 1.0;
  const displayedLimit = currency === "SAR" ? maxRefundable : maxRefundable * currentRate;
  const currencySymbol = currency === "SAR" ? "$" : (currency === "BDT" ? "৳" : currency);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setAmount(val);

      if (val === "") return;

      const numVal = parseFloat(val);
      if (!isNaN(numVal) && numVal > displayedLimit + 0.01) { // 0.01 tolerance
          setAmount(displayedLimit.toFixed(2));
          toast.info(`Amount capped at maximum refundable limit: ${currencySymbol}${displayedLimit.toFixed(2)}`);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let amountInSar = parseFloat(amount);
    if (currency !== "SAR") {
        amountInSar = parseFloat(amount) / currentRate;
    }

    // Safety margin for float comparison
    if (amountInSar > maxRefundable + 0.05) {
        toast.error(`Cannot refund more than ${displayedLimit.toFixed(2)} ${currency}`);
        return;
    }
    setLoading(true);

    try {
      const payload = {
        service_request_id: serviceRequestId,
        amount: parseFloat(amount),
        method: method,
        reason,
        currency,
        exchange_rate: currentRate
      };

      await fetchClient("/api/v1/transactions/refund", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      onRefundRequested();
      toast.success("Refund Processed", "The funds have been returned to the client ledger.");
      setOpen(false);
      
      // Reset form
      setAmount("");
      setMethod("Cash");
      setReason("");
      setCurrency("SAR");
      setExchangeRate("1.0");
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "Could not process the reversal.";
      toast.error("Refund Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" size="sm" className={cn(gonia.button.base, "gap-2")}>
              <RefreshCcw className="h-4 w-4" /> Refund
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-none border-2">
        <DialogHeader className="p-6 bg-destructive/5 border-b border-destructive/10">
          <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive text-white"><RefreshCcw className="h-5 w-5" /></div>
              <div>
                  <DialogTitle className="text-lg font-black uppercase tracking-tight text-destructive">Financial Reversal</DialogTitle>
                  <DialogDescription className="text-[10px] font-bold uppercase tracking-normal opacity-60">
                    Max Refundable Limit: {currencySymbol}{displayedLimit.toFixed(2)} {currency}
                  </DialogDescription>
              </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-[var(--gonia-canvas)]">
          <div className="space-y-2">
            <Label className={gonia.text.label}>Reversal Amount ({currency})</Label>
            <Input 
                id="amount" 
                type="number" 
                value={amount} 
                onChange={handleAmountChange} 
                step="0.01"
                required 
                className={gonia.input.base}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                    <Label className={gonia.text.label}>Currency</Label>
                    <Select onValueChange={setCurrency} defaultValue={currency}>
                        <SelectTrigger className={gonia.input.base}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-none border-2">
                            <SelectItem value="SAR" className="text-xs font-bold">SAR</SelectItem>
                            <SelectItem value="BDT" className="text-xs font-bold">BDT</SelectItem>
                        </SelectContent>
                    </Select>
               </div>
               {currency !== "SAR" && (
                   <div className="space-y-2">
                        <Label className={gonia.text.label}>Exchange Rate (1 SAR = ?)</Label>
                        <Input 
                            type="number" 
                            value={exchangeRate} 
                            onChange={(e) => setExchangeRate(e.target.value)}
                            step="0.01"
                            className={gonia.input.base}
                        />
                   </div>
               )}
          </div>

          <div className="space-y-2">
            <Label className={gonia.text.label}>Payment Method</Label>
            <Select onValueChange={setMethod} defaultValue={method}>
                <SelectTrigger className={gonia.input.base}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2">
                    <SelectItem value="Cash" className="text-xs font-bold uppercase">Physical Cash</SelectItem>
                    <SelectItem value="Bank Transfer" className="text-xs font-bold uppercase">Electronic Transfer</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className={gonia.text.label}>Auditable Reason</Label>
            <Textarea 
                id="reason" 
                value={reason} 
                onChange={(e) => setReason(e.target.value)} 
                placeholder="State the reason for this reversal (e.g. Request Cancelled)"
                required
                className={cn(gonia.input.base, "min-h-[100px] py-3")}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" variant="destructive" disabled={loading} className={cn(gonia.button.base, gonia.button.destructive, "w-full h-12")}>
                {loading ? <LoadingSpinner size="sm" className="mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
                Process Reversal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
