"use client";

import * as React from "react";
import { 
  Button, 
  Badge, 
  GoniaIcons, 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  cn 
} from "@/ui";
import { SlidersHorizontal, FilterX, X } from "lucide-react";

interface GoniaFilterProps {
  activeCount?: number;
  onReset?: () => void;
  title?: string;
  children: React.ReactNode;
  triggerClassName?: string;
  contentClassName?: string;
  align?: "start" | "center" | "end";
}

/**
 * GoniaFilter
 * A standardized filter wrapper for Gonia v1.5 Registry views.
 * Redesigned to use a sliding Sheet for better usability and density.
 */
export function GoniaFilter({ 
  activeCount = 0, 
  onReset, 
  title = "Filter Registry", 
  children, 
  triggerClassName,
  contentClassName,
}: GoniaFilterProps) {
  const hasActiveFilters = activeCount > 0;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className={cn(
              "h-9 w-9 border-primary/20 rounded-none shrink-0 relative", 
              hasActiveFilters && "border-primary bg-primary/5 text-primary",
              triggerClassName
          )}
        >
          <GoniaIcons.Filter className="h-3.5 w-3.5" />
          {hasActiveFilters && (
            <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] px-1 flex items-center justify-center bg-primary text-white text-[8px] font-black border border-white rounded-none shadow-sm">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className={cn("w-full sm:max-w-md p-0 rounded-none border-l-4 border-primary bg-white shadow-2xl flex flex-col h-full overflow-hidden", contentClassName)}
      >
        <div className="bg-primary/5 p-4 md:p-6 border-b-2 border-primary/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <SheetTitle className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-primary">{title}</SheetTitle>
          </div>
          <div className="flex items-center gap-2">
            {onReset && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onReset}
                className="h-8 px-2 text-[9px] font-black uppercase text-muted-foreground hover:text-destructive gap-1 transition-all rounded-none hover:bg-destructive/5"
              >
                <FilterX className="h-3 w-3" /> Reset
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <div className="space-y-8">
            {children}
          </div>
        </div>

        <div className="p-6 border-t border-primary/5 bg-primary/[0.02] shrink-0">
           <SheetClose asChild>
             <Button className="w-full h-12 rounded-none font-black uppercase tracking-widest shadow-[4px_4px_0_0_var(--gonia-accent)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">
               Apply Filters
             </Button>
           </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface GoniaFilterCheckboxProps {
  label: string;
  value: string;
  count?: number;
  checked: boolean;
  onChange: (value: string) => void;
}

/**
 * GoniaFilterCheckbox
 * A standardized monochrome square checkbox for filter lists.
 */
export function GoniaFilterCheckbox({ label, value, count, checked, onChange }: GoniaFilterCheckboxProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group select-none py-1 hover:bg-primary/5 px-2 -mx-2 rounded-sm transition-colors">
      <div className={cn(
        "w-4 h-4 border transition-colors flex items-center justify-center shrink-0 rounded-none",
        checked ? "bg-primary border-primary" : "bg-transparent border-primary/30 group-hover:border-primary"
      )}>
        {checked && <div className="w-2 h-2 bg-white" />}
      </div>
      <input 
        type="checkbox" 
        className="hidden" 
        checked={checked} 
        onChange={() => onChange(value)} 
      />
      <span className={cn(
        "text-[10px] font-bold uppercase tracking-normal transition-colors flex-1",
        checked ? "text-primary" : "text-primary/40 group-hover:text-primary/70"
      )}>
        {label}
      </span>
      {count !== undefined && (
        <span className="font-mono text-[10px] text-primary/30">{count}</span>
      )}
    </label>
  );
}

/**
 * GoniaFilterSection
 * A standardized header for sections within a filter popover.
 */
export function GoniaFilterSection({ title, className }: { title: string, className?: string }) {
  return (
    <div className={cn("text-[10px] font-black uppercase text-primary/40 mb-2 px-1", className)}>
      {title}
    </div>
  );
}
