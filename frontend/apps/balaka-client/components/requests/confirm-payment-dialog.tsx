import { useState, useEffect, useMemo } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useNotifications, gonia, GONIA_INPUT_CLASSES, GoniaCurrencyInput, Badge } from "@/ui";

import { fetchClient } from "@/core/api";

import { Loader2, CreditCard, Banknote, Ticket as TicketIcon, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/core/currency-context";

interface ConfirmPaymentDialogProps {
  serviceRequestId: number;
  basePrice: number;
  onPaymentConfirmed: () => void;
  className?: string;
}

export function ConfirmPaymentDialog({ serviceRequestId, basePrice, onPaymentConfirmed, className }: ConfirmPaymentDialogProps) {
  const { toast } = useNotifications();
  const { formatCurrency, rate: systemRate } = useCurrency();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [method, setMethod] = useState("Bank Transfer");
  const [clientRef, setClientRef] = useState("");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState(basePrice || 0);
  
  const [lockedExchangeRate, setLockedExchangeRate] = useState(1.0);
  const [localCurrency, setLocalCurrency] = useState("SAR");
  const [serviceRequest, setServiceRequest] = useState<any>(null);
  const [initializing, setInitializing] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [activeCoupon, setActiveCoupon] = useState<string | null>(null);

  useEffect(() => {
      if (open) {
          const fetchData = async () => {
              setInitializing(true);
              try {
                  const req = await fetchClient<any>(`/api/v1/service-requests/${serviceRequestId}`);
                  setServiceRequest(req);
                  setLockedExchangeRate(req.exchange_rate || 32.0);
                  setLocalCurrency(req.currency || "SAR");
                  setAmount(basePrice || 0);
                  setAppliedDiscount(0);
                  setActiveCoupon(null);
                  setCouponCode("");
              } catch (error) {
                  console.error("Failed to fetch request data:", error);
              } finally {
                  setInitializing(false);
              }
          };
          fetchData();
      }
  }, [open, basePrice, serviceRequestId]);

  const applyCoupon = async () => {
    if (!couponCode || !serviceRequest) return;
    setValidatingCoupon(true);
    try {
        let discountValue = 0;
        let isPercentage = false;
        let codeLabel = couponCode;

        // 1. Check Service-Level Config
        const svcConfig = serviceRequest.service_definition?.coupon_config;
        if (svcConfig?.enabled && svcConfig.code?.toUpperCase() === couponCode.toUpperCase()) {
            const now = new Date();
            if (svcConfig.expiry_date && new Date(svcConfig.expiry_date) < now) {
                throw new Error("This promotion has expired.");
            }
            discountValue = svcConfig.percentage || 0;
            isPercentage = true;
            codeLabel = svcConfig.code;
        } else {
            // 2. Fallback to Global
            const coupon = await fetchClient<any>(`/api/v1/system/coupons/validate/${couponCode}`);
            discountValue = coupon.value;
            isPercentage = coupon.is_percentage;
            codeLabel = coupon.code;
        }

        // Calculate Discount
        let discountAmount = discountValue;
        if (isPercentage) {
            discountAmount = (basePrice * discountValue) / 100;
        }

        const finalDiscount = Math.round(discountAmount * 100) / 100;
        setAppliedDiscount(finalDiscount);
        setAmount(Math.max(0, basePrice - finalDiscount));
        setActiveCoupon(codeLabel);
        toast.success(`Coupon '${codeLabel}' applied successfully!`);
    } catch (error: any) {
        toast.error(error.message || "Invalid coupon code");
    } finally {
        setValidatingCoupon(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-fill reference for Cash
    let finalRef = clientRef;
    if (method === "Cash") {
        finalRef = "CASH-" + Date.now().toString().slice(-6);
    } else if (!clientRef) {
        toast.error("Technical reference ID required");
        return;
    }

    if (!amount || amount <= 0) {
        toast.error("Invalid payment amount");
        return;
    }

    setLoading(true);

    try {
      const payload = {
        service_request_id: serviceRequestId,
        payment_method: method,
        client_reference_id: finalRef,
        notes: activeCoupon ? `${notes} [Coupon: ${activeCoupon} (-${appliedDiscount} SAR)]`.trim() : notes,
        amount: localCurrency === "BDT" ? parseFloat((amount * lockedExchangeRate).toFixed(2)) : amount, 
        currency: localCurrency,
        exchange_rate: lockedExchangeRate,
        coupon_code: activeCoupon
      };

      await fetchClient("/api/v1/transactions/claim", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      onPaymentConfirmed();
      toast.success("Payment submitted for verification.");
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Payment submission failed");
    } finally {
      setLoading(false);
    }
  };

  const isCash = method === "Cash";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={cn(gonia.button.base, gonia.button.primary, "gap-2", className)}>
            <Banknote className="h-4 w-4" /> Pay Now
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] p-0 overflow-hidden rounded-none border-2 border-primary bg-white flex flex-col">
        <DialogHeader className="p-4 sm:p-6 bg-primary/5 border-b border-primary/10 shrink-0">
          <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <DialogTitle className={gonia.text.h2}>Pay for Service</DialogTitle>
          </div>
          <DialogDescription className={gonia.text.caption}>
            Register your payment details for administrative review.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-6 bg-[var(--gonia-canvas)]">
            {/* Coupon Section */}
            <div className="bg-orange-50 border border-orange-100 p-3 sm:p-4 space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-normal text-orange-800 flex items-center gap-2">
                    <TicketIcon className="h-3 w-3" /> Have a Coupon?
                </Label>
                <div className="flex gap-2">
                    <Input 
                        placeholder="Enter Code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="h-9 sm:h-10 rounded-none border-orange-200 focus:border-orange-400 bg-white font-mono text-xs uppercase w-full"
                        disabled={!!activeCoupon}
                    />
                    {activeCoupon ? (
                        <Button 
                            type="button"
                            variant="outline" 
                            className="h-9 sm:h-10 px-3 rounded-none border-orange-300 text-orange-700 bg-orange-100 shrink-0"
                            onClick={() => {
                                setActiveCoupon(null);
                                setAppliedDiscount(0);
                                setAmount(basePrice);
                                setCouponCode("");
                            }}
                        >
                            Reset
                        </Button>
                    ) : (
                        <Button 
                            type="button"
                            variant="outline" 
                            className="h-9 sm:h-10 px-3 rounded-none border-orange-300 text-orange-700 hover:bg-orange-100 uppercase font-black text-[9px] shrink-0"
                            onClick={applyCoupon}
                            disabled={validatingCoupon || !couponCode}
                        >
                            {validatingCoupon ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Apply"}
                        </Button>
                    )}
                </div>
                {activeCoupon && (
                    <div className="flex items-center gap-2 mt-1">
                        <Tag className="h-2.5 w-2.5 text-emerald-600" />
                        <span className="text-[10px] font-bold text-emerald-700">Applied: -{formatCurrency(appliedDiscount)}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 bg-primary/5 p-3 sm:p-4 border border-primary/10 mb-2">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-normal text-primary">Payment Currency</Label>
                    <Select value={localCurrency} onValueChange={setLocalCurrency}>
                        <SelectTrigger className="h-9 sm:h-10 rounded-none bg-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-none border-2 border-primary/10">
                            <SelectItem value="SAR" className="text-xs font-bold uppercase py-3">Saudi Riyal (SAR)</SelectItem>
                            <SelectItem value="BDT" className="text-xs font-bold uppercase py-3">Bangladeshi Taka (BDT)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-normal text-primary">Conversion Rate</Label>
                    <div className="h-9 sm:h-10 flex items-center px-3 bg-white border border-primary/10 font-mono text-xs font-black text-primary/60">
                        1 SR = ৳{lockedExchangeRate.toFixed(2)}
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label className={gonia.text.label}>Pay Amount ({localCurrency === 'BDT' ? '৳' : 'SR'})</Label>
                <div className="relative">
                    <GoniaCurrencyInput 
                        id="amount" 
                        value={amount}
                        onChange={setAmount}
                        className="h-11 sm:h-12 bg-white"
                        exchangeRate={lockedExchangeRate}
                        symbol={localCurrency === 'BDT' ? '৳' : 'SR'}
                        required
                    />
                    <div className="absolute right-12 top-1/2 -translate-y-1/2 text-[9px] sm:text-[10px] font-black text-primary/40 uppercase tracking-normal pointer-events-none">
                        Due: {formatCurrency(basePrice - appliedDiscount)}
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label className={gonia.text.label}>Payment Method</Label>
                <Select onValueChange={setMethod} defaultValue={method}>
                    <SelectTrigger className={cn(GONIA_INPUT_CLASSES, "bg-white h-10 sm:h-11")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-2 border-primary/10">
                        <SelectItem value="Bank Transfer" className="text-xs font-bold uppercase py-3">Bank Transfer</SelectItem>
                        <SelectItem value="Online" className="text-xs font-bold uppercase py-3">Online Gateway</SelectItem>
                        <SelectItem value="Check" className="text-xs font-bold uppercase py-3">Corporate Check</SelectItem>
                        <SelectItem value="Cash" className="text-xs font-bold uppercase py-3">Physical Cash</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            {!isCash && (
                <div className="space-y-2">
                    <Label className={gonia.text.label}>Technical Reference ID</Label>
                    <Input 
                        id="clientRef" 
                        value={clientRef} 
                        onChange={(e) => setClientRef(e.target.value)} 
                        placeholder="Transaction ID / Receipt Number"
                        className={cn(GONIA_INPUT_CLASSES, "bg-white h-10 sm:h-11")}
                        required={!isCash}
                    />
                </div>
            )}

            <div className="space-y-2">
                <Label className={gonia.text.label}>Internal Notes (Optional)</Label>
                <Textarea 
                    id="notes" 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    className={cn(GONIA_INPUT_CLASSES, "min-h-[80px] sm:min-h-[100px] py-3 sm:py-4 bg-white")}
                    placeholder="Additional context regarding this transaction..."
                />
            </div>
            </form>
        </div>

        <DialogFooter className="p-4 sm:p-6 pt-2 border-t border-primary/10 bg-white shrink-0">
            <Button 
                onClick={handleSubmit}
                disabled={loading || initializing || (!isCash && !clientRef)}
                className={cn(gonia.button.base, gonia.button.primary, "w-full h-11 sm:h-12")}
            >
                {(loading || initializing) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initializing ? "Initializing..." : `Pay ${formatCurrency(amount)}`}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}