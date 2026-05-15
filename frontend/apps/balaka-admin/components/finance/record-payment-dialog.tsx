"use client";

import { useState, useEffect } from "react";
import { 
  Button, 
  GoniaResponsiveDialog, 
  Input, 
  Label, 
  Textarea, 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue, 
  useNotifications, 
  GONIA_INPUT_CLASSES, 
  GoniaCurrencyInput 
} from "@/ui";





import { fetchClient } from "@/core/api";

import { Loader2, CreditCard, Plus, ShieldCheck, Wallet, Hash, TrendingUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/core/currency-context";


interface RecordPaymentDialogProps {
  serviceRequestId: number;
  basePrice: number;
  onPaymentRecorded: () => void;
  trigger?: React.ReactNode;
}

export function RecordPaymentDialog({ serviceRequestId, basePrice, onPaymentRecorded, trigger }: RecordPaymentDialogProps) {
  const { toast } = useNotifications();
  const { rate: systemRate } = useCurrency();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remainingBalance, setRemainingBalance] = useState(basePrice || 0);
  
  const [amount, setAmount] = useState<number>(0);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [method, setMethod] = useState("Cash");
  const [notes, setNotes] = useState("");
  const [clientRef, setClientRef] = useState("");
  
  const [lockedExchangeRate, setLockedExchangeRate] = useState(1.0);
  const [paymentCurrency, setPaymentCurrency] = useState("SAR");
  const [initializing, setInitializing] = useState(false);

  // When currency changes, check if we need to apply the system rate
  const handleCurrencyChange = (newCurrency: string) => {
      // If we are switching TO BDT and the rate is currently 1.0 (default SAR), use system rate
      let newRate = lockedExchangeRate;

      if (newCurrency === "BDT") {
          // Switching to BDT
          if (lockedExchangeRate === 1.0) {
              newRate = systemRate; // Use live system rate if no specific rate was locked
          }
      } else {
          // Switching to SAR
          newRate = 1.0;
      }
      
      setLockedExchangeRate(newRate);
      setPaymentCurrency(newCurrency);
  };

  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        setInitializing(true);
        try {
          const [balance, request] = await Promise.all([
            fetchClient<number>(`/api/v1/service-requests/${serviceRequestId}/remaining-balance`),
            fetchClient<any>(`/api/v1/service-requests/${serviceRequestId}`)
          ]);
          
          setRemainingBalance(balance);
          setAmount(balance);
          
          // Logic: If request has a rate, use it. If not, default to 1.0.
          // IF the request currency is BDT, we expect a rate > 1.0.
          // IF the request currency is SAR, rate is 1.0.
          const reqRate = request.exchange_rate || 1.0;
          setLockedExchangeRate(reqRate);
          setPaymentCurrency(request.currency || "SAR");
          
          // Edge case: If request is BDT but rate is missing/1.0, force system rate
          if (request.currency === "BDT" && reqRate === 1.0) {
              setLockedExchangeRate(systemRate);
          }
          
        } catch (error) {
          console.error("Failed to fetch request data:", error);
        } finally {
          setInitializing(false);
        }
      };
      fetchData();
    }
  }, [open, serviceRequestId, systemRate]);

  const handleDiscountPercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = parseFloat(e.target.value) || 0;
    setDiscountPercentage(percentage);
    const newDiscountAmount = (remainingBalance * percentage) / 100;
    setDiscountAmount(newDiscountAmount);
    setAmount(Math.max(0, remainingBalance - newDiscountAmount));
  };

  const handleDiscountAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDiscountAmount = parseFloat(e.target.value) || 0;
    setDiscountAmount(newDiscountAmount);
    setDiscountPercentage(0);
    setAmount(Math.max(0, remainingBalance - newDiscountAmount));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const payload = {
        service_request_id: serviceRequestId,
        amount: paymentCurrency === "BDT" ? parseFloat((amount * lockedExchangeRate).toFixed(2)) : amount, // Claimed amount
        discount: discountAmount,
        payment_method: method,
        notes,
        client_reference_id: clientRef || null,
        claimed_currency: paymentCurrency,
        exchange_rate: lockedExchangeRate
      };

      await fetchClient("/api/v1/transactions/", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      onPaymentRecorded();
      toast.success("Payment recorded and awaiting verification");
      setOpen(false);
      
      // Reset
      setAmount(0);
      setDiscountPercentage(0);
      setDiscountAmount(0);
      setMethod("Cash");
      setNotes("");
      setClientRef("");
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "Failed to record payment";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const { formatCurrency } = useCurrency();

  return (
    <>
      <div onClick={() => setOpen(true)} className="inline-block">
        {trigger || (
          <Button size="sm" className="gap-2 h-9 px-4 font-black uppercase tracking-normal text-[9px] shadow-[3px_3px_0_0_var(--gonia-accent)] hover:shadow-none transition-all">
            <Plus className="h-3.5 w-3.5" /> Record Payment
          </Button>
        )}
      </div>

      <GoniaResponsiveDialog
        isOpen={open}
        onOpenChange={setOpen}
        title="Record Payment"
        description="Verify and record manual payment received for this operation."
        maxWidth="lg"
        footer={
          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 sm:flex-none h-11 uppercase font-black text-[10px]">Cancel</Button>
            <Button 
                onClick={handleSubmit} 
                disabled={loading || initializing} 
                className="flex-1 sm:flex-none h-11 bg-primary text-white font-black uppercase tracking-normal px-8 shadow-[4px_4px_0_0_var(--gonia-accent)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
            >
                {initializing ? "Initializing..." : "Save Transaction"}
            </Button>
          </div>
        }
      >
        <div className="space-y-6 pb-10 sm:pb-0">
            {/* Multi-Currency Support Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-primary/5 p-4 border border-primary/10">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-normal text-primary">Payment Currency</Label>
                    <Select value={paymentCurrency} onValueChange={handleCurrencyChange}>
                        <SelectTrigger className={GONIA_INPUT_CLASSES}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-none border-2">
                            <SelectItem value="SAR" className="font-bold uppercase text-xs">Saudi Riyal (SAR)</SelectItem>
                            <SelectItem value="BDT" className="font-bold uppercase text-xs">Bangladeshi Taka (BDT)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-normal text-primary">Locked Exchange Rate</Label>
                    <div className="h-10 flex items-center px-3 bg-white border border-primary/10 font-mono text-sm font-black text-primary/60">
                        1 SAR = {lockedExchangeRate.toFixed(2)} BDT
                    </div>
                    <p className="text-[8px] text-muted-foreground italic uppercase">This rate was locked when the request was priced.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-normal text-muted-foreground flex items-center gap-1.5">
                        <Wallet className="h-3 w-3" /> Amount ({paymentCurrency === 'BDT' ? '৳' : 'SR'})
                    </Label>
                    <GoniaCurrencyInput 
                        value={amount} 
                        onChange={setAmount} 
                        className={GONIA_INPUT_CLASSES}
                        exchangeRate={lockedExchangeRate}
                        symbol={paymentCurrency === 'BDT' ? '৳' : 'SR'}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-normal text-muted-foreground flex items-center gap-1.5">
                        <CreditCard className="h-3 w-3" /> Method
                    </Label>
                    <Select value={method} onValueChange={setMethod}>
                        <SelectTrigger className={GONIA_INPUT_CLASSES}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-none border-2">
                            <SelectItem value="Cash" className="text-xs font-bold uppercase">Cash (Hand-over)</SelectItem>
                            <SelectItem value="Bank Transfer" className="text-xs font-bold uppercase">Bank Transfer</SelectItem>
                            <SelectItem value="bKash" className="text-xs font-bold uppercase">bKash (BD)</SelectItem>
                            <SelectItem value="STC Pay" className="text-xs font-bold uppercase">STC Pay (SA)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-normal text-muted-foreground flex items-center gap-1.5">
                    <Hash className="h-3 w-3" /> Transaction Reference
                </Label>
                <Input 
                    placeholder="Ref # / TrxID / Bank Slip ID"
                    value={clientRef} 
                    onChange={(e) => setClientRef(e.target.value)} 
                    className={GONIA_INPUT_CLASSES}
                />
                <p className="text-[8px] text-muted-foreground italic uppercase">Leave empty for cash transactions without formal receipts.</p>
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-normal text-muted-foreground">Notes (Optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={cn(GONIA_INPUT_CLASSES, "min-h-[60px] h-auto pt-2")} />
            </div>

            <div className="p-4 bg-primary/5 border border-dashed border-primary/20 rounded-none flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary/40" />
                <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-normal text-primary">Instant Ledger Impact</span>
                <div className="flex items-start gap-2 p-3 bg-primary/5 border border-dashed border-primary/20">
                    <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="text-[10px] font-bold text-primary/60">Balance for this request will be updated upon saving.</span>
                </div>
                </div>
            </div>
        </div>
      </GoniaResponsiveDialog>
    </>
  );
}
