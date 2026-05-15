import * as React from "react"

import { cn } from "../lib/utils"
import { gonia } from "../lib/gonia-theme"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(
          "dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 h-10 border bg-transparent px-3 py-1 text-sm transition-all focus-visible:ring-1 aria-invalid:ring-1 placeholder:text-muted-foreground/50 w-full min-w-0 outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          gonia.input.base,
          gonia.radius,
          // File styling: uses theme definition
          gonia.input.file,
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }