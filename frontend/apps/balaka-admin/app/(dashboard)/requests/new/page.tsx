"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  gonia, 
  useNotifications, 
  GoniaPageShell,
  Badge,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui";
import { fetchClient } from "@/core/api";
import { DynamicForm } from "@/components/shared/dynamic-form";
import { FinancialBreakdownEditor, FinancialItem } from "@/components/finance/financial-breakdown-editor";
import { 
  ServiceDefinition, 
  Vendor 
} from "@/core/types";
import { 
  Plus, 
  ClipboardList, 
  Calculator, 
  Wallet,
  Globe,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/core/currency-context";
import { useAuth } from "@/lib/auth-context";

export default function NewRequestPage() {
    const router = useRouter();
    const { toast } = useNotifications();
    const { rate: systemRate, formatCurrency } = useCurrency();
    const { user } = useAuth();
    
    // Data State
    const [services, setServices] = useState<ServiceDefinition[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [selectedService, setSelectedService] = useState<ServiceDefinition | null>(null);
    const [loading, setLoading] = useState(false);

    // Form & Financial State
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
    const [breakdown, setBreakdown] = useState<FinancialItem[]>([]);
    const [currency, setCurrency] = useState("SAR");
    const [exchangeRate, setExchangeRate] = useState<number | string>(systemRate);
    const [quantity, setQuantity] = useState(1);
    const [targetStatus, setStatus] = useState("Completed");
    const [paymentMethod, setPaymentMethod] = useState("Cash");
    const [paymentReference, setPaymentReference] = useState("");
    const [paymentAmount, setPaymentAmount] = useState<number | string>(0);
    const prevQuantityRef = useRef(1);

    // Filtered services based on RBAC scope
    const filteredServices = useMemo(() => {
        if (!user) return [];
        
        const isAdmin = user.is_superuser || user.roles.some(role => role.name === "Admin");
        if (isAdmin) return services;
        
        if (user.allowed_services && user.allowed_services.length > 0) {
            const allowedIds = user.allowed_services.map(s => s.id);
            return services.filter(s => allowedIds.includes(s.id));
        }
        
        // If not admin but has no allowed_services explicitly set, 
        // we default to showing all available services for staff (non-client)
        const isClient = user.roles.every(r => r.name === "Client");
        if (!isClient) return services;

        return services.filter(s => s.is_public);
    }, [services, user]);

    // Fetch initial data
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [sData, vData] = await Promise.all([
                    fetchClient<{ items: ServiceDefinition[] }>("/api/v1/services/?limit=100&include_private=true"),
                    fetchClient<{ items: Vendor[] }>("/api/v1/vendors/?limit=100")
                ]);
                setServices(sData.items || []);
                setVendors(vData.items || []);
            } catch (error) {
                console.error("Failed to load setup data", error);
                toast.error("Failed to load services or vendors");
            }
        };
        loadInitialData();
    }, [toast]);

    // Set Default Service (Air Ticket) or First Available
    useEffect(() => {
        if (filteredServices.length > 0 && !selectedService) {
            const defaultSvc = filteredServices.find(s => s.slug === "air-ticket") || filteredServices[0];
            handleServiceSelect(defaultSvc);
        }
    }, [filteredServices, selectedService]);

    // Sync exchange rate
    useEffect(() => {
        if (systemRate) setExchangeRate(systemRate);
    }, [systemRate]);

    // Handle Service Selection & Reset
    const handleServiceSelect = (svc: ServiceDefinition) => {
        setSelectedService(svc);
        setSelectedVariantId(svc.variants && svc.variants.length > 0 ? svc.variants[0].id : null);
        setFormData({});
        setQuantity(1);
        setPaymentAmount(0);
        setStatus("Completed");
        
        // Initialize breakdown from template
        if (svc.financial_schema) {
            const template = svc.financial_schema.map((t) => ({
                label: t.label,
                type: t.type,
                amount: t.amount || 0,
                source: t.source || (t.type === "INCOME" ? "CLIENT" : "EXTERNAL"),
                key: t.key,
                sub_items: t.sub_items || []
            }));
            setBreakdown(template as FinancialItem[]);
        } else {
            setBreakdown([]);
        }
    };

    const handleVariantSelect = (vId: number) => {
        setSelectedVariantId(vId);
        const variant = selectedService?.variants?.find(v => v.id === vId);
        if (variant) {
            // Update base price in breakdown
            const newBreakdown = [...breakdown];
            const priceIdx = newBreakdown.findIndex(i => i.key === "base_price" || i.label.toLowerCase().includes("selling price"));
            if (priceIdx >= 0) {
                newBreakdown[priceIdx].amount = variant.default_price;
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
        }
    };

    // Auto-Calculate Breakdown on Quantity Change
    useEffect(() => {
        if (!selectedService || breakdown.length === 0) return;
        
        const prevQuantity = prevQuantityRef.current;
        if (prevQuantity === quantity) return;

        const variant = selectedService.variants?.find(v => v.id === selectedVariantId);
        const basePrice = variant ? variant.default_price : (selectedService.base_price || 0);
        const baseCost = variant ? (variant.default_cost || 0) : 0;

        const newBreakdown = breakdown.map(item => {
            const isIncome = item.type === "INCOME" && (item.key === "base_price" || item.label.toLowerCase().includes("price") || item.label.toLowerCase().includes("charge"));
            const isExpense = item.type === "EXPENSE" && (item.key === "base_cost" || item.label.toLowerCase().includes("cost"));

            if (isIncome) {
                const prevCalculated = basePrice * prevQuantity;
                if (item.amount === prevCalculated || item.amount === 0) {
                    return { ...item, amount: basePrice * quantity };
                }
            }
            if (isExpense) {
                const prevCalculated = baseCost * prevQuantity;
                if (item.amount === prevCalculated || item.amount === 0) {
                    return { ...item, amount: baseCost * quantity };
                }
            }
            return item;
        });

        const hasChanged = newBreakdown.some((item, idx) => item.amount !== breakdown[idx].amount);
        if (hasChanged) {
            setBreakdown(newBreakdown);
            
            const oldTotal = breakdown.filter(i => i.type === "INCOME").reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
            const newTotal = newBreakdown.filter(i => i.type === "INCOME").reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
            
            if (Number(paymentAmount) === oldTotal || Number(paymentAmount) === 0) {
                setPaymentAmount(newTotal);
            }
        }
        
        prevQuantityRef.current = quantity;
    }, [quantity, selectedVariantId, selectedService, breakdown, paymentAmount]);

    const handleFinalSubmit = async () => {
        if (!selectedService) return;
        
        const income = breakdown.filter(i => i.type === "INCOME").reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        const expense = breakdown.filter(i => i.type === "EXPENSE").reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        const discount = breakdown.filter(i => i.type === "DISCOUNT").reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        const targetSellingPrice = Math.max(0, income - discount);
        const currentPayment = Number(paymentAmount) || 0;

        if (targetStatus === "Completed") {
            const isInternal = !selectedService.is_public;
            
            if (targetSellingPrice <= 0 && !isInternal) {
                toast.error("Cannot mark as Completed: Selling price must be greater than 0.");
                return;
            }
            if (currentPayment < targetSellingPrice && !isInternal) {
                toast.error(`Cannot mark as Completed: Balance Due detected. Fully settle payment to complete.`);
                return;
            }
        }

        setLoading(true);
        try {
            const payload = {
                service_def_id: selectedService.id,
                form_data: formData,
                variant_id: selectedVariantId,
                quantity: quantity,
                status: targetStatus,
                selling_price: targetSellingPrice,
                cost_price: expense,
                financial_breakdown: breakdown,
                currency: currency,
                exchange_rate: typeof exchangeRate === 'string' ? parseFloat(exchangeRate) : exchangeRate,
                payment_amount: currentPayment,
                payment_method: paymentMethod,
                payment_reference: paymentReference
            };

            const response = await fetchClient<any>("/api/v1/service-requests/", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            toast.success(`Request REQ-${response.id} created successfully!`);
            const isInternal = !selectedService.is_public;
            router.push(`${isInternal ? '/operations' : '/requests'}/${response.id}`);
        } catch (error: any) {
            toast.error(error.message || "Failed to create request");
        } finally {
            setLoading(false);
        }
    };

    return (
        <GoniaPageShell
            title="Create New Request"
            subtitle="Register a new service request and process payment."
            icon={<Plus className="h-8 w-8" />}
        >
            <div className="space-y-8 pb-20 px-1 max-w-5xl mx-auto">
                
                {/* 1. SERVICE SELECTION DROPDOWN */}
                <div className="bg-white p-6 border-2 border-primary/10 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-end gap-4">
                        <div className="flex-1 space-y-2">
                            <Label className="text-xs font-black uppercase text-muted-foreground">Select Service Type</Label>
                            <Select 
                                value={selectedService?.id.toString()} 
                                onValueChange={(val) => {
                                    const svc = filteredServices.find(s => s.id.toString() === val);
                                    if (svc) handleServiceSelect(svc);
                                }}
                            >
                                <SelectTrigger className="h-12 border-2 border-primary/20 font-bold text-lg">
                                    <SelectValue placeholder="Choose a service..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <div className="p-2 text-[10px] font-black uppercase text-muted-foreground/50">Public Services</div>
                                    {filteredServices.filter(s => s.is_public).map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()} className="font-bold">
                                            <div className="flex items-center gap-2">
                                                <Globe className="h-3.5 w-3.5 text-blue-500" /> {s.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                    <div className="p-2 pt-4 text-[10px] font-black uppercase text-muted-foreground/50">Internal Operations</div>
                                    {filteredServices.filter(s => !s.is_public).map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()} className="font-bold">
                                            <div className="flex items-center gap-2">
                                                <Lock className="h-3.5 w-3.5 text-slate-500" /> {s.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {selectedService && (
                            <Badge variant={selectedService.is_public ? "default" : "destructive"} className="h-12 px-4 rounded-none text-xs uppercase font-black flex items-center gap-2">
                                {selectedService.is_public ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                {selectedService.category || "General"}
                            </Badge>
                        )}
                    </div>
                </div>

                {selectedService && (
                    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        
                        {/* 2. DYNAMIC FORM AREA */}
                        <Card className="rounded-none border-2">
                            <CardHeader className="bg-primary/5 border-b py-4">
                                <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4" /> Application Data
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8">
                                <DynamicForm 
                                    key={selectedService.id} // Force re-render on change
                                    schema={selectedService.form_schema || { sections: [] }} 
                                    onSubmit={async (data) => {
                                        setFormData(data);
                                    }}
                                    onValuesChange={setFormData}
                                    defaultValues={formData}
                                    submitLabel="Verify Data"
                                    hideSubmit={true} // Use main button
                                    context={{
                                        user_identifier: "internal",
                                        service_name: selectedService.slug,
                                        service_id: selectedService.id
                                    }}
                                />
                            </CardContent>
                        </Card>

                        {/* 3. FINANCIAL CONFIGURATION */}
                        <Card className="rounded-none border-2 border-primary/10" id="financial-section">
                            <CardHeader className="bg-primary/5 border-b py-4">
                                <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                                    <Calculator className="h-4 w-4" /> Financial Terms & Payment
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 space-y-10">
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left: Commercial Config */}
                                    <div className="space-y-6">
                                        <div className="p-6 bg-primary/5 border-2 border-primary/10 space-y-6">
                                            {selectedService.variants && selectedService.variants.length > 0 && (
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Select Variant</Label>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {selectedService.variants?.map((v) => (
                                                            <button
                                                                key={v.id}
                                                                onClick={() => handleVariantSelect(v.id)}
                                                                className={cn(
                                                                    "w-full flex items-center justify-between p-3 border-2 text-left transition-all",
                                                                    selectedVariantId === v.id ? "border-primary bg-primary/5" : "border-border/40 bg-white hover:border-primary/20"
                                                                )}
                                                            >
                                                                <span className="text-[10px] font-black uppercase text-primary">{v.name_en}</span>
                                                                <span className="text-[10px] font-mono font-bold text-muted-foreground">{formatCurrency(v.default_price)}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase text-primary/60">Fulfillment Status</Label>
                                                    <Select value={targetStatus} onValueChange={setStatus}>
                                                        <SelectTrigger className="h-10 border-2 rounded-none font-bold bg-white">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-none border-2">
                                                            <SelectItem value="Completed" className="font-bold uppercase text-xs">Direct Completed</SelectItem>
                                                            <SelectItem value="Pending" className="font-bold uppercase text-xs">Pending</SelectItem>
                                                            <SelectItem value="Approved" className="font-bold uppercase text-xs">Approved</SelectItem>
                                                            <SelectItem value="Processing" className="font-bold uppercase text-xs">Processing</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase text-primary/60">Quantity</Label>
                                                    <Input 
                                                        type="number" 
                                                        min="1" 
                                                        value={quantity} 
                                                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                                        className="h-10 border-2 rounded-none font-black text-lg bg-white"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Payment Entry */}
                                    <div className="space-y-6">
                                        <div className="p-6 border-2 border-emerald-500/20 bg-emerald-500/5 space-y-6">
                                            <div className="flex items-center gap-2 text-emerald-600">
                                                <Wallet className="h-4 w-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Initial Settlement</span>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase text-muted-foreground/60">Amount ({currency})</Label>
                                                    <Input 
                                                        type="number" 
                                                        value={paymentAmount} 
                                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                                        className="h-12 border-2 border-emerald-500/30 rounded-none font-black text-xl"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase text-muted-foreground/60">Method</Label>
                                                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                                            <SelectTrigger className="h-10 border-2 rounded-none font-bold bg-white"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Cash">Cash</SelectItem>
                                                                <SelectItem value="Bank Transfer">Bank</SelectItem>
                                                                <SelectItem value="Card">Card</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase text-muted-foreground/60">Ref #</Label>
                                                        <Input 
                                                            value={paymentReference} 
                                                            onChange={(e) => setPaymentReference(e.target.value)}
                                                            className="h-10 border-2 rounded-none font-bold bg-white"
                                                            placeholder="Optional"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Full width Breakdown Editor */}
                                <div className="pt-6 border-t border-primary/10">
                                    <FinancialBreakdownEditor 
                                        items={breakdown}
                                        onChange={setBreakdown}
                                        vendors={selectedService.vendors || []}
                                        mode="actual"
                                        currency={currency}
                                        onCurrencyChange={setCurrency}
                                        exchangeRate={exchangeRate}
                                        onExchangeRateChange={setExchangeRate}
                                    />
                                </div>

                                <div className="pt-10 flex justify-end">
                                    <Button onClick={handleFinalSubmit} disabled={loading} className="w-full md:w-auto h-16 px-20 bg-primary text-white font-black uppercase tracking-widest shadow-[6px_6px_0_0_var(--gonia-accent)] hover:shadow-none transition-all">
                                        {loading ? "Processing Transaction..." : "Save and Register Request"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </GoniaPageShell>
    );
}
