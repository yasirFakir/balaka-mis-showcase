import * as React from "react"
import { cn } from "../lib/utils"
import { gonia, GoniaStatusConfig } from "../lib/gonia-theme"
import { GoniaIcons } from "../lib/icon-registry"

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: string
  variant?: "default" | "outline" | "solid"
  showIcon?: boolean
}

/**
 * Centralized Status Badge component.
 * Uses the statusTheme from gonia-theme.ts for consistent coloring and labeling.
 */
export function StatusBadge({ 
  status, 
  variant = "default",
  showIcon = true,
  className, 
  ...props 
}: StatusBadgeProps) {
  const theme: GoniaStatusConfig = gonia.statusTheme[status] || {
    color: "bg-muted text-muted-foreground",
    label: status,
    icon: ""
  }

  // Map status to semantic icons from theme
  const getIcon = () => {
    if (!theme.icon) return null;
    const IconComponent = (GoniaIcons as any)[theme.icon];
    if (!IconComponent) return null;

    return (
      <IconComponent 
        className={cn(
          "h-2.5 w-2.5 mr-1", 
          status === "Processing" && "animate-spin-slow"
        )} 
      />
    );
  };

  return (
    <div
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[9px] font-black uppercase tracking-normal rounded-none whitespace-nowrap",
        theme.color,
        variant === "outline" && "bg-transparent border",
        variant === "solid" && "!bg-primary !text-white", // Overrides
        className
      )}
      {...props}
    >
      {showIcon && getIcon()}
      {theme.label}
    </div>
  )
}