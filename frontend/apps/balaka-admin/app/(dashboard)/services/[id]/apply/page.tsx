"use client";

import { ProtectedRoute } from "@/components/shared/protected-route";
import { DynamicForm } from "@/components/shared/dynamic-form";
import { fetchClient } from "@/core/api";
import { useAuth } from "@/lib/auth-context";
import { useParams, useRouter } from "next/navigation";
import { 
    useNotifications, 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription, 
    CardFooter, 
    Badge, 
    Separator, 
    Button, 
    Label, 
    Input, 
    LoadingSpinner,
    gonia
} from "@/ui";
import { useEffect, useState } from "react";
import { ArrowLeft, Calculator, Info, Package, CheckCircle2, ClipboardList, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { User, ServiceDefinition, ServiceVariant } from "@/core/types";
import { UserSelect } from "@/components/shared/user-select";
import { useCurrency } from "@/core/currency-context";
import { CurrencySwitcher } from "@/components/shared/currency-switcher";

export default function AdminServiceApplyPage() {
    const { user: currentUser } = useAuth();
    const { toast } = useNotifications();
    const { currency, formatCurrency, convertToBDT } = useCurrency();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    
    const [service, setService] = useState<ServiceDefinition | null>(null);
    const [loading, setLoading] = useState(true);
    const [formValues, setFormValues] = useState<any>({});
    const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [estimatedTotal, setEstimatedTotal] = useState(0);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        async function loadService() {
             try {
                 const found = await fetchClient<ServiceDefinition>(`/api/v1/services/${id}`);
                 setService(found);
                 
                 // Pre-select first variant if exists
                 if (found.variants && found.variants.length > 0) {
                     setSelectedVariantId(found.variants[0].id);
                 }
             } catch (error) {
                 toast.error("Failed to load service details");
                 router.push("/services");
             } finally {
                 setLoading(false);
             }
        }
        loadService();
    }, [id, router]);

    // Live Price Calculation
    useEffect(() => {
        if (!service) return;
        
        let base = service.base_price;
        if (selectedVariantId && service.variants) {
            const variant = service.variants.find(v => v.id === selectedVariantId);
            if (variant) base = variant.default_price;
        }

        let dynamicAdditions = 0;
        if (service.form_schema && service.financial_schema) {
            const incomeItems = service.financial_schema.filter((i: any) => i.type === "INCOME" && i.key !== "base_price");
            dynamicAdditions = incomeItems.reduce((sum: number, i: any) => sum + (parseFloat(i.amount as any) || 0), 0);
        }

        const total = (base * quantity) + dynamicAdditions;
        setEstimatedTotal(base === 0 ? 0 : (isNaN(total) ? 0 : total));
    }, [formValues, service, selectedVariantId, quantity]);

    const handleSubmit = async (formData: any) => {
        if (!service) return;
        if (!selectedUser) {
            toast.error("Please select a client first");
            return;
        }

        setSubmitting(true);
        try {
            await fetchClient("/api/v1/service-requests/", {
                method: "POST",
                body: JSON.stringify({
                    service_def_id: service.id,
                    user_id: selectedUser.id,
                    form_data: formData,
                    variant_id: selectedVariantId,
                    quantity: quantity
                })
            });
            
            toast.success("Application created successfully!");
            router.push("/requests");
        } catch (error: any) {
            toast.error(error.message || "Failed to create application");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingSpinner size="lg" full />;
    if (!service) return null;

    const selectedVariant = service.variants?.find(v => v.id === selectedVariantId);
    const isQuoteRequest = (selectedVariant?.default_price ?? service.base_price) === 0;
    const safeEstimatedTotal = isNaN(estimatedTotal) ? 0 : estimatedTotal;

    return (
        <ProtectedRoute>
            <div className="space-y-8">
                {/* Header */}
                <div className={gonia.layout.pageHeader}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="icon" onClick={() => router.push("/services")} className="h-10 w-10 rounded-none border-primary/20 text-primary">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <h1 className={cn(gonia.text.h1, "flex items-center gap-3 uppercase")}>
                                    <ClipboardList className="h-8 w-8" /> Apply: {service.name}
                                </h1>
                                <p className={gonia.text.caption}>
                                    Create a new service request for a client manually.
                                </p>
                            </div>
                        </div>
                        <CurrencySwitcher />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Client, Variants & Form */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* 1. Client Selection */}
                        <Card className="rounded-none border-2 border-primary">
                            <CardHeader className="bg-primary/5 border-b">
                                <CardTitle className="text-sm font-black uppercase tracking-normal flex items-center gap-2 text-primary">
                                    <UserIcon className="h-4 w-4" /> 1. Select Target Client
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <UserSelect 
                                    selectedUserId={selectedUser?.id}
                                    onSelect={setSelectedUser}
                                    placeholder="Search and select a client for this request..."
                                />
                                {selectedUser && (
                                    <div className="mt-4 p-4 bg-primary/5 border-l-4 border-primary flex justify-between items-center">
                                        <div className="space-y-1">
                                            <p className="text-xs font-black uppercase text-primary">{selectedUser.full_name}</p>
                                            <p className="text-[10px] font-mono text-muted-foreground uppercase">{selectedUser.email}</p>
                                        </div>
                                        <Badge variant="outline" className="rounded-none font-black text-[9px] uppercase border-primary/20 text-primary">
                                            Selected
                                        </Badge>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 2. Variant Selection */}
                        {service.variants && service.variants.length > 0 && (
                            <Card className="rounded-none border-2">
                                <CardHeader className="bg-primary/5 border-b">
                                    <CardTitle className="text-sm font-black uppercase tracking-normal flex items-center gap-2 text-primary">
                                        <Package className="h-4 w-4" /> 2. Select Service Package
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {service.variants?.map((variant) => (
                                            <div 
                                                key={variant.id}
                                                className={cn(
                                                    "cursor-pointer border-2 p-4 transition-all hover:border-primary",
                                                    selectedVariantId === variant.id ? "border-primary bg-primary/5 shadow-[4px_4px_0_0_var(--gonia-accent)]" : "border-border/40 bg-white"
                                                )}
                                                onClick={() => setSelectedVariantId(variant.id)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-black uppercase text-xs tracking-tight text-primary">{variant.name_en || variant.name}</p>
                                                        {variant.name_bn && <p className="text-[10px] font-bold text-muted-foreground mt-0.5">{variant.name_bn}</p>}
                                                    </div>
                                                    {selectedVariantId === variant.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                                </div>
                                                <div className="mt-4 flex flex-col">
                                                    <span className="text-xl font-black font-mono text-primary leading-tight">
                                                        {variant.default_price > 0 ? formatCurrency(variant.default_price) : "Quote"}
                                                    </span>
                                                    {variant.default_price > 0 && (
                                                        <span className="text-[10px] font-bold text-muted-foreground/60 font-mono">
                                                            {currency === "SAR" 
                                                                ? `≈ ৳${convertToBDT(variant.default_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                                                : `≈ SR ${variant.default_price.toFixed(2)}`}
                                                        </span>
                                                    )}
                                                    {variant.price_model === "PER_UNIT" && <span className="text-[8px] font-black uppercase text-muted-foreground opacity-60 mt-1">/ unit</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {selectedVariant && selectedVariant.price_model === "PER_UNIT" && (
                                        <div className="mt-8 p-6 bg-muted/10 border-2 border-dashed border-primary/10 flex flex-col md:flex-row md:items-center gap-6">
                                            <Label className="text-[10px] font-black uppercase tracking-normal text-primary">Quantity / Units:</Label>
                                            <div className="flex items-center gap-4">
                                                <Input 
                                                    type="number" 
                                                    min="1" 
                                                    value={quantity.toString()} 
                                                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                                    className="w-24 text-center font-black h-12 bg-white rounded-none border-2 border-primary/20"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                                        x {formatCurrency(selectedVariant.default_price)} = <strong className="text-primary text-sm font-mono">{formatCurrency(selectedVariant.default_price * quantity)}</strong>
                                                    </span>
                                                    <span className="text-[9px] font-bold text-muted-foreground/50 font-mono">
                                                        {currency === "SAR" 
                                                            ? `≈ ৳${convertToBDT(selectedVariant.default_price * quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                                            : `≈ SR ${(selectedVariant.default_price * quantity).toFixed(2)}`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* 3. Form */}
                        <Card className="rounded-none border-2">
                            <CardHeader className="bg-primary/5 border-b">
                                <CardTitle className="text-sm font-black uppercase tracking-normal flex items-center gap-2 text-primary">
                                    <Info className="h-4 w-4" /> 3. Required Documentation
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8">
                                {service.form_schema ? (
                                    <DynamicForm 
                                        schema={service.form_schema || { sections: [] }} 
                                        onSubmit={handleSubmit} 
                                        onValuesChange={setFormValues}
                                        context={{
                                            user_identifier: selectedUser?.id.toString() || "pending",
                                            service_name: service.slug,
                                            service_id: service.id
                                        }}
                                        submitLabel={submitting ? "Processing..." : (!isQuoteRequest ? `Create Request (${formatCurrency(safeEstimatedTotal)})` : "Request Quote")}
                                    />
                                ) : (
                                    <div className="text-center py-10">
                                        <Button size="xl" onClick={() => handleSubmit({})} disabled={submitting} className="w-full">
                                            {submitting ? "Processing..." : (!isQuoteRequest ? `Create Request (${formatCurrency(safeEstimatedTotal)})` : "Request Quote")}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Pricing & Cart View */}
                    <div className="space-y-6">
                        <Card className="border-primary/20 bg-primary/5 sticky top-24 rounded-none border-2 shadow-none overflow-hidden">
                            <div className="bg-primary h-1.5 w-full" />
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-primary uppercase font-black text-sm tracking-normal">
                                    <Calculator className="h-4 w-4" /> Financial Summary
                                </CardTitle>
                                <CardDescription className="text-[10px] font-bold uppercase">Estimated Pricing Breakdown ({currency})</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-normal">
                                    <span className="text-muted-foreground">Base Fulfillment</span>
                                    <span className="font-mono text-primary">
                                        {selectedVariant && selectedVariant.default_price > 0 
                                            ? formatCurrency(selectedVariant.default_price)
                                            : (service.base_price > 0 ? formatCurrency(service.base_price) : "TBD")}
                                    </span>
                                </div>
                                
                                {selectedVariant?.price_model === "PER_UNIT" && (
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-normal">
                                        <span className="text-muted-foreground">Quantity</span>
                                        <span className="font-mono text-primary">x {quantity}</span>
                                    </div>
                                )}

                                {service.financial_schema?.filter(i => i.type === "INCOME" && i.key !== "base_price").map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-[10px] font-black uppercase tracking-normal">
                                        <span className="text-muted-foreground">{item.label}</span>
                                        <span className="font-mono text-primary">{formatCurrency(parseFloat(item.amount as any))}</span>
                                    </div>
                                ))}

                                <Separator className="bg-primary/10" />
                                <div className="flex flex-col bg-white p-4 border-2 border-primary/5">
                                    <div className="flex justify-between items-center w-full mb-1">
                                        <span className="font-black uppercase tracking-normal text-xs">Total Price</span>
                                        <span className="font-black text-2xl text-primary font-mono leading-tight">
                                            {safeEstimatedTotal > 0 ? formatCurrency(safeEstimatedTotal) : "Quote"}
                                        </span>
                                    </div>
                                    <div className="flex justify-end w-full border-t border-primary/5 pt-2">
                                        <span className="font-bold text-[10px] text-muted-foreground/60 font-mono">
                                            {safeEstimatedTotal > 0 && (
                                                currency === "SAR" 
                                                    ? `≈ ৳${convertToBDT(safeEstimatedTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                                    : `≈ SR ${safeEstimatedTotal.toFixed(2)}`
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-primary/10 py-4">
                                <p className="text-[9px] font-bold text-primary/60 uppercase leading-relaxed text-center w-full">
                                    {isQuoteRequest 
                                        ? "Final valuation determined by admin after technical review." 
                                        : "Standard market rates applied. Adjustments can be made during processing."}
                                </p>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
