"use client";

import React from "react";
import { ClipboardList, FileCode } from "lucide-react";
import { cn } from "../lib/utils";
import { gonia } from "../lib/gonia-theme";
import { Badge } from "../base/badge";
import { GoniaCard } from "../layout/gonia-primitives";
import { Button } from "../base/button";
import { format, parseISO, isValid } from "date-fns";

interface GoniaRequestDetailsProps {
  formData: Record<string, any>;
  onViewFile?: (url: string) => void;
  className?: string;
  title?: string;
  badgeText?: string;
}

/**
 * A standardized component to display dynamic form data (Summary).
 * Handles file detection, list rendering, and date formatting.
 */
export function GoniaRequestDetails({
  formData,
  onViewFile,
  className,
  title = "Application Information",
  badgeText,
}: GoniaRequestDetailsProps) {
  const formatValue = (value: any) => {
    if (value === null || value === undefined || value === "") return "—";

    // 1. Handle Files
    const isFile = typeof value === "string" && (value.startsWith("/static/") || value.startsWith("/api/v1/files/secure/"));
    if (isFile) {
        return (
            <Button
                variant="outline"
                size="sm"
                onClick={() => onViewFile?.(value as string)}
                className={cn(gonia.button.base, gonia.button.outline, "h-7 text-[9px] px-3 shadow-none gap-2 border-primary/30")}
            >
                <FileCode className="h-3.5 w-3.5" /> 
                <span>View Attachment</span>
            </Button>
        );
    }

    // 2. Handle Lists/Arrays
    if (Array.isArray(value)) {
        return (
            <div className="flex flex-wrap gap-1.5">
                {value.map((item, i) => (
                    <Badge key={i} className="bg-primary/5 text-primary border-primary/10 text-[9px] font-bold rounded-none uppercase">
                        {String(item)}
                    </Badge>
                ))}
                {value.length === 0 && <span className="text-[11px] text-muted-foreground italic">EMPTY</span>}
            </div>
        );
    }

    // 3. Handle Dates (ISO detection)
    if (typeof value === "string" && value.length > 10 && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        const date = parseISO(value);
        if (isValid(date)) {
            return (
                <span className="text-[13px] font-bold text-primary uppercase tracking-tight">
                    {format(date, "PPP")}
                </span>
            );
        }
    }

    // 4. Handle Booleans
    if (typeof value === "boolean") {
        return (
            <Badge className={cn("rounded-none text-[9px] font-black uppercase", value ? "bg-emerald-500" : "bg-primary/10 text-primary")}>
                {value ? "YES" : "NO"}
            </Badge>
        );
    }

    // Default: String/Number
    return (
        <span className="text-[13px] font-bold text-primary uppercase tracking-tight break-words line-clamp-2">
            {String(value)}
        </span>
    );
  };

  return (
    <div className={cn(gonia.layout.card, "p-0 overflow-hidden bg-[var(--gonia-surface)] border border-primary/40 shadow-none", className)}>
      <div className="bg-[var(--gonia-limestone)] border-b border-primary/30 py-3 px-6 flex justify-between items-center">
        <h2 className={cn(gonia.text.label, "m-0 text-primary flex items-center gap-3")}>
          <ClipboardList className="h-4 w-4 opacity-70" /> {title}
        </h2>
        {badgeText && (
          <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase px-2 py-0.5 shadow-none">
            {badgeText}
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-collapse">
        {Object.entries(formData).map(([key, value]) => (
            <div 
              key={key} 
              className="flex flex-col border-b border-r border-primary/30 group hover:bg-primary/[0.02] transition-colors"
            >
              <div className="bg-[var(--gonia-limestone)]/50 px-4 py-1.5 border-b border-primary/[0.1]">
                <span className="text-[9px] font-black uppercase text-primary/50 tracking-normal group-hover:text-primary/70 transition-colors">
                  {key.replace(/_/g, " ")}
                </span>
              </div>
              <div className="px-4 py-3 min-h-[52px] flex items-center bg-[var(--gonia-surface)]">
                {formatValue(value)}
              </div>
            </div>
        ))}
      </div>
    </div>
  );
}
