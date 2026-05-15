"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion, LayoutGroup } from "framer-motion"

import { cn } from "../lib/utils"
import { gonia } from "../lib/gonia-theme"

const TabsContext = React.createContext<{ id: string }>({ id: "tabs" })

function Tabs({ children, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>) {
  const id = React.useId()
  return (
    <TabsContext.Provider value={{ id }}>
      <LayoutGroup id={id}>
        <TabsPrimitive.Root {...props}>
          {children}
        </TabsPrimitive.Root>
      </LayoutGroup>
    </TabsContext.Provider>
  )
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      gonia.tabs.list,
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

// We need a custom trigger to access the data-state for animation
const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & { activeClassName?: string }
>(({ className, activeClassName, children, ...props }, ref) => {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn("group", className)} // Pass class to wrapper for positioning if needed
      asChild
      {...props}
    >
      <TabsTriggerChild activeClassName={activeClassName}>{children}</TabsTriggerChild>
    </TabsPrimitive.Trigger>
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsTriggerChild = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button"> & { activeClassName?: string }
>(({ className, activeClassName, children, ...props }, ref) => {
  const isActive = (props as Record<string, unknown>)["data-state"] === "active"
  const { id } = React.useContext(TabsContext)

  return (
    <button
      ref={ref}
      {...props}
      className={cn(
        "relative inline-flex items-center justify-center whitespace-nowrap focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer transition-colors duration-200 h-full",
        gonia.tabs.trigger,
        isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-primary",
        className
      )}
    >
      <span className="relative z-10 inline-flex items-center justify-center gap-2.5 h-full">
        {children}
      </span>
      {isActive && (
        <motion.div
          layoutId={`active-tab-${id}`}
          className={cn("absolute inset-0 z-0 bg-primary shadow-none", activeClassName)}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        />
      )}
    </button>
  )
})
TabsTriggerChild.displayName = "TabsTriggerChild"

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-6 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }