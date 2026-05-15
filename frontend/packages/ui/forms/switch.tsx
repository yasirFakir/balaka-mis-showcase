"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "../lib/utils"

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void
  checked?: boolean
  defaultChecked?: boolean
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked: controlledChecked, defaultChecked, onCheckedChange, ...props }, ref) => {
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked || false)
    const isControlled = controlledChecked !== undefined
    const isChecked = isControlled ? controlledChecked : internalChecked

    const toggle = () => {
      if (!props.disabled) {
        const next = !isChecked
        if (!isControlled) {
          setInternalChecked(next)
        }
        onCheckedChange?.(next)
      }
    }

    return (
      <div
        className={cn(
          "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-none border-2 transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          isChecked ? "bg-primary border-primary" : "bg-transparent border-primary/40",
          className
        )}
        onClick={toggle}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={isChecked}
          onChange={(e) => {
            if (!isControlled) {
              setInternalChecked(e.target.checked)
            }
            onCheckedChange?.(e.target.checked)
          }}
          disabled={props.disabled}
          ref={ref}
          {...props}
        />
        <motion.div
          animate={{
            x: isChecked ? 20 : 4,
            backgroundColor: isChecked ? "var(--gonia-surface)" : "var(--gonia-primary)",
          }}
          initial={false}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
          className="pointer-events-none block h-3 w-3 rounded-none shadow-sm"
        />
      </div>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }