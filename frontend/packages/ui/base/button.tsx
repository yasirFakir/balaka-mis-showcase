import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "../lib/utils"
import { gonia } from "../lib/gonia-theme"

const buttonVariants = cva(
  cn(
    "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 border bg-clip-padding text-[10px] font-bold uppercase tracking-normal focus-visible:ring-1 aria-invalid:ring-1 [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-all duration-150 ease-in-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none",
    gonia.button.base,
    gonia.radius
  ),
  {
    variants: {
      variant: {
        default: gonia.button.primary,
        secondary: gonia.button.secondary,
        muted: gonia.button.muted,
        outline: gonia.button.outline,
        ghost: gonia.button.ghost,
        destructive: gonia.button.destructive,
        link: "text-primary underline-offset-4 hover:underline border-none shadow-none active:translate-x-0 active:translate-y-0 active:scale-100",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-[10px]",
        lg: "h-12 px-8 text-sm",
        xl: "h-14 px-8 text-base font-black tracking-normal",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8 text-[10px]",
        "icon-xs": "h-6 w-6 text-[9px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef<HTMLButtonElement, React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }>(({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
