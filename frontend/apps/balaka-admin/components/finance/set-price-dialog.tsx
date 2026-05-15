"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Button, 
  GoniaResponsiveDialog, 
  useNotifications,
  gonia,
  Badge,
  GoniaIcons
} from "@/ui";

import { fetchClient } from "@/core/api";

import { Loader2, Calculator, Receipt, Coins, ShieldAlert, CheckCircle2, Tag, Ticket as TicketIcon } from "lucide-react";
import { FinancialBreakdownEditor, FinancialItem } from "./financial-breakdown-editor";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/core/currency-context";
import { Input, Label } from "@/ui";

import { ServiceRequest, ServiceVariant, Vendor } from "@/core/types";

interface SetPriceDialogProps {
  requestId: number;
  onPriceUpdated: () => void;
  trigger?: React.ReactNode;
  currentPrice?: number;
}

export function SetPriceDialog({ requestId, onPriceUpdated, trigger }: SetPriceDialogProps) {
  const { toast } = useNotifications();
  const { formatCurrency: globalFormat, currency: globalCurrencyMode } = useCurrency();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [breakdown, setBreakdown] = useState<FinancialItem[]>([]);
  const [approve, setApprove] = useState(false); 
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [availableVariants, setAvailableVariants] = useState<ServiceVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [localCurrency, setLocalCurrency] = useState("SAR");
  const [localExchangeRate, setLocalExchangeRate] = useState<string | number>(32.6);
  
  const [couponCode, setCouponCode] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Local Formatter using the CUSTOM rate from this dialog
  const formatWithLocalRate = (amount: number) => {
      const numericRate = typeof localExchangeRate === 'string' ? parseFloat(localExchangeRate) : localExchangeRate;
      const rate = isNaN(numericRate) || numericRate <= 0 ? 1.0 : numericRate;

      if (globalCurrencyMode === "BDT") {
          const bdt = amount * rate;
          return `৳${bdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      return `SR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  useEffect(() => {
      if (open) {
          setLoading(true);
          Promise.all([
              fetchClient<{ items: Vendor[] } | Vendor[]>("/api/v1/vendors/"),
              fetchClient<ServiceRequest>(`/api/v1/service-requests/${requestId}`)
          ]).then(([vData, req]) => {
              const allVendors = Array.isArray(vData) ? vData : (vData.items || []);
              setVendors(allVendors);
              setRequest(req);
              setLocalCurrency(req.currency || "SAR");
              setLocalExchangeRate(req.exchange_rate || 1.0);
              
              // NEW: Use existing coupon if already set, otherwise suggest service default
              if (req.coupon_code) {
                  setCouponCode(req.coupon_code);
              } else if (req.service_definition?.coupon_config?.enabled && req.service_definition?.coupon_config?.code) {
                  setCouponCode(req.service_definition.coupon_config.code);
              } else {
                  setCouponCode("");
              }
              
              if (req.service_definition?.variants) {
                  setAvailableVariants(req.service_definition.variants);
              }

              if (req.financial_breakdown && req.financial_breakdown.length > 0) {
                   const mapped = req.financial_breakdown.map((item) => {
                       const vId = item.vendor_id?.toString() || item.source_id?.toString() || "";
                       // Robust Source Detection: Handle legacy VENDOR
                       let detectedSource: any = item.source;
                       if (detectedSource === "VENDOR") detectedSource = "EXTERNAL";
                       
                       if (!detectedSource && vId) {
                           const vendor = allVendors.find((v) => v.id.toString() === vId);
                           detectedSource = vendor?.type === "INTERNAL" ? "INTERNAL" : "EXTERNAL";
                       }

                       return {
                           ...item,
                           source: (detectedSource as any) || (item.type === "INCOME" ? "CLIENT" : "EXTERNAL"),
                           source_id: vId || undefined,
                           vendor_id: vId || undefined,
                           sub_items: item.sub_items || [] 
                       } as FinancialItem;
                   });
                   setBreakdown(mapped);
              } else if (req.service_definition?.financial_schema) {
                  const template = req.service_definition.financial_schema.map((t) => {
                      const vId = ""; // No vendor assigned yet in schema
                      
                      let detectedSource: any = t.source;
                      if (detectedSource === "VENDOR") detectedSource = "EXTERNAL";

                      return {
                          label: t.label,
                          type: t.type,
                          amount: t.amount || 0,
                          source: (detectedSource as any) || (t.type === "INCOME" ? "CLIENT" : "EXTERNAL"),
                          source_id: vId || undefined,
                          vendor_id: vId || undefined,
                          sub_items: t.sub_items || []
                      } as FinancialItem;
                  });
                  setBreakdown(template);
              }
          }).catch(err => {
              console.error("Failed to load settlement data", err);
              toast.error("Failed to load vendors or request details");
          }).finally(() => {
              setLoading(false);
          });
      }
  }, [open, requestId]);

  const applyCoupon = async () => {
    if (!couponCode || !request) return;
    setValidatingCoupon(true);
    try {
        let discountValue = 0;
        let isPercentage = false;
        let codeLabel = couponCode;

        // 1. Check Service-Level Config first (Primary)
        const svcConfig = request.service_definition?.coupon_config;
        if (svcConfig?.enabled && svcConfig.code?.toUpperCase() === couponCode.toUpperCase()) {
            // Service-Level Validation
            const now = new Date();
            if (svcConfig.expiry_date && new Date(svcConfig.expiry_date) < now) {
                throw new Error("This promotion has expired.");
            }
            // Note: usage_limit for service config is tricky without backend tracking. 
            // For now, we assume service-level configs are 'static' templates unless we add a usage counter to the definition.
            
            discountValue = svcConfig.percentage || 0;
            isPercentage = true;
            codeLabel = svcConfig.code;
        } else {
            // 2. Fallback to Global Coupon Database
            const coupon = await fetchClient<any>(`/api/v1/system/coupons/validate/${couponCode}`);
            discountValue = coupon.value;
            isPercentage = coupon.is_percentage;
            codeLabel = coupon.code;
        }
        
        // Add to breakdown
        const newBreakdown = [...breakdown];
        const existingIdx = newBreakdown.findIndex(i => i.type === "DISCOUNT" && i.key === "coupon_discount");
        
        // Calculate amount in SAR (Internal truth)
        let discountAmount = discountValue;
        if (isPercentage) {
            const totalIncome = newBreakdown.filter(i => i.type === "INCOME").reduce((sum, i) => sum + (i.amount || 0), 0);
            discountAmount = (totalIncome * discountValue) / 100;
        }

        const couponItem: FinancialItem = {
            label: `Promotion: ${codeLabel}`,
            type: "DISCOUNT",
            amount: Math.round(discountAmount * 100) / 100,
            source: "INTERNAL",
            key: "coupon_discount"
        };

        if (existingIdx >= 0) {
            newBreakdown[existingIdx] = couponItem;
        } else {
            newBreakdown.push(couponItem);
        }
        
        setBreakdown(newBreakdown);
        toast.success(`Promotion '${codeLabel}' applied successfully!`);
    } catch (error: any) {
        toast.error(error.message || "Invalid promotion code");
    } finally {
        setValidatingCoupon(false);
    }
  };

  const handleVariantSelect = (variant: ServiceVariant) => {
      setSelectedVariantId(variant.id);
      
      // Update price in breakdown if exists
      const newBreakdown = [...breakdown];
      const priceItemIdx = newBreakdown.findIndex(i => i.key === "base_price" || i.label.toLowerCase().includes("selling price"));
      
      if (priceItemIdx >= 0) {
          newBreakdown[priceItemIdx].amount = variant.default_price;
      } else {
          newBreakdown.unshift({
              label: "Selling Price",
              key: "base_price",
              type: "INCOME",
              amount: variant.default_price,
              source: "CLIENT"
          });
      }
      setBreakdown(newBreakdown);
  };

  const handleRateChange = (newRate: string | number) => {
      setLocalExchangeRate(newRate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    try {
      await fetchClient(`/api/v1/service-requests/${requestId}`, {
        method: "PUT",
        body: JSON.stringify({ 
            // PURPOSE: If authorized, move to the first technical lifecycle stage.
            // If not, just update the financial data but keep current status.
            status: approve ? "Verifying Information" : undefined,
            financial_breakdown: breakdown,
            currency: localCurrency,
            exchange_rate: typeof localExchangeRate === 'string' ? parseFloat(localExchangeRate) : localExchangeRate,
            coupon_code: couponCode
        }),
      });
      toast.success(approve ? "Pricing Confirmed & Process Started" : "Pricing draft saved successfully");
      onPriceUpdated();
      setOpen(false);
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "Failed to update pricing breakdown";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div onClick={() => setOpen(true)} className="inline-block">
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2 h-9 px-4 font-black uppercase tracking-normal text-[9px] border-primary/20 hover:border-primary/40">
            <Coins className="h-3.5 w-3.5" /> Set Pricing
          </Button>
        )}
      </div>

      <GoniaResponsiveDialog
        isOpen={open}
        onOpenChange={setOpen}
        title="Set Service Pricing"
        description="Configure pricing strategy and operational cost breakdown."
        maxWidth="5xl"
        footer={
          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 sm:flex-none h-11 uppercase font-black text-[10px]">Cancel</Button>
            <Button 
                onClick={handleSubmit} 
                disabled={loading} 
                className="flex-1 sm:flex-none h-11 bg-primary text-white font-black uppercase tracking-normal px-8 shadow-[4px_4px_0_0_var(--gonia-accent)]"
            >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                Save Pricing Details
            </Button>
          </div>
        }
      >
        {!request ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin h-8 w-8 text-primary opacity-20" />
                <p className={cn(gonia.text.caption, "animate-pulse")}>Retrieving Data...</p>
            </div>
        ) : (
            <div className="space-y-8 pb-10 sm:pb-0">
                {/* SERVICE CONTEXT & COUPON */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-primary/5 p-4 md:p-6 border-l-4 border-primary flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-white flex items-center justify-center border-2 border-primary/10">
                                <GoniaIcons.Operations className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-tight text-primary">
                                    {request.service_definition?.name}
                                </h3>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                                    REF: {request.id} // CLIENT: {request.user?.full_name}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="h-7 px-3 rounded-none border-primary/20 text-primary font-bold uppercase text-[9px]">
                                Status: {request.status}
                            </Badge>
                        </div>
                    </div>

                    <div className="bg-orange-50 border border-orange-100 p-4 space-y-2 flex flex-col justify-center">
                        <Label className="text-[10px] font-black uppercase tracking-normal text-orange-800 flex items-center gap-2">
                            <TicketIcon className="h-3 w-3" /> Promotion / Coupon
                        </Label>
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Enter Code"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                className="h-9 rounded-none border-orange-200 focus:border-orange-400 bg-white font-mono text-xs uppercase"
                            />
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-9 px-3 rounded-none border-orange-300 text-orange-700 hover:bg-orange-100 uppercase font-black text-[9px]"
                                onClick={applyCoupon}
                                disabled={validatingCoupon || !couponCode}
                            >
                                {validatingCoupon ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* VARIANT SELECTION (IF ANY) */}
                {availableVariants.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <GoniaIcons.Services className="h-4 w-4 text-primary/40" />
                            <h4 className="text-[10px] font-black uppercase tracking-normal text-primary">Product Selection</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {availableVariants.map((variant) => (
                                <button
                                    key={variant.id}
                                    onClick={() => handleVariantSelect(variant)}
                                    className={cn(
                                        "flex flex-col p-4 border-2 transition-all text-left group relative",
                                        selectedVariantId === variant.id 
                                            ? "bg-primary border-primary text-white shadow-[4px_4px_0_0_var(--gonia-accent)]" 
                                            : "bg-white border-primary/10 hover:border-primary/30"
                                    )}
                                >
                                    <span className={cn("text-[10px] font-black uppercase tracking-tight mb-1", selectedVariantId === variant.id ? "text-white" : "text-primary")}>
                                        {variant.name_en}
                                    </span>
                                    <span className={cn("text-xs font-mono font-black", selectedVariantId === variant.id ? "text-white/80" : "text-muted-foreground")}>
                                        {formatWithLocalRate(variant.default_price)}
                                    </span>
                                    {selectedVariantId === variant.id && (
                                        <div className="absolute top-2 right-2">
                                            <CheckCircle2 className="h-4 w-4 text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* FINANCIAL EDITOR */}
                <div className="space-y-4 border-t-2 border-primary/5 pt-8">
                    <div className="flex items-center gap-2 mb-2">
                        <Calculator className="h-4 w-4 text-primary/40" />
                        <h4 className="text-[10px] font-black uppercase tracking-normal text-primary">Pricing Breakdown</h4>
                    </div>
                    <div className="bg-white/50 border-2 border-primary/5 p-4 md:p-6">
                        <FinancialBreakdownEditor 
                            items={breakdown} 
                            onChange={setBreakdown} 
                            vendors={vendors}
                            mode="actual"
                            currency={localCurrency}
                            onCurrencyChange={setLocalCurrency}
                            exchangeRate={localExchangeRate}
                            onExchangeRateChange={handleRateChange}
                        />
                    </div>
                </div>
            </div>
        )}
      </GoniaResponsiveDialog>
    </>
  );
}
