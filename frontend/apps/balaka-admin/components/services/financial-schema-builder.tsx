"use client";

import { useEffect } from "react";
import { FinancialBreakdownEditor, FinancialItem } from "../finance/financial-breakdown-editor";

interface FinancialSchemaBuilderProps {
    value: FinancialItem[];
    vendors?: any[];
    onChange: (value: FinancialItem[]) => void;
}

export function FinancialSchemaBuilder({ value, vendors, onChange }: FinancialSchemaBuilderProps) {
    
    // Initialize with Base Price if empty
    useEffect(() => {
        if (!value || value.length === 0) {
            onChange([
                { key: "base_price", label: "Base Price", type: "INCOME", source: "CLIENT", amount: 0 }
            ]);
        }
    }, [value, onChange]);

    return (
        <div className="space-y-6">
            <div className="bg-primary/5 p-4 border-l-4 border-primary">
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-normal leading-relaxed">
                    Financial Policy Architect // Define standard cost centers and revenue streams for this service.
                </p>
            </div>

            <FinancialBreakdownEditor 
                items={value || []} 
                onChange={onChange} 
                vendors={vendors}
                mode="template"
                showTotal={true}
            />
        </div>
    );
}
