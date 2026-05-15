import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "../lib/utils"

const badgeVariants = cva(
  "h-[22px] gap-1 rounded-none border border-border/50 px-2 text-[10px] font-black uppercase tracking-tight transition-all inline-flex items-center justify-center w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none focus-visible:border-ring transition-colors overflow-hidden group/badge",
  {
    variants: {
      variant: {
        default: "bg-primary text-white border-none",
        secondary: "bg-secondary text-white border-none",
        outline: "text-foreground border-border",
        // Filled Box Styles - High contrast for status recognition
        success: "bg-[var(--gonia-success)] text-white border-none shadow-none",
        warning: "bg-[var(--gonia-warning)] text-[var(--gonia-ink)] border-none shadow-none",
        destructive: "bg-[var(--gonia-error)] text-white border-none shadow-none",
        processing: "bg-blue-600 text-white border-none shadow-none",
        completed: "bg-[var(--gonia-success)] text-white border-none shadow-none",
        info: "bg-[var(--gonia-info)] text-white border-none shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Badge = React.forwardRef<
  HTMLSpanElement,
  React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }
>(({ className, variant = "default", asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      ref={ref}
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
})
Badge.displayName = "Badge"

export { Badge, badgeVariants }
