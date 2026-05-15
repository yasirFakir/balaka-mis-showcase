"use client";

import { useState, useEffect } from "react";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui";




import { Trash2, Plus, Package, Languages, Calculator, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/core/currency-context";
import { GoniaCurrencyInput } from "@/ui";

export interface ServiceVariant {
  id?: number;
  name_en: string;
  name_bn?: string;
  price_model: "FIXED" | "PER_UNIT";
  default_price: number;
  default_cost: number; 
  default_vendor_id?: number | null;
}

interface ServiceVariantEditorProps {
  variants: ServiceVariant[];
  onChange: (variants: ServiceVariant[]) => void;
}

export function ServiceVariantEditor({ variants, onChange }: ServiceVariantEditorProps) {
  const { currency } = useCurrency();
  
  const addVariant = () => {
    onChange([
      ...variants,
      { name_en: "", price_model: "FIXED", default_price: 0, default_cost: 0, default_vendor_id: null }
    ]);
  };

  const removeVariant = (index: number) => {
    const newVariants = [...variants];
    newVariants.splice(index, 1);
    onChange(newVariants);
  };

  const updateVariant = (index: number, field: keyof ServiceVariant, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    onChange(newVariants);
  };

  const INPUT_HEIGHT = "h-11";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-primary/5 p-4 border-l-4 border-primary">
          <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-normal text-primary flex items-center gap-2">
                  <Package className="h-4 w-4" /> Service Products
              </h3>
              <p className="text-[10px] text-muted-foreground uppercase font-medium">
                  Define specific packages or variations available for this service.
              </p>
          </div>
          <Button onClick={addVariant} size="sm" className="h-10 rounded-none font-bold uppercase tracking-normal text-[10px] gap-2 shadow-[4px_4px_0_0_var(--gonia-accent)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
              <Plus className="h-4 w-4" /> Add Product Variant
          </Button>
      </div>

      <div className="space-y-4">
        {variants.length === 0 && (
            <div className="text-center py-12 bg-muted/10 border-2 border-dashed border-primary/10 text-muted-foreground text-[10px] font-black uppercase tracking-normal flex flex-col items-center gap-3">
                <Coins className="h-8 w-8 opacity-20" />
                No variants defined. This service will use the base price.
            </div>
        )}
        
        {variants.map((variant, index) => (
          <Card key={index} className="rounded-none border-2 shadow-none group overflow-hidden">
            <CardContent className="p-0">
                <div className="flex flex-col xl:flex-row items-stretch">
                    {/* LEFT: Identification (Names) */}
                    <div className="flex-1 p-4 md:p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-normal text-muted-foreground flex items-center gap-1.5">
                                    <Languages className="h-3 w-3" /> Display Name (EN)
                                </Label>
                                <Input
                                    value={variant.name_en}
                                    onChange={(e) => updateVariant(index, "name_en", e.target.value)}
                                    placeholder="e.g. Standard 23KG Box"
                                    className={cn(INPUT_HEIGHT, "rounded-none bg-muted/10 font-bold focus:bg-background border-border/40")}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-normal text-muted-foreground flex items-center gap-1.5">
                                    <Languages className="h-3 w-3" /> Display Name (BN)
                                </Label>
                                <Input
                                    value={variant.name_bn || ""}
                                    onChange={(e) => updateVariant(index, "name_bn", e.target.value)}
                                    placeholder="বাংলা নাম"
                                    className={cn(INPUT_HEIGHT, "rounded-none bg-muted/10 font-bold focus:bg-background border-border/40 font-bengali")}
                                />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Price Configuration */}
                    <div className="bg-muted/5 border-t xl:border-t-0 xl:border-l-2 p-4 md:p-5 flex flex-wrap sm:flex-nowrap items-stretch gap-4">
                        <div className="flex flex-col gap-2 w-full sm:w-[160px] shrink-0">
                            <div className="space-y-1">
                                <Label className="text-[8px] font-black uppercase tracking-normal text-muted-foreground/60 leading-none">Price Model</Label>
                                <Select value={variant.price_model} onValueChange={(val) => updateVariant(index, "price_model", val)}>
                                    <SelectTrigger className="h-8 rounded-none border-2 border-border/20 bg-background text-[10px] font-bold uppercase">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none border-2">
                                        <SelectItem value="FIXED" className="text-[10px] font-bold uppercase">Fixed Price</SelectItem>
                                        <SelectItem value="PER_UNIT" className="text-[10px] font-bold uppercase">Per Unit</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1 opacity-50 cursor-not-allowed">
                                <Label className="text-[8px] font-black uppercase tracking-normal text-muted-foreground/60 leading-none">Internal Cost</Label>
                                <div className="h-8 flex items-center px-3 bg-muted border-2 border-dashed border-border/20 text-[10px] font-mono italic">
                                    See Finance Tab
                                </div>
                            </div>
                        </div>

                        {/* Hero Price Field */}
                        <div className="flex-1 flex flex-col min-w-[120px]">
                            <Label className="text-[8px] font-black uppercase tracking-normal text-muted-foreground/60 mb-1 leading-none flex items-center gap-1">
                                <Calculator className="h-3 w-3" /> Selling Price
                            </Label>
                            <div className="relative flex-1 flex items-stretch">
                                <GoniaCurrencyInput 
                                    value={variant.default_price}
                                    onChange={(val) => updateVariant(index, "default_price", val)}
                                    className="w-full h-full min-h-[60px] md:min-h-[70px] rounded-none bg-background font-mono text-xl md:text-2xl font-black border-2 border-border/20 pl-12 text-primary focus:border-primary transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        {/* Action */}
                        <div className="flex flex-col">
                            <div className="text-[8px] mb-1 leading-none invisible select-none hidden sm:block">Action</div>
                            <Button 
                                variant="outline" 
                                size="icon" 
                                className="flex-1 w-full sm:w-12 border-destructive/20 text-destructive hover:bg-destructive hover:border-destructive hover:text-white transition-all shrink-0 rounded-none h-10 sm:h-auto"
                                onClick={() => removeVariant(index)}
                            >
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={addVariant} size="sm" variant="outline" className="w-full h-12 border-2 border-dashed border-primary/20 hover:border-primary hover:bg-primary hover:text-white transition-all font-black uppercase tracking-normal text-[10px]">
          <Plus className="h-4 w-4 mr-2" /> Append New Product Variant
      </Button>
    </div>
  );
}
