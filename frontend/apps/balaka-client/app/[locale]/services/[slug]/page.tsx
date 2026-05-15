"use client";

import { ProtectedRoute } from "@/components/layout/protected-route";
import { DynamicForm } from "@/components/services/dynamic-form";
import { fetchClient } from "@/core/api";
import { useAuth } from "@/lib/auth-context";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useNotifications, Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter, Badge, Separator, Button, RadioGroup, RadioGroupItem, Label, Input, GoniaPageShell, WhatsAppButton } from "@/ui";
import { useEffect, useState } from "react";



import { ArrowLeft, Calculator, Info, Package, CheckCircle2, ClipboardList } from "lucide-react";




import { cn } from "@/lib/utils";

interface ServiceVariant {
    id: number;
    name_en: string;
    name_bn?: string;
    price_model: "FIXED" | "PER_UNIT";
    default_price: number;
}

interface ServiceDefinition {
    id: number;
    name: string;
    slug: string;
    description: string;
    base_price: number;
    form_schema: any;
    financial_schema?: any[];
    variants: ServiceVariant[];
    pricing_strategy?: {
        mode: string;
        field: string;
        rate: number;
    };
}

export default function ServiceApplicationPage() {
    const { user } = useAuth();
    const { toast } = useNotifications();
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    
    const [service, setService] = useState<ServiceDefinition | null>(null);
    const [loading, setLoading] = useState(true);
    const [formValues, setFormValues] = useState<any>({});
    const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [estimatedTotal, setEstimatedTotal] = useState(0);

    useEffect(() => {
        async function loadService() {
             try {
                 const response = await fetchClient<any>("/api/v1/services/");
                 // Handle both flat array and enveloped response { items, total }
                 const services = Array.isArray(response) ? response : (response.items || []);
                 const found = services.find((s: any) => s.slug === slug);
                 
                 if (!found) {
                     toast.error("Service not found");
                     router.push("/dashboard");
                     return;
                 }
                 setService(found);
                 
                 // Pre-select first variant if exists
                 if (found.variants && found.variants.length > 0) {
                     setSelectedVariantId(found.variants[0].id);
                 }
             } catch (error) {
                 toast.error("Failed to load service details");
             } finally {
                 setLoading(false);
             }
        }
        loadService();
    }, [slug, router]);

    // Live Price Calculation
    useEffect(() => {
        if (!service) return;
        
        // 1. Determine Base from variants or definition
        let base = service.base_price;
        if (selectedVariantId && service.variants) {
            const variant = service.variants.find(v => v.id === selectedVariantId);
            if (variant) base = variant.default_price;
        }

        // 2. Add dynamic impacts from the financial schema (INCOME items ONLY)
        // This handles cases like "Per KG" where the schema might have a dynamic rate.
        let dynamicAdditions = 0;
        if (service.form_schema && service.financial_schema) {
            // Filter only for INCOME items that might be linked to form fields
            const incomeItems = service.financial_schema.filter((i: any) => i.type === "INCOME" && i.key !== "base_price");
            
            // Logic for calculating additional fees based on form input if needed
            // For now, we sum the static income items defined in the template
            dynamicAdditions = incomeItems.reduce((sum: number, i: any) => sum + (parseFloat(i.amount) || 0), 0);
        }

        const total = (base * quantity) + dynamicAdditions;
        // If base is 0, this is a quoted service - do not show ANY partial charges (like service fees) to the client initially.
        setEstimatedTotal(base === 0 ? 0 : (isNaN(total) ? 0 : total));
    }, [formValues, service, selectedVariantId, quantity]);

    const handleSubmit = async (formData: any) => {
        if (!service) return;

        try {
            await fetchClient("/api/v1/service-requests/", {
                method: "POST",
                body: JSON.stringify({
                    service_def_id: service.id,
                    form_data: formData,
                    variant_id: selectedVariantId,
                    quantity: quantity
                })
            });
            
            toast.success("Application submitted successfully!");
            router.push("/dashboard");
        } catch (error: any) {
            toast.error(error.message || "Failed to submit application");
        }
    };

    if (loading) return <div className="container py-10">Loading service details...</div>;
    if (!service) return null;

    const selectedVariant = service.variants?.find(v => v.id === selectedVariantId);
    
    // Determine if this is a quote request:
    // 1. If variants exist, is the selected variant price 0?
    // 2. If no variants, is the base price 0?
    let baseForQuoteCheck = service.base_price;
    if (selectedVariant) {
        baseForQuoteCheck = selectedVariant.default_price;
    }
    const isQuoteRequest = baseForQuoteCheck === 0;

    const safeEstimatedTotal = isNaN(estimatedTotal) ? 0 : estimatedTotal;

    return (
        <ProtectedRoute>
            <GoniaPageShell
                title={service.name}
                subtitle={service.description}
                icon={<ClipboardList className="h-8 w-8" />}
                actions={
                    <Button variant="ghost" onClick={() => router.back()} className="gap-2 h-12 md:h-10">
                        <ArrowLeft className="h-4 w-4" /> Back to Catalog
                    </Button>
                }
            >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Form & Variants */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="space-y-6">
                            {/* Variant Selection */}
                            {service.variants && service.variants.length > 0 && (
                                <Card className="rounded-none border-2">
                                    <CardHeader className="bg-primary/5 border-b">
                                        <CardTitle className="text-sm font-black uppercase tracking-normal flex items-center gap-2 text-primary">
                                            <Package className="h-4 w-4" /> 1. Select Service Package
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {service.variants.map((variant) => (
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
                                                            <p className="font-black uppercase text-xs tracking-tight text-primary">{variant.name_en}</p>
                                                            {variant.name_bn && <p className="text-[10px] font-bold text-muted-foreground mt-0.5">{variant.name_bn}</p>}
                                                        </div>
                                                        {selectedVariantId === variant.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                                    </div>
                                                    <div className="mt-4 flex items-baseline gap-1">
                                                        <span className="text-xl font-black font-mono text-primary">
                                                            {variant.default_price > 0 ? `SR ${variant.default_price}` : "Quote"}
                                                        </span>
                                                        {variant.price_model === "PER_UNIT" && <span className="text-[10px] font-black uppercase text-muted-foreground opacity-60">/ unit</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Quantity Input if Per Unit */}
                                        {selectedVariant && selectedVariant.price_model === "PER_UNIT" && (
                                            <div className="mt-8 p-6 bg-muted/10 border-2 border-dashed border-primary/10 flex flex-col md:flex-row md:items-center gap-6">
                                                <Label className="text-[10px] font-black uppercase tracking-normal text-primary">Service Volume / Units:</Label>
                                                <div className="flex items-center gap-4">
                                                    <Input 
                                                        type="number" 
                                                        min="1" 
                                                        value={quantity.toString()} 
                                                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                                        className="w-24 text-center font-black h-12 bg-white rounded-none border-2 border-primary/20"
                                                    />
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                                        x ${selectedVariant.default_price} = <strong className="text-primary text-sm">${(selectedVariant.default_price * quantity).toFixed(2)}</strong>
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            <Card className="rounded-none border-2">
                                <CardHeader className="bg-primary/5 border-b">
                                    <CardTitle className="text-sm font-black uppercase tracking-normal flex items-center gap-2 text-primary">
                                        <Info className="h-4 w-4" /> 2. Required Documentation
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8">
                                    {service.form_schema ? (
                                        <DynamicForm 
                                            schema={service.form_schema} 
                                            onSubmit={handleSubmit} 
                                            onValuesChange={setFormValues}
                                            context={{
                                                user_identifier: user?.id.toString() || "unknown",
                                                service_name: service.slug,
                                                service_id: service.id
                                            }}
                                            submitLabel={!isQuoteRequest ? `Submit Application (SR ${safeEstimatedTotal.toFixed(2)})` : "Request Quote"}
                                        />
                                    ) : (
                                        <div className="text-center py-10">
                                            <Button size="xl" onClick={() => handleSubmit({})} className="w-full">
                                                {!isQuoteRequest ? `Submit Application (SR ${safeEstimatedTotal.toFixed(2)})` : "Request Quote"}
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Right Column: Pricing & Info */}
                    <div className="space-y-6">
                        {/* Price Calculator */}
                        <Card className="border-primary/20 bg-primary/5 sticky top-24 rounded-none border-2 shadow-none overflow-hidden">
                            <div className="bg-primary h-1.5 w-full" />
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-primary uppercase font-black text-sm tracking-normal">
                                    <Calculator className="h-4 w-4" /> Financial Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-normal">
                                    <span className="text-muted-foreground">Base Fulfillment</span>
                                    <span className="font-mono text-primary">
                                        {selectedVariant && selectedVariant.default_price > 0 
                                            ? `SR ${selectedVariant.default_price}` 
                                            : "TBD"}
                                    </span>
                                </div>
                                
                                {selectedVariant?.price_model === "PER_UNIT" && (
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-normal">
                                        <span className="text-muted-foreground">Quantity</span>
                                        <span className="font-mono text-primary">x {quantity}</span>
                                    </div>
                                )}

                                <Separator className="bg-primary/10" />
                                <div className="flex justify-between items-center bg-white p-4 border-2 border-primary/5">
                                    <span className="font-black uppercase tracking-normal text-xs">Total Price</span>
                                    <span className="font-black text-2xl text-primary font-mono">
                                        {safeEstimatedTotal > 0 ? `SR ${safeEstimatedTotal.toFixed(2)}` : "Quote"}
                                    </span>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-primary/10 py-4 flex flex-col gap-4">
                                <p className="text-[9px] font-bold text-primary/60 uppercase leading-relaxed text-center w-full">
                                    {isQuoteRequest 
                                        ? "Final valuation determined by admin after technical review." 
                                        : "*Market rates subject to final verification."}
                                </p>
                                <WhatsAppButton 
                                    variant="outline" 
                                    label="Inquire via WhatsApp" 
                                    className="w-full bg-white h-10 text-[9px]"
                                    message={`Hi, I'm interested in the "${service.name}" service. Can you provide more details?`}
                                />
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </GoniaPageShell>
        </ProtectedRoute>
    );
}